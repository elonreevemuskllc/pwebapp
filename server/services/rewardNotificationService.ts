import pool from '../db/connection';
import { sendRewardMilestoneReached } from './emailService';

interface UserFtdCount {
  user_id: number;
  email: string;
  username: string;
  ftd_count: number;
}

interface Reward {
  id: number;
  name: string;
  ftd_required: number;
}

async function checkRewardMilestones() {
  const connection = await pool.getConnection();

  try {
    const [users] = await connection.query<any[]>(`
      SELECT
        u.id as user_id,
        u.email,
        u.username,
        COUNT(DISTINCT fa.id) as ftd_count
      FROM users u
      LEFT JOIN ftd_assignments fa ON fa.assigned_user_id = u.id
        AND YEAR(fa.registration_date) = YEAR(CURDATE())
        AND MONTH(fa.registration_date) = MONTH(CURDATE())
      WHERE u.role = 'affiliate'
      GROUP BY u.id, u.email, u.username
    `);

    const [rewards] = await connection.query<any[]>(`
      SELECT id, name, ftd_required
      FROM rewards
      ORDER BY ftd_required ASC
    `);

    for (const user of users) {
      const userFtdCount = user.ftd_count || 0;

      for (const reward of rewards) {
        if (userFtdCount === reward.ftd_required) {
          const [existingClaims] = await connection.query<any[]>(
            `SELECT id FROM reward_claims
             WHERE reward_id = ?
             AND user_id = ?
             AND claim_year = YEAR(CURDATE())
             AND claim_month = MONTH(CURDATE())`,
            [reward.id, user.user_id]
          );

          if (existingClaims.length === 0) {
            console.log(
              `🎉 User ${user.username} (${user.user_id}) reached reward milestone: ${reward.name} (${reward.ftd_required} FTD)`
            );

            await sendRewardMilestoneReached(
              user.email,
              user.username,
              reward.name,
              reward.ftd_required
            );

            // Envoyer une notification push
            const { sendNotification } = await import('./notificationService');
            await sendNotification({
              userId: user.user_id,
              title: '🎉 Récompense disponible !',
              body: `Félicitations ! Vous avez atteint ${reward.ftd_required} FTD ce mois-ci. La récompense "${reward.name}" est maintenant disponible.`,
              icon: '/icon-192x192.png',
              url: '/affiliate/rewards',
              type: 'reward'
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking reward milestones:', error);
  } finally {
    connection.release();
  }
}

let notificationInterval: NodeJS.Timeout | null = null;

export function startRewardNotificationService() {
  if (notificationInterval) {
    console.log('⚠️  Reward Notification Service is already running');
    return;
  }

  console.log('🚀 Starting Reward Notification Service (runs every 5 minutes)');

  checkRewardMilestones();

  notificationInterval = setInterval(() => {
    checkRewardMilestones();
  }, 5 * 60 * 1000);
}

export function stopRewardNotificationService() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
    console.log('🛑 Reward Notification Service stopped');
  }
}
