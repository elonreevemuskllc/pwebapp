import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import PaymentRequestModal from '../../components/PaymentRequestModal';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { Wallet, DollarSign, Clock, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { buildApiUrl } from '../../utils/api';

interface Balance {
	total_balance: number;
	paid_balance: number;
	unpaid_balance: number;
	cpa_earnings: number;
	revshare_earnings: number;
	salary_earnings: number;
	monthly_salary: number;
	paid_ftd_referral?: number;
	paid_revshare?: number;
	last_updated: string | null;
}

interface Deal {
	cpa_enabled: boolean;
	revshare_enabled: boolean;
}

interface PaymentRequest {
	id: number;
	amount: number;
	crypto_type: string;
	network: string;
	wallet_address: string;
	note: string | null;
	status: 'pending' | 'accepted' | 'declined';
	admin_note: string | null;
	processed_by_username: string | null;
	processed_at: string | null;
	created_at: string;
}

export default function Payments() {
	const { t } = useTranslation();
	const { user, loading, logout } = useAuth();
	const [balance, setBalance] = useState<Balance | null>(null);
	const [loadingBalance, setLoadingBalance] = useState(true);
	const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
	const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
	const [loadingRequests, setLoadingRequests] = useState(true);
	const [deal, setDeal] = useState<Deal | null>(null);

	const navItems = getNavItems('affiliate');

	useEffect(() => {
		if (user && user.accountType === 'affiliate') {
			fetchBalance();
			fetchPaymentRequests();
			fetchDeal();
		}
	}, [user]);

	const fetchBalance = async () => {
		setLoadingBalance(true);
		try {
			const response = await fetch(buildApiUrl('/api/my-balance'), {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setBalance(data);
			}
		} catch (error) {
			console.error('Error fetching balance:', error);
		} finally {
			setLoadingBalance(false);
		}
	};

	const fetchPaymentRequests = async () => {
		setLoadingRequests(true);
		try {
			const response = await fetch(buildApiUrl('/api/my-payment-requests'), {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				const normalizedData = data.map((req: any) => ({
					...req,
					amount: parseFloat(req.amount)
				}));
				setPaymentRequests(normalizedData);
			}
		} catch (error) {
			console.error('Error fetching payment requests:', error);
		} finally {
			setLoadingRequests(false);
		}
	};

	const fetchDeal = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/my-deal'), {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setDeal(data);
			}
		} catch (error) {
			console.error('Error fetching deal:', error);
		}
	};

	const handleRequestSuccess = () => {
		fetchBalance();
		fetchPaymentRequests();
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<motion.div
					className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
					animate={{ rotate: 360 }}
					transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
				/>
			</div>
		);
	}

	if (!user || user.accountType !== 'affiliate') {
		return null;
	}

	const formatCurrency = (amount: number) => {
		return amount.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ') + ' €';
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'pending':
				return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
			case 'accepted':
				return 'bg-green-500/10 text-green-500 border-green-500/20';
			case 'declined':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
			default:
				return 'bg-accent text-muted-foreground border-border';
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'pending':
				return <Clock className="w-4 h-4" />;
			case 'accepted':
				return <CheckCircle className="w-4 h-4" />;
			case 'declined':
				return <XCircle className="w-4 h-4" />;
			default:
				return <AlertCircle className="w-4 h-4" />;
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case 'pending':
				return t('affiliatePayments.status.pending');
			case 'accepted':
				return t('affiliatePayments.status.accepted');
			case 'declined':
				return t('affiliatePayments.status.declined');
			default:
				return status;
		}
	};

	const pendingRequest = paymentRequests.find(req => req.status === 'pending');

	return (
		<div className="min-h-screen bg-background">
			<Navbar user={user} navItems={navItems} onLogout={logout} />

			<div className="relative pt-24 px-4 pb-12">
				<div className="max-w-7xl mx-auto py-8">
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="mb-8 flex items-center justify-between"
					>
						<div>
							<h1 className="text-4xl font-bold text-foreground">{t('affiliatePayments.title')}</h1>
							<p className="text-muted-foreground mt-2">{t('affiliatePayments.subtitle')}</p>
						</div>
					{balance && balance.unpaid_balance > 0 && !pendingRequest && (
							<button
								onClick={() => setIsRequestModalOpen(true)}
								className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
							>
								<Send className="w-5 h-5" />
								{t('affiliatePayments.newPayment')}
							</button>
						)}
					</motion.div>

					{loadingBalance ? (
						<div className="flex justify-center py-20">
							<motion.div
								className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							/>
						</div>
					) : balance ? (
						<>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.1 }}
									className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all"
								>
									<div className="flex items-start justify-between mb-4">
										<div className="flex-1">
											<p className="text-sm text-muted-foreground mb-1">{t('affiliatePayments.totalGenerated')}</p>
										</div>
									</div>
									<div className="mb-4">
										<h2 className="text-4xl font-bold text-foreground">{formatCurrency(balance.total_balance)}</h2>
									</div>
									<div className="space-y-2 pt-3 border-t border-border">
										{deal?.cpa_enabled && (
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">CPA:</span>
												<span className="text-sm font-medium text-foreground">{formatCurrency(balance.cpa_earnings)}</span>
											</div>
										)}
										{deal?.revshare_enabled && (
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">RevShare:</span>
												<span className="text-sm font-medium text-foreground">{formatCurrency(balance.revshare_earnings)}</span>
											</div>
										)}
										{balance.monthly_salary > 0 && (
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">{t('affiliatePayments.fixedCommission')}</span>
												<span className="text-sm font-medium text-foreground">{formatCurrency(balance.salary_earnings)}</span>
											</div>
										)}
									</div>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
									className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all"
								>
									<div className="flex items-start justify-between mb-4">
										<div className="flex-1">
											<p className="text-sm text-muted-foreground mb-1">{t('affiliatePayments.toPay')}</p>
										</div>
									</div>
									<div className="mb-4">
										<h2 className="text-4xl font-bold text-foreground">{formatCurrency(balance.unpaid_balance)}</h2>
									</div>
									<div className="space-y-1">
										<div className="flex items-center gap-1">
											<span className="text-sm font-medium text-foreground">{t('affiliatePayments.pendingPayment')}</span>
											<Clock className="w-3 h-3 text-muted-foreground" />
										</div>
									</div>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3 }}
									className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all"
								>
									<div className="flex items-start justify-between mb-4">
										<div className="flex-1">
											<p className="text-sm text-muted-foreground mb-1">{t('affiliatePayments.alreadyPaid')}</p>
										</div>
									</div>
									<div className="mb-4">
										<h2 className="text-4xl font-bold text-foreground">{formatCurrency(balance.paid_balance)}</h2>
									</div>
									<div className="space-y-1">
										<div className="flex items-center gap-1">
											<span className="text-sm font-medium text-foreground">{t('affiliatePayments.paymentsReceived')}</span>
											<DollarSign className="w-3 h-3 text-muted-foreground" />
										</div>
									</div>
								</motion.div>
							</div>

							<div className="mb-8">
								{balance.monthly_salary > 0 && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.4 }}
										className="bg-card border border-border rounded-xl p-6 mb-4"
									>
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm text-muted-foreground mb-1">{t('affiliatePayments.monthlyFixedCommission')}</p>
												<h3 className="text-2xl font-bold text-foreground">{formatCurrency(balance.monthly_salary)}</h3>
											</div>
											<div className="p-3 bg-primary/10 rounded-lg">
												<DollarSign className="w-6 h-6 text-primary" />
											</div>
										</div>
										<p className="text-xs text-muted-foreground mt-3">
											{t('affiliatePayments.proRatedDaily')}
										</p>
									</motion.div>
								)}
								{balance.last_updated && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.5 }}
										className="text-center"
									>
										<p className="text-sm text-muted-foreground">
											{t('affiliatePayments.lastUpdated')}: {new Date(balance.last_updated).toLocaleString('fr-FR')}
										</p>
									</motion.div>
								)}
							</div>

							{pendingRequest && (
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.5 }}
									className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6 mb-8"
								>
									<div className="flex items-start gap-4">
										<div className="p-3 bg-yellow-500/10 rounded-lg">
											<Clock className="w-6 h-6 text-yellow-500" />
										</div>
										<div className="flex-1">
											<h3 className="text-lg font-bold text-foreground mb-2">{t('affiliatePayments.pendingRequest')}</h3>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<p className="text-sm text-muted-foreground">{t('affiliatePayments.requestedAmount')}</p>
													<p className="text-xl font-bold text-foreground">{formatCurrency(pendingRequest.amount)}</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">{t('affiliatePayments.requestDate')}</p>
													<p className="text-sm font-medium text-foreground">
														{new Date(pendingRequest.created_at).toLocaleDateString('fr-FR', {
															day: 'numeric',
															month: 'long',
															year: 'numeric'
														})}
													</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">{t('affiliatePayments.cryptoNetwork')}</p>
													<p className="text-sm font-medium text-foreground">
														{pendingRequest.crypto_type} ({pendingRequest.network})
													</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">{t('affiliatePayments.wallet')}</p>
													<p className="text-xs font-mono text-foreground break-all">
														{pendingRequest.wallet_address}
													</p>
												</div>
											</div>
											{pendingRequest.note && (
												<div className="mt-4 pt-4 border-t border-yellow-500/20">
													<p className="text-sm text-muted-foreground mb-1">{t('affiliatePayments.note')}</p>
													<p className="text-sm text-foreground">{pendingRequest.note}</p>
												</div>
											)}
										</div>
									</div>
								</motion.div>
							)}

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.6 }}
								className="bg-card border border-border rounded-xl overflow-hidden"
							>
								<div className="p-6 border-b border-border">
									<div className="flex items-center gap-3">
										<div className="p-3 bg-primary/10 rounded-lg">
											<Wallet className="w-6 h-6 text-primary" />
										</div>
										<h2 className="text-2xl font-bold text-foreground">{t('affiliatePayments.paymentHistory')}</h2>
									</div>
								</div>

								{loadingRequests ? (
									<div className="flex justify-center py-20">
										<motion.div
											className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
											animate={{ rotate: 360 }}
											transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
										/>
									</div>
								) : paymentRequests.length === 0 ? (
									<div className="text-center py-12">
										<p className="text-muted-foreground">{t('affiliatePayments.noPaymentRequests')}</p>
										<p className="text-sm text-muted-foreground mt-2">
											{t('affiliatePayments.requestsAppearHere')}
										</p>
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="bg-accent">
												<tr>
													<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliatePayments.table.date')}</th>
													<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliatePayments.table.amount')}</th>
													<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliatePayments.table.cryptoNetwork')}</th>
													<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliatePayments.table.status')}</th>
													<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliatePayments.table.processedOn')}</th>
												</tr>
											</thead>
											<tbody>
												{paymentRequests.map((request) => (
													<tr key={request.id} className="border-b border-border hover:bg-accent/50 transition-colors">
														<td className="p-4">
															<p className="text-sm text-foreground">
																{new Date(request.created_at).toLocaleDateString('fr-FR', {
																	day: 'numeric',
																	month: 'short',
																	year: 'numeric'
																})}
															</p>
														</td>
														<td className="p-4">
															<p className="font-semibold text-foreground">{formatCurrency(request.amount)}</p>
														</td>
														<td className="p-4">
															<div>
																<p className="font-medium text-foreground">{request.crypto_type}</p>
																<p className="text-xs text-muted-foreground">{request.network}</p>
															</div>
														</td>
														<td className="p-4">
															<span
																className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
																	request.status
																)}`}
															>
																{getStatusIcon(request.status)}
																{getStatusLabel(request.status)}
															</span>
														</td>
														<td className="p-4">
															{request.processed_at ? (
																<div>
																	<p className="text-sm text-foreground">
																		{new Date(request.processed_at).toLocaleDateString('fr-FR', {
																			day: 'numeric',
																			month: 'short',
																			year: 'numeric'
																		})}
																	</p>
																</div>
															) : (
																<p className="text-sm text-muted-foreground">-</p>
															)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}

								{paymentRequests.some(req => req.status === 'declined' && req.admin_note) && (
									<div className="p-6 border-t border-border">
										<h3 className="text-sm font-semibold text-foreground mb-3">{t('affiliatePayments.rejectionNotes')}</h3>
										<div className="space-y-3">
											{paymentRequests
												.filter(req => req.status === 'declined' && req.admin_note)
												.map((request) => (
													<div key={request.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
														<div className="flex items-start gap-3">
															<XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
															<div className="flex-1">
																<p className="text-sm font-medium text-foreground mb-1">
																	{t('affiliatePayments.requestOf')} {new Date(request.created_at).toLocaleDateString('fr-FR')} - {formatCurrency(request.amount)}
																</p>
																<p className="text-sm text-muted-foreground">{request.admin_note}</p>
															</div>
														</div>
													</div>
												))}
										</div>
									</div>
								)}
							</motion.div>
						</>
					) : (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="bg-card border border-border rounded-xl p-12 text-center"
						>
							<div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
								<Wallet className="w-8 h-8 text-muted-foreground" />
							</div>
							<p className="text-muted-foreground text-lg">{t('affiliatePayments.noBalanceData')}</p>
						</motion.div>
					)}
				</div>
			</div>

			<PaymentRequestModal
				ftdReferralBalance={balance && deal?.cpa_enabled ? (balance.cpa_earnings - (balance.paid_ftd_referral || 0)) : 0}
				isOpen={isRequestModalOpen}
				revshareBalance={balance && deal?.revshare_enabled ? (balance.revshare_earnings - (balance.paid_revshare || 0)) : 0}
				salaryBalance={balance ? balance.salary_earnings : 0}
				onClose={() => setIsRequestModalOpen(false)}
				onSuccess={handleRequestSuccess}
			/>
		</div>
	);
}