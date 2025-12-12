import pool from '../db/connection';
import { parseStringPromise } from 'xml2js';
import { fetch, Agent } from 'undici';

const ipv4Agent = new Agent({
	connect: {
		family: 4
	}
});

interface AdminStats {
	totalCpa: number;
	totalExpenses: number;
	totalSalaries: number;
	netProfit: number;
	totalRevenue: number;
	affiliates: AffiliateStats[];
}

interface AffiliateStats {
	userId: number;
	username: string;
	cpa: string | number;
	totalExpenses: number;
	totalSalaries: number;
	profit: number;
	dailyAverage: number;
	revenue: number;
}

async function calculateSubAdminTotals(
	subAdminId: number,
	startDate: string,
	endDate: string,
	connection: any
): Promise<{ totalRevenue: number; totalCpa: number; totalSalaries: number; totalExpenses: number }> {
	const fromDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
	const toDate = endDate || new Date().toISOString().split('T')[0];

	let totalRevenue = 0;
	let totalCpa = 0;
	let totalSalaries = 0;
	let totalExpenses = 0;

	const [shaveRows] = await connection.query(
		`SELECT target_id FROM shaves WHERE user_id = ?`,
		[subAdminId]
	) as any[];

	for (const row of shaveRows) {
		const targetId = row.target_id;

		const [trackingCodesResult] = await connection.query(
			`SELECT code FROM tracking_codes WHERE user_id = ?`,
			[targetId]
		) as any[];

		const trackingCodes = trackingCodesResult.map((r: any) => r.code);

		if (trackingCodes.length > 0) {
			const revenue = await fetchRevenueFromAPI(trackingCodes, fromDate, toDate);
			totalRevenue += revenue;
		}

		const [dealResult] = await connection.query(
			`SELECT cpa_enabled, cpa_amount FROM affiliate_deals WHERE user_id = ?`,
			[targetId]
		) as any[];

		const deal = dealResult[0];

		if (deal && deal.cpa_enabled) {
			let ftdQuery = `SELECT COUNT(*) as ftd_count FROM ftd_assignments WHERE assigned_user_id = ?`;
			const params = [targetId];

			if (startDate && endDate) {
				ftdQuery += ` AND DATE(registration_date) BETWEEN ? AND ?`;
				params.push(startDate, endDate);
			}

			const [ftdCountResult] = await connection.query(ftdQuery, params) as any[];
			const ftdCount = ftdCountResult[0]?.ftd_count || 0;
			const cpaAmount = parseFloat(deal.cpa_amount || 0);
			totalCpa += ftdCount * cpaAmount;
		}

		let salaryQuery = `SELECT COALESCE(SUM(amount), 0) as total_salaries FROM daily_salary_claims WHERE user_id = ? AND status = 'approved'`;
		let expenseQuery = `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expense_reimbursements WHERE user_id = ? AND status = 'accepted'`;

		if (startDate && endDate) {
			salaryQuery += ` AND claim_date BETWEEN ? AND ?`;
			expenseQuery += ` AND DATE(created_at) BETWEEN ? AND ?`;
		}

		const [salaryResult] = await connection.query(
			salaryQuery,
			startDate && endDate ? [targetId, startDate, endDate] : [targetId]
		) as any[];

		const [expenseResult] = await connection.query(
			expenseQuery,
			startDate && endDate ? [targetId, startDate, endDate] : [targetId]
		) as any[];

	totalSalaries += parseFloat(salaryResult[0]?.total_salaries || 0);
	totalExpenses += parseFloat(expenseResult[0]?.total_expenses || 0);
	}

	// Include CPA earnings in total revenue
	return { totalRevenue: totalRevenue + totalCpa, totalCpa, totalSalaries, totalExpenses };
}

