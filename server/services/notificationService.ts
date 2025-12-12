import pool from '../db/connection';

export interface NotificationData {
	userId: number;
	title: string;
	body: string;
	icon?: string;
	url?: string;
	type?: 'payment' | 'reward' | 'update' | 'salary' | 'general';
}

/**
 * Envoie une notification à un utilisateur
 * Stocke la notification en base pour qu'elle soit récupérée par le client
 */
export async function sendNotification(data: NotificationData): Promise<boolean> {
	try {
		const connection = await pool.getConnection();

		// Vérifier que l'utilisateur a activé les notifications
		const [users] = await connection.query<any[]>(
			'SELECT notifications_enabled FROM users WHERE id = ?',
			[data.userId]
		);

		if (users.length === 0 || !users[0].notifications_enabled) {
			connection.release();
			return false; // Utilisateur n'a pas activé les notifications
		}

		// Créer la table de notifications si elle n'existe pas
		await connection.query(`
			CREATE TABLE IF NOT EXISTS user_notifications (
				id INT AUTO_INCREMENT PRIMARY KEY,
				user_id INT NOT NULL,
				title VARCHAR(255) NOT NULL,
				body TEXT NOT NULL,
				icon VARCHAR(500),
				url VARCHAR(500),
				type VARCHAR(50),
				read_status TINYINT(1) DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
				INDEX idx_user_read (user_id, read_status),
				INDEX idx_created_at (created_at)
			)
		`);

		// Insérer la notification
		await connection.query(
			`INSERT INTO user_notifications (user_id, title, body, icon, url, type)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[
				data.userId,
				data.title,
				data.body,
				data.icon || '/icon-192x192.png',
				data.url || null,
				data.type || 'general'
			]
		);

		connection.release();
		console.log(`📬 Notification envoyée à l'utilisateur ${data.userId}: ${data.title}`);
		return true;
	} catch (error) {
		console.error('Erreur lors de l\'envoi de notification:', error);
		return false;
	}
}

/**
 * Envoie une notification à plusieurs utilisateurs
 */
export async function sendBulkNotifications(
	userIds: number[],
	title: string,
	body: string,
	options?: { icon?: string; url?: string; type?: string }
): Promise<number> {
	let successCount = 0;
	for (const userId of userIds) {
		const sent = await sendNotification({
			userId,
			title,
			body,
			icon: options?.icon,
			url: options?.url,
			type: options?.type as any
		});
		if (sent) successCount++;
	}
	return successCount;
}

/**
 * Récupère les notifications non lues d'un utilisateur
 */
export async function getUnreadNotifications(userId: number): Promise<any[]> {
	try {
		const connection = await pool.getConnection();
		const [notifications] = await connection.query<any[]>(
			`SELECT id, title, body, icon, url, type, created_at
			 FROM user_notifications
			 WHERE user_id = ? AND read_status = 0
			 ORDER BY created_at DESC
			 LIMIT 50`,
			[userId]
		);
		connection.release();
		return notifications;
	} catch (error) {
		console.error('Erreur lors de la récupération des notifications:', error);
		return [];
	}
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
	try {
		const connection = await pool.getConnection();
		await connection.query(
			'UPDATE user_notifications SET read_status = 1 WHERE id = ? AND user_id = ?',
			[notificationId, userId]
		);
		connection.release();
		return true;
	} catch (error) {
		console.error('Erreur lors du marquage de notification:', error);
		return false;
	}
}

