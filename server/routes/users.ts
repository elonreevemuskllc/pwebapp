import express from 'express';
import pool from '../db/connection';
import { getAffiliateStatistics, getDailyRevenue } from '../services/statisticsService';

const router = express.Router();

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

router.get('/users/birthdays', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [birthdays] = await connection.query(
			`SELECT id, username, email, date_of_birth,
			DAY(date_of_birth) as birth_day,
			MONTH(date_of_birth) as birth_month
			FROM users
			WHERE MONTH(date_of_birth) = MONTH(CURDATE())
			AND state = 'accepted'
			ORDER BY DAY(date_of_birth) ASC`
		) as any[];

		res.json(birthdays);
	} catch (error) {
		console.error('Error fetching birthdays:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/users', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {

		const [users] = await connection.query(
			'SELECT id, username, email, role, state, is_frozen, note FROM users ORDER BY created_at DESC'
		) as any[];

		res.json(users);
	} catch (error) {
		console.error('Error fetching users:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/user/:id', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {

		const [user] = await connection.query(
			`SELECT u.id, u.username, u.email, u.role, u.salary, u.salary_payment_frequency_days, u.is_frozen, u.state, u.referrer, u.manager, u.note, u.date_of_birth,
			       ref.username as referrer_username
			FROM users u
			LEFT JOIN users ref ON u.referrer = ref.id
			WHERE u.id = ?`,
			[req.params.id]
		) as any[];

		if (!user[0]) {
			return res.status(404).json({ error: 'User not found' });
		}

		res.json(user[0]);
	} catch (error) {
		console.error('Error fetching user:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/user/:id/pending-salary', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {

		const [pending] = await connection.query(
			'SELECT * FROM pending_salary_changes WHERE user_id = ?',
			[req.params.id]
		) as any[];

		res.json({ pending: pending[0] || null });
	} catch (error) {
		console.error('Error fetching pending salary:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/user/:id/deal', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {

		const [user] = await connection.query(
			'SELECT role FROM users WHERE id = ?',
			[req.params.id]
		) as any[];

		if (!user[0]) {
			return res.status(404).json({ error: 'User not found' });
		}

		let deal = null;

		if (user[0].role === 'affiliate') {
			const [affiliateDeal] = await connection.query(
				'SELECT * FROM affiliate_deals WHERE user_id = ?',
				[req.params.id]
			) as any[];
			deal = affiliateDeal[0] || null;
		} else if (user[0].role === 'manager') {
			const [managerDeal] = await connection.query(
				'SELECT * FROM manager_deals WHERE user_id = ?',
				[req.params.id]
			) as any[];
			deal = managerDeal[0] || null;
		}

		res.json({ deal });
	} catch (error) {
		console.error('Error fetching deal:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/user/:id/shaves', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {

		const [shaves] = await connection.query(
			`SELECT s.*,
				u1.username as user_username,
				u2.username as target_username,
				u3.username as intermediary_username
			FROM shaves s
			LEFT JOIN users u1 ON s.user_id = u1.id
			LEFT JOIN users u2 ON s.target_id = u2.id
			LEFT JOIN users u3 ON s.intermediary_id = u3.id
			WHERE s.user_id = ? OR s.target_id = ?`,
			[req.params.id, req.params.id]
		) as any[];

		res.json({ shaves });
	} catch (error) {
		console.error('Error fetching shaves:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/user/:id/total-expenses', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [result] = await connection.query(
			'SELECT COALESCE(SUM(amount), 0) as total FROM expense_reimbursements WHERE user_id = ? AND status = "accepted"',
			[req.params.id]
		) as any[];

		res.json({ total: result[0]?.total || 0 });
	} catch (error) {
		console.error('Error fetching total expenses:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.put('/user/:id/update', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { field, value } = req.body;
	const connection = await pool.getConnection();

	try {

		if (!['username', 'email', 'salary_payment_frequency_days', 'note'].includes(field)) {
			return res.status(400).json({ error: 'Invalid field' });
		}

		await connection.query(
			`UPDATE users SET ${field} = ? WHERE id = ?`,
			[value, req.params.id]
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error updating user:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.post('/user/:id/freeze', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { freeze } = req.body;
	const connection = await pool.getConnection();

	try {

		await connection.query(
			'UPDATE users SET is_frozen = ? WHERE id = ?',
			[freeze ? 1 : 0, req.params.id]
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error freezing user:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.post('/user/:id/salary', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { new_salary } = req.body;
	const connection = await pool.getConnection();

	try {

		const nextMonth = new Date();
		nextMonth.setMonth(nextMonth.getMonth() + 1);
		nextMonth.setDate(1);
		const effectiveDate = nextMonth.toISOString().split('T')[0];

		await connection.query(
			'INSERT INTO pending_salary_changes (user_id, new_salary, effective_date) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE new_salary = ?, effective_date = ?',
			[req.params.id, new_salary, effectiveDate, new_salary, effectiveDate]
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error scheduling salary change:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.post('/user/:id/salary/apply-now', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		const [pendingChanges] = await connection.query(
			'SELECT new_salary FROM pending_salary_changes WHERE user_id = ?',
			[req.params.id]
		);

		if ((pendingChanges as any[]).length === 0) {
			await connection.rollback();
			return res.status(404).json({ error: 'No pending salary change found' });
		}

		const newSalary = (pendingChanges as any[])[0].new_salary;

		await connection.query(
			'UPDATE users SET salary = ? WHERE id = ?',
			[newSalary, req.params.id]
		);

		await connection.query(
			'DELETE FROM pending_salary_changes WHERE user_id = ?',
			[req.params.id]
		);

		await connection.commit();
		res.json({ success: true });
	} catch (error) {
		await connection.rollback();
		console.error('Error applying salary now:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.put('/user/:id/deal', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { deal } = req.body;
	const connection = await pool.getConnection();

	try {

		const [user] = await connection.query(
			'SELECT role FROM users WHERE id = ?',
			[req.params.id]
		) as any[];

		if (!user[0]) {
			return res.status(404).json({ error: 'User not found' });
		}

		if (user[0].role === 'affiliate') {
			await connection.query(
				`INSERT INTO affiliate_deals (user_id, cpa_enabled, cpa_amount, revshare_enabled, revshare_percentage)
				VALUES (?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
				cpa_enabled = ?, cpa_amount = ?, revshare_enabled = ?, revshare_percentage = ?`,
				[
					req.params.id,
					deal.cpa_enabled ? 1 : 0,
					deal.cpa_amount || 0,
					deal.revshare_enabled ? 1 : 0,
					deal.revshare_percentage || 0,
					deal.cpa_enabled ? 1 : 0,
					deal.cpa_amount || 0,
					deal.revshare_enabled ? 1 : 0,
					deal.revshare_percentage || 0
				]
			);
		} else if (user[0].role === 'manager') {
			await connection.query(
				`INSERT INTO manager_deals (user_id, cpa_per_ftd)
				VALUES (?, ?)
				ON DUPLICATE KEY UPDATE cpa_per_ftd = ?`,
				[req.params.id, deal.cpa_per_ftd || 0, deal.cpa_per_ftd || 0]
			);
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Error updating deal:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/user/:id/tracking-codes', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [codes] = await connection.query(
			'SELECT id, code, display_name, afp, created_at FROM tracking_codes WHERE user_id = ? ORDER BY created_at DESC',
			[req.params.id]
		) as any[];

		res.json({ trackingCodes: codes });
	} catch (error) {
		console.error('Error fetching tracking codes:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.post('/user/:id/tracking-codes', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { code, display_name, afp } = req.body;
	const connection = await pool.getConnection();

	try {
		if (!code || !code.trim()) {
			return res.status(400).json({ error: 'Code is required' });
		}

		if (!display_name || !display_name.trim()) {
			return res.status(400).json({ error: 'Display name is required' });
		}

		await connection.query(
			'INSERT INTO tracking_codes (user_id, code, display_name, afp) VALUES (?, ?, ?, ?)',
			[req.params.id, code.trim(), display_name.trim(), afp || null]
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error adding tracking code:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.delete('/user/:userId/tracking-codes/:codeId', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		await connection.query(
			'DELETE FROM tracking_codes WHERE id = ? AND user_id = ?',
			[req.params.codeId, req.params.userId]
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error deleting tracking code:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.post('/user/:id/ftd', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { ftd_user_id, registration_date, tracking_code, afp, note, is_bulk, quantity } = req.body;
	const connection = await pool.getConnection();

	try {
		if (!registration_date || !tracking_code) {
			return res.status(400).json({ error: 'Registration date and tracking code are required' });
		}

		if (is_bulk) {
			const bulkQuantity = parseInt(quantity) || 1;
			for (let i = 0; i < bulkQuantity; i++) {
				await connection.query(
					'INSERT INTO ftd_assignments (ftd_user_id, assigned_user_id, registration_date, tracking_code, afp, note) VALUES (?, ?, ?, ?, ?, ?)',
					['', req.params.id, registration_date, tracking_code, afp || null, note || null]
				);
			}
		} else {
			if (!ftd_user_id) {
				return res.status(400).json({ error: 'FTD user ID is required for single FTD' });
			}

			await connection.query(
				'INSERT INTO ftd_assignments (ftd_user_id, assigned_user_id, registration_date, tracking_code, afp, note) VALUES (?, ?, ?, ?, ?, ?)',
				[ftd_user_id, req.params.id, registration_date, tracking_code, afp || null, note || null]
			);
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Error adding FTD:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/user/:id/ftd-assignments', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [assignments] = await connection.query(
			'SELECT id, ftd_user_id, registration_date, tracking_code, note FROM ftd_assignments WHERE assigned_user_id = ? ORDER BY registration_date DESC',
			[req.params.id]
		) as any[];

		res.json({ assignments });
	} catch (error) {
		console.error('Error fetching FTD assignments:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.delete('/user/:userId/ftd/:ftdId', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		await connection.query(
			'DELETE FROM ftd_assignments WHERE id = ? AND assigned_user_id = ?',
			[req.params.ftdId, req.params.userId]
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error deleting FTD:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.post('/user/:id/revshare', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { trader_id, date, revshare } = req.body;
	const connection = await pool.getConnection();

	try {
		if (!trader_id || !date || revshare === undefined) {
			return res.status(400).json({ error: 'All fields are required' });
		}

		const [existing] = await connection.query(
			'SELECT id FROM daily_revshare WHERE trader_id = ? AND date = ?',
			[trader_id, date]
		) as any[];

		if (existing.length > 0) {
			await connection.query(
				'UPDATE daily_revshare SET revshare = ? WHERE trader_id = ? AND date = ?',
				[revshare, trader_id, date]
			);
		} else {
			await connection.query(
				'INSERT INTO daily_revshare (trader_id, date, revshare) VALUES (?, ?, ?)',
				[trader_id, date, revshare]
			);
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Error adding/updating revshare:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

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

router.get('/my-statistics', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	try {
		const period = (req.query.period as string) || 'all';
		const validPeriods = ['today', 'week', 'month', 'all', 'custom'];
		const selectedPeriod = validPeriods.includes(period) ? period as any : 'all';

		const startDate = req.query.startDate as string | undefined;
		const endDate = req.query.endDate as string | undefined;

		const statistics = await getAffiliateStatistics(session.userId, selectedPeriod, startDate, endDate);
		res.json(statistics);
	} catch (error) {
		console.error('Error fetching statistics:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/daily-revenue', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	try {
		const days = parseInt(req.query.days as string) || 30;
		const dailyRevenue = await getDailyRevenue(session.userId, days);
		res.json(dailyRevenue);
	} catch (error) {
		console.error('Error fetching daily revenue:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/my-monthly-ftd-count', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	try {
		const [result] = await pool.query(
			`SELECT COUNT(*) as count
			FROM ftd_assignments
			WHERE assigned_user_id = ?
			AND YEAR(registration_date) = YEAR(CURDATE())
			AND MONTH(registration_date) = MONTH(CURDATE())`,
			[session.userId]
		) as any[];

		const monthlyFtdCount = result[0]?.count || 0;
		res.json({ monthlyFtdCount });
	} catch (error) {
		console.error('Error fetching monthly FTD count:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/my-referrals', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	const { startDate, endDate } = req.query;

	const connection = await pool.getConnection();

	try {
		// Get all referred users
		const [referrals] = await connection.query(
			`SELECT id, username, email, created_at, state
			FROM users
			WHERE referrer = ? AND state = 'accepted'
			ORDER BY created_at DESC`,
			[session.userId]
		) as any[];

		// For each referral, get detailed stats for the period
		const referralsWithStats = await Promise.all(referrals.map(async (referral: any) => {
			let cpaEarnings = 0;
			let revshareEarnings = 0;
			let ftdCount = 0;

			// Get affiliate deal
			const [deal] = await connection.query(
				'SELECT cpa_enabled, cpa_amount, revshare_enabled, revshare_percentage FROM affiliate_deals WHERE user_id = ?',
				[referral.id]
			) as any[];

			const dealConfig = deal.length > 0 ? deal[0] : null;

			if (startDate && endDate) {
				// Calculate earnings for the period
				if (dealConfig && dealConfig.cpa_enabled) {
					// Get FTD count for period
					const [ftdRows] = await connection.query(
						`SELECT COUNT(*) as count FROM ftd_assignments 
						WHERE assigned_user_id = ? AND DATE(registration_date) BETWEEN ? AND ?`,
						[referral.id, startDate, endDate]
					) as any[];
					ftdCount = ftdRows[0]?.count || 0;
					cpaEarnings = ftdCount * parseFloat(dealConfig.cpa_amount || 0);
				}

				if (dealConfig && dealConfig.revshare_enabled) {
					// Get revshare for period
					const [ftdList] = await connection.query(
						'SELECT ftd_user_id FROM ftd_assignments WHERE assigned_user_id = ?',
						[referral.id]
					) as any[];

					if (ftdList.length > 0) {
						const traderIds = ftdList.map((row: any) => row.ftd_user_id);
						const placeholders = traderIds.map(() => '?').join(',');

						const [revshareRows] = await connection.query(
							`SELECT SUM(revshare) as total FROM daily_revshare 
							WHERE trader_id IN (${placeholders}) AND date BETWEEN ? AND ?`,
							[...traderIds, startDate, endDate]
						) as any[];

						const totalRevshare = parseFloat(revshareRows[0]?.total || 0);
						revshareEarnings = totalRevshare * (parseFloat(dealConfig.revshare_percentage || 0) / 100);
					}
				}
			} else {
				// Use total balance (all time)
				const [balance] = await connection.query(
					'SELECT cpa_earnings, revshare_earnings FROM balances WHERE user_id = ?',
					[referral.id]
				) as any[];

				cpaEarnings = balance.length > 0 ? parseFloat(balance[0].cpa_earnings || 0) : 0;
				revshareEarnings = balance.length > 0 ? parseFloat(balance[0].revshare_earnings || 0) : 0;
			}

			const totalEarnings = cpaEarnings + revshareEarnings;

			// Get shave configuration to calculate commission
			const [shave] = await connection.query(
				'SELECT commission_type, value FROM shaves WHERE user_id = ? AND target_id = ?',
				[session.userId, referral.id]
			) as any[];

			let commissionEarned = 0;
			if (shave.length > 0) {
				const shaveConfig = shave[0];
				if (shaveConfig.commission_type === 'percentage') {
					// Percentage of referred user's earnings
					commissionEarned = totalEarnings * (parseFloat(shaveConfig.value) / 100);
				} else if (shaveConfig.commission_type === 'fixed_per_ftd') {
					// Fixed amount per FTD (need to get FTD count for period if dates provided)
					if (startDate && endDate) {
						const [periodFtdRows] = await connection.query(
							`SELECT COUNT(*) as count FROM ftd_assignments 
							WHERE assigned_user_id = ? AND DATE(registration_date) BETWEEN ? AND ?`,
							[referral.id, startDate, endDate]
						) as any[];
						ftdCount = periodFtdRows[0]?.count || 0;
					} else {
						const [allFtdRows] = await connection.query(
							'SELECT COUNT(*) as count FROM ftd_assignments WHERE assigned_user_id = ?',
							[referral.id]
						) as any[];
						ftdCount = allFtdRows[0]?.count || 0;
					}
					commissionEarned = ftdCount * parseFloat(shaveConfig.value);
				}
			}

			return {
				...referral,
				ftd_count: ftdCount,
				total_earnings: totalEarnings,
				commission_earned: commissionEarned,
				commission_type: shave.length > 0 ? shave[0].commission_type : null,
				commission_value: shave.length > 0 ? parseFloat(shave[0].value) : null
			};
		}));

		res.json(referralsWithStats);
	} catch (error) {
		console.error('Error fetching referrals:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/my-tracking-codes', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	const connection = await pool.getConnection();

	try {
		const [codes] = await connection.query(
			'SELECT code FROM tracking_codes WHERE user_id = ?',
			[session.userId]
		) as any[];

		res.json({ trackingCodes: codes.map((c: any) => c.code) });
	} catch (error) {
		console.error('Error fetching tracking codes:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/tracking-code-stats', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	const connection = await pool.getConnection();

	try {
		const [trackingCodes] = await connection.query(
			'SELECT code, display_name, afp FROM tracking_codes WHERE user_id = ?',
			[session.userId]
		) as any[];

		if (trackingCodes.length === 0) {
			return res.json([]);
		}

		const [dealRows] = await connection.query(
			`SELECT cpa_enabled, cpa_amount, revshare_enabled, revshare_percentage
			FROM affiliate_deals
			WHERE user_id = ?`,
			[session.userId]
		) as any[];

		const deal = dealRows[0] || {
			cpa_enabled: 0,
			cpa_amount: 0,
			revshare_enabled: 0,
			revshare_percentage: 0
		};

		// Calculate total shave percentage for this user
		const [shaveRows] = await connection.query(
			`SELECT COALESCE(SUM(value), 0) as total_shave
			FROM shaves
			WHERE target_id = ?`,
			[session.userId]
		) as any[];

		const totalShavePercentage = parseFloat(shaveRows[0]?.total_shave || 0);
		const visiblePercentage = Math.max(0, 100 - totalShavePercentage) / 100;

		const stats = [];

		for (const { code, display_name, afp } of trackingCodes) {
			const [ftdRows] = await connection.query(
				`SELECT COUNT(*) as count
				FROM ftd_assignments
				WHERE tracking_code = ? AND assigned_user_id = ?`,
				[code, session.userId]
			) as any[];

			const ftdCount = ftdRows[0]?.count || 0;

			const [visitorRows] = await connection.query(
				`SELECT SUM(unique_visitors) as visitors, SUM(impressions) as impressions, SUM(deposits) as deposits
				FROM daily_media_stats
				WHERE (tracking_code = ? OR (afp = ? AND afp IS NOT NULL AND afp != ''))`,
				[code, afp || '']
			) as any[];

			const rawVisitors = visitorRows[0]?.visitors || 0;
			const rawImpressions = visitorRows[0]?.impressions || 0;
			const rawDeposits = parseFloat(visitorRows[0]?.deposits || 0);

			// Apply shave percentage to media stats
			const visitors = Math.round(rawVisitors * visiblePercentage);
			const impressions = Math.round(rawImpressions * visiblePercentage);
			const deposits = rawDeposits * visiblePercentage;

			let cpaEarnings = 0;
			if (deal.cpa_enabled) {
				cpaEarnings = ftdCount * parseFloat(deal.cpa_amount);
			}

			let revshareEarnings = 0;
			if (deal.revshare_enabled) {
				const [ftdList] = await connection.query(
					`SELECT ftd_user_id FROM ftd_assignments WHERE tracking_code = ? AND assigned_user_id = ?`,
					[code, session.userId]
				) as any[];

				if (ftdList.length > 0) {
					const traderIds = ftdList.map((row: any) => row.ftd_user_id);
					const placeholders = traderIds.map(() => '?').join(',');

					const [revshareRows] = await connection.query(
						`SELECT SUM(revshare) as total FROM daily_revshare WHERE trader_id IN (${placeholders})`,
						traderIds
					) as any[];

					const totalRevshare = parseFloat(revshareRows[0]?.total || 0);
					revshareEarnings = totalRevshare * (parseFloat(deal.revshare_percentage) / 100);
				}
			}

			stats.push({
				trackingCode: code,
				displayName: display_name,
				afp: afp || '',
				ftds: ftdCount,
				visitors,
				impressions,
				deposits,
				cpaEarnings,
				revshareEarnings,
				totalEarnings: cpaEarnings + revshareEarnings
			});
		}

		res.json(stats);
	} catch (error) {
		console.error('Error fetching tracking code stats:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/my-deal', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	const connection = await pool.getConnection();

	try {
		const [dealRows] = await connection.query(
			`SELECT cpa_enabled, revshare_enabled
			FROM affiliate_deals
			WHERE user_id = ?`,
			[session.userId]
		) as any[];

		if (dealRows.length === 0) {
			return res.json({
				cpa_enabled: false,
				revshare_enabled: false
			});
		}

		res.json({
			cpa_enabled: Boolean(dealRows[0].cpa_enabled),
			revshare_enabled: Boolean(dealRows[0].revshare_enabled)
		});
	} catch (error) {
		console.error('Error fetching deal:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/my-balance', async (req, res) => {
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
		const [balanceRows] = await connection.query(
			`SELECT total_balance, paid_balance, cpa_earnings, revshare_earnings, salary_earnings, paid_ftd_referral, paid_revshare, last_updated
			FROM balances
			WHERE user_id = ?`,
			[session.userId]
		) as any[];

		const [userRows] = await connection.query(
			`SELECT salary FROM users WHERE id = ?`,
			[session.userId]
		) as any[];

		const monthlySalary = parseFloat(userRows[0]?.salary || 0);

		if (balanceRows.length === 0) {
			return res.json({
				total_balance: 0,
				paid_balance: 0,
				unpaid_balance: 0,
				cpa_earnings: 0,
				revshare_earnings: 0,
				salary_earnings: 0,
				monthly_salary: monthlySalary,
				last_updated: null
			});
		}

		const balance = balanceRows[0];
		const unpaidBalance = parseFloat(balance.total_balance) - parseFloat(balance.paid_balance);

		res.json({
			total_balance: parseFloat(balance.total_balance),
			paid_balance: parseFloat(balance.paid_balance),
			unpaid_balance: unpaidBalance,
			cpa_earnings: parseFloat(balance.cpa_earnings),
			revshare_earnings: parseFloat(balance.revshare_earnings),
			paid_ftd_referral: parseFloat(balance.paid_ftd_referral || 0),
			paid_revshare: parseFloat(balance.paid_revshare || 0),
			salary_earnings: parseFloat(balance.salary_earnings || 0),
			monthly_salary: monthlySalary,
			last_updated: balance.last_updated
		});
	} catch (error) {
		console.error('Error fetching balance:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/users/search', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { q } = req.query;

	if (!q || typeof q !== 'string' || q.length < 2) {
		return res.json({ users: [] });
	}

	try {
		const [users] = await pool.query(
			`SELECT id, username, email, role
			FROM users
			WHERE (username LIKE ? OR email LIKE ?)
			AND state = 'accepted'
			LIMIT 10`,
			[`%${q}%`, `%${q}%`]
		) as any[];

		res.json({ users });
	} catch (error) {
		console.error('Error searching users:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.put('/user/:id/referrer', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { id } = req.params;
	const { referrer_id, commission_type, commission_value } = req.body;

	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Update user referrer
		await connection.query(
			'UPDATE users SET referrer = ? WHERE id = ?',
			[referrer_id, id]
		);

		// Delete existing shave if any
		await connection.query(
			'DELETE FROM shaves WHERE user_id = ? AND target_id = ?',
			[referrer_id, id]
		);

		// Create new shave
		await connection.query(
			'INSERT INTO shaves (user_id, target_id, commission_type, value) VALUES (?, ?, ?, ?)',
			[referrer_id, id, commission_type, commission_value]
		);

		await connection.commit();
		res.json({ success: true });
	} catch (error) {
		await connection.rollback();
		console.error('Error updating referrer:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.delete('/user/:id/referrer', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { id } = req.params;
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Get referrer before removing
		const [users] = await connection.query(
			'SELECT referrer FROM users WHERE id = ?',
			[id]
		) as any[];

		if (users.length === 0) {
			await connection.rollback();
			return res.status(404).json({ error: 'User not found' });
		}

		const referrerId = users[0].referrer;

		// Remove referrer from user
		await connection.query(
			'UPDATE users SET referrer = NULL WHERE id = ?',
			[id]
		);

		// Delete shave if exists
		if (referrerId) {
			await connection.query(
				'DELETE FROM shaves WHERE user_id = ? AND target_id = ?',
				[referrerId, id]
			);
		}

		await connection.commit();
		res.json({ success: true });
	} catch (error) {
		await connection.rollback();
		console.error('Error removing referrer:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.delete('/user/:id/delete', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { id } = req.params;
	const reason = req.body?.reason || null;
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Get all user data before deletion
		const [userData] = await connection.query('SELECT * FROM users WHERE id = ?', [id]) as any[];

		if (userData.length === 0) {
			await connection.rollback();
			return res.status(404).json({ error: 'User not found' });
		}

		// Get all related data
		const [sessions] = await connection.query('SELECT * FROM sessions WHERE user_id = ?', [id]);
		const [pendingSalary] = await connection.query('SELECT * FROM pending_salary_changes WHERE user_id = ?', [id]);
		const [affiliateDeals] = await connection.query('SELECT * FROM affiliate_deals WHERE user_id = ?', [id]);
		const [managerDeals] = await connection.query('SELECT * FROM manager_deals WHERE user_id = ?', [id]);
		const [shaves] = await connection.query('SELECT * FROM shaves WHERE user_id = ? OR target_id = ? OR intermediary_id = ?', [id, id, id]);
		const [trackingCodes] = await connection.query('SELECT * FROM tracking_codes WHERE user_id = ?', [id]);
		const [ftdAssignments] = await connection.query('SELECT * FROM ftd_assignments WHERE assigned_user_id = ?', [id]);
		const [balances] = await connection.query('SELECT * FROM balances WHERE user_id = ?', [id]);
		const [expenses] = await connection.query('SELECT * FROM expense_reimbursements WHERE user_id = ?', [id]);
		const [payments] = await connection.query('SELECT * FROM payment_requests WHERE user_id = ?', [id]);
		const [salaryClaims] = await connection.query('SELECT * FROM daily_salary_claims WHERE user_id = ?', [id]);
		const [userFiles] = await connection.query('SELECT * FROM user_files WHERE user_id = ?', [id]);
		const [rewardClaims] = await connection.query('SELECT * FROM reward_claims WHERE user_id = ?', [id]);

		// Compile all data into a single object
		const completeUserData = {
			user: userData[0],
			sessions,
			pendingSalary,
			affiliateDeals,
			managerDeals,
			shaves,
			trackingCodes,
			ftdAssignments,
			balances,
			expenses,
			payments,
			salaryClaims,
			userFiles,
			rewardClaims
		};

		// Save to deleted_users archive
		await connection.query(
			'INSERT INTO deleted_users (original_user_id, user_data, deleted_by, reason) VALUES (?, ?, ?, ?)',
			[id, JSON.stringify(completeUserData), adminId, reason || null]
		);

		// Delete all related data
		await connection.query('DELETE FROM sessions WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM pending_salary_changes WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM affiliate_deals WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM manager_deals WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM shaves WHERE user_id = ? OR target_id = ? OR intermediary_id = ?', [id, id, id]);
		await connection.query('DELETE FROM tracking_codes WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM ftd_assignments WHERE assigned_user_id = ?', [id]);
		await connection.query('DELETE FROM balances WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM expense_reimbursements WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM payment_requests WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM daily_salary_claims WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM user_files WHERE user_id = ?', [id]);
		await connection.query('DELETE FROM reward_claims WHERE user_id = ?', [id]);

		// Update users who have this user as referrer
		await connection.query('UPDATE users SET referrer = NULL WHERE referrer = ?', [id]);

		// Delete the user
		await connection.query('DELETE FROM users WHERE id = ?', [id]);

		await connection.commit();
		res.json({ success: true });
	} catch (error) {
		await connection.rollback();
		console.error('Error deleting user:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/deleted-users', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [deletedUsers] = await connection.query(
			`SELECT du.id, du.original_user_id, du.deleted_at, du.reason,
				JSON_UNQUOTE(JSON_EXTRACT(du.user_data, '$.user.username')) as username,
				JSON_UNQUOTE(JSON_EXTRACT(du.user_data, '$.user.email')) as email,
				JSON_UNQUOTE(JSON_EXTRACT(du.user_data, '$.user.role')) as role,
				u.username as deleted_by_username
			FROM deleted_users du
			LEFT JOIN users u ON du.deleted_by = u.id
			ORDER BY du.deleted_at DESC`
		) as any[];

		res.json(deletedUsers);
	} catch (error) {
		console.error('Error fetching deleted users:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.post('/restore-user/:archiveId', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { archiveId } = req.params;
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Get archived data
		const [archived] = await connection.query(
			'SELECT user_data FROM deleted_users WHERE id = ?',
			[archiveId]
		) as any[];

		if (archived.length === 0) {
			await connection.rollback();
			return res.status(404).json({ error: 'Archived user not found' });
		}

		const userData = typeof archived[0].user_data === 'string'
			? JSON.parse(archived[0].user_data)
			: archived[0].user_data;

		// Check if email already exists
		const [existingUser] = await connection.query(
			'SELECT id FROM users WHERE email = ?',
			[userData.user.email]
		) as any[];

		if (existingUser.length > 0) {
			await connection.rollback();
			return res.status(400).json({ error: 'A user with this email already exists' });
		}

		// Restore user
		const [result] = await connection.query(
			`INSERT INTO users (role, email, password, username, date_of_birth, application_data, referrer, manager, salary, salary_payment_frequency_days, state, reject_reason, is_verified, is_frozen, note, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				userData.user.role,
				userData.user.email,
				userData.user.password,
				userData.user.username,
				userData.user.date_of_birth,
				userData.user.application_data,
				userData.user.referrer,
				userData.user.manager,
				userData.user.salary,
				userData.user.salary_payment_frequency_days,
				userData.user.state,
				userData.user.reject_reason,
				userData.user.is_verified,
				userData.user.is_frozen,
				userData.user.note,
				userData.user.created_at
			]
		) as any;

		const newUserId = (result as any).insertId;

		// Restore affiliate deals
		if (userData.affiliateDeals && userData.affiliateDeals.length > 0) {
			const deal = userData.affiliateDeals[0];
			await connection.query(
				'INSERT INTO affiliate_deals (user_id, cpa_enabled, cpa_amount, revshare_enabled, revshare_percentage) VALUES (?, ?, ?, ?, ?)',
				[newUserId, deal.cpa_enabled, deal.cpa_amount, deal.revshare_enabled, deal.revshare_percentage]
			);
		}

		// Restore manager deals
		if (userData.managerDeals && userData.managerDeals.length > 0) {
			const deal = userData.managerDeals[0];
			await connection.query(
				'INSERT INTO manager_deals (user_id, cpa_per_ftd) VALUES (?, ?)',
				[newUserId, deal.cpa_per_ftd]
			);
		}

		// Restore tracking codes
		if (userData.trackingCodes && userData.trackingCodes.length > 0) {
			for (const code of userData.trackingCodes) {
				await connection.query(
					'INSERT INTO tracking_codes (user_id, code, display_name, afp, created_at) VALUES (?, ?, ?, ?, ?)',
					[newUserId, code.code, code.display_name, code.afp, code.created_at]
				);
			}
		}

		// Restore FTD assignments
		if (userData.ftdAssignments && userData.ftdAssignments.length > 0) {
			for (const ftd of userData.ftdAssignments) {
				await connection.query(
					'INSERT INTO ftd_assignments (ftd_user_id, assigned_user_id, registration_date, tracking_code, afp, note) VALUES (?, ?, ?, ?, ?, ?)',
					[ftd.ftd_user_id, newUserId, ftd.registration_date, ftd.tracking_code, ftd.afp, ftd.note]
				);
			}
		}

		// Restore balances
		if (userData.balances && userData.balances.length > 0) {
			const balance = userData.balances[0];
			await connection.query(
				'INSERT INTO balances (user_id, total_balance, paid_balance, cpa_earnings, revshare_earnings, referral_earnings, salary_earnings, paid_ftd_referral, paid_revshare) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[newUserId, balance.total_balance, balance.paid_balance, balance.cpa_earnings, balance.revshare_earnings, balance.referral_earnings || 0, balance.salary_earnings || 0, balance.paid_ftd_referral || 0, balance.paid_revshare || 0]
			);
		}

		// Delete from archive
		await connection.query('DELETE FROM deleted_users WHERE id = ?', [archiveId]);

		await connection.commit();
		res.json({ success: true, newUserId });
	} catch (error) {
		await connection.rollback();
		console.error('Error restoring user:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

export default router;