import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface DateOfBirthModalProps {
	onComplete: () => void;
}

export default function DateOfBirthModal({ onComplete }: DateOfBirthModalProps) {
	const [dateOfBirth, setDateOfBirth] = useState('');
	const [loading, setLoading] = useState(false);
	const { t } = useTranslation();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!dateOfBirth) {
			toast.error(t('dateOfBirthModal.pleaseEnterDob'));
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/update-date-of-birth`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ dateOfBirth })
			});

			if (!response.ok) {
				throw new Error(t('dateOfBirthModal.failedToUpdate'));
			}

			toast.success(t('dateOfBirthModal.dobSaved'));
			onComplete();
		} catch (error) {
			toast.error(t('dateOfBirthModal.errorSaving'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
			>
				<div className="text-center mb-6">
					<div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
						<Calendar className="w-8 h-8 text-primary" />
					</div>
					<h2 className="text-2xl font-bold text-foreground mb-2">
						{t('dateOfBirthModal.title')}
					</h2>
					<p className="text-muted-foreground">
						{t('dateOfBirthModal.subtitle')}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground mb-2">
							{t('dateOfBirthModal.dobLabel')} <span className="text-red-500">*</span>
						</label>
						<input
							type="date"
							id="dateOfBirth"
							value={dateOfBirth}
							onChange={(e) => setDateOfBirth(e.target.value)}
							max={new Date().toISOString().split('T')[0]}
							required
							className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
						/>
					</div>

					<div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
						<p className="text-sm text-orange-800 font-medium">
							{t('dateOfBirthModal.warning')}
						</p>
					</div>

					<motion.button
						type="submit"
						disabled={loading}
						whileHover={{ scale: loading ? 1 : 1.02 }}
						whileTap={{ scale: loading ? 1 : 0.98 }}
						className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
					>
						{loading ? t('dateOfBirthModal.saving') : t('dateOfBirthModal.validate')}
					</motion.button>
				</form>
			</motion.div>
		</div>
	);
}
