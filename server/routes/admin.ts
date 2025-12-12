import express from 'express';
import pool from '../db/connection';
import { emailService } from '../services/emailService';
import { calculateAdminStats } from '../services/adminStatsService';

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

router.get('/applications', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const [applications] = await pool.query(`
			SELECT
				u.id,
				u.username,
				u.email,
				u.role,
				u.state,
				u.reject_reason,
				u.is_verified,
				u.application_data,
				u.referrer,
				u.manager,
				u.created_at,
				ref.username as referrer_username,
				ref.email as referrer_email,
				mgr.username as manager_username,
				mgr.email as manager_email,
				maa.assigned_at as manager_assigned_at,
				ad.cpa_enabled,
				ad.cpa_amount,
				ad.revshare_enabled,
				ad.revshare_percentage
			FROM users u
			LEFT JOIN users ref ON u.referrer = ref.id
			LEFT JOIN users mgr ON u.manager = mgr.id
			LEFT JOIN manager_affiliate_assignments maa ON maa.affiliate_id = u.id AND maa.manager_id = u.manager
			LEFT JOIN affiliate_deals ad ON u.id = ad.user_id
			WHERE u.role != 'admin'
			ORDER BY u.created_at DESC
		`);

		res.json({ applications });
	} catch (error) {
		console.error('Get applications error:', error);
		res.status(500).json({ error: 'Failed to fetch applications' });
	}
});

router.get('/search-users', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { query, role } = req.query;

		if (!query) {
			return res.json({ users: [] });
		}

		let sql = `
			SELECT id, username, email, role
			FROM users
			WHERE state = 'accepted' AND is_verified = 1
			AND (username LIKE ? OR email LIKE ?)
		`;

		const params: any[] = [`%${query}%`, `%${query}%`];

		if (role === 'manager' || role === 'affiliate') {
			sql += ' AND role = ?';
			params.push(role);
		}

		sql += ' LIMIT 10';

		const [users] = await pool.query(sql, params);

		res.json({ users });
	} catch (error) {
		console.error('Search users error:', error);
		res.status(500).json({ error: 'Failed to search users' });
	}
});

router.put('/applications/:id/reject', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { id } = req.params;
		const { reason } = req.body;

		if (!reason) {
			return res.status(400).json({ error: 'Rejection reason is required' });
		}

		const [users] = await pool.query(
			'SELECT email, username FROM users WHERE id = ?',
			[id]
		);

		if ((users as any[]).length === 0) {
			return res.status(404).json({ error: 'User not found' });
		}

		const user = (users as any[])[0];

		await pool.query(
			'UPDATE users SET state = ?, reject_reason = ? WHERE id = ?',
			['rejected', reason, id]
		);

		await emailService.sendApplicationRejected(user.email, user.username, reason);

		res.json({ success: true, message: 'Application rejected successfully' });
	} catch (error) {
		console.error('Reject application error:', error);
		res.status(500).json({ error: 'Failed to reject application' });
	}
});

