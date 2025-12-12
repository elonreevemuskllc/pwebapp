import pool from '../db/connection';
import { getShavePercentageForDate } from './shaveHistoryService';

interface AffiliateStatistics {
	totalFtds: number;
	cpaEarnings: number;
	revshareEarnings: number;
	totalEarnings: number;
	cpaEnabled: boolean;
	revshareEnabled: boolean;
	activeTraders: number;
	totalRevshare: number;
	ftdChange: number;
	cpaChange: number;
	revshareChange: number;
	totalChange: number;
	activeTradersChange: number;
	totalRevshareChange: number;
	uniqueVisitors: number;
	referralEarnings: number;
	referralChange: number;
}

interface DailyRevenue {
	date: string;
	cpaEarnings: number;
	revshareEarnings: number;
	totalEarnings: number;
}

type Period = 'today' | 'week' | 'month' | 'all' | 'custom';

function getDateFilter(period: Period, startDate?: string, endDate?: string): string {
	if (period === 'custom' && startDate && endDate) {
		return `DATE(registration_date) >= '${startDate}' AND DATE(registration_date) <= '${endDate}'`;
	}
	switch (period) {
		case 'today':
			return 'DATE(registration_date) = CURDATE()';
		case 'week':
			return 'registration_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
		case 'month':
			return 'registration_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
		case 'all':
		default:
			return '1=1';
	}
}

function getRevshareDateFilter(period: Period, startDate?: string, endDate?: string): string {
	if (period === 'custom' && startDate && endDate) {
		return `DATE(date) >= '${startDate}' AND DATE(date) <= '${endDate}'`;
	}
	switch (period) {
		case 'today':
			return 'DATE(date) = CURDATE()';
		case 'week':
			return 'date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
		case 'month':
			return 'date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
		case 'all':
		default:
			return '1=1';
	}
}

function getPreviousPeriodFilter(period: Period, startDate?: string, endDate?: string): string {
	if (period === 'custom' && startDate && endDate) {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
		const prevEnd = new Date(start);
		prevEnd.setDate(prevEnd.getDate() - 1);
		const prevStart = new Date(prevEnd);
		prevStart.setDate(prevStart.getDate() - diff);
		return `DATE(registration_date) >= '${prevStart.toISOString().split('T')[0]}' AND DATE(registration_date) <= '${prevEnd.toISOString().split('T')[0]}'`;
	}
	switch (period) {
		case 'today':
			return 'DATE(registration_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
		case 'week':
			return 'registration_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND registration_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
		case 'month':
			return 'registration_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND registration_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
		case 'all':
		default:
			return '1=0';
	}
}

function getPreviousRevsharePeriodFilter(period: Period, startDate?: string, endDate?: string): string {
	if (period === 'custom' && startDate && endDate) {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
		const prevEnd = new Date(start);
		prevEnd.setDate(prevEnd.getDate() - 1);
		const prevStart = new Date(prevEnd);
		prevStart.setDate(prevStart.getDate() - diff);
		return `DATE(date) >= '${prevStart.toISOString().split('T')[0]}' AND DATE(date) <= '${prevEnd.toISOString().split('T')[0]}'`;
	}
	switch (period) {
		case 'today':
			return 'DATE(date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
		case 'week':
			return 'date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
		case 'month':
			return 'date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
		case 'all':
		default:
			return '1=0';
	}
}

function calculatePercentageChange(current: number, previous: number): number {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return ((current - previous) / previous) * 100;
}

