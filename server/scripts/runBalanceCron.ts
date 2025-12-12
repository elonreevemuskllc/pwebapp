import dotenv from 'dotenv';
import { updateAllAffiliateBalances } from '../services/balanceService';

dotenv.config();

async function main() {
	console.log('Starting balance update cron...');
	try {
		await updateAllAffiliateBalances();
		console.log('Balance update completed successfully');
		process.exit(0);
	} catch (error) {
		console.error('Balance update failed:', error);
		process.exit(1);
	}
}

main();