router.put('/applications/:id/accept', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { id } = req.params;
		const {
			role,
			cpaEnabled,
			cpaAmount,
			revshareEnabled,
			revsharePercentage,
			managerCpaPerFtd,
			salary,
			salaryPaymentFrequencyDays,
			trackingCodes,
			trackingCodesWithNames,
			referrerCommissionType,
			referrerShavePercentage,
			referrerFixedPerFtd
		} = req.body;

		if (!role || (role !== 'manager' && role !== 'affiliate')) {
			return res.status(400).json({ error: 'Valid role is required' });
		}

		const [users] = await pool.query(
			'SELECT email, username FROM users WHERE id = ?',
			[id]
		);

		if ((users as any[]).length === 0) {
			return res.status(404).json({ error: 'User not found' });
		}

		const user = (users as any[])[0];

		await pool.query(
			'UPDATE users SET state = ?, role = ?, salary = ?, salary_payment_frequency_days = ? WHERE id = ?',
			['accepted', role, salary || 0, salaryPaymentFrequencyDays || 7, id]
		);

		if (role === 'affiliate' && (cpaEnabled || revshareEnabled)) {
			await pool.query(`
				INSERT INTO affiliate_deals (user_id, cpa_enabled, cpa_amount, revshare_enabled, revshare_percentage)
				VALUES (?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					cpa_enabled = VALUES(cpa_enabled),
					cpa_amount = VALUES(cpa_amount),
					revshare_enabled = VALUES(revshare_enabled),
					revshare_percentage = VALUES(revshare_percentage)
			`, [id, cpaEnabled ? 1 : 0, cpaAmount || 0, revshareEnabled ? 1 : 0, revsharePercentage || 0]);
		}

		if (role === 'manager') {
			await pool.query(`
				INSERT INTO manager_deals (user_id, cpa_per_ftd)
				VALUES (?, ?)
				ON DUPLICATE KEY UPDATE
					cpa_per_ftd = VALUES(cpa_per_ftd)
			`, [id, managerCpaPerFtd || 0]);
		}

		if (role === 'affiliate') {
			if (trackingCodesWithNames && Array.isArray(trackingCodesWithNames) && trackingCodesWithNames.length > 0) {
				for (const tc of trackingCodesWithNames) {
					if (tc.code && tc.code.trim() && tc.displayName && tc.displayName.trim()) {
						await pool.query(
							'INSERT INTO tracking_codes (user_id, code, display_name) VALUES (?, ?, ?)',
							[id, tc.code.trim(), tc.displayName.trim()]
						);
					}
				}
			} else if (trackingCodes && trackingCodes.trim()) {
				const codes = trackingCodes.split(',').map((code: string) => code.trim()).filter((code: string) => code.length > 0);
				for (const code of codes) {
					await pool.query(
						'INSERT INTO tracking_codes (user_id, code, display_name) VALUES (?, ?, ?)',
						[id, code, code]
					);
				}
			}
		}

		const [userCheck] = await pool.query(
			'SELECT referrer, manager FROM users WHERE id = ?',
			[id]
		) as any[];

		if (userCheck.length > 0 && userCheck[0].manager && role === 'affiliate') {
			const managerId = userCheck[0].manager;
			await pool.query(
				'INSERT IGNORE INTO manager_affiliate_assignments (manager_id, affiliate_id) VALUES (?, ?)',
				[managerId, id]
			);
		}

		if (userCheck.length > 0 && userCheck[0].referrer) {
			const referrerId = userCheck[0].referrer;
			const commissionType = referrerCommissionType || 'percentage';

			if (commissionType === 'percentage') {
				if (!referrerShavePercentage || referrerShavePercentage <= 0) {
					return res.status(400).json({ error: 'Le pourcentage de shave du parrain est obligatoire' });
				}
				await pool.query(
					'INSERT INTO shaves (user_id, target_id, commission_type, value) VALUES (?, ?, ?, ?)',
					[referrerId, id, 'percentage', referrerShavePercentage]
				);
			} else if (commissionType === 'fixed_per_ftd') {
				if (!referrerFixedPerFtd || referrerFixedPerFtd <= 0) {
					return res.status(400).json({ error: 'La commission fixe par FTD du parrain est obligatoire' });
				}
				await pool.query(
					'INSERT INTO shaves (user_id, target_id, commission_type, value) VALUES (?, ?, ?, ?)',
					[referrerId, id, 'fixed_per_ftd', referrerFixedPerFtd]
				);
			}
		}

		await emailService.sendApplicationAccepted(user.email, user.username);

		res.json({ success: true, message: 'Application accepted successfully' });
	} catch (error) {
		console.error('Accept application error:', error);
		res.status(500).json({ error: 'Failed to accept application' });
	}
});

