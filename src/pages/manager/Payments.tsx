import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { Wallet, TrendingUp, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import PaymentRequestModal from '../../components/PaymentRequestModal';

interface Balance {
	manager_ftd_earnings: number;
	manager_salary_earnings: number;
	paid_balance: number;
}

interface PaymentRequest {
	id: number;
	amount: number;
	payment_type: 'ftd_referral' | 'salary';
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

export default function ManagerPayments() {
	const { user, loading, logout } = useAuth();
	const [balance, setBalance] = useState<Balance | null>(null);
	const [requests, setRequests] = useState<PaymentRequest[]>([]);
	const [loadingBalance, setLoadingBalance] = useState(true);
	const [loadingRequests, setLoadingRequests] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [canRequestPayment, setCanRequestPayment] = useState(true);
	const [nextPaymentDate, setNextPaymentDate] = useState<string | null>(null);

	const navItems = getNavItems('manager');

	useEffect(() => {
		if (user && user.accountType === 'manager') {
			fetchBalance();
			fetchRequests();
		}
	}, [user]);

	const fetchBalance = async () => {
		setLoadingBalance(true);
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/manager/balance`, {
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

	const fetchRequests = async () => {
		setLoadingRequests(true);
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/my-payment-requests`, {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setRequests(data);

				const lastAcceptedOrPending = data.find((req: PaymentRequest) =>
					req.status === 'accepted' || req.status === 'pending'
				);

				if (lastAcceptedOrPending) {
					const lastDate = new Date(lastAcceptedOrPending.created_at);
					const today = new Date();
					const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

					if (daysSince < 30) {
						setCanRequestPayment(false);
						const nextDate = new Date(lastDate);
						nextDate.setDate(nextDate.getDate() + 30);
						setNextPaymentDate(nextDate.toLocaleDateString('fr-FR'));
					} else {
						setCanRequestPayment(true);
						setNextPaymentDate(null);
					}
				}
			}
		} catch (error) {
			console.error('Error fetching payment requests:', error);
		} finally {
			setLoadingRequests(false);
		}
	};

	const handleRequestPayment = () => {
		setIsModalOpen(true);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
		fetchBalance();
		fetchRequests();
	};

	const formatCurrency = (amount: number) => {
		return amount.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ') + ' €';
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'pending':
				return 'text-yellow-500';
			case 'accepted':
				return 'text-green-500';
			case 'declined':
				return 'text-red-500';
			default:
				return 'text-muted-foreground';
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
				return null;
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case 'pending':
				return 'En attente';
			case 'accepted':
				return 'Accepté';
			case 'declined':
				return 'Refusé';
			default:
				return status;
		}
	};

	const getPaymentTypeLabel = (type: string) => {
		switch (type) {
			case 'ftd_referral':
				return 'FTD';
			case 'salary':
				return 'Commissions Fixes';
			default:
				return type;
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

	if (!user || user.accountType !== 'manager') {
		return null;
	}

	const ftdBalance = (balance?.manager_ftd_earnings || 0);
	const salaryBalance = (balance?.manager_salary_earnings || 0);

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
						<h1 className="text-4xl font-bold text-foreground">Paiements</h1>
						<p className="text-muted-foreground mt-2">Gérez vos demandes de paiement</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="p-3 bg-blue-500/10 rounded-lg">
									<TrendingUp className="w-6 h-6 text-blue-500" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Solde FTD</p>
									<h2 className="text-2xl font-bold text-foreground">
										{loadingBalance ? '...' : formatCurrency(ftdBalance)}
									</h2>
								</div>
							</div>
							<p className="text-xs text-muted-foreground">
								Paiement possible les mercredis
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="p-3 bg-emerald-500/10 rounded-lg">
									<Wallet className="w-6 h-6 text-emerald-500" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Solde Commissions Fixes</p>
									<h2 className="text-2xl font-bold text-foreground">
										{loadingBalance ? '...' : formatCurrency(salaryBalance)}
									</h2>
								</div>
							</div>
							<p className="text-xs text-muted-foreground">
								Prorata journalier automatique
							</p>
						</motion.div>
					</div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="bg-card border border-border rounded-xl p-6 mb-8"
					>
						<button
							onClick={handleRequestPayment}
							className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
						>
							<Wallet className="w-5 h-5" />
							Demander un paiement
						</button>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="bg-card border border-border rounded-xl overflow-hidden"
					>
						<div className="p-6 border-b border-border">
							<h2 className="text-2xl font-bold text-foreground">Historique des demandes</h2>
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
								<Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">Aucune demande de paiement</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-accent">
										<tr>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Montant</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Crypto/Réseau</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
										</tr>
									</thead>
									<tbody>
										{requests.map((request) => (
											<tr key={request.id} className="border-b border-border hover:bg-accent/50 transition-colors">
												<td className="p-4">
													<span className="text-sm font-medium text-foreground">
														{getPaymentTypeLabel(request.payment_type)}
													</span>
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
													<p className="text-sm text-muted-foreground">
														{new Date(request.created_at).toLocaleDateString('fr-FR')}
													</p>
												</td>
												<td className="p-4">
													<div className={`flex items-center gap-2 ${getStatusColor(request.status)}`}>
														{getStatusIcon(request.status)}
														<span className="text-sm font-medium">{getStatusLabel(request.status)}</span>
													</div>
													{request.status === 'declined' && request.admin_note && (
														<p className="text-xs text-red-500 mt-1">{request.admin_note}</p>
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

			{isModalOpen && (
				<PaymentRequestModal
					isOpen={isModalOpen}
					onClose={handleModalClose}
					ftdReferralBalance={ftdBalance}
					revshareBalance={0}
					salaryBalance={salaryBalance}
					onSuccess={handleModalClose}
				/>
			)}
		</div>
	);
}
