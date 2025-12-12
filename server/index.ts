import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDatabase } from './db/schema';
import { createDefaultAdmin } from './utils/createDefaultAdmin';
import { startSalaryCron } from './services/salaryService';
import { startFtdCron } from './services/ftdCronService';
import { startBalanceCron } from './services/balanceService';
import { startRewardNotificationService } from './services/rewardNotificationService';
import { startManagerSalaryCron } from './services/managerSalaryService';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import shavesRoutes from './routes/shaves';
import usersRoutes from './routes/users';
import paymentsRoutes from './routes/payments';
import expensesRoutes from './routes/expenses';
import rewardsRoutes from './routes/rewards';
import uploadRoutes from './routes/upload';
import userFilesRoutes from './routes/userFiles';
import salaryClaimsRoutes from './routes/salaryClaims';
import managerRoutes from './routes/manager';
import comptaRoutes from './routes/compta';
import notificationsRoutes from './routes/notifications';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

const allowedOrigins = process.env.VITE_SITE_URL 
	? process.env.VITE_SITE_URL.split(',').map(origin => origin.trim())
	: ['http://localhost:5174'];

app.use(cors({
	origin: allowedOrigins,
	credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static('public/uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', shavesRoutes);
app.use('/api/admin', usersRoutes);
app.use('/api', usersRoutes);
app.use('/api', paymentsRoutes);
app.use('/api', expensesRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', userFilesRoutes);
app.use('/api', salaryClaimsRoutes);
app.use('/api', managerRoutes);
app.use('/api/admin/compta', comptaRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

async function startServer() {
	try {
		await initDatabase();
		await createDefaultAdmin();
		startSalaryCron();
		startFtdCron();
		startBalanceCron();
		startRewardNotificationService();
		startManagerSalaryCron();

		// Middleware de gestion d'erreurs global (doit être après toutes les routes)
		app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
			console.error('Error:', err);
			
			// S'assurer que la réponse est toujours du JSON valide
			if (!res.headersSent) {
				res.status(err.status || 500).json({
					error: err.message || 'Erreur serveur',
					...(process.env.NODE_ENV === 'development' && { stack: err.stack })
				});
			}
		});

		app.listen(PORT, "0.0.0.0", () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

startServer();
