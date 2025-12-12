import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationPrompt() {
	const { permission, isSupported, requestPermission, isGranted } = useNotifications();
	const [showPrompt, setShowPrompt] = useState(false);

	useEffect(() => {
		// Afficher le prompt seulement si :
		// - Les notifications sont supportées
		// - La permission n'est pas déjà accordée
		if (isSupported && permission === 'default') {
			// Attendre 3 secondes avant d'afficher
			const timer = setTimeout(() => {
				setShowPrompt(true);
			}, 3000);

			return () => clearTimeout(timer);
		}
	}, [isSupported, permission]);

	const handleEnable = async () => {
		const granted = await requestPermission();
		if (granted) {
			setShowPrompt(false);
			localStorage.setItem('notification-prompt-seen', 'true');
		}
	};

	const handleDismiss = () => {
		setShowPrompt(false);
		localStorage.setItem('notification-prompt-seen', 'true');
	};

	if (!isSupported || isGranted || !showPrompt) {
		return null;
	}

	return (
		<AnimatePresence>
			{showPrompt && (
				<motion.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 100, opacity: 0 }}
					className="fixed bottom-4 right-4 z-50 max-w-sm"
				>
					<div className="bg-card border border-border rounded-xl shadow-2xl p-4 space-y-3">
						<div className="flex items-start justify-between">
							<div className="flex items-start gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<Bell className="w-5 h-5 text-primary" />
								</div>
								<div className="flex-1">
									<h3 className="font-semibold text-foreground mb-1">
										Activer les notifications
									</h3>
									<p className="text-sm text-muted-foreground">
										Recevez des alertes pour vos paiements, récompenses et mises à jour importantes.
									</p>
								</div>
							</div>
							<button
								onClick={handleDismiss}
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<div className="flex gap-2">
							<button
								onClick={handleEnable}
								className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
							>
								Activer
							</button>
							<button
								onClick={handleDismiss}
								className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
							>
								Plus tard
							</button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

