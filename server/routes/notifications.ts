import express from 'express';
import pool from '../db/connection';
import { getUnreadNotifications, markNotificationAsRead } from '../services/notificationService';

const router = express.Router();

// Activer les notifications pour un utilisateur
router.post('/enable', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;

		if (!sessionId) {
			return res.status(401).json({ error: 'Non authentifié' });
		}

		const [sessions] = await pool.query(
			'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
			[sessionId]
		);

		if ((sessions as any[]).length === 0) {
			return res.status(401).json({ error: 'Session invalide' });
		}

		const userId = (sessions as any[])[0].user_id;

		// Mettre à jour la préférence de notifications
		await pool.query(
			'UPDATE users SET notifications_enabled = 1 WHERE id = ?',
			[userId]
		);

		res.json({ success: true, message: 'Notifications activées' });
	} catch (error) {
		console.error('Erreur activation notifications:', error);
		res.status(500).json({ error: 'Erreur serveur' });
	}
});

// Désactiver les notifications
router.post('/disable', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;

		if (!sessionId) {
			return res.status(401).json({ error: 'Non authentifié' });
		}

		const [sessions] = await pool.query(
			'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
			[sessionId]
		);

		if ((sessions as any[]).length === 0) {
			return res.status(401).json({ error: 'Session invalide' });
		}

		const userId = (sessions as any[])[0].user_id;

		await pool.query(
			'UPDATE users SET notifications_enabled = 0 WHERE id = ?',
			[userId]
		);

		res.json({ success: true, message: 'Notifications désactivées' });
	} catch (error) {
		console.error('Erreur désactivation notifications:', error);
		res.status(500).json({ error: 'Erreur serveur' });
	}
});

// Récupérer les notifications non lues
router.get('/unread', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;

		if (!sessionId) {
			return res.status(401).json({ error: 'Non authentifié' });
		}

		const [sessions] = await pool.query(
			'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
			[sessionId]
		);

		if ((sessions as any[]).length === 0) {
			return res.status(401).json({ error: 'Session invalide' });
		}

		const userId = (sessions as any[])[0].user_id;
		const notifications = await getUnreadNotifications(userId);

		res.json({ notifications });
	} catch (error) {
		console.error('Erreur récupération notifications:', error);
		res.status(500).json({ error: 'Erreur serveur' });
	}
});

// Marquer une notification comme lue
router.post('/read/:id', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;

		if (!sessionId) {
			return res.status(401).json({ error: 'Non authentifié' });
		}

		const [sessions] = await pool.query(
			'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
			[sessionId]
		);

		if ((sessions as any[]).length === 0) {
			return res.status(401).json({ error: 'Session invalide' });
		}

		const userId = (sessions as any[])[0].user_id;
		const notificationId = parseInt(req.params.id);

		await markNotificationAsRead(notificationId, userId);

		res.json({ success: true });
	} catch (error) {
		console.error('Erreur marquage notification:', error);
		res.status(500).json({ error: 'Erreur serveur' });
	}
});

export default router;

