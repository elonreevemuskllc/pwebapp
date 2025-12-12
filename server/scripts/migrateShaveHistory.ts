import pool from '../db/connection';

async function migrateExistingShavesToHistory() {
	const connection = await pool.getConnection();

	try {
		console.log('Starting shave history migration...');

		await connection.beginTransaction();

		const [existingShaves] = await connection.query(
			`SELECT user_id, target_id, commission_type, value FROM shaves`
		) as any[];

		for (const shave of existingShaves) {
			const [existingHistory] = await connection.query(
				`SELECT id FROM shave_history WHERE user_id = ? AND target_id = ? AND end_date IS NULL`,
				[shave.user_id, shave.target_id]
			) as any[];

			if (existingHistory.length === 0) {
				await connection.query(
					`INSERT INTO shave_history (user_id, target_id, commission_type, value, start_date)
					VALUES (?, ?, ?, ?, '2020-01-01')`,
					[shave.user_id, shave.target_id, shave.commission_type, shave.value]
				);
				console.log(`Migrated shave: user_id=${shave.user_id}, target_id=${shave.target_id}`);
			}
		}

		await connection.commit();
		console.log('Shave history migration completed successfully!');
	} catch (error) {
		await connection.rollback();
		console.error('Error during migration:', error);
		throw error;
	} finally {
		connection.release();
		await pool.end();
	}
}

migrateExistingShavesToHistory();