export async function calculateAdminStats(
	adminId: number,
	startDate?: string,
	endDate?: string
): Promise<AdminStats> {
	const connection = await pool.getConnection();

	try {
		const fromDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const toDate = endDate || new Date().toISOString().split('T')[0];

		console.log(`[ADMIN STATS] ===== Starting Admin Stats Calculation for Admin ${adminId} =====`);
		console.log(`[ADMIN STATS] Date range: ${startDate} to ${endDate}`);

		const [shaveRows] = await connection.query(
			`SELECT
				s.id,
				s.target_id,
				s.commission_type,
				s.value as shave_value,
				s.intermediary_id,
				u_target.username as target_username
			FROM shaves s
			JOIN users u_target ON s.target_id = u_target.id
			WHERE s.user_id = ?`,
			[adminId]
		) as any[];

		let totalCpa = 0;
		let totalExpenses = 0;
		let totalSalaries = 0;
		let totalRevenue = 0;
		const affiliates: AffiliateStats[] = [];

		let dateFilter = '';
		const dateParams = [];

		if (startDate && endDate) {
			dateFilter = ' AND DATE(registration_date) BETWEEN ? AND ?';
			dateParams.push(startDate, endDate);
		}

		const [parentShaveResult] = await connection.query(
			`SELECT value FROM shaves WHERE target_id = ? ORDER BY id DESC LIMIT 1`,
			[adminId]
		) as any[];

		const parentShavePercentage = parentShaveResult[0]?.value || 0;
		const adminOwnPercentage = parentShavePercentage > 0 ? (100 - parentShavePercentage) : 100;

		console.log(`[ADMIN STATS] Admin has a parent with shave: ${parentShavePercentage}%`);
		console.log(`[ADMIN STATS] Admin's own percentage: ${adminOwnPercentage}%`);

		for (const shave of shaveRows) {
			const targetId = shave.target_id;
			const shaveValue = parseFloat(shave.shave_value);

			console.log(`\n[ADMIN STATS] ===== Processing ${shave.target_username} (ID: ${targetId}) =====`);

			const [targetUserResult] = await connection.query(
				`SELECT role FROM users WHERE id = ?`,
				[targetId]
			) as any[];

			const targetRole = targetUserResult[0]?.role || 'affiliate';

			let affiliateRevenue = 0;
			let affilCpa = 0;
			let adminExpenseShare = 0;
			let adminSalaryShare = 0;
			let cpaDisplay: string | number = 'Non actif';

			if (targetRole === 'admin') {
				console.log(`[ADMIN STATS] Target is ADMIN - calculating totals from sub-admin's affiliates`);

				const subAdminTotals = await calculateSubAdminTotals(targetId, fromDate, toDate, connection);

				console.log(`[ADMIN STATS] Sub-admin totals (100%):`, subAdminTotals);

				affiliateRevenue = (subAdminTotals.totalRevenue * shaveValue) / 100;
				affilCpa = (subAdminTotals.totalCpa * shaveValue) / 100;
				adminSalaryShare = (subAdminTotals.totalSalaries * shaveValue) / 100;
				adminExpenseShare = (subAdminTotals.totalExpenses * shaveValue) / 100;

				cpaDisplay = affilCpa;

				console.log(`[ADMIN STATS] Admin's share (${shaveValue}%):`);
				console.log(`  - Revenue: ${affiliateRevenue}`);
				console.log(`  - CPA: ${affilCpa}`);
				console.log(`  - Salaries: ${adminSalaryShare}`);
				console.log(`  - Expenses: ${adminExpenseShare}`);
			} else {
				console.log(`[ADMIN STATS] Target is AFFILIATE`);

				const [trackingCodesResult] = await connection.query(
					`SELECT code FROM tracking_codes WHERE user_id = ?`,
					[targetId]
				) as any[];

				const trackingCodes = trackingCodesResult.map((row: any) => row.code);

				if (trackingCodes.length > 0) {
					affiliateRevenue = await fetchRevenueFromAPI(trackingCodes, fromDate, toDate);
				}

				const [dealResult] = await connection.query(
					`SELECT cpa_enabled, cpa_amount FROM affiliate_deals WHERE user_id = ?`,
					[targetId]
				) as any[];

				const deal = dealResult[0];

				if (deal && deal.cpa_enabled) {
					const ftdQuery = `SELECT COUNT(*) as ftd_count FROM ftd_assignments WHERE assigned_user_id = ?${dateFilter}`;
					const [ftdCountResult] = await connection.query(
						ftdQuery,
						[targetId, ...dateParams]
					) as any[];

					const ftdCount = ftdCountResult[0]?.ftd_count || 0;
					const cpaAmount = parseFloat(deal.cpa_amount || 0);
					affilCpa = ftdCount * cpaAmount;
					cpaDisplay = affilCpa;
				}

				let expenseQuery = `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expense_reimbursements WHERE user_id = ? AND status = 'accepted'`;
				let salaryQuery = `SELECT COALESCE(SUM(amount), 0) as total_salaries FROM daily_salary_claims WHERE user_id = ? AND status = 'approved'`;

				if (startDate && endDate) {
					expenseQuery += ` AND DATE(created_at) BETWEEN ? AND ?`;
					salaryQuery += ` AND claim_date BETWEEN ? AND ?`;
				}

				const [expenseResult] = await connection.query(
					expenseQuery,
					startDate && endDate ? [targetId, startDate, endDate] : [targetId]
				) as any[];

				const [salaryResult] = await connection.query(
					salaryQuery,
					startDate && endDate ? [targetId, startDate, endDate] : [targetId]
				) as any[];

				adminExpenseShare = parseFloat(expenseResult[0]?.total_expenses || 0);
				adminSalaryShare = parseFloat(salaryResult[0]?.total_salaries || 0);

				console.log(`[ADMIN STATS] Affiliate totals: Revenue=${affiliateRevenue}, CPA=${affilCpa}, Salaries=${adminSalaryShare}, Expenses=${adminExpenseShare}`);
			}

			let adjustedRevenue = affiliateRevenue;
			let adjustedCpa = affilCpa;
			let adjustedSalaryShare = adminSalaryShare;
			let adjustedExpenseShare = adminExpenseShare;

			if (targetRole === 'admin') {
				console.log(`[ADMIN STATS] Target is admin - NO adjustment (shave already calculated on total)`);
			} else {
				adjustedRevenue = (affiliateRevenue * adminOwnPercentage) / 100;
				adjustedCpa = (affilCpa * adminOwnPercentage) / 100;
				adjustedSalaryShare = (adminSalaryShare * adminOwnPercentage) / 100;
				adjustedExpenseShare = (adminExpenseShare * adminOwnPercentage) / 100;

				console.log(`[ADMIN STATS] Target is affiliate - Adjusted (${adminOwnPercentage}%):`);
				console.log(`  - Revenue: ${adjustedRevenue}`);
				console.log(`  - CPA: ${adjustedCpa}`);
				console.log(`  - Salaries: ${adjustedSalaryShare}`);
				console.log(`  - Expenses: ${adjustedExpenseShare}`);
			}

			// Include CPA earnings in total revenue
			totalRevenue += adjustedRevenue + adjustedCpa;
			totalCpa += adjustedCpa;
			totalExpenses += adjustedExpenseShare;
			totalSalaries += adjustedSalaryShare;

			// Profit = Total Revenue (including CPA) - Expenses - Salaries
			const profit = (adjustedRevenue + adjustedCpa) - adjustedExpenseShare - adjustedSalaryShare;

			let days = 1;
			if (startDate && endDate) {
				const start = new Date(startDate);
				const end = new Date(endDate);
				days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
			}

			const dailyAverage = profit / days;

			affiliates.push({
				userId: targetId,
				username: shave.target_username,
				cpa: cpaDisplay,
				totalExpenses: adjustedExpenseShare,
				totalSalaries: adjustedSalaryShare,
				profit: profit,
				dailyAverage: dailyAverage,
				revenue: adjustedRevenue + adjustedCpa  // Include CPA in revenue
			});

			console.log(`[ADMIN STATS] Running totals: Revenue=${totalRevenue}, CPA=${totalCpa}, Salaries=${totalSalaries}, Expenses=${totalExpenses}`);
		}

		const netProfit = totalRevenue - totalCpa - totalExpenses - totalSalaries;

		console.log(`\n[ADMIN STATS] ===== FINAL TOTALS =====`);
		console.log(`[ADMIN STATS] Total Revenue: ${totalRevenue}`);
		console.log(`[ADMIN STATS] Total CPA: ${totalCpa}`);
		console.log(`[ADMIN STATS] Total Salaries: ${totalSalaries}`);
		console.log(`[ADMIN STATS] Total Expenses: ${totalExpenses}`);
		console.log(`[ADMIN STATS] Net Profit: ${netProfit}`);

		return {
			totalCpa,
			totalExpenses,
			totalSalaries,
			netProfit,
			totalRevenue,
			affiliates
		};
	} finally {
		connection.release();
	}
}

