import { fetchAndProcessRegistrations } from '../services/ftdCronService';
import { initDatabase } from '../db/schema';

async function main() {
	console.log('🔧 Initializing database...');
	await initDatabase();

	console.log('🚀 Running FTD registration fetch manually...\n');
	await fetchAndProcessRegistrations();

	console.log('\n✅ Manual execution completed');
	process.exit(0);
}

main().catch(error => {
	console.error('❌ Fatal error:', error);
	process.exit(1);
});
