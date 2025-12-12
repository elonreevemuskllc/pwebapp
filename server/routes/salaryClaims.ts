import { Router } from 'express';
import pool from '../db/connection';

const router = Router();

async function verifyAdmin(sessionId: string): Promise<number | null> {
	const [sessions] = await pool.query(
		`SELECT s.user_id, u.role
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.id = ? AND s.expires_at > NOW() AND u.role = 'admin'`,
		[sessionId]
	);

	if ((sessions as any[]).length === 0) {
		return null;
	}

	return (sessions as any[])[0].user_id;
}

async function verifySession(sessionId: string): Promise<{ id: number; role: string } | null> {
	const [sessions] = await pool.query(
		`SELECT s.user_id as id, u.role
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.id = ? AND s.expires_at > NOW()`,
		[sessionId]
	);

	if ((sessions as any[]).length === 0) {
		return null;
	}

	return (sessions as any[])[0];
}

function getDaysInMonth(date: Date): number {
	const year = date.getFullYear();
	const month = date.getMonth();
	return new Date(year, month + 1, 0).getDate();
}

router.post('/salary-claims/submit', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const user = await verifySession(sessionId);

		if (!user) {
			return res.status(403).json({ message: 'Non authentifié' });
		}

		const { proofLink } = req.body;
		const userId = user.id;

		if (!proofLink || !proofLink.trim()) {
			return res.status(400).json({ message: 'Le lien de preuve est requis' });
		}

		const connection = await pool.getConnection();
		try {
			const [user] = await connection.query(
				'SELECT salary, role, state FROM users WHERE id = ?',
				[userId]
			) as any[];

			if (user.length === 0) {
				return res.status(404).json({ message: 'Utilisateur non trouvé' });
			}

			if (user[0].role !== 'affiliate' || user[0].state !== 'accepted') {
				return res.status(403).json({ message: 'Seuls les affiliés acceptés peuvent soumettre une demande de salaire' });
			}

			if (!user[0].salary || user[0].salary <= 0) {
				return res.status(400).json({ message: 'Vous n\'avez pas de salaire configuré' });
			}

			const today = new Date();
			const todayStr = today.toISOString().split('T')[0];
			const daysInMonth = getDaysInMonth(today);
			const dailyAmount = parseFloat(user[0].salary) / daysInMonth;

			const [existing] = await connection.query(
				'SELECT id FROM daily_salary_claims WHERE user_id = ? AND claim_date = ?',
				[userId, todayStr]
			) as any[];

			if (existing.length > 0) {
				return res.status(400).json({ message: 'Vous avez déjà soumis une demande pour aujourd\'hui' });
			}

			await connection.query(
				`INSERT INTO daily_salary_claims
				(user_id, claim_date, proof_link, amount)
				VALUES (?, ?, ?, ?)`,
				[userId, todayStr, proofLink, dailyAmount]
			);

			res.json({
				message: 'Demande de salaire soumise avec succès',
				amount: dailyAmount
			});
		} finally {
			connection.release();
		}
	} catch (error) {
		console.error('Error submitting salary claim:', error);
		res.status(500).json({ message: 'Erreur lors de la soumission de la demande' });
	}
});

router.get('/salary-claims/today-status', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const user = await verifySession(sessionId);

		if (!user) {
			return res.status(403).json({ message: 'Non authentifié' });
		}

		const userId = user.id;
		const today = new Date().toISOString().split('T')[0];

		const connection = await pool.getConnection();
		try {
			const [user] = await connection.query(
				'SELECT salary, role, state FROM users WHERE id = ?',
				[userId]
			) as any[];

			if (user.length === 0 || user[0].role !== 'affiliate' || !user[0].salary || user[0].salary <= 0) {
				return res.json({
					hasSalary: false,
					canClaim: false
				});
			}

			const [claim] = await connection.query(
				'SELECT id, status FROM daily_salary_claims WHERE user_id = ? AND claim_date = ?',
				[userId, today]
			) as any[];

			const daysInMonth = getDaysInMonth(new Date());
			const dailyAmount = parseFloat(user[0].salary) / daysInMonth;

			res.json({
				hasSalary: true,
				canClaim: claim.length === 0,
				claimStatus: claim.length > 0 ? claim[0].status : null,
				dailyAmount: dailyAmount
			});
		} finally {
			connection.release();
		}
	} catch (error) {
		console.error('Error checking salary claim status:', error);
		res.status(500).json({ message: 'Erreur lors de la vérification du statut' });
	}
});

