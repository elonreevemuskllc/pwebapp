import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { TrendingUp, Users, DollarSign, Calendar, Clock } from 'lucide-react';

interface Affiliate {
	id: number;
	username: string;
	email: string;
	ftd_count: number;
	commission_per_ftd: number;
	total_commission: number;
}

interface DashboardStats {
	ftd_earnings: number;
	salary_earnings: number;
	total_earnings: number;
	affiliates: Affiliate[];
}

export default function ManagerDashboard() {
	const { user, loading, logout } = useAuth();
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [loadingStats, setLoadingStats] = useState(true);
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');

	const navItems = getNavItems('manager');

	const getToday = () => {
		const today = new Date();
		return today.toISOString().split('T')[0];
	};

	const getYesterday = () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		return yesterday.toISOString().split('T')[0];
	};

	const getThisWeekStart = () => {
		const today = new Date();
		const day = today.getDay();
		const diff = today.getDate() - day + (day === 0 ? -6 : 1);
		const monday = new Date(today.setDate(diff));
		return monday.toISOString().split('T')[0];
	};

	const getLastWeekDates = () => {
		const today = new Date();
		const day = today.getDay();
		const diff = today.getDate() - day + (day === 0 ? -6 : 1);
		const lastMonday = new Date(today.setDate(diff - 7));
		const lastSunday = new Date(today.setDate(lastMonday.getDate() + 6));
		return {
			start: lastMonday.toISOString().split('T')[0],
			end: lastSunday.toISOString().split('T')[0]
		};
	};

	const getThisMonthStart = () => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
	};

	const getLastMonthDates = () => {
		const today = new Date();
		const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
		const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
		return {
			start: firstDayLastMonth.toISOString().split('T')[0],
			end: lastDayLastMonth.toISOString().split('T')[0]
		};
	};

	const setPeriod = (period: string) => {
		const today = getToday();
		switch (period) {
			case 'today':
				setStartDate(today);
				setEndDate(today);
				break;
			case 'yesterday':
				const yesterday = getYesterday();
				setStartDate(yesterday);
				setEndDate(yesterday);
				break;
			case 'thisWeek':
				setStartDate(getThisWeekStart());
				setEndDate(today);
				break;
			case 'lastWeek':
				const lastWeek = getLastWeekDates();
				setStartDate(lastWeek.start);
				setEndDate(lastWeek.end);
				break;
			case 'thisMonth':
				setStartDate(getThisMonthStart());
				setEndDate(today);
				break;
			case 'lastMonth':
				const lastMonth = getLastMonthDates();
				setStartDate(lastMonth.start);
				setEndDate(lastMonth.end);
				break;
			default:
				break;
		}
	};

	useEffect(() => {
		if (user && user.accountType === 'manager') {
			fetchStats();
		}
	}, [user, startDate, endDate]);

	const fetchStats = async () => {
		setLoadingStats(true);
		try {
			let url = `${import.meta.env.VITE_API_URL}/api/manager/dashboard-stats`;

			if (startDate && endDate) {
				url += `?startDate=${startDate}&endDate=${endDate}`;
			}

			const response = await fetch(url, {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setStats(data);
			}
		} catch (error) {
			console.error('Error fetching stats:', error);
		} finally {
			setLoadingStats(false);
		}
	};

	const formatCurrency = (amount: number) => {
		return amount.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ') + ' €';
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
						<h1 className="text-4xl font-bold text-foreground">Tableau de bord Manager</h1>
						<p className="text-muted-foreground mt-2">Gérez votre équipe et suivez vos revenus</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="bg-card border border-border rounded-xl p-6 mb-8"
					>
						<div className="flex items-center gap-3 mb-4">
							<Calendar className="w-5 h-5 text-primary" />
							<h2 className="text-lg font-semibold text-foreground">Filtrer par période</h2>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
							<button
								onClick={() => setPeriod('today')}
								className="flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium"
							>
								<Clock className="w-4 h-4" />
								Aujourd'hui
							</button>
							<button
								onClick={() => setPeriod('yesterday')}
								className="px-3 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors text-sm font-medium"
							>
								Hier
							</button>
							<button
								onClick={() => setPeriod('thisWeek')}
								className="px-3 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors text-sm font-medium"
							>
								Cette semaine
							</button>
							<button
								onClick={() => setPeriod('lastWeek')}
								className="px-3 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors text-sm font-medium"
							>
								Semaine dernière
							</button>
							<button
								onClick={() => setPeriod('thisMonth')}
								className="px-3 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors text-sm font-medium"
							>
								Ce mois
							</button>
							<button
								onClick={() => setPeriod('lastMonth')}
								className="px-3 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors text-sm font-medium"
							>
								Mois dernier
							</button>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-muted-foreground mb-2">
									Date de début
								</label>
								<input
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-muted-foreground mb-2">
									Date de fin
								</label>
								<input
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
									className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
								/>
							</div>
						</div>
						{(startDate || endDate) && (
							<button
								onClick={() => {
									setStartDate('');
									setEndDate('');
								}}
								className="mt-4 px-4 py-2 text-sm bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors"
							>
								Réinitialiser les filtres
							</button>
						)}
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="p-3 bg-blue-500/10 rounded-lg">
									<DollarSign className="w-6 h-6 text-blue-500" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Commissions FTD</p>
									<h2 className="text-2xl font-bold text-foreground">
										{loadingStats ? '...' : formatCurrency(stats?.ftd_earnings || 0)}
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
								<div className="p-3 bg-emerald-500/10 rounded-lg">
									<TrendingUp className="w-6 h-6 text-emerald-500" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Commissions Fixes</p>
									<h2 className="text-2xl font-bold text-foreground">
										{loadingStats ? '...' : formatCurrency(stats?.salary_earnings || 0)}
									</h2>
								</div>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="p-3 bg-primary/10 rounded-lg">
									<TrendingUp className="w-6 h-6 text-primary" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Total Revenus</p>
									<h2 className="text-2xl font-bold text-foreground">
										{loadingStats ? '...' : formatCurrency(stats?.total_earnings || 0)}
									</h2>
								</div>
							</div>
						</motion.div>
					</div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5 }}
						className="bg-card border border-border rounded-xl overflow-hidden"
					>
						<div className="p-6 border-b border-border flex items-center gap-3">
							<Users className="w-6 h-6 text-primary" />
							<h2 className="text-2xl font-bold text-foreground">Affiliés liés</h2>
						</div>

						{loadingStats ? (
							<div className="flex justify-center py-20">
								<motion.div
									className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
									animate={{ rotate: 360 }}
									transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
								/>
							</div>
						) : !stats || stats.affiliates.length === 0 ? (
							<div className="p-12 text-center">
								<Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">Aucun affilié lié</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-accent">
										<tr>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Nom</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">FTDs</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Commission/FTD</th>
											<th className="text-left p-4 text-sm font-medium text-muted-foreground">Total Commission</th>
										</tr>
									</thead>
									<tbody>
										{stats.affiliates.map((affiliate) => (
											<tr key={affiliate.id} className="border-b border-border hover:bg-accent/50 transition-colors">
												<td className="p-4">
													<p className="font-medium text-foreground">{affiliate.username}</p>
												</td>
												<td className="p-4">
													<p className="text-sm text-muted-foreground">{affiliate.email}</p>
												</td>
												<td className="p-4">
													<p className="font-semibold text-foreground">{affiliate.ftd_count}</p>
												</td>
												<td className="p-4">
													<p className="text-foreground">{formatCurrency(affiliate.commission_per_ftd)}</p>
												</td>
												<td className="p-4">
													<p className="font-semibold text-primary">{formatCurrency(affiliate.total_commission)}</p>
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
		</div>
	);
}
