import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Clock, XCircle, Shield } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../utils/httpClient';

export default function Login() {
	const navigate = useNavigate();
	const { t } = useTranslation();

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
				// No session, stay on login page
			}
		};

		checkSession();
	}, [navigate]);
	const [
		step,
		setStep,
	] = useState<'email' | 'pending' | 'rejected' | 'verify' | 'password' | 'forgot-password' | 'reset-password'>('email');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [verificationCode, setVerificationCode] = useState('');
	const [resetCode, setResetCode] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [rejectionReason, setRejectionReason] = useState('');
	const [emailLocked, setEmailLocked] = useState(false);

	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await api.post('/api/auth/check-email', { email });

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || t('loginPage.toastCheckEmailFailed'));
			}

			setEmailLocked(true);

			if (data.status === 'pending') {
				setStep('pending');
			} else if (data.status === 'rejected') {
				setRejectionReason(data.rejectionReason);
				setStep('rejected');
			} else if (data.status === 'accepted') {
				if (data.isVerified) {
					setStep('password');
				} else {
					await sendVerificationCode();
					setStep('verify');
				}
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('loginPage.toastCheckEmailFailed'));
		} finally {
			setLoading(false);
		}
	};

	const sendVerificationCode = async () => {
		try {
			await api.post('/api/auth/send-verification', { email });
			toast.success(t('loginPage.toastVerificationCodeSent'));
		} catch (err) {
			console.error('Failed to send verification code:', err);
		}
	};

	const handleVerificationSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await api.post('/api/auth/verify-code', { email, code: verificationCode });

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Verification failed');
			}

			toast.success(t('loginPage.toastVerificationSuccess'));
			setStep('password');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('loginPage.toastVerificationFailed'));
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await api.post('/api/auth/login', { email, password });

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Login failed');
			}

			localStorage.setItem('user', JSON.stringify(data.user));
			toast.success(t('loginPage.toastLoginSuccess'));

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
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('loginPage.toastLoginFailed'));
		} finally {
			setLoading(false);
		}
	};

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				duration: 0.6,
				ease: 'easeOut',
			},
		},
		exit: {
			opacity: 0,
			transition: {
				duration: 0.3,
			},
		},
	};

	const cardVariants = {
		hidden: { opacity: 0, y: 30, scale: 0.95 },
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: {
				type: 'spring',
				damping: 25,
				stiffness: 300,
				duration: 0.6,
			},
		},
		exit: {
			opacity: 0,
			y: -30,
			scale: 0.95,
			transition: {
				duration: 0.3,
			},
		},
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
				delay: 0.2,
			},
		},
	};

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
						y: [0, 50, 0],
					}}
					transition={{
						duration: 20,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>
				<motion.div
					className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl"
					animate={{
						x: [0, -100, 0],
						y: [0, -50, 0],
					}}
					transition={{
						duration: 15,
						repeat: Infinity,
						ease: 'easeInOut',
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
						className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
					>
						<motion.div
							whileHover={{ x: -4 }}
							transition={{ type: 'spring', stiffness: 400 }}
						>
							<ArrowLeft className="w-4 h-4" />
						</motion.div>
						<span>{t('loginPage.back')}</span>
					</Link>
				</motion.div>

				<AnimatePresence mode="wait">
					<motion.div
						key={step}
						variants={cardVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
					>
						<div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
						>
							<h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">{t('loginPage.title')}</h1>
							<p className="text-sm sm:text-base text-muted-foreground mb-8">
								{step === 'email' && t('loginPage.subtitleEmail')}
								{step === 'password' && t('loginPage.subtitlePassword')}
								{step === 'verify' && t('loginPage.subtitleVerify')}
								{step === 'pending' && t('loginPage.subtitlePending')}
								{step === 'rejected' && t('loginPage.subtitleRejected')}
								{step === 'forgot-password' && t('loginPage.subtitleForgotPassword')}
								{step === 'reset-password' && t('loginPage.subtitleResetPassword')}
							</p>
						</motion.div>

						{step === 'email' && (
							<motion.form
								onSubmit={handleEmailSubmit}
								className="space-y-6"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								<div>
									<label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.emailLabel')}
									</label>
									<div className="relative">
										<input
											type="email"
											id="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder={t('loginPage.emailPlaceholder')}
											required
											disabled={emailLocked}
											className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all disabled:opacity-70 disabled:cursor-not-allowed"
										/>
										{emailLocked && (
											<button
												type="button"
												onClick={() => {
													setEmailLocked(false);
													setEmail('');
												}}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary hover:underline"
											>
												{t('loginPage.edit')}
											</button>
										)}
									</div>
								</div>

								<motion.button
									type="submit"
									disabled={loading || emailLocked}
									whileHover={{ scale: (loading || emailLocked) ? 1 : 1.02 }}
									whileTap={{ scale: (loading || emailLocked) ? 1 : 0.98 }}
									className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden group border-2 border-primary"
								>
									<motion.div
										className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
										initial={{ x: '-100%' }}
										whileHover={{ x: '100%' }}
										transition={{ duration: 0.6 }}
									/>
									{loading && <Loader2 className="w-4 h-4 animate-spin" />}
									<span className="relative z-10">{loading ? t('loginPage.verifying') : t('loginPage.continue')}</span>
								</motion.button>
							</motion.form>
						)}

						{step === 'pending' && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								<div className="mb-6">
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.emailLabel')}
									</label>
									<div className="relative">
										<input
											type="email"
											value={email}
											disabled
											className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl text-foreground opacity-70 cursor-not-allowed"
										/>
										<button
											type="button"
											onClick={() => {
												setEmailLocked(false);
												setEmail('');
												setStep('email');
											}}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary hover:underline"
										>
											{t('loginPage.edit')}
										</button>
									</div>
								</div>

								<div className="text-center py-8">
									<motion.div
										variants={iconVariants}
										className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6"
									>
										<Clock className="w-10 h-10 text-amber-500" />
									</motion.div>
									<motion.h3
										className="text-xl sm:text-2xl font-semibold text-foreground mb-3"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.3 }}
									>
										{t('loginPage.pendingTitle')}
									</motion.h3>
									<motion.p
										className="text-sm sm:text-base text-muted-foreground"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.4 }}
									>
										{t('loginPage.pendingText')}
									</motion.p>
								</div>
							</motion.div>
						)}

						{step === 'rejected' && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								<div className="mb-6">
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.emailLabel')}
									</label>
									<div className="relative">
										<input
											type="email"
											value={email}
											disabled
											className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl text-foreground opacity-70 cursor-not-allowed"
										/>
										<button
											type="button"
											onClick={() => {
												setEmailLocked(false);
												setEmail('');
												setStep('email');
											}}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary hover:underline"
										>
											{t('loginPage.edit')}
										</button>
									</div>
								</div>

								<div className="text-center py-8">
									<motion.div
										variants={iconVariants}
										className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6"
									>
										<XCircle className="w-10 h-10 text-destructive" />
									</motion.div>
									<motion.h3
										className="text-xl sm:text-2xl font-semibold text-foreground mb-3"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.3 }}
									>
										{t('loginPage.rejectedTitle')}
									</motion.h3>
									<motion.p
										className="text-sm sm:text-base text-muted-foreground mb-6"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.4 }}
									>
										{t('loginPage.rejectedText')}
									</motion.p>
									{rejectionReason && (
										<motion.div
											className="bg-secondary/50 border border-border rounded-xl p-4 text-left"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.5 }}
										>
											<p className="text-sm font-medium text-foreground mb-1">{t('loginPage.reason')}</p>
											<p className="text-sm text-muted-foreground">{rejectionReason}</p>
										</motion.div>
									)}
								</div>
							</motion.div>
						)}

						{step === 'verify' && (
							<motion.form
								onSubmit={handleVerificationSubmit}
								className="space-y-6"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								<div className="mb-6">
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.emailLabel')}
									</label>
									<div className="relative">
										<input
											type="email"
											value={email}
											disabled
											className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl text-foreground opacity-70 cursor-not-allowed"
										/>
										<button
											type="button"
											onClick={() => {
												setEmailLocked(false);
												setEmail('');
												setStep('email');
											}}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary hover:underline"
										>
											{t('loginPage.edit')}
										</button>
									</div>
								</div>

								<motion.div
									className="text-center mb-6"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
								>
									<motion.div
										variants={iconVariants}
										className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
									>
										<Shield className="w-8 h-8 text-primary" />
									</motion.div>
									<p className="text-sm text-muted-foreground">
										{t('loginPage.verificationCodeSent')}
									</p>
								</motion.div>

								<div>
									<label htmlFor="code" className="block text-sm font-medium text-foreground mb-2 text-center">
										{t('loginPage.verificationCodeLabel')}
									</label>
									<input
										type="text"
										id="code"
										value={verificationCode}
										onChange={(e) => setVerificationCode(e.target.value)}
										required
										maxLength={6}
										placeholder="000000"
										className="w-full px-4 py-4 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground text-center text-2xl sm:text-3xl tracking-widest font-mono"
									/>
								</div>

								<motion.button
									type="submit"
									disabled={loading}
									whileHover={{ scale: loading ? 1 : 1.02 }}
									whileTap={{ scale: loading ? 1 : 0.98 }}
									className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-primary"
								>
									{loading && <Loader2 className="w-4 h-4 animate-spin" />}
									{loading ? t('loginPage.verifying') : t('loginPage.verify')}
								</motion.button>
							</motion.form>
						)}

						{step === 'password' && (
							<motion.form
								onSubmit={handlePasswordSubmit}
								className="space-y-6"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								<div className="mb-6">
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.emailLabel')}
									</label>
									<div className="relative">
										<input
											type="email"
											value={email}
											disabled
											className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl text-foreground opacity-70 cursor-not-allowed"
										/>
										<button
											type="button"
											onClick={() => {
												setEmailLocked(false);
												setEmail('');
												setStep('email');
											}}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary hover:underline"
										>
											{t('loginPage.edit')}
										</button>
									</div>
								</div>

								<div>
									<label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.passwordLabel')}
									</label>
									<input
										type="password"
										id="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder={t('loginPage.passwordPlaceholder')}
										required
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
								</div>

								<motion.button
									type="submit"
									disabled={loading}
									whileHover={{ scale: loading ? 1 : 1.02 }}
									whileTap={{ scale: loading ? 1 : 0.98 }}
									className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-primary"
								>
									{loading && <Loader2 className="w-4 h-4 animate-spin" />}
									{loading ? t('loginPage.loggingIn') : t('loginPage.login')}
								</motion.button>

								<motion.button
									type="button"
									onClick={() => {
										setStep('forgot-password');
										setPassword('');
									}}
									className="w-full text-sm text-primary hover:underline mt-4"
								>
									{t('loginPage.forgotPassword')}
								</motion.button>
							</motion.form>
						)}

						{step === 'forgot-password' && (
							<motion.form
								onSubmit={async (e) => {
									e.preventDefault();
									setLoading(true);
									try {
										const response = await api.post('/api/auth/forgot-password', {
											method: 'POST',
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify({ email }),
										});

										if (!response.ok) {
											const data = await response.json();
											throw new Error(data.error || t('loginPage.toastRequestFailed'));
										}

										toast.success(t('loginPage.toastVerificationCodeSent'));
										setStep('reset-password');
									} catch (err) {
										toast.error(err instanceof Error ? err.message : t('loginPage.toastRequestFailed'));
									} finally {
										setLoading(false);
									}
								}}
								className="space-y-6"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								<div className="mb-6">
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.emailLabel')}
									</label>
									<div className="relative">
										<input
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground"
											required
										/>
									</div>
								</div>

								<motion.div
									className="text-center mb-6 bg-accent/50 rounded-xl p-4"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
								>
									<p className="text-sm text-muted-foreground">
										{t('loginPage.resetCodeSent')}
									</p>
								</motion.div>

								<motion.button
									type="submit"
									disabled={loading}
									whileHover={{ scale: loading ? 1 : 1.02 }}
									whileTap={{ scale: loading ? 1 : 0.98 }}
									className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-primary"
								>
									{loading && <Loader2 className="w-4 h-4 animate-spin" />}
									{loading ? t('loginPage.sending') : t('loginPage.sendCode')}
								</motion.button>

								<motion.button
									type="button"
									onClick={() => setStep('email')}
									className="w-full text-sm text-muted-foreground hover:text-foreground mt-4"
								>
									{t('loginPage.backToLogin')}
								</motion.button>
							</motion.form>
						)}

						{step === 'reset-password' && (
							<motion.form
								onSubmit={async (e) => {
									e.preventDefault();
									if (newPassword !== confirmPassword) {
										toast.error(t('loginPage.passwordsDoNotMatch'));
										return;
									}
									if (newPassword.length < 6) {
										toast.error(t('loginPage.passwordTooShort'));
										return;
									}
									setLoading(true);
									try {
										const response = await api.post('/api/auth/reset-password', { email, code: resetCode, newPassword });

										const data = await response.json();

										if (!response.ok) {
											throw new Error(data.error || t('loginPage.toastPasswordResetFailed'));
										}

										toast.success(t('loginPage.toastPasswordResetSuccess'));
										setStep('email');
										setEmail('');
										setResetCode('');
										setNewPassword('');
										setConfirmPassword('');
										setEmailLocked(false);
									} catch (err) {
										toast.error(err instanceof Error ? err.message : t('loginPage.toastPasswordResetFailed'));
									} finally {
										setLoading(false);
									}
								}}
								className="space-y-6"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								<div className="mb-6">
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.emailLabel')}
									</label>
									<input
										type="email"
										value={email}
										disabled
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl text-foreground opacity-70 cursor-not-allowed"
									/>
								</div>

								<div>
									<label htmlFor="resetCode" className="block text-sm font-medium text-foreground mb-2 text-center">
										{t('loginPage.verificationCodeLabel')}
									</label>
									<input
										type="text"
										id="resetCode"
										value={resetCode}
										onChange={(e) => setResetCode(e.target.value)}
										required
										maxLength={6}
										placeholder="000000"
										className="w-full px-4 py-4 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground text-center text-2xl sm:text-3xl tracking-widest font-mono"
									/>
								</div>

								<div>
									<label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.newPasswordLabel')}
									</label>
									<input
										type="password"
										id="newPassword"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										placeholder={t('loginPage.passwordPlaceholder')}
										required
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
								</div>

								<div>
									<label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
										{t('loginPage.confirmPasswordLabel')}
									</label>
									<input
										type="password"
										id="confirmPassword"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										placeholder={t('loginPage.passwordPlaceholder')}
										required
										className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground transition-all"
									/>
								</div>

								<motion.button
									type="submit"
									disabled={loading}
									whileHover={{ scale: loading ? 1 : 1.02 }}
									whileTap={{ scale: loading ? 1 : 0.98 }}
									className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-primary"
								>
									{loading && <Loader2 className="w-4 h-4 animate-spin" />}
									{loading ? t('loginPage.reseting') : t('loginPage.resetPassword')}
								</motion.button>
							</motion.form>
						)}
					</motion.div>
				</AnimatePresence>

				<motion.div
					className="mt-6 text-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
				>
					<p className="text-sm text-muted-foreground">
						{t('loginPage.noAccount')}{' '}
						<Link to="/register" className="text-primary font-medium hover:underline">
							{t('loginPage.signUp')}
						</Link>
					</p>
				</motion.div>
			</div>
		</motion.div>
	);
}
