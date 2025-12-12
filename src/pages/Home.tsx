import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export default function Home() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading) {
			if (!user) {
				// Non connecté → redirection vers Register
				navigate('/register');
			} else {
				// Connecté → redirection vers le dashboard approprié
				switch (user.accountType) {
					case 'admin':
						navigate('/admin/dashboard');
						break;
					case 'affiliate':
						navigate('/affiliate/dashboard');
						break;
					case 'manager':
						navigate('/manager/payments');
						break;
					default:
						navigate('/login');
				}
			}
		}
	}, [user, loading, navigate]);

	// Afficher un loader pendant la vérification
	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<motion.div
				className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
				animate={{ rotate: 360 }}
				transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
			/>
		</div>
	);
}
