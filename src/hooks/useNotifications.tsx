import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { buildApiUrl } from '../utils/api';

export function useNotifications() {
	const [permission, setPermission] = useState<NotificationPermission>('default');
	const [isSupported, setIsSupported] = useState(false);

	useEffect(() => {
		const hasNotificationAPI = 'Notification' in window;
		const hasServiceWorker = 'serviceWorker' in navigator;
		const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
		
		if (hasNotificationAPI && hasServiceWorker && isSecureContext) {
			setIsSupported(true);
			setPermission(Notification.permission);
		}
	}, []);

	const requestPermission = async (): Promise<boolean> => {
		if (!isSupported) {
			const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
			if (!isSecureContext) {
				toast.error('Les notifications nécessitent une connexion HTTPS (SSL) pour fonctionner');
			} else {
				toast.error('Les notifications ne sont pas supportées sur ce navigateur');
			}
			return false;
		}

		if (permission === 'granted') {
			toast.success('Les notifications sont déjà activées');
			return true;
		}

		try {
			const result = await Notification.requestPermission();
			setPermission(result);

			if (result === 'granted') {
				toast.success('Notifications activées !');
				await registerServiceWorker();
				return true;
			} else {
				toast.error('Permission refusée pour les notifications');
				return false;
			}
		} catch (error) {
			console.error('Erreur lors de la demande de permission:', error);
			toast.error('Erreur lors de l\'activation des notifications');
			return false;
		}
	};

	const registerServiceWorker = async () => {
		if ('serviceWorker' in navigator) {
			try {
				// Enregistrer que l'utilisateur a activé les notifications
				await api.post('/api/notifications/enable');

				console.log('Notifications activées avec succès');
			} catch (error) {
				console.error('Erreur lors de l\'enregistrement:', error);
			}
		}
	};

	return {
		permission,
		isSupported,
		requestPermission,
		isGranted: permission === 'granted'
	};
}

