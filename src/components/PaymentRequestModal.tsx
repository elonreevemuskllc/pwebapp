import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Wallet, Network, AlertCircle, Check, Users, Percent, Banknote, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../hooks/useTranslation';
import { buildApiUrl } from '../utils/api';

interface PaymentRequestModalProps {
	isOpen: boolean;
	onClose: () => void;
	ftdReferralBalance: number;
	revshareBalance: number;
	salaryBalance: number;
	onSuccess: () => void;
}

type PaymentType = 'ftd_referral' | 'revshare' | 'salary';

const CRYPTO_NETWORKS: Record<string, string[]> = {
	// USDT: ['BEP20', 'TRC20', 'SOL'],
	// USDC: ['BEP20', 'TRC20', 'SOL', 'ARBITRUM'],
	// ETH: ['ERC20']
	USDC: ['SOL'],
};

const CRYPTO_ICONS: Record<string, string> = {
	USDT: 'dollar',
	USDC: 'dollar',
	ETH: 'coins'
};

export default function PaymentRequestModal({ isOpen, onClose, ftdReferralBalance, revshareBalance, salaryBalance, onSuccess }: PaymentRequestModalProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState(0);
	const [completedSteps, setCompletedSteps] = useState<number[]>([]);
	const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
	const [amount, setAmount] = useState('');
	const [cryptoType, setCryptoType] = useState<string>('');
	const [network, setNetwork] = useState<string>('');
	const [walletAddress, setWalletAddress] = useState('');
	const [walletAddressConfirm, setWalletAddressConfirm] = useState('');
	const [note, setNote] = useState('');
	const [loading, setLoading] = useState(false);

	const isDev = import.meta.env.VITE_IS_DEV === '1';
	const today = new Date();
	const isWednesday = today.getDay() === 3;
	const isFirstOfMonth = today.getDate() === 1;

	const hasFtdDeal = ftdReferralBalance > 0;
	const hasRevshareDeal = revshareBalance > 0;
	const hasSalary = salaryBalance > 0;

	const availableBalance = paymentType === 'revshare' ? revshareBalance : (paymentType === 'salary' ? salaryBalance : ftdReferralBalance);
	const canRequest = isDev ? true : (paymentType === 'revshare' ? isFirstOfMonth : true);

	const resetForm = () => {
		setStep(0);
		setCompletedSteps([]);
		setPaymentType(null);
		setAmount('');
		setCryptoType('');
		setNetwork('');
		setWalletAddress('');
		setWalletAddressConfirm('');
		setNote('');
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const handleNext = () => {
		if (step === 0) {
			if (!paymentType) {
				toast.error(t('paymentRequestModal.selectPaymentType'));
				return;
			}
			if (!isDev) {
				if (paymentType === 'revshare' && !isFirstOfMonth) {
					toast.error(t('paymentRequestModal.revshareOnlyOnFirst'));
					return;
				}
				if (paymentType === 'ftd_referral' && !isWednesday) {
					toast.error(t('paymentRequestModal.ftdOnlyOnWednesday'));
					return;
				}
			}
			setCompletedSteps([...completedSteps, 0]);
			setStep(1);
		} else if (step === 1) {
			const amountNum = parseFloat(amount);
			if (!amount || amountNum <= 0) {
				toast.error(t('paymentRequestModal.invalidAmount'));
				return;
			}
			if (amountNum > availableBalance) {
				toast.error(t('paymentRequestModal.amountExceedsBalance'));
				return;
			}
			setCompletedSteps([...completedSteps, 1]);
			setStep(2);
		} else if (step === 2) {
			if (!cryptoType) {
				toast.error(t('paymentRequestModal.selectCrypto'));
				return;
			}
			if (!network) {
				toast.error(t('paymentRequestModal.selectNetwork'));
				return;
			}
			setCompletedSteps([...completedSteps, 2]);
			setStep(3);
		} else if (step === 3) {
			if (!walletAddress || !walletAddressConfirm) {
				toast.error(t('paymentRequestModal.enterWallet'));
				return;
			}
			if (walletAddress !== walletAddressConfirm) {
				toast.error(t('paymentRequestModal.walletsDoNotMatch'));
				return;
			}
			setCompletedSteps([...completedSteps, 3]);
			setStep(4);
		}
	};

	const handleSubmit = async () => {
		if (!isDev && !canRequest) {
			if (paymentType === 'revshare') {
				toast.error(t('paymentRequestModal.revshareOnlyOnFirst'));
			} else if (paymentType === 'ftd_referral') {
				toast.error(t('paymentRequestModal.ftdOnlyOnWednesday'));
			}
			return;
		}

		setLoading(true);
		try {
			const response = await fetch(buildApiUrl('/api/payment-requests'), {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					payment_type: paymentType,
					amount: parseFloat(amount),
					crypto_type: cryptoType,
					network,
					wallet_address: walletAddress,
					note: note.trim() || null
				})
			});

			if (response.ok) {
				toast.success(t('paymentRequestModal.requestSuccess'));
				handleClose();
				onSuccess();
			} else {
				const data = await response.json();
				toast.error(data.error || t('paymentRequestModal.requestError'));
			}
		} catch (error) {
			toast.error(t('paymentRequestModal.connectionError'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={handleClose}
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="fixed inset-0 z-50 flex items-center justify-center p-4"
					>
						<div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
							<div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
								<h2 className="text-2xl font-bold text-foreground">{t('paymentRequestModal.title')}</h2>
								<button
									onClick={handleClose}
									className="p-2 hover:bg-accent rounded-lg transition-colors"
								>
									<X className="w-5 h-5 text-muted-foreground" />
								</button>
							</div>

							<div className="p-6">
								{!canRequest && paymentType && (
									<div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
										<AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
										<div>
											<p className="text-sm font-medium text-yellow-500">{t('paymentRequestModal.warning')}</p>
											<p className="text-sm text-muted-foreground mt-1">
												{paymentType === 'revshare'
													? t('paymentRequestModal.revshareWarning')
													: t('paymentRequestModal.ftdWarning')}
											</p>
										</div>
									</div>
								)}

								<div className="mb-6">
									<div className="flex items-center gap-2 mb-4">
										{[0, 1, 2, 3, 4].map((s) => (
											<div
												key={s}
												className={`flex-1 h-2.5 rounded-full transition-all duration-300 relative overflow-hidden ${
													completedSteps.includes(s)
														? 'bg-green-500'
														: s === step
														? 'bg-neutral-600'
														: 'bg-neutral-300 dark:bg-neutral-700'
												}`}
											>
												{completedSteps.includes(s) && (
													<motion.div
														initial={{ width: 0 }}
														animate={{ width: '100%' }}
														transition={{ duration: 0.5 }}
														className="absolute inset-0 bg-green-500"
													/>
												)}
											</div>
										))}
									</div>
									<p className="text-sm text-muted-foreground text-center">
										{t('paymentRequestModal.step').replace('{step}', (step + 1).toString())}
									</p>
								</div>

								<AnimatePresence mode="wait">
									{step === 0 && (
										<motion.div
											key="step0"
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -20 }}
											transition={{ duration: 0.2 }}
										>
											<div className="mb-6">
												<label className="block text-sm font-medium text-foreground mb-3">
													{t('paymentRequestModal.paymentType')}
												</label>
												<div className="grid grid-cols-1 gap-4">
													{hasFtdDeal && (
														<button
															onClick={() => setPaymentType('ftd_referral')}
															disabled={!isDev && !isWednesday}
															className={`p-6 rounded-xl border-2 transition-all text-left ${
																paymentType === 'ftd_referral'
																	? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
																	: 'border-border bg-background hover:border-accent'
															} disabled:opacity-50 disabled:cursor-not-allowed`}
														>
															<div className="flex items-start justify-between">
																<div className="flex-1">
																	<h3 className="font-bold text-lg text-foreground mb-2">{t('paymentRequestModal.ftdReferral')}</h3>
																	<p className="text-sm text-muted-foreground mb-3">
																		{t('paymentRequestModal.ftdReferralDescription')}
																	</p>
																	<div className="flex items-baseline gap-2">
																		<span className="text-2xl font-bold text-foreground">{ftdReferralBalance.toFixed(2)} €</span>
																		<span className="text-sm text-muted-foreground">{t('paymentRequestModal.available')}</span>
																	</div>
																</div>
																<Users className="w-8 h-8 text-primary" />
															</div>
															<div className="mt-3 pt-3 border-t border-border">
																<p className="text-xs text-muted-foreground">
																	{isDev ? t('paymentRequestModal.devMode') : (isWednesday ? t('paymentRequestModal.availableToday') : t('paymentRequestModal.onlyOnWednesday'))}
																</p>
															</div>
														</button>
													)}

													{hasRevshareDeal && (
														<button
															onClick={() => setPaymentType('revshare')}
															disabled={!isDev && !isFirstOfMonth}
															className={`p-6 rounded-xl border-2 transition-all text-left ${
																paymentType === 'revshare'
																	? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
																	: 'border-border bg-background hover:border-accent'
															} disabled:opacity-50 disabled:cursor-not-allowed`}
														>
															<div className="flex items-start justify-between">
																<div className="flex-1">
																	<h3 className="font-bold text-lg text-foreground mb-2">{t('paymentRequestModal.revshare')}</h3>
																	<p className="text-sm text-muted-foreground mb-3">
																		{t('paymentRequestModal.revshareDescription')}
																	</p>
																	<div className="flex items-baseline gap-2">
																		<span className="text-2xl font-bold text-foreground">{revshareBalance.toFixed(2)} €</span>
																		<span className="text-sm text-muted-foreground">{t('paymentRequestModal.available')}</span>
																	</div>
																</div>
																<Percent className="w-8 h-8 text-primary" />
															</div>
															<div className="mt-3 pt-3 border-t border-border">
																<p className="text-xs text-muted-foreground">
																	{isDev ? t('paymentRequestModal.devMode') : (isFirstOfMonth ? t('paymentRequestModal.availableToday') : t('paymentRequestModal.onlyOnFirst'))}
																</p>
															</div>
														</button>
													)}

													{hasSalary && (
														<button
															onClick={() => setPaymentType('salary')}
															className={`p-6 rounded-xl border-2 transition-all text-left ${
																paymentType === 'salary'
																	? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
																	: 'border-border bg-background hover:border-accent'
															}`}
														>
															<div className="flex items-start justify-between">
																<div className="flex-1">
																	<h3 className="font-bold text-lg text-foreground mb-2">{t('paymentRequestModal.fixedCommission')}</h3>
																	<p className="text-sm text-muted-foreground mb-3">
																		{t('paymentRequestModal.fixedCommissionDescription')}
																	</p>
																	<div className="flex items-baseline gap-2">
																		<span className="text-2xl font-bold text-foreground">{salaryBalance.toFixed(2)} €</span>
																		<span className="text-sm text-muted-foreground">{t('paymentRequestModal.available')}</span>
																	</div>
																</div>
																<Banknote className="w-8 h-8 text-primary" />
															</div>
															<div className="mt-3 pt-3 border-t border-border">
																<p className="text-xs text-muted-foreground">
																	{t('paymentRequestModal.frequencyConfigured')}
																</p>
															</div>
														</button>
													)}
												</div>
											</div>
										</motion.div>
									)}

									{step === 1 && (
										<motion.div
											key="step1"
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -20 }}
											transition={{ duration: 0.2 }}
										>
											<div className="mb-6">
												<label className="block text-sm font-medium text-foreground mb-2">
													{t('paymentRequestModal.amountToWithdraw')}
												</label>
												<div className="relative">
													<div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
														<DollarSign className="w-5 h-5 text-muted-foreground" />
													</div>
													<input
														type="number"
														value={amount}
														onChange={(e) => setAmount(e.target.value)}
														placeholder="0.00"
														step="0.01"
														min="0"
														max={availableBalance}
														className="w-full pl-12 pr-16 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
													/>
													<span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium pointer-events-none">
														EUR
													</span>
												</div>
												<p className="mt-2 text-sm text-muted-foreground">
													{t('paymentRequestModal.availableBalance')} ({paymentType === 'revshare' ? t('paymentRequestModal.revshare') : (paymentType === 'salary' ? t('paymentRequestModal.fixedCommission') : t('paymentRequestModal.ftdReferral'))}): {availableBalance.toFixed(2)} €
												</p>
											</div>
										</motion.div>
									)}

									{step === 2 && (
										<motion.div
											key="step2"
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -20 }}
											transition={{ duration: 0.2 }}
										>
											<div className="mb-6">
												<label className="block text-sm font-medium text-foreground mb-3">
													{t('paymentRequestModal.crypto')}
												</label>
												<div className="grid grid-cols-3 gap-3">
													{Object.keys(CRYPTO_NETWORKS).map((crypto) => (
														<button
															key={crypto}
															onClick={() => {
																setCryptoType(crypto);
																setNetwork('');
															}}
															className={`p-4 rounded-xl border-2 transition-all ${
																cryptoType === crypto
																	? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
																	: 'border-border bg-background hover:border-accent'
															}`}
														>
															<img src={crypto.icon} alt={crypto.name} className="w-8 h-8 mx-auto mb-2" />
															<p className="font-semibold text-foreground">{crypto}</p>
														</button>
													))}
												</div>
											</div>

											{cryptoType && (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													className="mb-6"
												>
													<label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
														<Network className="w-4 h-4" />
														{t('paymentRequestModal.network')}
													</label>
													<div className="grid grid-cols-2 gap-3">
														{CRYPTO_NETWORKS[cryptoType].map((net) => (
															<button
																key={net}
																onClick={() => setNetwork(net)}
																className={`p-3 rounded-xl border-2 transition-all ${
																	network === net
																		? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
																		: 'border-border bg-background hover:border-accent'
																}`}
															>
																<p className="font-semibold text-foreground">{net}</p>
															</button>
														))}
													</div>
												</motion.div>
											)}
										</motion.div>
									)}

									{step === 3 && (
										<motion.div
											key="step3"
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -20 }}
											transition={{ duration: 0.2 }}
										>
											<div className="mb-6">
												<label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
													<Wallet className="w-4 h-4" />
													{t('paymentRequestModal.walletAddress')}
												</label>
												<input
													type="text"
													value={walletAddress}
													onChange={(e) => setWalletAddress(e.target.value)}
													placeholder={t('paymentRequestModal.enterWalletPlaceholder')}
													className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
												/>
											</div>

											<div className="mb-6">
												<label className="block text-sm font-medium text-foreground mb-2">
													{t('paymentRequestModal.confirmWallet')}
												</label>
												<input
													type="text"
													value={walletAddressConfirm}
													onChange={(e) => setWalletAddressConfirm(e.target.value)}
													placeholder={t('paymentRequestModal.enterWalletPlaceholder')}
													className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
												/>
												{walletAddress && walletAddressConfirm && walletAddress !== walletAddressConfirm && (
													<p className="mt-2 text-sm text-red-500 flex items-center gap-1">
														<X className="w-4 h-4" />
														{t('paymentRequestModal.walletsDoNotMatch')}
													</p>
												)}
												{walletAddress && walletAddressConfirm && walletAddress === walletAddressConfirm && (
													<p className="mt-2 text-sm text-green-500 flex items-center gap-1">
														<Check className="w-4 h-4" />
														{t('paymentRequestModal.walletsMatch')}
													</p>
												)}
											</div>
										</motion.div>
									)}

									{step === 4 && (
										<motion.div
											key="step4"
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -20 }}
											transition={{ duration: 0.2 }}
										>
											<div className="mb-6 bg-gradient-to-br from-green-500/10 to-primary/10 border border-green-500/20 rounded-xl p-6 space-y-3">
												<div className="flex items-center gap-2 mb-3">
													<div className="p-2 bg-green-500/20 rounded-lg">
														<Check className="w-5 h-5 text-green-500" />
													</div>
													<h3 className="font-semibold text-foreground">{t('paymentRequestModal.summaryTitle')}</h3>
												</div>
												<div className="flex justify-between items-center py-2 border-b border-border/50">
													<span className="text-muted-foreground">{t('paymentRequestModal.type')}</span>
													<span className="font-semibold text-foreground">{paymentType === 'revshare' ? t('paymentRequestModal.revshare') : (paymentType === 'salary' ? t('paymentRequestModal.fixedCommission') : t('paymentRequestModal.ftdReferral'))}</span>
												</div>
												<div className="flex justify-between items-center py-2 border-b border-border/50">
													<span className="text-muted-foreground">{t('paymentRequestModal.amount')}</span>
													<span className="font-semibold text-foreground text-lg">{parseFloat(amount).toFixed(2)} €</span>
												</div>
												<div className="flex justify-between items-center py-2 border-b border-border/50">
													<span className="text-muted-foreground">{t('paymentRequestModal.cryptoLabel')}</span>
													<div className="flex items-center gap-2">
														<div className="w-6 h-6 flex items-center justify-center bg-primary/10 rounded">
															{CRYPTO_ICONS[cryptoType] === 'dollar' ? (
																<DollarSign className="w-4 h-4 text-primary" />
															) : (
																<Coins className="w-4 h-4 text-primary" />
															)}
														</div>
														<span className="font-semibold text-foreground">{cryptoType}</span>
													</div>
												</div>
												<div className="flex justify-between items-center py-2 border-b border-border/50">
													<span className="text-muted-foreground">{t('paymentRequestModal.networkLabel')}</span>
													<span className="font-semibold text-foreground">{network}</span>
												</div>
												<div className="flex flex-col gap-2 py-2">
													<span className="text-muted-foreground">{t('paymentRequestModal.walletLabel')}</span>
													<span className="font-mono text-xs text-foreground break-all bg-background/50 p-3 rounded-lg">
														{walletAddress}
													</span>
												</div>
											</div>

											<div className="mb-6">
												<label className="block text-sm font-medium text-foreground mb-2">
													{t('paymentRequestModal.noteOptional')}
												</label>
												<textarea
													value={note}
													onChange={(e) => setNote(e.target.value)}
													placeholder={t('paymentRequestModal.notePlaceholder')}
													rows={3}
													className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
												/>
											</div>
										</motion.div>
									)}
								</AnimatePresence>

								<div className="flex gap-3 pt-4">
									{step > 0 && (
										<button
											onClick={() => setStep(step - 1)}
											className="flex-1 px-6 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-accent transition-colors"
										>
											{t('paymentRequestModal.back')}
										</button>
									)}
									{step < 4 ? (
										<button
											onClick={handleNext}
											className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30"
										>
											{t('paymentRequestModal.next')}
										</button>
									) : (
										<button
											onClick={handleSubmit}
											disabled={loading || !canRequest}
											className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
										>
											{loading ? t('paymentRequestModal.submitting') : t('paymentRequestModal.submit')}
										</button>
									)}
								</div>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}