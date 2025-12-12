import { useEffect, useCallback } from 'react';
import { useNotifications } from './useNotifications';
import { api } from '../utils/httpClient';

/**
 * Hook pour vérifier périodiquement les nouvelles notifications depuis le serveur
 */
export function useNotificationPolling() {
	const { isGranted } = useNotifications();

	const checkNotifications = useCallback(async () => {
		if (!isGranted) return;

		try {
			const response = await api.get('/api/notifications/unread');

			if (!response.ok) return;

			const data = await response.json();
			const notifications = data.notifications || [];

			// Afficher les nouvelles notifications
			for (const notification of notifications) {
				// Vérifier si la notification a déjà été affichée
				const shownKey = `notification_shown_${notification.id}`;
				if (localStorage.getItem(shownKey)) continue;

				// Afficher la notification
				if ('Notification' in window && Notification.permission === 'granted') {
					const notif = new Notification(notification.title, {
						body: notification.body,
						icon: notification.icon || '/icon-192x192.png',
						tag: `notification-${notification.id}`,
						requireInteraction: false
					});

					// Ouvrir l'URL si fournie
					if (notification.url) {
						notif.onclick = () => {
							window.focus();
							window.location.href = notification.url;
							notif.close();
						};
					}

					// Marquer comme affichée
					localStorage.setItem(shownKey, 'true');

					// Marquer comme lue sur le serveur
					api.post(`/api/notifications/read/${notification.id}`).catch(console.error);

					// Auto-fermer après 5 secondes
					setTimeout(() => notif.close(), 5000);
				}
			}
		} catch (error) {
			console.error('Erreur lors de la vérification des notifications:', error);
		}
	}, [isGranted]);

	useEffect(() => {
		if (!isGranted) return;

		// Vérifier immédiatement
		checkNotifications();

		// Vérifier toutes les 30 secondes
		const interval = setInterval(checkNotifications, 30000);

		return () => clearInterval(interval);
	}, [isGranted, checkNotifications]);
}

