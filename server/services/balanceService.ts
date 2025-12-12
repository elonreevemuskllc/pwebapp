import pool from '../db/connection';

export async function updateUserBalance(userId: number): Promise<void> {
	const connection = await pool.getConnection();

	try {
		const [dealRows] = await connection.query(
			`SELECT cpa_enabled, cpa_amount, revshare_enabled, revshare_percentage
			FROM affiliate_deals
			WHERE user_id = ?`,
			[userId]
		) as any[];

		const deal = dealRows[0] || {
			cpa_enabled: 0,
			cpa_amount: 0,
			revshare_enabled: 0,
			revshare_percentage: 0
		};

		let cpaEarnings = 0;
		if (deal.cpa_enabled) {
			const [ftdRows] = await connection.query(
				`SELECT COUNT(*) as count
				FROM ftd_assignments
				WHERE assigned_user_id = ?`,
				[userId]
			) as any[];

			const ftdCount = ftdRows[0]?.count || 0;
			cpaEarnings = ftdCount * parseFloat(deal.cpa_amount);
		}

		let revshareEarnings = 0;
		if (deal.revshare_enabled) {
			const [ftdList] = await connection.query(
				`SELECT ftd_user_id FROM ftd_assignments WHERE assigned_user_id = ?`,
				[userId]
			) as any[];

			if (ftdList.length > 0) {
				const traderIds = ftdList.map((row: any) => row.ftd_user_id);
				const placeholders = traderIds.map(() => '?').join(',');

				const [revshareRows] = await connection.query(
					`SELECT SUM(revshare) as total FROM daily_revshare WHERE trader_id IN (${placeholders})`,
					traderIds
				) as any[];

				const totalRevshare = parseFloat(revshareRows[0]?.total || 0);
				const calculatedRevshare = totalRevshare * (parseFloat(deal.revshare_percentage) / 100);
				revshareEarnings = Math.max(0, calculatedRevshare);
			}
		}

		// Salary earnings come only from approved claims, already added directly to balance
		const [approvedClaims] = await connection.query(
			`SELECT user_id FROM daily_salary_claims WHERE user_id = ? AND status = 'approved' LIMIT 1`,
			[userId]
		) as any[];

		// Salary_earnings is already updated when claims are approved, we just read it from balances
		const [currentBalance] = await connection.query(
			'SELECT salary_earnings FROM balances WHERE user_id = ?',
			[userId]
		) as any[];

		const salaryEarnings = currentBalance.length > 0 ? parseFloat(currentBalance[0].salary_earnings || 0) : 0;

		// Calculate referral earnings from referred affiliates
		let referralEarnings = 0;
		const [referredUsers] = await connection.query(
			`SELECT u.id, s.commission_type, s.value, b.cpa_earnings, b.revshare_earnings
			FROM users u
			LEFT JOIN shaves s ON s.user_id = ? AND s.target_id = u.id
			LEFT JOIN balances b ON b.user_id = u.id
			WHERE u.referrer = ?`,
			[userId, userId]
		) as any[];

		for (const referred of referredUsers) {
			if (referred.commission_type === 'percentage') {
				// Shave percentage: take a percentage of referred user's earnings
				const referredTotal = (parseFloat(referred.cpa_earnings) || 0) + (parseFloat(referred.revshare_earnings) || 0);
				referralEarnings += referredTotal * (parseFloat(referred.value) / 100);
			} else if (referred.commission_type === 'fixed_per_ftd') {
				// Fixed per FTD: count FTDs of referred user and multiply by fixed amount
				const [ftdCountRows] = await connection.query(
					`SELECT COUNT(*) as count FROM ftd_assignments WHERE assigned_user_id = ?`,
					[referred.id]
				) as any[];
				const ftdCount = ftdCountRows[0]?.count || 0;
				referralEarnings += ftdCount * parseFloat(referred.value);
			}
		}

		const totalBalance = cpaEarnings + revshareEarnings + salaryEarnings + referralEarnings;

		await connection.query(
			`INSERT INTO balances (user_id, total_balance, paid_balance, cpa_earnings, revshare_earnings, salary_earnings, referral_earnings)
			VALUES (?, ?, 0, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				total_balance = ?,
				cpa_earnings = ?,
				revshare_earnings = ?,
				salary_earnings = ?,
				referral_earnings = ?,
				last_updated = CURRENT_TIMESTAMP`,
			[userId, totalBalance, cpaEarnings, revshareEarnings, salaryEarnings, referralEarnings, totalBalance, cpaEarnings, revshareEarnings, salaryEarnings, referralEarnings]
		);
	} catch (error) {
		console.error(`Error updating balance for user ${userId}:`, error);
		throw error;
	} finally {
		connection.release();
	}
}

export async function updateAllAffiliateBalances(): Promise<void> {
	const connection = await pool.getConnection();

	try {
		const [affiliates] = await connection.query(
			`SELECT id FROM users WHERE role = 'affiliate' AND state = 'accepted'`
		) as any[];

		console.log(`💰 Updating balances for ${affiliates.length} affiliates...`);

		for (const affiliate of affiliates) {
			try {
				await updateUserBalance(affiliate.id);
			} catch (error) {
				console.error(`Failed to update balance for user ${affiliate.id}:`, error);
			}
		}

		const [managers] = await connection.query(
			`SELECT id FROM users WHERE role = 'manager' AND state = 'accepted'`
		) as any[];

		console.log(`💼 Updating balances for ${managers.length} managers...`);

		for (const manager of managers) {
			try {
				await connection.query(
					`INSERT INTO balances (user_id, total_balance)
					VALUES (?, 0)
					ON DUPLICATE KEY UPDATE
						total_balance = (COALESCE(manager_ftd_earnings, 0) + COALESCE(manager_salary_earnings, 0))`,
					[manager.id]
				);
			} catch (error) {
				console.error(`Failed to update balance for manager ${manager.id}:`, error);
			}
		}

		console.log('✅ All affiliate and manager balances updated successfully');
	} catch (error) {
		console.error('Error updating all affiliate balances:', error);
		throw error;
	} finally {
		connection.release();
	}
}

let balanceCronInterval: NodeJS.Timeout | null = null;

export function startBalanceCron() {
	if (balanceCronInterval) {
		console.log('⚠️  Balance Cron is already running');
		return;
	}

	console.log('🚀 Starting Balance Cron Service (runs every 5 minutes)');

	updateAllAffiliateBalances();

	balanceCronInterval = setInterval(() => {
		updateAllAffiliateBalances();
	}, 5 * 60 * 1000);
}

export function stopBalanceCron() {
	if (balanceCronInterval) {
		clearInterval(balanceCronInterval);
		balanceCronInterval = null;
		console.log('🛑 Balance Cron Service stopped');
	}
}