router.get('/admin/salary-claims', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ message: 'Accès refusé' });
		}

		const connection = await pool.getConnection();
		try {
			const [claims] = await connection.query(
				`SELECT
					dsc.id,
					dsc.user_id,
					dsc.claim_date,
					dsc.proof_link,
					dsc.amount,
					dsc.status,
					dsc.admin_note,
					dsc.processed_at,
					dsc.created_at,
					u.username,
					u.email,
					admin.username as processed_by_username
				FROM daily_salary_claims dsc
				JOIN users u ON dsc.user_id = u.id
				LEFT JOIN users admin ON dsc.processed_by = admin.id
				ORDER BY
					CASE dsc.status
						WHEN 'pending' THEN 1
						WHEN 'approved' THEN 2
						WHEN 'rejected' THEN 3
					END,
					CASE 
						WHEN dsc.status = 'pending' AND dsc.admin_note IS NOT NULL THEN 2
						ELSE 1
					END,
					dsc.created_at DESC`,
				[]
			) as any[];

			res.json(claims);
		} finally {
			connection.release();
		}
	} catch (error) {
		console.error('Error fetching salary claims:', error);
		res.status(500).json({ message: 'Erreur lors de la récupération des demandes' });
	}
});

router.post('/admin/salary-claims/:id/approve', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ message: 'Accès refusé' });
		}

		const { id } = req.params;
		const { adminNote } = req.body;

		const connection = await pool.getConnection();
		try {
			await connection.beginTransaction();

			const [claim] = await connection.query(
				'SELECT user_id, amount, status FROM daily_salary_claims WHERE id = ?',
				[id]
			) as any[];

			if (claim.length === 0) {
				await connection.rollback();
				return res.status(404).json({ message: 'Demande non trouvée' });
			}

			if (claim[0].status !== 'pending') {
				await connection.rollback();
				return res.status(400).json({ message: 'Cette demande a déjà été traitée' });
			}

			await connection.query(
				`UPDATE daily_salary_claims
				SET status = 'approved', admin_note = ?, processed_by = ?, processed_at = NOW()
				WHERE id = ?`,
				[adminNote || null, adminId, id]
			);

			await connection.query(
				`INSERT INTO balances (user_id, total_balance, salary_earnings)
				VALUES (?, ?, ?)
				ON DUPLICATE KEY UPDATE
					total_balance = total_balance + VALUES(salary_earnings),
					salary_earnings = salary_earnings + VALUES(salary_earnings)`,
				[claim[0].user_id, claim[0].amount, claim[0].amount]
			);

			await connection.commit();

			res.json({ message: 'Demande approuvée et salaire versé avec succès' });
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	} catch (error) {
		console.error('Error approving salary claim:', error);
		res.status(500).json({ message: 'Erreur lors de l\'approbation de la demande' });
	}
});

router.post('/admin/salary-claims/:id/reject', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ message: 'Accès refusé' });
		}

		const { id } = req.params;
		const { adminNote } = req.body;

		const connection = await pool.getConnection();
		try {
			const [claim] = await connection.query(
				'SELECT status FROM daily_salary_claims WHERE id = ?',
				[id]
			) as any[];

			if (claim.length === 0) {
				return res.status(404).json({ message: 'Demande non trouvée' });
			}

			if (claim[0].status !== 'pending') {
				return res.status(400).json({ message: 'Cette demande a déjà été traitée' });
			}

			await connection.query(
				`UPDATE daily_salary_claims
				SET status = 'rejected', admin_note = ?, processed_by = ?, processed_at = NOW()
				WHERE id = ?`,
				[adminNote || null, adminId, id]
			);

			res.json({ message: 'Demande rejetée avec succès' });
		} finally {
			connection.release();
		}
	} catch (error) {
		console.error('Error rejecting salary claim:', error);
		res.status(500).json({ message: 'Erreur lors du rejet de la demande' });
	}
});

router.post('/admin/salary-claims/:id/postpone', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ message: 'Accès refusé' });
		}

		const { id } = req.params;
		const { adminNote } = req.body;

		const connection = await pool.getConnection();
		try {
			const [claim] = await connection.query(
				'SELECT status FROM daily_salary_claims WHERE id = ?',
				[id]
			) as any[];

			if (claim.length === 0) {
				return res.status(404).json({ message: 'Demande non trouvée' });
			}

			if (claim[0].status !== 'pending') {
				return res.status(400).json({ message: 'Cette demande a déjà été traitée' });
			}

			await connection.query(
				`UPDATE daily_salary_claims
				SET admin_note = ?, processed_by = ?, processed_at = NOW()
				WHERE id = ?`,
				[adminNote || 'À traiter plus tard', adminId, id]
			);

			res.json({ message: 'Demande reportée avec succès' });
		} finally {
			connection.release();
		}
	} catch (error) {
		console.error('Error postponing salary claim:', error);
		res.status(500).json({ message: 'Erreur lors du report de la demande' });
	}
});

export default router;
