import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CheckCircle2, ArrowRight, Check } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../utils/httpClient';

function getCookie(name: string): string | null {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
	return null;
}

function setCookie(name: string, value: string, days: number = 30) {
	const expires = new Date(Date.now() + days * 864e5).toUTCString();
	document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function Register() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	useEffect(() => {
		const checkSession = async () => {
		try {
			const response = await api.get('/api/auth/verify-session');

				if (response.ok) {
					const data = await response.json();
					switch (data.user.accountType) {
						case 'admin':
							navigate('/admin/dashboard');
							break;
						case 'manager':
							navigate('/manager/dashboard');
							break;
						case 'affiliate':
							navigate('/affiliate/dashboard');
							break;
					}
				}
			} catch (error) {
				// No session, stay on register page
			}
		};

		const referrerParam = searchParams.get('referrer');
		const managerParam = searchParams.get('manager');

		if (referrerParam) {
			setCookie('referrer', referrerParam);
		}
		if (managerParam) {
			setCookie('manager', managerParam);
		}

		checkSession();
	}, [navigate, searchParams]);
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		confirmPassword: '',
		dateOfBirth: '',
		telegram: '',
		socialNetworks: '',
		additionalInfo: ''
	});
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleNext = () => {
		if (step === 1 && (!formData.username || !formData.email || !formData.dateOfBirth)) {
			toast.error(t('registerPage.fillAllFieldsError'));
			return;
		}
		if (step === 2) {
			if (!formData.password || !formData.confirmPassword) {
				toast.error(t('registerPage.fillAllFields'));
				return;
			}
			if (formData.password !== formData.confirmPassword) {
				toast.error(t('registerPage.passwordsDoNotMatch'));
				return;
			}
			if (formData.password.length < 8) {
				toast.error(t('registerPage.passwordTooShort'));
				return;
			}
		}
		setStep(prev => (prev + 1) as 1 | 2 | 3);
	};

	const handleBack = () => {
		setStep(prev => (prev - 1) as 1 | 2 | 3);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.telegram) {
			toast.error(t('registerPage.fillAllFieldsError'));
			return;
		}

		setLoading(true);

		try {
			const applicationData = {
				socialNetworks: formData.socialNetworks,
				additionalInfo: formData.additionalInfo
			};

			const referrerCookie = getCookie('referrer');
			const managerCookie = getCookie('manager');

			const payload: any = {
				email: formData.email,
				password: formData.password,
				username: formData.username,
				dateOfBirth: formData.dateOfBirth,
				telegram: formData.telegram,
				applicationData
			};

			if (referrerCookie) {
				payload.referrer = parseInt(referrerCookie);
			}
			if (managerCookie) {
				payload.manager = parseInt(managerCookie);
			}

			const response = await api.post('/api/auth/register', payload);

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || t('registerPage.registrationFailed'));
			}

			setSuccess(true);
			toast.success(t('registerPage.registrationSuccess'));
			setTimeout(() => {
				navigate('/login');
			}, 3000);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('registerPage.registrationFailed'));
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				duration: 0.6,
				ease: 'easeOut'
			}
		}
	};

	const cardVariants = {
		hidden: { opacity: 0, x: 50 },
		visible: {
			opacity: 1,
			x: 0,
			transition: {
				type: 'spring',
				damping: 25,
				stiffness: 300
			}
		},
		exit: {
			opacity: 0,
			x: -50,
			transition: {
				duration: 0.3
			}
		}
	};

	const successVariants = {
		hidden: { opacity: 0, scale: 0.8 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: {
				type: 'spring',
				damping: 20,
				stiffness: 300
			}
		}
	};

	const iconVariants = {
		hidden: { scale: 0, rotate: -180 },
		visible: {
			scale: 1,
			rotate: 0,
			transition: {
				type: 'spring',
				damping: 20,
				stiffness: 300,
				delay: 0.2
			}
		}
	};

	if (success) {
		return (
			<motion.div
				className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4"
				initial="hidden"
				animate="visible"
				variants={containerVariants}
			>
				<motion.div
					className="w-full max-w-md"
					variants={successVariants}
				>
					<div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl text-center">
						<motion.div
							variants={iconVariants}
							className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6"
						>
							<CheckCircle2 className="w-10 h-10 text-green-500" />
						</motion.div>
						<motion.h2
							className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
						>
							{t('registerPage.registrationSuccess')}
						</motion.h2>
						<motion.p
							className="text-muted-foreground mb-4"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
						>
							{t('registerPage.applicationSubmitted')}
						</motion.p>
						<motion.p
							className="text-sm text-muted-foreground"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.5 }}
						>
							{t('registerPage.redirectingToLogin')}
						</motion.p>
					</div>
				</motion.div>
			</motion.div>
		);
	}

	return (
		<motion.div
			className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4 overflow-hidden relative"
			initial="hidden"
			animate="visible"
			variants={containerVariants}
		>
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<motion.div
					className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
					animate={{
						x: [0, 100, 0],
						y: [0, 50, 0]
					}}
					transition={{
						duration: 20,
						repeat: Infinity,
						ease: 'easeInOut'
					}}
				/>
				<motion.div
					className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl"
					animate={{
						x: [0, -100, 0],
						y: [0, -50, 0]
					}}
					transition={{
						duration: 15,
						repeat: Infinity,
						ease: 'easeInOut'
					}}
				/>
			</div>

			<div className="w-full max-w-md relative z-10">
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
				>
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
					>
						<motion.div
							whileHover={{ x: -4 }}
							transition={{ type: 'spring', stiffness: 400 }}
						>
							<ArrowLeft className="w-4 h-4" />
						</motion.div>
						<span>{t('registerPage.back')}</span>
					</Link>
				</motion.div>

				<div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
					<div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">{t('registerPage.title')}</h1>

						<div className="flex items-center justify-center gap-3 mb-8">
							{[1, 2, 3].map(i => (
								<div
									key={i}
									className="flex items-center gap-3"
								>
									<motion.div
										className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-500 ${
											i < step
												? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
												: i === step
												? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
												: 'bg-transparent border-2 border-muted text-muted-foreground'
										}`}
										animate={i < step ? { scale: [1, 1.1, 1] } : {}}
										transition={{ duration: 0.3 }}
									>
										{i < step ? <Check className="w-5 h-5" /> : i}
									</motion.div>
									{i < 3 && (
										<div
											className={`w-12 sm:w-16 h-0.5 transition-all duration-500 ${
												i < step ? 'bg-green-500' : 'bg-muted'
											}`}
										/>
									)}
								</div>
							))}
						</div>
					</motion.div>

					<AnimatePresence mode="wait">
						{step === 1 && (
							<motion.div
								key="step1"
								variants={cardVariants}
								initial="hidden"
								animate="visible"
								exit="exit"
								className="space-y-6"
							>
								<div>
									<label
										htmlFor="username"
										className="block text-sm font-medium text-foreground mb-2"
									>
										{t('registerPage.usernameLabel')}
									</label>
									<input
										type="text"
										id="username"
										name="username"
										value={formData.username}
										onChange={handleChange}
										placeholder={t('registerPage.usernamePlaceholder')}
										required
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
								</div>

								<div>
									<label
										htmlFor="email"
										className="block text-sm font-medium text-foreground mb-2"
									>
										{t('registerPage.emailLabel')}
									</label>
									<input
										type="email"
										id="email"
										name="email"
										value={formData.email}
										onChange={handleChange}
										placeholder={t('registerPage.emailPlaceholder')}
										required
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
								</div>

								<div>
									<label
										htmlFor="dateOfBirth"
										className="block text-sm font-medium text-foreground mb-2"
									>
										{t('registerPage.dateOfBirthLabel')} <span className="text-red-500">*</span>
									</label>
									<input
										type="date"
										id="dateOfBirth"
										name="dateOfBirth"
										value={formData.dateOfBirth}
										onChange={handleChange}
										required
										max={new Date().toISOString().split('T')[0]}
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										{t('registerPage.dateOfBirthHint')}
									</p>
								</div>

								<motion.button
									type="button"
									onClick={handleNext}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 border-2 border-primary"
								>
									<span>{t('registerPage.continue')}</span>
									<ArrowRight className="w-4 h-4" />
								</motion.button>
							</motion.div>
						)}

						{step === 2 && (
							<motion.div
								key="step2"
								variants={cardVariants}
								initial="hidden"
								animate="visible"
								exit="exit"
								className="space-y-6"
							>
								<div>
									<label
										htmlFor="password"
										className="block text-sm font-medium text-foreground mb-2"
									>
										{t('registerPage.passwordLabel')}
									</label>
									<input
										type="password"
										id="password"
										name="password"
										value={formData.password}
										onChange={handleChange}
										placeholder={t('registerPage.passwordPlaceholder')}
										required
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
								</div>

								<div>
									<label
										htmlFor="confirmPassword"
										className="block text-sm font-medium text-foreground mb-2"
									>
										{t('registerPage.confirmPasswordLabel')}
									</label>
									<input
										type="password"
										id="confirmPassword"
										name="confirmPassword"
										value={formData.confirmPassword}
										onChange={handleChange}
										placeholder={t('registerPage.confirmPasswordPlaceholder')}
										required
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
									<p className="text-xs text-muted-foreground mt-2">
										{t('registerPage.passwordHint')}
									</p>
								</div>

								<div className="flex gap-3">
									<motion.button
										type="button"
										onClick={handleBack}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="flex-1 py-3 px-4 bg-secondary text-foreground rounded-xl font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
									>
										<ArrowLeft className="w-4 h-4" />
										<span>{t('registerPage.back')}</span>
									</motion.button>
									<motion.button
										type="button"
										onClick={handleNext}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 border-2 border-primary"
									>
										<span>{t('registerPage.continue')}</span>
										<ArrowRight className="w-4 h-4" />
									</motion.button>
								</div>
							</motion.div>
						)}

						{step === 3 && (
							<motion.form
								key="step3"
								onSubmit={handleSubmit}
								variants={cardVariants}
								initial="hidden"
								animate="visible"
								exit="exit"
								className="space-y-6"
							>
								<div>
									<label
										htmlFor="socialNetworks"
										className="block text-sm font-medium text-foreground mb-2"
									>
										{t('registerPage.socialNetworksLabel')}
									</label>
									<input
										type="text"
										id="socialNetworks"
										name="socialNetworks"
										value={formData.socialNetworks}
										onChange={handleChange}
										placeholder={t('registerPage.socialNetworksPlaceholder')}
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
								</div>

								<div>
									<label
										htmlFor="telegram"
										className="block text-sm font-medium text-foreground mb-2"
									>
										{t('registerPage.telegramLabel')} <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										id="telegram"
										name="telegram"
										value={formData.telegram}
										onChange={handleChange}
										placeholder={t('registerPage.telegramPlaceholder')}
										required
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
								</div>

								<div>
									<label
										htmlFor="additionalInfo"
										className="block text-sm font-medium text-foreground mb-2"
									>
										{t('registerPage.aboutYouLabel')}
									</label>
									<textarea
										id="additionalInfo"
										name="additionalInfo"
										value={formData.additionalInfo}
										onChange={handleChange}
										rows={4}
										placeholder={t('registerPage.aboutYouPlaceholder')}
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground resize-none transition-all"
									/>
								</div>

								<div className="flex gap-3">
									<motion.button
										type="button"
										onClick={handleBack}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="flex-1 py-3 px-4 bg-secondary text-foreground rounded-xl font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
									>
										<ArrowLeft className="w-4 h-4" />
										<span>{t('registerPage.back')}</span>
									</motion.button>
									<motion.button
										type="submit"
										disabled={loading}
										whileHover={{ scale: loading ? 1 : 1.02 }}
										whileTap={{ scale: loading ? 1 : 0.98 }}
										className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden group border-2 border-primary"
									>
										<motion.div
											className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
											initial={{ x: '-100%' }}
											whileHover={{ x: '100%' }}
											transition={{ duration: 0.6 }}
										/>
										{loading && <Loader2 className="w-4 h-4 animate-spin" />}
										<span className="relative z-10">
											{loading ? t('registerPage.registering') : t('registerPage.createAccount')}
										</span>
									</motion.button>
								</div>
							</motion.form>
						)}
					</AnimatePresence>
				</div>

				<motion.div
					className="mt-6 text-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
				>
					<p className="text-sm text-muted-foreground">
						{t('registerPage.alreadyHaveAccount')}{' '}
						<Link
							to="/login"
							className="text-primary font-medium hover:underline"
						>
							{t('registerPage.login')}
						</Link>
					</p>
				</motion.div>
			</div>
		</motion.div>
	);
}
