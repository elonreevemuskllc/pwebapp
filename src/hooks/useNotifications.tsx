import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function useNotifications() {
	const [permission, setPermission] = useState<NotificationPermission>('default');
	const [isSupported, setIsSupported] = useState(false);

	useEffect(() => {
		if ('Notification' in window && 'serviceWorker' in navigator) {
			setIsSupported(true);
			setPermission(Notification.permission);
		}
	}, []);

	const requestPermission = async (): Promise<boolean> => {
		if (!isSupported) {
			toast.error('Les notifications ne sont pas supportées sur ce navigateur');
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
				await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/enable`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include'
				});

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