export async function getAffiliateStatistics(userId: number, period: Period = 'all', startDate?: string, endDate?: string): Promise<AffiliateStatistics> {
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

		const dateFilter = getDateFilter(period, startDate, endDate);
		const previousDateFilter = getPreviousPeriodFilter(period, startDate, endDate);

		const [ftdRows] = await connection.query(
			`SELECT COUNT(*) as count
			FROM ftd_assignments
			WHERE assigned_user_id = ? AND ${dateFilter}`,
			[userId]
		) as any[];

		const totalFtds = ftdRows[0]?.count || 0;

		const [previousFtdRows] = await connection.query(
			`SELECT COUNT(*) as count
			FROM ftd_assignments
			WHERE assigned_user_id = ? AND ${previousDateFilter}`,
			[userId]
		) as any[];

		const previousFtds = previousFtdRows[0]?.count || 0;

		let cpaEarnings = 0;
		let previousCpaEarnings = 0;
		if (deal.cpa_enabled) {
			cpaEarnings = totalFtds * parseFloat(deal.cpa_amount);
			previousCpaEarnings = previousFtds * parseFloat(deal.cpa_amount);
		}

		let revshareEarnings = 0;
		let previousRevshareEarnings = 0;
		if (deal.revshare_enabled) {
			const [ftdList] = await connection.query(
				`SELECT ftd_user_id
				FROM ftd_assignments
				WHERE assigned_user_id = ?`,
				[userId]
			) as any[];

			if (ftdList.length > 0) {
				const traderIds = ftdList.map((row: any) => row.ftd_user_id);
				const placeholders = traderIds.map(() => '?').join(',');
				const revshareFilter = getRevshareDateFilter(period, startDate, endDate);
				const previousRevshareFilter = getPreviousRevsharePeriodFilter(period, startDate, endDate);

				const [revshareRows] = await connection.query(
					`SELECT SUM(revshare) as total
					FROM daily_revshare
					WHERE trader_id IN (${placeholders}) AND ${revshareFilter}`,
					traderIds
				) as any[];

				const [previousRevshareRows] = await connection.query(
					`SELECT SUM(revshare) as total
					FROM daily_revshare
					WHERE trader_id IN (${placeholders}) AND ${previousRevshareFilter}`,
					traderIds
				) as any[];

				const totalRevshare = parseFloat(revshareRows[0]?.total || 0);
				const previousTotalRevshare = parseFloat(previousRevshareRows[0]?.total || 0);
				const percentage = parseFloat(deal.revshare_percentage) / 100;
				revshareEarnings = totalRevshare * percentage;
				previousRevshareEarnings = previousTotalRevshare * percentage;
			}
		}

		// Calculate referral earnings from direct referrals (users with this user as referrer)
		let referralEarnings = 0;
		let previousReferralEarnings = 0;

		// Get all referred users with their shave configuration and deals
		const [referredUsers] = await connection.query(
			`SELECT u.id, s.commission_type, s.value,
			       ad.cpa_enabled, ad.cpa_amount, ad.revshare_enabled, ad.revshare_percentage
			FROM users u
			LEFT JOIN shaves s ON s.user_id = ? AND s.target_id = u.id
			LEFT JOIN affiliate_deals ad ON ad.user_id = u.id
			WHERE u.referrer = ?`,
			[userId, userId]
		) as any[];

		for (const referred of referredUsers) {
			if (!referred.commission_type || !referred.value) continue;

			if (referred.commission_type === 'percentage') {
				// Calculate percentage-based earnings from referred user's CPA and Revshare
				let referredCurrentEarnings = 0;
				let referredPrevEarnings = 0;

				// CPA earnings
				if (referred.cpa_enabled) {
					const [currentFtds] = await connection.query(
						`SELECT COUNT(*) as count FROM ftd_assignments WHERE assigned_user_id = ? AND ${dateFilter}`,
						[referred.id]
					) as any[];
					const [prevFtds] = await connection.query(
						`SELECT COUNT(*) as count FROM ftd_assignments WHERE assigned_user_id = ? AND ${previousDateFilter}`,
						[referred.id]
					) as any[];

					referredCurrentEarnings += (currentFtds[0]?.count || 0) * parseFloat(referred.cpa_amount || 0);
					referredPrevEarnings += (prevFtds[0]?.count || 0) * parseFloat(referred.cpa_amount || 0);
				}

				// Revshare earnings
				if (referred.revshare_enabled) {
					const [ftdList] = await connection.query(
						`SELECT ftd_user_id FROM ftd_assignments WHERE assigned_user_id = ?`,
						[referred.id]
					) as any[];

					if (ftdList.length > 0) {
						const traderIds = ftdList.map((r: any) => r.ftd_user_id);
						const placeholders = traderIds.map(() => '?').join(',');
						const revshareFilter = getRevshareDateFilter(period, startDate, endDate);
						const prevRevshareFilter = getPreviousRevsharePeriodFilter(period, startDate, endDate);

						const [currentRevshare] = await connection.query(
							`SELECT SUM(revshare) as total FROM daily_revshare WHERE trader_id IN (${placeholders}) AND ${revshareFilter}`,
							traderIds
						) as any[];
						const [prevRevshare] = await connection.query(
							`SELECT SUM(revshare) as total FROM daily_revshare WHERE trader_id IN (${placeholders}) AND ${prevRevshareFilter}`,
							traderIds
						) as any[];

						const percentage = parseFloat(referred.revshare_percentage || 0) / 100;
						referredCurrentEarnings += (parseFloat(currentRevshare[0]?.total || 0)) * percentage;
						referredPrevEarnings += (parseFloat(prevRevshare[0]?.total || 0)) * percentage;
					}
				}

				const shavePercentage = parseFloat(referred.value) / 100;
				referralEarnings += referredCurrentEarnings * shavePercentage;
				previousReferralEarnings += referredPrevEarnings * shavePercentage;

			} else if (referred.commission_type === 'fixed_per_ftd') {
				// Fixed commission per FTD
				const [currentFtdCount] = await connection.query(
					`SELECT COUNT(*) as count FROM ftd_assignments WHERE assigned_user_id = ? AND ${dateFilter}`,
					[referred.id]
				) as any[];
				const [prevFtdCount] = await connection.query(
					`SELECT COUNT(*) as count FROM ftd_assignments WHERE assigned_user_id = ? AND ${previousDateFilter}`,
					[referred.id]
				) as any[];

				referralEarnings += (currentFtdCount[0]?.count || 0) * parseFloat(referred.value);
				previousReferralEarnings += (prevFtdCount[0]?.count || 0) * parseFloat(referred.value);
			}
		}

		const totalEarnings = cpaEarnings + Math.max(revshareEarnings, 0) + referralEarnings;
		const previousTotalEarnings = previousCpaEarnings + Math.max(previousRevshareEarnings, 0) + previousReferralEarnings;

		const [activeTraderRows] = await connection.query(
			`SELECT COUNT(DISTINCT ftd_user_id) as traders
			FROM ftd_assignments
			WHERE assigned_user_id = ?`,
			[userId]
		) as any[];

		const activeTraders = activeTraderRows[0]?.traders || 0;

		const [previousActiveTraderRows] = await connection.query(
			`SELECT COUNT(DISTINCT fa.ftd_user_id) as traders
			FROM ftd_assignments fa
			WHERE fa.assigned_user_id = ? AND ${previousDateFilter}`,
			[userId]
		) as any[];

		const previousActiveTraders = previousActiveTraderRows[0]?.traders || 0;

		const [trackingCodesRows] = await connection.query(
			`SELECT code FROM tracking_codes WHERE user_id = ?`,
			[userId]
		) as any[];

		let uniqueVisitors = 0;

		if (trackingCodesRows.length > 0) {
			const trackingCodes = trackingCodesRows.map((row: any) => row.code);
			const placeholders = trackingCodes.map(() => '?').join(',');
			const mediaDateFilter = getRevshareDateFilter(period, startDate, endDate);

			const [visitorRows] = await connection.query(
				`SELECT date, SUM(unique_visitors) as total
				FROM daily_media_stats
				WHERE tracking_code IN (${placeholders}) AND ${mediaDateFilter}
				GROUP BY date`,
				trackingCodes
			) as any[];

			for (const row of visitorRows) {
				const date = new Date(row.date);
				const shavePercentage = await getShavePercentageForDate(userId, date);
				const visiblePercentage = Math.max(0, 100 - shavePercentage) / 100;
				const rawVisitors = row.total || 0;
				uniqueVisitors += Math.round(rawVisitors * visiblePercentage);
			}
		}

		let totalRevshare = 0;
		let previousTotalRevshare = 0;

		if (deal.revshare_enabled) {
			const [ftdList] = await connection.query(
				`SELECT ftd_user_id
				FROM ftd_assignments
				WHERE assigned_user_id = ?`,
				[userId]
			) as any[];

			if (ftdList.length > 0) {
				const traderIds = ftdList.map((row: any) => row.ftd_user_id);
				const placeholders = traderIds.map(() => '?').join(',');
				const revshareFilter = getRevshareDateFilter(period, startDate, endDate);
				const previousRevshareFilter = getPreviousRevsharePeriodFilter(period, startDate, endDate);

				const [currentRevshareRows] = await connection.query(
					`SELECT SUM(revshare) as total
					FROM daily_revshare
					WHERE trader_id IN (${placeholders}) AND ${revshareFilter}`,
					traderIds
				) as any[];

				const [prevRevshareRows] = await connection.query(
					`SELECT SUM(revshare) as total
					FROM daily_revshare
					WHERE trader_id IN (${placeholders}) AND ${previousRevshareFilter}`,
					traderIds
				) as any[];

				totalRevshare = parseFloat(currentRevshareRows[0]?.total || 0);
				previousTotalRevshare = parseFloat(prevRevshareRows[0]?.total || 0);
			}
		}

		return {
			totalFtds,
			cpaEarnings,
			revshareEarnings,
			totalEarnings,
			cpaEnabled: Boolean(deal.cpa_enabled),
			revshareEnabled: Boolean(deal.revshare_enabled),
			activeTraders,
			totalRevshare,
			ftdChange: calculatePercentageChange(totalFtds, previousFtds),
			cpaChange: calculatePercentageChange(cpaEarnings, previousCpaEarnings),
			revshareChange: calculatePercentageChange(revshareEarnings, previousRevshareEarnings),
			totalChange: calculatePercentageChange(totalEarnings, previousTotalEarnings),
			activeTradersChange: calculatePercentageChange(activeTraders, previousActiveTraders),
			totalRevshareChange: calculatePercentageChange(totalRevshare, previousTotalRevshare),
			uniqueVisitors,
			referralEarnings,
			referralChange: calculatePercentageChange(referralEarnings, previousReferralEarnings)
		};
	} finally {
		connection.release();
	}
}

