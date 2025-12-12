import express from 'express';
import pool from '../db/connection';

const router = express.Router();

async function verifyManagerSession(sessionId: string): Promise<number | null> {
	const [sessions] = await pool.query(
		`SELECT s.user_id, u.role
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.id = ? AND s.expires_at > NOW() AND u.role = 'manager'`,
		[sessionId]
	);

	if ((sessions as any[]).length === 0) {
		return null;
	}

	return (sessions as any[])[0].user_id;
}

router.get('/manager/dashboard-stats', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const managerId = await verifyManagerSession(sessionId);

	if (!managerId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const { startDate, endDate } = req.query;

		let ftdEarnings = 0;
		let salaryEarnings = 0;

		const [affiliatesQuery] = await connection.query(
			`SELECT u.id, u.username, u.email, md.cpa_per_ftd, maa.assigned_at
			FROM users u
			LEFT JOIN manager_deals md ON md.user_id = ?
			LEFT JOIN manager_affiliate_assignments maa ON maa.manager_id = ? AND maa.affiliate_id = u.id
			WHERE u.manager = ? AND u.state = 'accepted' AND maa.assigned_at IS NOT NULL`,
			[managerId, managerId, managerId]
		) as any[];

		const affiliates: any[] = [];

		for (const affiliate of affiliatesQuery) {
			const assignedDate = new Date(affiliate.assigned_at);
			let ftdCountQuery;

			if (startDate && endDate) {
				[ftdCountQuery] = await connection.query(
					`SELECT COUNT(*) as count
					FROM ftd_assignments
					WHERE assigned_user_id = ?
					AND registration_date >= ?
					AND DATE(registration_date) BETWEEN ? AND ?`,
					[affiliate.id, assignedDate, startDate, endDate]
				) as any[];
			} else {
				[ftdCountQuery] = await connection.query(
					`SELECT COUNT(*) as count
					FROM ftd_assignments
					WHERE assigned_user_id = ?
					AND registration_date >= ?`,
					[affiliate.id, assignedDate]
				) as any[];
			}

			const ftdCount = ftdCountQuery[0]?.count || 0;
			const cpaPerFtd = parseFloat(affiliate.cpa_per_ftd || 0);
			const commission = ftdCount * cpaPerFtd;

			ftdEarnings += commission;

			affiliates.push({
				id: affiliate.id,
				username: affiliate.username,
				email: affiliate.email,
				ftd_count: ftdCount,
				commission_per_ftd: cpaPerFtd,
				total_commission: commission
			});
		}

		if (startDate && endDate) {
			const [salaryQuery] = await connection.query(
				`SELECT SUM(amount) as total
				FROM daily_salary_payments
				WHERE user_id = ? AND payment_date BETWEEN ? AND ?`,
				[managerId, startDate, endDate]
			) as any[];
			salaryEarnings = parseFloat(salaryQuery[0]?.total || 0);
		} else {
			const [balanceRows] = await connection.query(
				`SELECT manager_salary_earnings
				FROM balances
				WHERE user_id = ?`,
				[managerId]
			) as any[];
			salaryEarnings = parseFloat(balanceRows[0]?.manager_salary_earnings || 0);
		}

		const totalEarnings = ftdEarnings + salaryEarnings;

		res.json({
			ftd_earnings: ftdEarnings,
			salary_earnings: salaryEarnings,
			total_earnings: totalEarnings,
			affiliates: affiliates
		});
	} catch (error) {
		console.error('Error fetching manager dashboard stats:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/manager/balance', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const managerId = await verifyManagerSession(sessionId);

	if (!managerId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	try {
		const [balanceRows] = await pool.query(
			`SELECT manager_ftd_earnings, manager_salary_earnings, paid_balance
			FROM balances
			WHERE user_id = ?`,
			[managerId]
		) as any[];

		const balance = balanceRows.length > 0 ? balanceRows[0] : {
			manager_ftd_earnings: 0,
			manager_salary_earnings: 0,
			paid_balance: 0
		};

		res.json({
			manager_ftd_earnings: parseFloat(balance.manager_ftd_earnings || 0),
			manager_salary_earnings: parseFloat(balance.manager_salary_earnings || 0),
			paid_balance: parseFloat(balance.paid_balance || 0)
		});
	} catch (error) {
		console.error('Error fetching manager balance:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