router.put('/applications/:id/update-referrer', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { id } = req.params;
		const { referrerId } = req.body;

		let validReferrerId = null;

		if (referrerId) {
			const [referrer] = await pool.query(
				'SELECT id FROM users WHERE id = ? AND role = ? AND state = ? AND is_verified = ?',
				[referrerId, 'affiliate', 'accepted', 1]
			);

			if ((referrer as any[]).length > 0) {
				validReferrerId = referrerId;
			}
		}

		await pool.query(
			'UPDATE users SET referrer = ? WHERE id = ?',
			[validReferrerId, id]
		);

		res.json({ success: true, message: 'Referrer updated successfully' });
	} catch (error) {
		console.error('Update referrer error:', error);
		res.status(500).json({ error: 'Failed to update referrer' });
	}
});

router.put('/applications/:id/update-manager', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { id } = req.params;
		const { managerId } = req.body;

		let validManagerId = null;

		if (managerId) {
			const [manager] = await pool.query(
				'SELECT id FROM users WHERE id = ? AND role = ? AND state = ? AND is_verified = ?',
				[managerId, 'manager', 'accepted', 1]
			);

			if ((manager as any[]).length > 0) {
				validManagerId = managerId;
			}
		}

		const [currentUser] = await pool.query(
			'SELECT manager, role FROM users WHERE id = ?',
			[id]
		) as any[];

		await pool.query(
			'UPDATE users SET manager = ? WHERE id = ?',
			[validManagerId, id]
		);

		if (validManagerId && currentUser.length > 0 && currentUser[0].role === 'affiliate') {
			await pool.query(
				'INSERT INTO manager_affiliate_assignments (manager_id, affiliate_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP',
				[validManagerId, id]
			);
		} else if (!validManagerId && currentUser.length > 0 && currentUser[0].manager) {
			await pool.query(
				'DELETE FROM manager_affiliate_assignments WHERE manager_id = ? AND affiliate_id = ?',
				[currentUser[0].manager, id]
			);
		}

		res.json({ success: true, message: 'Manager updated successfully' });
	} catch (error) {
		console.error('Update manager error:', error);
		res.status(500).json({ error: 'Failed to update manager' });
	}
});