export async function getDailyRevenue(userId: number, days: number = 30): Promise<DailyRevenue[]> {
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

		const dailyData: Map<string, DailyRevenue> = new Map();

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split('T')[0];
			dailyData.set(dateStr, {
				date: dateStr,
				cpaEarnings: 0,
				revshareEarnings: 0,
				totalEarnings: 0
			});
		}

		if (deal.cpa_enabled) {
			const [ftdRows] = await connection.query(
				`SELECT DATE(registration_date) as date, COUNT(*) as count
				FROM ftd_assignments
				WHERE assigned_user_id = ? AND registration_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
				GROUP BY DATE(registration_date)`,
				[userId, days]
			) as any[];

			for (const row of ftdRows) {
				// MySQL DATE() returns YYYY-MM-DD string, use it directly
				const dateStr = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0];
				if (dailyData.has(dateStr)) {
					const cpaAmount = row.count * parseFloat(deal.cpa_amount);
					const existing = dailyData.get(dateStr)!;
					existing.cpaEarnings = cpaAmount;
					existing.totalEarnings += cpaAmount;
				}
			}
		}

		if (deal.revshare_enabled) {
			const [ftdList] = await connection.query(
				`SELECT ftd_user_id
				FROM ftd_assignments
				WHERE assigned_user_id = ?`,
				[userId]
			) as any[];

			if (ftdList.length > 0) {
				const traderIds = ftdList.map((row: any) => row.ftd_user_id);
				const placeholders = traderIds.map(() => '?').join(',');

				const [revshareRows] = await connection.query(
					`SELECT DATE(date) as date, SUM(revshare) as total
					FROM daily_revshare
					WHERE trader_id IN (${placeholders}) AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
					GROUP BY DATE(date)`,
					[...traderIds, days]
				) as any[];

				const percentage = parseFloat(deal.revshare_percentage) / 100;

				for (const row of revshareRows) {
					// MySQL DATE() returns YYYY-MM-DD string, use it directly
					const dateStr = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0];
					if (dailyData.has(dateStr)) {
						const revshareAmount = parseFloat(row.total) * percentage;
						const existing = dailyData.get(dateStr)!;
						existing.revshareEarnings = revshareAmount;
						existing.totalEarnings += revshareAmount;
					}
				}
			}
		}

		return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
	} finally {
		connection.release();
	}
}