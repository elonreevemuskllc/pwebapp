import pool from '../db/connection';

interface ShaveHistoryEntry {
	commission_type: string;
	value: number;
	start_date: Date;
	end_date: Date | null;
}

export async function getShavePercentageForDate(userId: number, date: Date): Promise<number> {
	const connection = await pool.getConnection();

	try {
		const dateStr = date.toISOString().split('T')[0];

		const [historyRows] = await connection.query(
			`SELECT commission_type, value, start_date, end_date
			FROM shave_history
			WHERE target_id = ?
			AND commission_type = 'percentage'
			AND start_date <= ?
			AND (end_date IS NULL OR end_date >= ?)
			ORDER BY start_date DESC`,
			[userId, dateStr, dateStr]
		) as any[];

		if (historyRows.length === 0) {
			return 0;
		}

		const totalShave = historyRows.reduce((sum: number, row: any) => {
			return sum + parseFloat(row.value);
		}, 0);

		return totalShave;
	} finally {
		connection.release();
	}
}

export async function applyShaveToStats(userId: number, stats: Array<{ date: string; [key: string]: any }>): Promise<any[]> {
	const result = [];

	for (const stat of stats) {
		const date = new Date(stat.date);
		const shavePercentage = await getShavePercentageForDate(userId, date);
		const visiblePercentage = Math.max(0, 100 - shavePercentage) / 100;

		const shavedStat = { ...stat };
		if (stat.unique_visitors !== undefined) {
			shavedStat.unique_visitors = Math.round(stat.unique_visitors * visiblePercentage);
		}
		if (stat.impressions !== undefined) {
			shavedStat.impressions = Math.round(stat.impressions * visiblePercentage);
		}
		if (stat.clicks !== undefined) {
			shavedStat.clicks = Math.round(stat.clicks * visiblePercentage);
		}

		result.push(shavedStat);
	}

	return result;
}

export async function getCurrentShavePercentage(userId: number): Promise<number> {
	return getShavePercentageForDate(userId, new Date());
}