async function fetchRevenueFromAPI(trackingCodes: string[], fromDate: string, toDate: string): Promise<number> {
	try {
		const apiUrl = `${process.env.AFFILIATE_API_URL}?command=commissions&fromdate=${fromDate}&todate=${toDate}`;

		console.log(`[API] Fetching revenue from MyStake API: ${apiUrl}`);
		console.log(`[API] Tracking codes: ${trackingCodes.join(', ')}`);
		console.log(`[API] Date range: ${fromDate} to ${toDate}`);

		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'affiliateid': process.env.AFFILIATE_ID || '',
				'x-api-key': process.env.AFFILIATE_API_KEY || ''
			},
			dispatcher: ipv4Agent
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`[API] Request failed: ${response.status} ${response.statusText}`);
			console.error(`[API] Error response: ${errorText}`);
			return 0;
		}

		const text = await response.text();

		if (!text || text.trim() === '') {
			console.log(`[API] Empty response - no commissions for this period`);
			return 0;
		}

		const xmlData = await parseStringPromise(text, { explicitArray: false });
		const commissions = xmlData?.ResultSet?.Commission || [];
		const commissionsArray = Array.isArray(commissions) ? commissions : [commissions];

		console.log(`[API] Found ${commissionsArray.length} total commissions`);

		let totalRevenue = 0;
		let matchedCommissions = 0;

		for (const commission of commissionsArray) {
			const trackingCode = commission.TrackingCode || '';

			if (trackingCodes.includes(trackingCode)) {
				const amount = parseFloat(commission.Commission || 0);
				totalRevenue += amount;
				matchedCommissions++;
			}
		}

		console.log(`[API] Matched ${matchedCommissions} commissions for tracking codes`);
		console.log(`[API] Total revenue: ${totalRevenue}€`);

		return totalRevenue;
	} catch (error) {
		console.error('[API] Error fetching revenue from API:', error);
		return 0;
	}
}
