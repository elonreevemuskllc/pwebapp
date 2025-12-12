import { useEffect, useState } from 'react';
import { X, TrendingUp, DollarSign, Users, Activity, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface User {
	id: number;
	username: string;
	email: string;
}

interface UserStatsModalProps {
	user: User;
	onClose: () => void;
}

interface DashboardStats {
	balance: number;
	pendingBalance: number;
	ftdCount: number;
	conversionRate: string;
	totalClicks: number;
	monthlyEarnings: number;
	canRequestPayment: boolean;
}

interface StatisticsData {
	daily: Array<{
		date: string;
		registrations: number;
		ftds: number;
		revenue: number;
	}>;
	monthly: Array<{
		month: string;
		registrations: number;
		ftds: number;
		revenue: number;
	}>;
}

export default function UserStatsModal({ user, onClose }: UserStatsModalProps) {
	const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
	const [statistics, setStatistics] = useState<StatisticsData | null>(null);
	const [loadingDashboard, setLoadingDashboard] = useState(true);
	const [loadingStats, setLoadingStats] = useState(true);
	const [activeTab, setActiveTab] = useState<'dashboard' | 'daily' | 'monthly'>('dashboard');

	useEffect(() => {
		fetchDashboardStats();
		fetchStatistics();
	}, [user.id]);

	const fetchDashboardStats = async () => {
		try {
			setLoadingDashboard(true);
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${user.id}/dashboard-stats`, {
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Failed to fetch dashboard stats');

			const data = await response.json();
			setDashboardStats(data);
		} catch (error) {
			toast.error('Erreur lors du chargement des statistiques dashboard');
			console.error(error);
		} finally {
			setLoadingDashboard(false);
		}
	};

	const fetchStatistics = async () => {
		try {
			setLoadingStats(true);
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${user.id}/statistics`, {
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Failed to fetch statistics');

			const data = await response.json();
			setStatistics(data);
		} catch (error) {
			toast.error('Erreur lors du chargement des statistiques');
			console.error(error);
		} finally {
			setLoadingStats(false);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.95 }}
				className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
			>
				<div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
					<div>
						<h2 className="text-2xl font-bold text-foreground">Statistiques de {user.username}</h2>
						<p className="text-sm text-muted-foreground mt-1">{user.email}</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-accent rounded-lg transition-colors"
					>
						<X className="w-6 h-6 text-muted-foreground" />
					</button>
				</div>

				<div className="flex border-b border-border">
					<button
						onClick={() => setActiveTab('dashboard')}
						className={`px-6 py-3 text-sm font-medium transition-colors ${
							activeTab === 'dashboard'
								? 'text-primary border-b-2 border-primary bg-primary/5'
								: 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
						}`}
					>
						Dashboard
					</button>
					<button
						onClick={() => setActiveTab('daily')}
						className={`px-6 py-3 text-sm font-medium transition-colors ${
							activeTab === 'daily'
								? 'text-primary border-b-2 border-primary bg-primary/5'
								: 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
						}`}
					>
						Statistiques Journalières
					</button>
					<button
						onClick={() => setActiveTab('monthly')}
						className={`px-6 py-3 text-sm font-medium transition-colors ${
							activeTab === 'monthly'
								? 'text-primary border-b-2 border-primary bg-primary/5'
								: 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
						}`}
					>
						Statistiques Mensuelles
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-6">
					{activeTab === 'dashboard' && (
						<>
							{loadingDashboard ? (
								<div className="flex justify-center py-20">
									<div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
								</div>
							) : dashboardStats ? (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									<div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-6">
										<div className="flex items-start justify-between mb-4">
											<div>
												<p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
												<h3 className="text-3xl font-bold text-green-500">{formatCurrency(dashboardStats.balance)}</h3>
											</div>
											<div className="p-3 bg-green-500/10 rounded-lg">
												<DollarSign className="w-6 h-6 text-green-500" />
											</div>
										</div>
										<p className="text-xs text-muted-foreground">Retirable immédiatement</p>
									</div>

									<div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
										<div className="flex items-start justify-between mb-4">
											<div>
												<p className="text-sm text-muted-foreground mb-1">Solde en attente</p>
												<h3 className="text-3xl font-bold text-yellow-500">{formatCurrency(dashboardStats.pendingBalance)}</h3>
											</div>
											<div className="p-3 bg-yellow-500/10 rounded-lg">
												<Activity className="w-6 h-6 text-yellow-500" />
											</div>
										</div>
										<p className="text-xs text-muted-foreground">En cours de validation</p>
									</div>

									<div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6">
										<div className="flex items-start justify-between mb-4">
											<div>
												<p className="text-sm text-muted-foreground mb-1">FTDs Total</p>
												<h3 className="text-3xl font-bold text-blue-500">{dashboardStats.ftdCount}</h3>
											</div>
											<div className="p-3 bg-blue-500/10 rounded-lg">
												<Users className="w-6 h-6 text-blue-500" />
											</div>
										</div>
										<p className="text-xs text-muted-foreground">Conversions réussies</p>
									</div>

									<div className="bg-card border border-border rounded-xl p-6">
										<div className="flex items-start justify-between mb-4">
											<div>
												<p className="text-sm text-muted-foreground mb-1">Taux de conversion</p>
												<h3 className="text-3xl font-bold text-foreground">{dashboardStats.conversionRate}</h3>
											</div>
											<div className="p-3 bg-primary/10 rounded-lg">
												<TrendingUp className="w-6 h-6 text-primary" />
											</div>
										</div>
										<p className="text-xs text-muted-foreground">Clicks vers FTDs</p>
									</div>

									<div className="bg-card border border-border rounded-xl p-6">
										<div className="flex items-start justify-between mb-4">
											<div>
												<p className="text-sm text-muted-foreground mb-1">Total Clicks</p>
												<h3 className="text-3xl font-bold text-foreground">{dashboardStats.totalClicks}</h3>
											</div>
											<div className="p-3 bg-primary/10 rounded-lg">
												<Activity className="w-6 h-6 text-primary" />
											</div>
										</div>
										<p className="text-xs text-muted-foreground">Traffic généré</p>
									</div>

									<div className="bg-card border border-border rounded-xl p-6">
										<div className="flex items-start justify-between mb-4">
											<div>
												<p className="text-sm text-muted-foreground mb-1">Gains mensuels</p>
												<h3 className="text-3xl font-bold text-foreground">{formatCurrency(dashboardStats.monthlyEarnings)}</h3>
											</div>
											<div className="p-3 bg-primary/10 rounded-lg">
												<Calendar className="w-6 h-6 text-primary" />
											</div>
										</div>
										<p className="text-xs text-muted-foreground">Ce mois-ci</p>
									</div>
								</div>
							) : (
								<p className="text-center text-muted-foreground py-20">Aucune donnée disponible</p>
							)}
						</>
					)}

					{activeTab === 'daily' && (
						<>
							{loadingStats ? (
								<div className="flex justify-center py-20">
									<div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
								</div>
							) : statistics?.daily && statistics.daily.length > 0 ? (
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-accent">
											<tr>
												<th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
												<th className="text-right p-4 text-sm font-medium text-muted-foreground">Inscriptions</th>
												<th className="text-right p-4 text-sm font-medium text-muted-foreground">FTDs</th>
												<th className="text-right p-4 text-sm font-medium text-muted-foreground">Revenu</th>
											</tr>
										</thead>
										<tbody>
											{statistics.daily.map((stat, index) => (
												<tr key={index} className="border-b border-border hover:bg-accent/50 transition-colors">
													<td className="p-4 text-sm font-medium text-foreground">{stat.date}</td>
													<td className="p-4 text-sm text-right text-foreground">{stat.registrations}</td>
													<td className="p-4 text-sm text-right text-blue-500 font-medium">{stat.ftds}</td>
													<td className="p-4 text-sm text-right text-green-500 font-bold">{formatCurrency(stat.revenue)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<p className="text-center text-muted-foreground py-20">Aucune statistique journalière disponible</p>
							)}
						</>
					)}

					{activeTab === 'monthly' && (
						<>
							{loadingStats ? (
								<div className="flex justify-center py-20">
									<div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
								</div>
							) : statistics?.monthly && statistics.monthly.length > 0 ? (
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-accent">
											<tr>
												<th className="text-left p-4 text-sm font-medium text-muted-foreground">Mois</th>
												<th className="text-right p-4 text-sm font-medium text-muted-foreground">Inscriptions</th>
												<th className="text-right p-4 text-sm font-medium text-muted-foreground">FTDs</th>
												<th className="text-right p-4 text-sm font-medium text-muted-foreground">Revenu</th>
											</tr>
										</thead>
										<tbody>
											{statistics.monthly.map((stat, index) => (
												<tr key={index} className="border-b border-border hover:bg-accent/50 transition-colors">
													<td className="p-4 text-sm font-medium text-foreground">{stat.month}</td>
													<td className="p-4 text-sm text-right text-foreground">{stat.registrations}</td>
													<td className="p-4 text-sm text-right text-blue-500 font-medium">{stat.ftds}</td>
													<td className="p-4 text-sm text-right text-green-500 font-bold">{formatCurrency(stat.revenue)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<p className="text-center text-muted-foreground py-20">Aucune statistique mensuelle disponible</p>
							)}
						</>
					)}
				</div>
			</motion.div>
		</div>
	);
}
