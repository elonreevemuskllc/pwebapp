import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import ExpenseRequestModal from '../../components/ExpenseRequestModal';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { Receipt, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { buildApiUrl } from '../../utils/api';

interface ExpenseReimbursement {
	id: number;
	amount: number;
	description: string;
	crypto_type: string;
	network: string;
	wallet_address: string;
	status: 'pending' | 'accepted' | 'declined';
	admin_note: string | null;
	processed_by_username: string | null;
	processed_at: string | null;
	created_at: string;
}

export default function Expenses() {
	const { user, loading, logout } = useAuth();
	const { t } = useTranslation();
	const [expenses, setExpenses] = useState<ExpenseReimbursement[]>([]);
	const [loadingExpenses, setLoadingExpenses] = useState(true);
	const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

	const navItems = getNavItems('affiliate');

	useEffect(() => {
		if (user && user.accountType === 'affiliate') {
			fetchExpenses();
		}
	}, [user]);

	const fetchExpenses = async () => {
		setLoadingExpenses(true);
		try {
			const response = await fetch(buildApiUrl('/api/my-expense-reimbursements'), {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				const normalizedData = data.map((exp: any) => ({
					...exp,
					amount: parseFloat(exp.amount)
				}));
				setExpenses(normalizedData);
			}
		} catch (error) {
			console.error('Error fetching expenses:', error);
		} finally {
			setLoadingExpenses(false);
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

	const getStatusLabel = (status: 'pending' | 'accepted' | 'declined') => {
		return t(`affiliateExpenses.status.${status}`);
	};

	const pendingExpense = expenses.find(exp => exp.status === 'pending');

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
							<h1 className="text-4xl font-bold text-foreground">{t('affiliateExpenses.title')}</h1>
							<p className="text-muted-foreground mt-2">{t('affiliateExpenses.subtitle')}</p>
						</div>
						<button
							onClick={() => setIsRequestModalOpen(true)}
							className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
						>
							<Plus className="w-5 h-5" />
							{t('affiliateExpenses.newExpense')}
						</button>
					</motion.div>

					{pendingExpense && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6 mb-8"
						>
							<div className="flex items-start gap-4">
								<div className="p-3 bg-yellow-500/10 rounded-lg">
									<Clock className="w-6 h-6 text-yellow-500" />
								</div>
								<div className="flex-1">
									<h3 className="text-lg font-bold text-foreground mb-2">{t('affiliateExpenses.pendingRequest')}</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<p className="text-sm text-muted-foreground">{t('affiliateExpenses.amount')}</p>
											<p className="text-xl font-bold text-foreground">{formatCurrency(pendingExpense.amount)}</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">{t('affiliateExpenses.requestDate')}</p>
											<p className="text-sm font-medium text-foreground">
												{new Date(pendingExpense.created_at).toLocaleDateString('fr-FR', {
													day: 'numeric',
													month: 'long',
													year: 'numeric'
												})}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">{t('affiliateExpenses.cryptoNetwork')}</p>
											<p className="text-sm font-medium text-foreground">
												{pendingExpense.crypto_type} ({pendingExpense.network})
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">{t('affiliateExpenses.wallet')}</p>
											<p className="text-xs font-mono text-foreground break-all">
												{pendingExpense.wallet_address}
											</p>
										</div>
									</div>
									<div className="mt-4 pt-4 border-t border-yellow-500/20">
										<p className="text-sm text-muted-foreground mb-1">{t('affiliateExpenses.description')}</p>
										<p className="text-sm text-foreground whitespace-pre-wrap">{pendingExpense.description}</p>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="bg-card border border-border rounded-xl overflow-hidden"
					>
						<div className="p-6 border-b border-border">
							<div className="flex items-center gap-3">
								<div className="p-3 bg-primary/10 rounded-lg">
									<Receipt className="w-6 h-6 text-primary" />
								</div>
								<h2 className="text-2xl font-bold text-foreground">{t('affiliateExpenses.historyTitle')}</h2>
							</div>
						</div>

						{loadingExpenses ? (
							<div className="flex justify-center py-20">
								<motion.div
									className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
									animate={{ rotate: 360 }}
									transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
								/>
							</div>
						) : expenses.length === 0 ? (
							<div className="text-center py-12">
								<p className="text-muted-foreground">{t('affiliateExpenses.noRequests')}</p>
								<p className="text-sm text-muted-foreground mt-2">
									{t('affiliateExpenses.requestsAppearHere')}
								</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-accent">
										<tr>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliateExpenses.table.date')}</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliateExpenses.table.amount')}</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliateExpenses.table.description')}</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliateExpenses.table.cryptoNetwork')}</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliateExpenses.table.status')}</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('affiliateExpenses.table.processedOn')}</th>
										</tr>
									</thead>
									<tbody>
										{expenses.map((expense) => (
											<tr key={expense.id} className="border-b border-border hover:bg-accent/50 transition-colors">
												<td className="p-4">
													<p className="text-sm text-foreground">
														{new Date(expense.created_at).toLocaleDateString('fr-FR', {
															day: 'numeric',
															month: 'short',
															year: 'numeric'
														})}
													</p>
												</td>
												<td className="p-4">
													<p className="font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
												</td>
												<td className="p-4">
													<p className="text-sm text-foreground max-w-xs truncate" title={expense.description}>
														{expense.description}
													</p>
												</td>
												<td className="p-4">
													<div>
														<p className="font-medium text-foreground">{expense.crypto_type}</p>
														<p className="text-xs text-muted-foreground">{expense.network}</p>
													</div>
												</td>
												<td className="p-4">
													<span
														className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
															expense.status
														)}`}
													>
														{getStatusIcon(expense.status)}
														{getStatusLabel(expense.status as 'pending' | 'accepted' | 'declined')}
													</span>
												</td>
												<td className="p-4">
													{expense.processed_at ? (
														<div>
															<p className="text-sm text-foreground">
																{new Date(expense.processed_at).toLocaleDateString('fr-FR', {
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

						{expenses.some(exp => exp.status === 'declined' && exp.admin_note) && (
							<div className="p-6 border-t border-border">
								<h3 className="text-sm font-semibold text-foreground mb-3">{t('affiliateExpenses.rejectionNotes')}</h3>
								<div className="space-y-3">
									{expenses
										.filter(exp => exp.status === 'declined' && exp.admin_note)
										.map((expense) => (
											<div key={expense.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
												<div className="flex items-start gap-3">
													<XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
													<div className="flex-1">
														<p className="text-sm font-medium text-foreground mb-1">
															{t('affiliateExpenses.requestOf')} {new Date(expense.created_at).toLocaleDateString('fr-FR')} - {formatCurrency(expense.amount)}
														</p>
														<p className="text-xs text-muted-foreground mb-2">{expense.description}</p>
														<p className="text-sm text-muted-foreground">{expense.admin_note}</p>
													</div>
												</div>
											</div>
										))}
								</div>
							</div>
						)}
					</motion.div>
				</div>
			</div>

			<ExpenseRequestModal
				isOpen={isRequestModalOpen}
				onClose={() => setIsRequestModalOpen(false)}
				onSuccess={fetchExpenses}
			/>
		</div>
	);
}