router.get('/dashboard-stats', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { startDate, endDate } = req.query;

		const stats = await calculateAdminStats(
			adminId,
			startDate as string | undefined,
			endDate as string | undefined
		);
		res.json(stats);
	} catch (error) {
		console.error('Error fetching admin dashboard stats:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/users/:userId/ftds', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { userId } = req.params;

		const [ftds] = await pool.query(
			`SELECT id, ftd_user_id, registration_date, tracking_code, afp, note
			FROM ftd_assignments
			WHERE assigned_user_id = ?
			ORDER BY registration_date DESC`,
			[userId]
		);

		res.json(ftds);
	} catch (error) {
		console.error('Error fetching FTDs:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.delete('/users/:userId/ftds/:ftdId', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { userId, ftdId } = req.params;

		const [ftdCheck] = await pool.query(
			`SELECT id FROM ftd_assignments WHERE id = ? AND assigned_user_id = ?`,
			[ftdId, userId]
		) as any[];

		if (ftdCheck.length === 0) {
			return res.status(404).json({ error: 'FTD not found' });
		}

		await pool.query(`DELETE FROM ftd_assignments WHERE id = ?`, [ftdId]);

		res.json({ success: true });
	} catch (error) {
		console.error('Error deleting FTD:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/user/:userId/dashboard-stats', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const userId = parseInt(req.params.userId);

		const [balanceRows] = await pool.query(
			`SELECT
				total_balance,
				paid_balance
			FROM balances WHERE user_id = ?`,
			[userId]
		) as any[];

		const totalBalance = balanceRows[0]?.total_balance || 0;
		const paidBalance = balanceRows[0]?.paid_balance || 0;
		const balance = totalBalance - paidBalance;
		const pendingBalance = 0;

		const [ftdRows] = await pool.query(
			`SELECT COUNT(*) as ftd_count FROM ftd_assignments WHERE assigned_user_id = ?`,
			[userId]
		) as any[];

		const ftdCount = ftdRows[0]?.ftd_count || 0;

		const totalClicks = 0;
		const conversionRate = '0%';

		const currentMonth = new Date().toISOString().slice(0, 7);
		const [monthlyFtdRows] = await pool.query(
			`SELECT COUNT(*) as monthly_ftds
			FROM ftd_assignments
			WHERE assigned_user_id = ? AND DATE_FORMAT(registration_date, '%Y-%m') = ?`,
			[userId, currentMonth]
		) as any[];

		const monthlyFtds = monthlyFtdRows[0]?.monthly_ftds || 0;

		const [dealRows] = await pool.query(
			`SELECT cpa_amount FROM affiliate_deals WHERE user_id = ?`,
			[userId]
		) as any[];

		const cpaAmount = dealRows[0]?.cpa_amount || 0;
		const monthlyEarnings = monthlyFtds * cpaAmount;

		const canRequestPayment = balance >= 100;

		res.json({
			balance,
			pendingBalance,
			ftdCount,
			conversionRate,
			totalClicks,
			monthlyEarnings,
			canRequestPayment
		});
	} catch (error) {
		console.error('Error fetching user dashboard stats:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/user/:userId/statistics', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const userId = parseInt(req.params.userId);

		const [dealRows] = await pool.query(
			`SELECT cpa_amount FROM affiliate_deals WHERE user_id = ?`,
			[userId]
		) as any[];

		const cpaAmount = dealRows[0]?.cpa_amount || 0;

		const [dailyStats] = await pool.query(
			`SELECT
				DATE(registration_date) as date,
				COUNT(*) as registrations,
				COUNT(*) as ftds,
				(COUNT(*) * ?) as revenue
			FROM ftd_assignments
			WHERE assigned_user_id = ?
			GROUP BY DATE(registration_date)
			ORDER BY date DESC
			LIMIT 30`,
			[cpaAmount, userId]
		) as any[];

		const [monthlyStats] = await pool.query(
			`SELECT
				DATE_FORMAT(registration_date, '%Y-%m') as month,
				COUNT(*) as registrations,
				COUNT(*) as ftds,
				(COUNT(*) * ?) as revenue
			FROM ftd_assignments
			WHERE assigned_user_id = ?
			GROUP BY DATE_FORMAT(registration_date, '%Y-%m')
			ORDER BY month DESC
			LIMIT 12`,
			[cpaAmount, userId]
		) as any[];

		res.json({
			daily: dailyStats,
			monthly: monthlyStats
		});
	} catch (error) {
		console.error('Error fetching user statistics:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/login-logs', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { limit = '100', offset = '0', status, email } = req.query;

		let query = `
			SELECT 
				ll.id,
				ll.user_id,
				ll.email,
				ll.ip_address,
				ll.user_agent,
				ll.login_status,
				ll.failure_reason,
				ll.created_at,
				u.username
			FROM login_logs ll
			LEFT JOIN users u ON ll.user_id = u.id
			WHERE 1=1
		`;

		const params: any[] = [];

		if (status) {
			query += ' AND ll.login_status = ?';
			params.push(status);
		}

		if (email) {
			query += ' AND ll.email LIKE ?';
			params.push(`%${email}%`);
		}

		query += ' ORDER BY ll.created_at DESC LIMIT ? OFFSET ?';
		params.push(parseInt(limit as string), parseInt(offset as string));

		const [logs] = await pool.query(query, params) as any[];

		const [countResult] = await pool.query(
			`SELECT COUNT(*) as total FROM login_logs ll WHERE 1=1${status ? ' AND ll.login_status = ?' : ''}${email ? ' AND ll.email LIKE ?' : ''}`,
			status && email ? [status, `%${email}%`] : status ? [status] : email ? [`%${email}%`] : []
		) as any[];

		res.json({
			logs,
			total: countResult[0]?.total || 0
		});
	} catch (error) {
		console.error('Error fetching login logs:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;