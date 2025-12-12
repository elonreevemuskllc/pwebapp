import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { TrendingUp, Clock, Check, X, AlertCircle, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../../hooks/useTranslation';
import { buildApiUrl } from '../../utils/api';

interface PaymentRequest {
	id: number;
	user_id: number;
	username: string;
	email: string;
	user_role: 'affiliate' | 'manager';
	amount: number;
	payment_type: 'ftd_referral' | 'revshare' | 'salary';
	crypto_type: string;
	network: string;
	wallet_address: string;
	note: string | null;
	status: 'pending' | 'accepted' | 'declined';
	admin_note: string | null;
	processed_by: number | null;
	processed_by_username: string | null;
	processed_at: string | null;
	created_at: string;
}

interface PaymentStats {
	total_generated: number;
	total_to_pay: number;
	total_paid: number;
}

interface ModalState {
	isOpen: boolean;
	type: 'accept' | 'decline' | 'postpone' | null;
	request: PaymentRequest | null;
}

export default function Payments() {
	const { user, loading, logout } = useAuth();
	const [requests, setRequests] = useState<PaymentRequest[]>([]);
	const [stats, setStats] = useState<PaymentStats | null>(null);
	const [loadingRequests, setLoadingRequests] = useState(true);
	const [loadingStats, setLoadingStats] = useState(true);
	const [modal, setModal] = useState<ModalState>({ isOpen: false, type: null, request: null });
	const [declineReason, setDeclineReason] = useState('');
	const [processingRequest, setProcessingRequest] = useState(false);

	const navItems = getNavItems('admin');
	const { t } = useTranslation();

	useEffect(() => {
		if (user && user.accountType === 'admin') {
			fetchRequests();
			fetchStats();
		}
	}, [user]);

	const fetchRequests = async () => {
		setLoadingRequests(true);
		try {
			const response = await fetch(buildApiUrl('/api/admin/payment-requests'), {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				const normalizedData = data.map((req: any) => ({
					...req,
					amount: parseFloat(req.amount)
				}));
				setRequests(normalizedData);
			}
		} catch (error) {
			console.error('Error fetching requests:', error);
		} finally {
			setLoadingRequests(false);
		}
	};

	const fetchStats = async () => {
		setLoadingStats(true);
		try {
			const response = await fetch(buildApiUrl('/api/admin/payment-stats'), {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				const normalizedStats = {
					total_generated: parseFloat(data.total_generated) || 0,
					total_to_pay: parseFloat(data.total_to_pay) || 0,
					total_paid: parseFloat(data.total_paid) || 0
				};
				setStats(normalizedStats);
			}
		} catch (error) {
			console.error('Error fetching stats:', error);
		} finally {
			setLoadingStats(false);
		}
	};

	const openModal = (type: 'accept' | 'decline' | 'postpone', request: PaymentRequest) => {
		setModal({ isOpen: true, type, request });
		setDeclineReason('');
	};

	const closeModal = () => {
		setModal({ isOpen: false, type: null, request: null });
		setDeclineReason('');
	};

	const handleAccept = async () => {
		if (!modal.request) return;

		setProcessingRequest(true);
		try {
			const response = await fetch(
				buildApiUrl('/api/admin/payment-requests/${modal.request.id}/accept'),
				{
					method: 'PUT',
					credentials: 'include'
				}
			);

			if (response.ok) {
				toast.success(t('adminPayments.toast.acceptSuccess'));
				closeModal();
				fetchRequests();
				fetchStats();
			} else {
				const data = await response.json();
				toast.error(data.error || t('adminPayments.toast.acceptError'));
			}
		} catch (error) {
			toast.error(t('adminPayments.toast.connectionError'));
		} finally {
			setProcessingRequest(false);
		}
	};

	const handleDecline = async () => {
		if (!modal.request || !declineReason.trim()) {
			toast.error(t('adminPayments.toast.reasonRequired'));
			return;
		}

		setProcessingRequest(true);
		try {
			const response = await fetch(
				buildApiUrl('/api/admin/payment-requests/${modal.request.id}/decline'),
				{
					method: 'PUT',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ admin_note: declineReason })
				}
			);

			if (response.ok) {
				toast.success(t('adminPayments.toast.declineSuccess'));
				closeModal();
				fetchRequests();
				fetchStats();
			} else {
				const data = await response.json();
				toast.error(data.error || t('adminPayments.toast.declineError'));
			}
		} catch (error) {
			toast.error(t('adminPayments.toast.connectionError'));
		} finally {
			setProcessingRequest(false);
		}
	};

	const handlePostpone = async () => {
		if (!modal.request) return;

		setProcessingRequest(true);
		try {
			const response = await fetch(
				buildApiUrl('/api/admin/payment-requests/${modal.request.id}/postpone'),
				{
					method: 'PUT',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ admin_note: declineReason || 'À traiter plus tard' })
				}
			);

			if (response.ok) {
				toast.success('Paiement reporté pour traitement ultérieur');
				closeModal();
				fetchRequests();
				fetchStats();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Erreur lors du report de la demande');
			}
		} catch (error) {
			toast.error(t('adminPayments.toast.connectionError'));
		} finally {
			setProcessingRequest(false);
		}
	};

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

	const getStatusLabel = (status: string) => {
		switch (status) {
			case 'pending':
				return t('adminPayments.status.pending');
			case 'accepted':
				return t('adminPayments.status.accepted');
			case 'declined':
				return t('adminPayments.status.declined');
			default:
				return status;
		}
	};

	const getPaymentTypeLabel = (type: string) => {
		switch (type) {
			case 'ftd_referral':
				return t('adminPayments.paymentType.ftd_referral');
			case 'revshare':
				return t('adminPayments.paymentType.revshare');
			case 'salary':
				return t('adminPayments.paymentType.salary');
			default:
				return type;
		}
	};

	const getPaymentTypeColor = (type: string) => {
		switch (type) {
			case 'ftd_referral':
				return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
			case 'revshare':
				return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
			case 'salary':
				return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
			default:
				return 'bg-accent text-muted-foreground border-border';
		}
	};

	const getRoleLabel = (role: string) => {
		switch (role) {
			case 'affiliate':
				return 'Affilié';
			case 'manager':
				return 'Manager';
			default:
				return role;
		}
	};

	const getRoleColor = (role: string) => {
		switch (role) {
			case 'affiliate':
				return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
			case 'manager':
				return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
			default:
				return 'bg-accent text-muted-foreground border-border';
		}
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

	if (!user || user.accountType !== 'admin') {
		return null;
	}

	return (
		<div className="min-h-screen bg-background">
			<Navbar user={user} navItems={navItems} onLogout={logout} />

			<div className="relative pt-24 px-4 pb-12">
				<div className="max-w-7xl mx-auto py-8">
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="mb-8"
					>
						<h1 className="text-4xl font-bold text-foreground">{t('adminPayments.title')}</h1>
						<p className="text-muted-foreground mt-2">{t('adminPayments.description')}</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="p-3 bg-primary/10 rounded-lg">
									<TrendingUp className="w-6 h-6 text-primary" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">{t('adminPayments.totalGenerated')}</p>
									<h2 className="text-2xl font-bold text-foreground">
										{loadingStats ? '...' : formatCurrency(stats?.total_generated || 0)}
									</h2>
								</div>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="p-3 bg-yellow-500/10 rounded-lg">
									<Clock className="w-6 h-6 text-yellow-500" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">{t('adminPayments.toPay')}</p>
									<h2 className="text-2xl font-bold text-foreground">
										{loadingStats ? '...' : formatCurrency(stats?.total_to_pay || 0)}
									</h2>
								</div>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="p-3 bg-green-500/10 rounded-lg">
									<Check className="w-6 h-6 text-green-500" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">{t('adminPayments.alreadyPaid')}</p>
									<h2 className="text-2xl font-bold text-foreground">
										{loadingStats ? '...' : formatCurrency(stats?.total_paid || 0)}
									</h2>
								</div>
							</div>
						</motion.div>
					</div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="bg-card border border-border rounded-xl overflow-hidden"
					>
						<div className="p-6 border-b border-border">
							<h2 className="text-2xl font-bold text-foreground">{t('adminPayments.paymentRequests')}</h2>
						</div>

						{loadingRequests ? (
							<div className="flex justify-center py-20">
								<motion.div
									className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
									animate={{ rotate: 360 }}
									transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
								/>
							</div>
						) : requests.length === 0 ? (
							<div className="p-12 text-center">
								<p className="text-muted-foreground">{t('adminPayments.noRequests')}</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full table-fixed">
									<thead className="bg-accent">
										<tr>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[11%]">Utilisateur</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[8%]">Rôle</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[10%]">Type</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[9%]">Montant</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[9%]">Crypto</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[13%]">Wallet</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[8%]">Date</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[10%]">Statut</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[14%]">Actions</th>
										</tr>
									</thead>
									<tbody>
										{requests.map((request) => (
											<tr key={request.id} className="border-b border-border hover:bg-accent/50 transition-colors">
												<td className="px-2 py-3">
													<p className="font-medium text-foreground text-sm truncate" title={`${request.username} (${request.email})`}>
														{request.username}
													</p>
												</td>
												<td className="px-2 py-3">
													<span
														className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${getRoleColor(
															request.user_role
														)}`}
													>
														{getRoleLabel(request.user_role)}
													</span>
												</td>
												<td className="px-2 py-3">
													<span
														className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${getPaymentTypeColor(
															request.payment_type
														)}`}
													>
														{getPaymentTypeLabel(request.payment_type)}
													</span>
												</td>
												<td className="px-2 py-3">
													<p className="font-semibold text-foreground text-sm">{formatCurrency(request.amount)}</p>
												</td>
												<td className="px-2 py-3">
													<p className="font-medium text-foreground text-xs">{request.crypto_type}</p>
												</td>
												<td className="px-2 py-3">
													<p className="font-mono text-[10px] text-foreground truncate" title={request.wallet_address}>
														{request.wallet_address}
													</p>
												</td>
												<td className="px-2 py-3">
													<p className="text-xs text-muted-foreground">
														{new Date(request.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
													</p>
												</td>
												<td className="px-2 py-3">
													<span
														className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${
															request.status === 'pending' && request.admin_note
																? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
																: getStatusColor(request.status)
														}`}
													>
														{request.status === 'pending' && request.admin_note
															? 'Plus tard'
															: getStatusLabel(request.status)}
													</span>
												</td>
												<td className="px-2 py-3">
													{request.status === 'pending' && (
														<div className="flex gap-1">
															<button
																onClick={() => openModal('accept', request)}
																className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded transition-colors"
																title={t('adminPayments.accept')}
															>
																<Check className="w-3.5 h-3.5" />
															</button>
															<button
																onClick={() => openModal('postpone', request)}
																className="p-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded transition-colors"
																title="Plus tard"
															>
																<PauseCircle className="w-3.5 h-3.5" />
															</button>
															<button
																onClick={() => openModal('decline', request)}
																className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded transition-colors"
																title={t('adminPayments.decline')}
															>
																<X className="w-3.5 h-3.5" />
															</button>
														</div>
													)}
													{request.status !== 'pending' && request.processed_at && (
														<p className="text-[10px] text-muted-foreground">
															{new Date(request.processed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
														</p>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</motion.div>
				</div>
			</div>

			{modal.isOpen && modal.request && (
				<>
					<div
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
						onClick={closeModal}
					/>
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg"
						>
							<div className="p-6 border-b border-border">
								<h3 className="text-xl font-bold text-foreground">
									{modal.type === 'accept' 
										? t('adminPayments.modal.acceptTitle') 
										: modal.type === 'postpone'
										? 'Reporter la demande de paiement'
										: t('adminPayments.modal.declineTitle')}
								</h3>
							</div>

							<div className="p-6">
								<div className="bg-accent rounded-xl p-4 mb-6 space-y-2">
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">{t('adminPayments.modal.affiliate')}:</span>
										<span className="font-medium text-foreground">{modal.request.username}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">{t('adminPayments.modal.type')}:</span>
										<span
											className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getPaymentTypeColor(
												modal.request.payment_type
											)}`}
										>
											{getPaymentTypeLabel(modal.request.payment_type)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">{t('adminPayments.modal.amount')}:</span>
										<span className="font-semibold text-foreground">{formatCurrency(modal.request.amount)}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">{t('adminPayments.modal.crypto')}:</span>
										<span className="font-medium text-foreground">
											{modal.request.crypto_type} ({modal.request.network})
										</span>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-sm text-muted-foreground">{t('adminPayments.modal.wallet')}:</span>
										<span className="font-mono text-xs text-foreground break-all">
											{modal.request.wallet_address}
										</span>
									</div>
									{modal.request.note && (
										<div className="flex flex-col gap-1 pt-2 border-t border-border">
											<span className="text-sm text-muted-foreground">{t('adminPayments.modal.note')}:</span>
											<span className="text-sm text-foreground">{modal.request.note}</span>
										</div>
									)}
								</div>

								{modal.type === 'accept' ? (
									<div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
										<AlertCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
										<div>
											<p className="text-sm font-medium text-green-500">{t('adminPayments.modal.confirmation')}</p>
											<p className="text-sm text-muted-foreground mt-1">
												{t('adminPayments.modal.acceptConfirmationText')}
											</p>
										</div>
									</div>
								) : modal.type === 'postpone' ? (
									<div className="mb-6">
										<div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 mb-4">
											<PauseCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
											<div>
												<p className="text-sm font-medium text-blue-500">Reporter pour traitement ultérieur</p>
												<p className="text-sm text-muted-foreground mt-1">
													Cette demande sera placée en attente sans être acceptée ni refusée.
												</p>
											</div>
										</div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Note (optionnel)
										</label>
										<textarea
											value={declineReason}
											onChange={(e) => setDeclineReason(e.target.value)}
											placeholder="Ajouter une note sur pourquoi c'est reporté..."
											rows={3}
											className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
										/>
									</div>
								) : (
									<div className="mb-6">
										<label className="block text-sm font-medium text-foreground mb-2">
											{t('adminPayments.modal.declineReason')} <span className="text-red-500">*</span>
										</label>
										<textarea
											value={declineReason}
											onChange={(e) => setDeclineReason(e.target.value)}
											placeholder={t('adminPayments.modal.declinePlaceholder')}
											rows={4}
											className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
										/>
									</div>
								)}

								<div className="flex gap-3">
									<button
										onClick={closeModal}
										disabled={processingRequest}
										className="flex-1 px-6 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
									>
										{t('adminPayments.modal.cancel')}
									</button>
									<button
										onClick={modal.type === 'accept' ? handleAccept : modal.type === 'postpone' ? handlePostpone : handleDecline}
										disabled={processingRequest || (modal.type === 'decline' && !declineReason.trim())}
										className={`flex-1 px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 ${
											modal.type === 'accept'
												? 'bg-green-500 text-white hover:bg-green-600'
												: modal.type === 'postpone'
												? 'bg-blue-500 text-white hover:bg-blue-600'
												: 'bg-red-500 text-white hover:bg-red-600'
										}`}
									>
										{processingRequest
											? t('adminPayments.modal.processing')
											: modal.type === 'accept'
											? t('adminPayments.modal.accept')
											: modal.type === 'postpone'
											? 'Reporter'
											: t('adminPayments.modal.decline')}
									</button>
								</div>
							</div>
						</motion.div>
					</div>
				</>
			)}
		</div>
	);
}
