import pool from '../db/connection';

export async function applySalaryChanges() {
	const connection = await pool.getConnection();

	try {
		const today = new Date().toISOString().split('T')[0];

		const [pendingChanges] = await connection.query(
			'SELECT * FROM pending_salary_changes WHERE effective_date <= ?',
			[today]
		) as any[];

		for (const change of pendingChanges) {
			await connection.query(
				'UPDATE users SET salary = ? WHERE id = ?',
				[change.new_salary, change.user_id]
			);

			await connection.query(
				'DELETE FROM pending_salary_changes WHERE id = ?',
				[change.id]
			);

			console.log(`Applied salary change for user ${change.user_id}: ${change.new_salary}`);
		}

		return pendingChanges.length;
	} catch (error) {
		console.error('Error applying salary changes:', error);
		throw error;
	} finally {
		connection.release();
	}
}

function getDaysInMonth(date: Date): number {
	const year = date.getFullYear();
	const month = date.getMonth();
	return new Date(year, month + 1, 0).getDate();
}

export async function processDailySalaryPayments(): Promise<void> {
	console.log('⚠️ Automatic daily salary payments are disabled. Users must submit daily claims.');
}

let lastProcessedDate: string | null = null;

export function startSalaryCron() {
	console.log('🚀 Starting Salary Cron Service');

	const runDailySalaryCheck = async () => {
		const todayStr = new Date().toISOString().split('T')[0];

		if (lastProcessedDate === todayStr) {
			return;
		}

		try {
			await processDailySalaryPayments();
			lastProcessedDate = todayStr;
		} catch (error) {
			console.error('Daily salary payment error:', error);
		}
	};

	const runMonthlySalaryChanges = async () => {
		const now = new Date();
		if (now.getDate() === 1) {
			console.log('📅 Running monthly salary changes check...');
			try {
				const applied = await applySalaryChanges();
				console.log(`Applied ${applied} salary changes`);
			} catch (error) {
				console.error('Monthly salary changes error:', error);
			}
		}
	};

	runDailySalaryCheck();
	runMonthlySalaryChanges();

	setInterval(async () => {
		await runDailySalaryCheck();
		await runMonthlySalaryChanges();
	}, 60 * 60 * 1000);

	console.log('✅ Salary cron job started (checks every hour)');
}
