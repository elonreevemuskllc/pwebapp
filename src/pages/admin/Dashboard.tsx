import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { TrendingUp, Users, DollarSign, TrendingDown, Activity, KeyRound, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from 'sonner';
import Modal from '../../components/Modal';

interface AffiliateStats {
	userId: number;
	username: string;
	cpa: string | number;
	totalExpenses: number;
	totalSalaries: number;
	profit: number;
	dailyAverage: number;
	revenue: number;
}

interface AdminStats {
	totalCpa: number;
	totalExpenses: number;
	totalSalaries: number;
	netProfit: number;
	totalRevenue: number;
	affiliates: AffiliateStats[];
}

type PeriodType = 'today' | 'week' | 'month' | 'all' | 'custom';
type SortField = 'username' | 'revenue' | 'cpa' | 'totalExpenses' | 'totalSalaries' | 'profit' | 'dailyAverage';
type SortDirection = 'asc' | 'desc' | null;

export default function AdminDashboard() {
	const { user, loading, logout } = useAuth();
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [loadingStats, setLoadingStats] = useState(true);
	const [period, setPeriod] = useState<PeriodType>('today');
	const [customStartDate, setCustomStartDate] = useState('');
	const [customEndDate, setCustomEndDate] = useState('');
	const [showPasswordModal, setShowPasswordModal] = useState(false);
	const [passwordData, setPasswordData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});
	const [changingPassword, setChangingPassword] = useState(false);
	const [sortField, setSortField] = useState<SortField>('revenue');
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

	const navItems = getNavItems('admin');
	const { t } = useTranslation();

	useEffect(() => {
		if (user && user.accountType === 'admin') {
			fetchStats();
		}
	}, [user, period, customStartDate, customEndDate]);

	const fetchStats = async () => {
		setLoadingStats(true);
		try {
			let url = `${import.meta.env.VITE_API_URL}/api/admin/dashboard-stats`;
			const params = new URLSearchParams();

			if (period === 'custom' && customStartDate && customEndDate) {
				params.append('startDate', customStartDate);
				params.append('endDate', customEndDate);
				console.log('[Frontend] Période custom:', customStartDate, 'à', customEndDate);
			} else if (period !== 'all') {
				const { startDate, endDate } = getPeriodDates(period);
				params.append('startDate', startDate);
				params.append('endDate', endDate);
				console.log('[Frontend] Période:', period, '- Dates:', startDate, 'à', endDate);
			} else {
				console.log('[Frontend] Période: Tout');
			}

			if (params.toString()) {
				url += `?${params.toString()}`;
			}

			console.log('[Frontend] URL de requête:', url);

			const response = await fetch(url, {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				console.log('[Frontend] Données reçues:', data);
				setStats(data);
			}
		} catch (error) {
			console.error('Error fetching admin stats:', error);
		} finally {
			setLoadingStats(false);
		}
	};

	const getPeriodDates = (periodType: PeriodType): { startDate: string; endDate: string } => {
		const now = new Date();
		const endDate = now.toISOString().split('T')[0];
		let startDate = '';

		switch (periodType) {
			case 'today':
				startDate = endDate;
				break;
			case 'week':
				const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				startDate = weekAgo.toISOString().split('T')[0];
				break;
			case 'month':
				const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				startDate = monthAgo.toISOString().split('T')[0];
				break;
			default:
				startDate = '2020-01-01';
		}

		return { startDate, endDate };
	};

	const formatCurrency = (amount: number | string) => {
		if (typeof amount === 'string') return amount;
		return amount.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ') + ' €';
	};

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			// Si on clique sur la même colonne, inverser la direction
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			// Nouvelle colonne, tri décroissant par défaut
			setSortField(field);
			setSortDirection('desc');
		}
	};

	const getSortedAffiliates = () => {
		if (!stats?.affiliates) return [];
		
		const sorted = [...stats.affiliates].sort((a, b) => {
			let aValue: any = a[sortField];
			let bValue: any = b[sortField];

			// Gérer le cas où CPA est une string ("Non actif")
			if (sortField === 'cpa') {
				aValue = typeof aValue === 'string' ? 0 : aValue;
				bValue = typeof bValue === 'string' ? 0 : bValue;
			}

			if (sortDirection === 'asc') {
				return aValue > bValue ? 1 : -1;
			} else {
				return aValue < bValue ? 1 : -1;
			}
		});

		return sorted;
	};

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) {
			return <ArrowUpDown className="w-4 h-4 text-muted-foreground opacity-50" />;
		}
		return sortDirection === 'asc' 
			? <ArrowUp className="w-4 h-4 text-primary" />
			: <ArrowDown className="w-4 h-4 text-primary" />;
	};

	const handleChangePassword = async () => {
		if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
			toast.error('Veuillez remplir tous les champs');
			return;
		}

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			toast.error('Les nouveaux mots de passe ne correspondent pas');
			return;
		}

		if (passwordData.newPassword.length < 8) {
			toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères');
			return;
		}

		setChangingPassword(true);

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/change-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					currentPassword: passwordData.currentPassword,
					newPassword: passwordData.newPassword
				})
			});

			if (response.ok) {
				toast.success('Mot de passe modifié avec succès');
				setShowPasswordModal(false);
				setPasswordData({
					currentPassword: '',
					newPassword: '',
					confirmPassword: ''
				});
			} else {
				const data = await response.json();
				toast.error(data.error || 'Erreur lors de la modification du mot de passe');
			}
		} catch (error) {
			console.error('Error changing password:', error);
			toast.error('Erreur lors de la modification du mot de passe');
		} finally {
			setChangingPassword(false);
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
						className="mb-8 flex justify-between items-center"
					>
						<div>
							<h1 className="text-4xl font-bold text-foreground">{t('adminDashboard.title')}</h1>
							<p className="text-muted-foreground mt-2">{t('adminDashboard.description')}</p>
						</div>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setShowPasswordModal(true)}
							className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
						>
							<KeyRound className="w-4 h-4" />
							<span>Modifier mon mot de passe</span>
						</motion.button>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="bg-card border border-border rounded-xl p-6 mb-8"
					>
						<h2 className="text-lg font-semibold text-foreground mb-4">{t('adminDashboard.displayPeriod')}</h2>
						<div className="flex flex-wrap gap-3 mb-4">
							<button
								onClick={() => setPeriod('today')}
								className={`px-4 py-2 rounded-lg transition-all font-medium ${
									period === 'today'
										? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
										: 'bg-accent text-foreground hover:bg-accent/70'
								}`}
							>
								{t('adminDashboard.today')}
							</button>
							<button
								onClick={() => setPeriod('week')}
								className={`px-4 py-2 rounded-lg transition-all font-medium ${
									period === 'week'
										? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
										: 'bg-accent text-foreground hover:bg-accent/70'
								}`}
							>
								{t('adminDashboard.last7days')}
							</button>
							<button
								onClick={() => setPeriod('month')}
								className={`px-4 py-2 rounded-lg transition-all font-medium ${
									period === 'month'
										? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
										: 'bg-accent text-foreground hover:bg-accent/70'
								}`}
							>
								{t('adminDashboard.last30days')}
							</button>
							<button
								onClick={() => setPeriod('all')}
								className={`px-4 py-2 rounded-lg transition-all font-medium ${
									period === 'all'
										? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
										: 'bg-accent text-foreground hover:bg-accent/70'
								}`}
							>
								{t('adminDashboard.all')}
							</button>
							<button
								onClick={() => setPeriod('custom')}
								className={`px-4 py-2 rounded-lg transition-all font-medium ${
									period === 'custom'
										? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
										: 'bg-accent text-foreground hover:bg-accent/70'
								}`}
							>
								{t('adminDashboard.custom')}
							</button>
						</div>

						{period === 'custom' && (
							<div className="flex flex-wrap gap-4">
								<div>
									<label className="block text-sm text-muted-foreground mb-2">{t('adminDashboard.startDate')}</label>
									<input
										type="date"
										value={customStartDate}
										onChange={(e) => setCustomStartDate(e.target.value)}
										className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
									/>
								</div>
								<div>
									<label className="block text-sm text-muted-foreground mb-2">{t('adminDashboard.endDate')}</label>
									<input
										type="date"
										value={customEndDate}
										onChange={(e) => setCustomEndDate(e.target.value)}
										className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
									/>
								</div>
							</div>
						)}
					</motion.div>

					{loadingStats ? (
						<div className="flex justify-center py-20">
							<motion.div
								className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							/>
						</div>
					) : stats ? (
						<>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
									className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all"
								>
									<div className="flex items-start justify-between mb-4">
										<div>
											<p className="text-sm text-muted-foreground mb-1">{t('adminDashboard.totalRevenue')}</p>
											<h2 className="text-3xl font-bold text-blue-500">{formatCurrency(stats.totalRevenue)}</h2>
										</div>
										<div className="p-3 bg-blue-500/10 rounded-lg">
											<TrendingUp className="w-6 h-6 text-blue-500" />
										</div>
									</div>
									<p className="text-xs text-muted-foreground">{t('adminDashboard.totalRevenueDescription')}</p>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.25 }}
									className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all"
								>
									<div className="flex items-start justify-between mb-4">
										<div>
											<p className="text-sm text-muted-foreground mb-1">{t('adminDashboard.totalCpa')}</p>
											<h2 className="text-3xl font-bold text-foreground">{formatCurrency(stats.totalCpa)}</h2>
										</div>
										<div className="p-3 bg-green-500/10 rounded-lg">
											<DollarSign className="w-6 h-6 text-green-500" />
										</div>
									</div>
									<p className="text-xs text-muted-foreground">{t('adminDashboard.totalCpaDescription')}</p>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3 }}
									className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all"
								>
									<div className="flex items-start justify-between mb-4">
										<div>
											<p className="text-sm text-muted-foreground mb-1">{t('adminDashboard.totalExpenses')}</p>
											<h2 className="text-3xl font-bold text-red-500">{formatCurrency(stats.totalExpenses)}</h2>
										</div>
										<div className="p-3 bg-red-500/10 rounded-lg">
											<TrendingDown className="w-6 h-6 text-red-500" />
										</div>
									</div>
									<p className="text-xs text-muted-foreground">{t('adminDashboard.totalExpensesDescription')}</p>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.35 }}
									className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all"
								>
									<div className="flex items-start justify-between mb-4">
										<div>
											<p className="text-sm text-muted-foreground mb-1">{t('adminDashboard.totalSalaries')}</p>
											<h2 className="text-3xl font-bold text-orange-500">{formatCurrency(stats.totalSalaries)}</h2>
										</div>
										<div className="p-3 bg-orange-500/10 rounded-lg">
											<Activity className="w-6 h-6 text-orange-500" />
										</div>
									</div>
									<p className="text-xs text-muted-foreground">{t('adminDashboard.totalSalariesDescription')}</p>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.4 }}
									className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary rounded-xl p-6 hover:shadow-lg hover:shadow-primary/20 transition-all"
								>
									<div className="flex items-start justify-between mb-4">
										<div>
											<p className="text-sm text-muted-foreground mb-1">{t('adminDashboard.netProfit')}</p>
											<h2 className="text-3xl font-bold text-foreground">{formatCurrency(stats.netProfit)}</h2>
										</div>
										<div className="p-3 bg-primary/20 rounded-lg">
											<TrendingUp className="w-6 h-6 text-primary" />
										</div>
									</div>
									<p className="text-xs text-muted-foreground">{t('adminDashboard.netProfitDescription')}</p>
								</motion.div>
							</div>

							{stats.affiliates.length > 0 && (
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.6 }}
									className="bg-card border border-border rounded-xl overflow-hidden"
								>
									<div className="p-6 border-b border-border">
										<div className="flex items-center gap-3">
											<div className="p-3 bg-primary/10 rounded-lg">
												<Users className="w-6 h-6 text-primary" />
											</div>
											<h2 className="text-2xl font-bold text-foreground">{t('adminDashboard.affiliates')}</h2>
										</div>
									</div>

									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="bg-accent">
												<tr>
													<th 
														className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent/70 transition-colors"
														onClick={() => handleSort('username')}
													>
														<div className="flex items-center gap-2">
															{t('adminDashboard.affiliate')}
															<SortIcon field="username" />
														</div>
													</th>
													<th 
														className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent/70 transition-colors"
														onClick={() => handleSort('revenue')}
													>
														<div className="flex items-center gap-2">
															{t('adminDashboard.revenue')}
															<SortIcon field="revenue" />
														</div>
													</th>
													<th 
														className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent/70 transition-colors"
														onClick={() => handleSort('cpa')}
													>
														<div className="flex items-center gap-2">
															{t('adminDashboard.cpa')}
															<SortIcon field="cpa" />
														</div>
													</th>
													<th 
														className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent/70 transition-colors"
														onClick={() => handleSort('totalExpenses')}
													>
														<div className="flex items-center gap-2">
															{t('adminDashboard.expenses')}
															<SortIcon field="totalExpenses" />
														</div>
													</th>
													<th 
														className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent/70 transition-colors"
														onClick={() => handleSort('totalSalaries')}
													>
														<div className="flex items-center gap-2">
															{t('adminDashboard.salaries')}
															<SortIcon field="totalSalaries" />
														</div>
													</th>
													<th 
														className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent/70 transition-colors"
														onClick={() => handleSort('profit')}
													>
														<div className="flex items-center gap-2">
															{t('adminDashboard.profit')}
															<SortIcon field="profit" />
														</div>
													</th>
													<th 
														className="text-left p-4 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-accent/70 transition-colors"
														onClick={() => handleSort('dailyAverage')}
													>
														<div className="flex items-center gap-2">
															{t('adminDashboard.dailyAverage')}
															<SortIcon field="dailyAverage" />
														</div>
													</th>
												</tr>
											</thead>
											<tbody>
												{getSortedAffiliates().map((affiliate, index) => (
													<tr key={index} className="border-b border-border hover:bg-accent/50 transition-colors">
														<td className="p-4">
															<p className="font-semibold text-foreground">{affiliate.username}</p>
														</td>
														<td className="p-4">
															<p className="font-medium text-blue-500">{formatCurrency(affiliate.revenue)}</p>
														</td>
														<td className="p-4">
															<p className={`font-medium ${typeof affiliate.cpa === 'string' ? 'text-muted-foreground' : 'text-green-500'}`}>
																{typeof affiliate.cpa === 'string' ? affiliate.cpa : formatCurrency(affiliate.cpa)}
															</p>
														</td>
														<td className="p-4">
															<p className="font-medium text-red-500">{formatCurrency(affiliate.totalExpenses)}</p>
														</td>
														<td className="p-4">
															<p className="font-medium text-orange-500">{formatCurrency(affiliate.totalSalaries)}</p>
														</td>
														<td className="p-4">
															<p className={`font-bold ${affiliate.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
																{formatCurrency(affiliate.profit)}
															</p>
														</td>
														<td className="p-4">
															<p className={`font-medium ${affiliate.dailyAverage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
																{formatCurrency(affiliate.dailyAverage)}
															</p>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</motion.div>
							)}
						</>
					) : (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="bg-card border border-border rounded-xl p-12 text-center"
						>
							<div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
								<TrendingUp className="w-8 h-8 text-muted-foreground" />
							</div>
							<p className="text-muted-foreground text-lg">{t('adminDashboard.noData')}</p>
						</motion.div>
					)}
				</div>
			</div>

			<Modal
				isOpen={showPasswordModal}
				onClose={() => {
					setShowPasswordModal(false);
					setPasswordData({
						currentPassword: '',
						newPassword: '',
						confirmPassword: ''
					});
				}}
				title="Modifier le mot de passe administrateur"
			>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Mot de passe actuel
						</label>
						<input
							type="password"
							value={passwordData.currentPassword}
							onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
							className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
							placeholder="Entrez votre mot de passe actuel"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Nouveau mot de passe
						</label>
						<input
							type="password"
							value={passwordData.newPassword}
							onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
							className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
							placeholder="Entrez le nouveau mot de passe"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Confirmer le nouveau mot de passe
						</label>
						<input
							type="password"
							value={passwordData.confirmPassword}
							onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
							className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
							placeholder="Confirmez le nouveau mot de passe"
						/>
					</div>

					<div className="flex gap-3 pt-4">
						<button
							onClick={() => {
								setShowPasswordModal(false);
								setPasswordData({
									currentPassword: '',
									newPassword: '',
									confirmPassword: ''
								});
							}}
							className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-accent transition-colors"
						>
							Annuler
						</button>
						<button
							onClick={handleChangePassword}
							disabled={changingPassword}
							className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							{changingPassword ? 'Modification...' : 'Modifier'}
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
