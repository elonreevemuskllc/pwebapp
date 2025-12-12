import express from 'express';
import pool from '../db/connection';
import { sendPaymentRequestConfirmation, sendPaymentRequestProcessed } from '../services/emailService';
import { sendNotification } from '../services/notificationService';

const router = express.Router();

async function verifySession(sessionId: string): Promise<{ userId: number; role: string } | null> {
	const [sessions] = await pool.query(
		`SELECT s.user_id, u.role
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.id = ? AND s.expires_at > NOW()`,
		[sessionId]
	);

	if ((sessions as any[]).length === 0) {
		return null;
	}

	return {
		userId: (sessions as any[])[0].user_id,
		role: (sessions as any[])[0].role
	};
}

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

router.post('/payment-requests', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate' && session.role !== 'manager') {
		return res.status(403).json({ error: 'Access denied - affiliates and managers only' });
	}

	const { payment_type, amount, crypto_type, network, wallet_address, note } = req.body;

	if (!payment_type || !amount || !crypto_type || !network || !wallet_address) {
		return res.status(400).json({ error: 'Missing required fields' });
	}

	if (payment_type !== 'ftd_referral' && payment_type !== 'revshare' && payment_type !== 'salary') {
		return res.status(400).json({ error: 'Invalid payment type' });
	}

	const connection = await pool.getConnection();

	try {
		const isDev = process.env.IS_DEV === '1';

		if (!isDev) {
			const today = new Date();
			const dayOfWeek = today.getDay();
			const dayOfMonth = today.getDate();

			if (session.role === 'manager') {
				const [lastManagerPaymentRows] = await connection.query(
					`SELECT created_at FROM payment_requests
					WHERE user_id = ? AND status IN ('pending', 'accepted')
					ORDER BY created_at DESC LIMIT 1`,
					[session.userId]
				) as any[];

				if (lastManagerPaymentRows.length > 0) {
					const lastPaymentDate = new Date(lastManagerPaymentRows[0].created_at);
					const daysSinceLastPayment = Math.floor((today.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

					if (daysSinceLastPayment < 30) {
						return res.status(400).json({
							error: `Les managers peuvent faire une demande de paiement uniquement une fois par mois (30 jours). Dernière demande: ${lastPaymentDate.toLocaleDateString('fr-FR')}`
						});
					}
				}
			}

			if (payment_type === 'ftd_referral' && dayOfWeek !== 3) {
				return res.status(400).json({ error: 'FTD + Referral payment requests can only be made on Wednesdays' });
			}

			if (payment_type === 'revshare' && dayOfMonth !== 1) {
				return res.status(400).json({ error: 'RevShare payment requests can only be made on the 1st of the month' });
			}

			if (payment_type === 'salary') {
				if (session.role === 'affiliate') {
					const [userRows] = await connection.query(
						`SELECT salary_payment_frequency_days FROM users WHERE id = ?`,
						[session.userId]
					) as any[];

					if (userRows.length === 0) {
						return res.status(404).json({ error: 'User not found' });
					}

					const frequencyDays = parseInt(userRows[0].salary_payment_frequency_days || 7);

					const [lastPaymentRows] = await connection.query(
						`SELECT last_payment_date FROM last_salary_payments WHERE user_id = ?`,
						[session.userId]
					) as any[];

					if (lastPaymentRows.length > 0) {
						const lastPaymentDate = new Date(lastPaymentRows[0].last_payment_date);
						const daysSinceLastPayment = Math.floor((today.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

						if (daysSinceLastPayment < frequencyDays) {
							return res.status(400).json({
								error: `Vous devez attendre ${frequencyDays} jours entre chaque demande de paiement de commission fixe. Dernière demande: ${lastPaymentDate.toLocaleDateString('fr-FR')}`
							});
						}
					}
				}
			}
		}

		const [pendingRequests] = await connection.query(
			`SELECT id FROM payment_requests WHERE user_id = ? AND status = 'pending'`,
			[session.userId]
		) as any[];

		if (pendingRequests.length > 0) {
			return res.status(400).json({ error: 'You already have a pending payment request' });
		}

		const [balanceRows] = await connection.query(
			`SELECT cpa_earnings, revshare_earnings, salary_earnings, paid_ftd_referral, paid_revshare, manager_ftd_earnings, manager_salary_earnings FROM balances WHERE user_id = ?`,
			[session.userId]
		) as any[];

		if (balanceRows.length === 0) {
			return res.status(400).json({ error: 'No balance found' });
		}

		const balance = balanceRows[0];
		const cpaEarnings = parseFloat(balance.cpa_earnings || 0);
		const revshareEarnings = parseFloat(balance.revshare_earnings || 0);
		const salaryEarnings = parseFloat(balance.salary_earnings || 0);
		const paidFtdReferral = parseFloat(balance.paid_ftd_referral || 0);
		const paidRevshare = parseFloat(balance.paid_revshare || 0);
		const managerFtdEarnings = parseFloat(balance.manager_ftd_earnings || 0);
		const managerSalaryEarnings = parseFloat(balance.manager_salary_earnings || 0);

		let availableBalance;
		if (session.role === 'manager') {
			availableBalance = payment_type === 'salary' ? managerSalaryEarnings : managerFtdEarnings;
		} else {
			const ftdReferralBalance = cpaEarnings - paidFtdReferral;
			const revshareBalance = revshareEarnings - paidRevshare;
			availableBalance = payment_type === 'revshare' ? revshareBalance : (payment_type === 'salary' ? salaryEarnings : ftdReferralBalance);
		}

		if (amount > availableBalance) {
			return res.status(400).json({ error: 'Requested amount exceeds available balance for this payment type' });
		}

		if (amount <= 0) {
			return res.status(400).json({ error: 'Amount must be positive' });
		}

		const validNetworks: Record<string, string[]> = {
			// 'USDT': ['BEP20', 'TRC20', 'SOL'],
			// 'USDC': ['BEP20', 'TRC20', 'SOL', 'ARBITRUM'],
			// 'ETH': ['ERC20']
			'USDC': ['SOL'],
		};

		if (!validNetworks[crypto_type] || !validNetworks[crypto_type].includes(network)) {
			return res.status(400).json({ error: 'Invalid network for selected cryptocurrency' });
		}

		await connection.query(
			`INSERT INTO payment_requests (user_id, payment_type, amount, crypto_type, network, wallet_address, note)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[session.userId, payment_type, amount, crypto_type, network, wallet_address, note || null]
		);

		const [userRows] = await connection.query(
			`SELECT email, username FROM users WHERE id = ?`,
			[session.userId]
		) as any[];

		if (userRows.length > 0) {
			await sendPaymentRequestConfirmation(
				userRows[0].email,
				userRows[0].username,
				amount,
				crypto_type,
				network
			);
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Error creating payment request:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/my-payment-requests', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate' && session.role !== 'manager') {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [requests] = await connection.query(
			`SELECT pr.*, u.username as processed_by_username
			FROM payment_requests pr
			LEFT JOIN users u ON pr.processed_by = u.id
			WHERE pr.user_id = ?
			ORDER BY pr.created_at DESC`,
			[session.userId]
		) as any[];

		const formattedRequests = requests.map((req: any) => ({
			...req,
			amount: parseFloat(req.amount)
		}));

		res.json(formattedRequests);
	} catch (error) {
		console.error('Error fetching payment requests:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/admin/payment-requests', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [requests] = await connection.query(
			`SELECT pr.*, u.username, u.email, u.role as user_role,
				admin_user.username as processed_by_username
			FROM payment_requests pr
			JOIN users u ON pr.user_id = u.id
			LEFT JOIN users admin_user ON pr.processed_by = admin_user.id
			ORDER BY
				CASE pr.status
					WHEN 'pending' THEN 1
					WHEN 'accepted' THEN 2
					WHEN 'declined' THEN 3
				END,
				CASE 
					WHEN pr.status = 'pending' AND pr.admin_note IS NOT NULL THEN 2
					ELSE 1
				END,
				pr.created_at DESC`
		) as any[];

		const formattedRequests = requests.map((req: any) => ({
			...req,
			amount: parseFloat(req.amount)
		}));

		res.json(formattedRequests);
	} catch (error) {
		console.error('Error fetching payment requests:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/admin/payment-stats', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [totalGenerated] = await connection.query(
			`SELECT COALESCE(SUM(total_balance), 0) as total FROM balances`
		) as any[];

		const [totalToPay] = await connection.query(
			`SELECT COALESCE(SUM(total_balance - paid_balance), 0) as total FROM balances`
		) as any[];

		const [totalPaid] = await connection.query(
			`SELECT COALESCE(SUM(paid_balance), 0) as total FROM balances`
		) as any[];

		res.json({
			total_generated: parseFloat(totalGenerated[0].total),
			total_to_pay: parseFloat(totalToPay[0].total),
			total_paid: parseFloat(totalPaid[0].total)
		});
	} catch (error) {
		console.error('Error fetching payment stats:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.put('/admin/payment-requests/:id/accept', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		const [requestRows] = await connection.query(
			`SELECT pr.*, u.email, u.username FROM payment_requests pr
			JOIN users u ON pr.user_id = u.id
			WHERE pr.id = ? AND pr.status = 'pending'`,
			[req.params.id]
		) as any[];

		if (requestRows.length === 0) {
			await connection.rollback();
			return res.status(404).json({ error: 'Payment request not found or already processed' });
		}

		const request = requestRows[0];

		await connection.query(
			`UPDATE payment_requests
			SET status = 'accepted', processed_by = ?, processed_at = NOW()
			WHERE id = ?`,
			[adminId, req.params.id]
		);

		const [userRows] = await connection.query(
			`SELECT role FROM users WHERE id = ?`,
			[request.user_id]
		) as any[];

		const userRole = userRows.length > 0 ? userRows[0].role : null;

		if (request.payment_type === 'salary') {
			if (userRole === 'manager') {
				await connection.query(
					`UPDATE balances
					SET paid_balance = paid_balance + ?,
							manager_salary_earnings = 0
					WHERE user_id = ?`,
					[request.amount, request.user_id]
				);
			} else {
				const today = new Date().toISOString().split('T')[0];
				await connection.query(
					`INSERT INTO last_salary_payments (user_id, last_payment_date)
					VALUES (?, ?)
					ON DUPLICATE KEY UPDATE last_payment_date = ?`,
					[request.user_id, today, today]
				);
			}
		} else if (request.payment_type === 'revshare') {
			await connection.query(
				`UPDATE balances
				SET paid_balance = paid_balance + ?,
						paid_revshare = paid_revshare + ?
				WHERE user_id = ?`,
				[request.amount, request.amount, request.user_id]
			);
		} else {
			if (userRole === 'manager') {
				await connection.query(
					`UPDATE balances
					SET paid_balance = paid_balance + ?,
							manager_ftd_earnings = manager_ftd_earnings - ?
					WHERE user_id = ?`,
					[request.amount, request.amount, request.user_id]
				);
			} else {
				await connection.query(
					`UPDATE balances
					SET paid_balance = paid_balance + ?,
							paid_ftd_referral = paid_ftd_referral + ?
					WHERE user_id = ?`,
					[request.amount, request.amount, request.user_id]
				);
			}
		}

		await sendPaymentRequestProcessed(
			request.email,
			request.username,
			parseFloat(request.amount),
			request.crypto_type,
			'accepted',
			null
		);

		await connection.commit();

		// Envoyer une notification
		await sendNotification({
			userId: request.user_id,
			title: 'Paiement accepté ✅',
			body: `Votre demande de paiement de ${parseFloat(request.amount)} ${request.crypto_type} a été acceptée.`,
			icon: '/icon-192x192.png',
			url: '/affiliate/payments',
			type: 'payment'
		});

		res.json({ success: true });
	} catch (error) {
		await connection.rollback();
		console.error('Error accepting payment request:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.put('/admin/payment-requests/:id/decline', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { admin_note } = req.body;

	if (!admin_note || !admin_note.trim()) {
		return res.status(400).json({ error: 'Reason for declining is required' });
	}

	const connection = await pool.getConnection();

	try {
		const [requestRows] = await connection.query(
			`SELECT pr.*, u.email, u.username FROM payment_requests pr
			JOIN users u ON pr.user_id = u.id
			WHERE pr.id = ? AND pr.status = 'pending'`,
			[req.params.id]
		) as any[];

		if (requestRows.length === 0) {
			return res.status(404).json({ error: 'Payment request not found or already processed' });
		}

		const request = requestRows[0];

		await connection.query(
			`UPDATE payment_requests
			SET status = 'declined', admin_note = ?, processed_by = ?, processed_at = NOW()
			WHERE id = ?`,
			[admin_note, adminId, req.params.id]
		);

		await sendPaymentRequestProcessed(
			request.email,
			request.username,
			parseFloat(request.amount),
			request.crypto_type,
			'declined',
			admin_note
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error declining payment request:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.put('/admin/payment-requests/:id/postpone', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { admin_note } = req.body;

	const connection = await pool.getConnection();

	try {
		const [requestRows] = await connection.query(
			`SELECT pr.*, u.email, u.username FROM payment_requests pr
			JOIN users u ON pr.user_id = u.id
			WHERE pr.id = ? AND pr.status = 'pending'`,
			[req.params.id]
		) as any[];

		if (requestRows.length === 0) {
			return res.status(404).json({ error: 'Payment request not found or already processed' });
		}

		await connection.query(
			`UPDATE payment_requests
			SET admin_note = ?, processed_by = ?, processed_at = NOW()
			WHERE id = ?`,
			[admin_note || 'À traiter plus tard', adminId, req.params.id]
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error postponing payment request:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

export default router;