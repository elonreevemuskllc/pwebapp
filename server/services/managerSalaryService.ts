import pool from '../db/connection';

export async function addDailyManagerCommissions(): Promise<void> {
	const connection = await pool.getConnection();

	try {
		const [managers] = await connection.query(
			`SELECT id, salary FROM users WHERE role = 'manager' AND salary IS NOT NULL AND salary > 0 AND state = 'accepted'`
		) as any[];

		console.log(`💼 Processing daily fixed commissions for ${managers.length} managers...`);

		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		for (const manager of managers) {
			const monthlySalary = parseFloat(manager.salary);
			const dailyProrata = monthlySalary / daysInMonth;

			const todayStr = today.toISOString().split('T')[0];

			const [existingPayment] = await connection.query(
				`SELECT id FROM daily_salary_payments WHERE user_id = ? AND payment_date = ?`,
				[manager.id, todayStr]
			) as any[];

			if (existingPayment.length === 0) {
				await connection.query(
					`INSERT INTO daily_salary_payments (user_id, payment_date, amount, total_monthly_salary, days_in_month)
					VALUES (?, ?, ?, ?, ?)`,
					[manager.id, todayStr, dailyProrata, monthlySalary, daysInMonth]
				);

				await connection.query(
					`INSERT INTO balances (user_id, manager_salary_earnings, total_balance)
					VALUES (?, ?, ?)
					ON DUPLICATE KEY UPDATE
						manager_salary_earnings = manager_salary_earnings + ?,
						total_balance = total_balance + ?`,
					[manager.id, dailyProrata, dailyProrata, dailyProrata, dailyProrata]
				);

				console.log(`✅ Added ${dailyProrata.toFixed(2)}€ to manager ${manager.id} (${monthlySalary}€/month over ${daysInMonth} days)`);
			} else {
				console.log(`ℹ️  Manager ${manager.id} already received commission for ${todayStr}`);
			}
		}

		console.log('✅ All manager daily fixed commissions processed successfully');
	} catch (error) {
		console.error('Error adding daily manager commissions:', error);
		throw error;
	} finally {
		connection.release();
	}
}

let managerSalaryCronInterval: NodeJS.Timeout | null = null;

export function startManagerSalaryCron() {
	if (managerSalaryCronInterval) {
		console.log('⚠️  Manager Salary Cron is already running');
		return;
	}

	console.log('🚀 Starting Manager Salary Cron Service (runs daily at midnight)');

	addDailyManagerCommissions();

	const now = new Date();
	const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
	const msUntilMidnight = tomorrow.getTime() - now.getTime();

	setTimeout(() => {
		addDailyManagerCommissions();

		managerSalaryCronInterval = setInterval(() => {
			addDailyManagerCommissions();
		}, 24 * 60 * 60 * 1000);
	}, msUntilMidnight);
}

export function stopManagerSalaryCron() {
	if (managerSalaryCronInterval) {
		clearInterval(managerSalaryCronInterval);
		managerSalaryCronInterval = null;
		console.log('🛑 Manager Salary Cron Service stopped');
	}
}
