import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import RewardsProgressBar from '../../components/RewardsProgressBar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { TrendingUp, TrendingDown, Users, Euro, Percent, Calendar, ChevronDown, Wallet, Activity, DollarSign, Eye } from 'lucide-react';

interface Statistics {
	totalFtds: number;
	cpaEarnings: number;
	revshareEarnings: number;
	totalEarnings: number;
	cpaEnabled: boolean;
	revshareEnabled: boolean;
	activeTraders: number;
	totalRevshare: number;
	ftdChange: number;
	cpaChange: number;
	revshareChange: number;
	totalChange: number;
	activeTradersChange: number;
	totalRevshareChange: number;
	uniqueVisitors: number;
}

interface DailyRevenue {
	date: string;
	cpaEarnings: number;
	revshareEarnings: number;
	totalEarnings: number;
}

interface Reward {
	id: number;
	name: string;
	image_url: string;
	value_euros: number;
	ftd_required: number;
}

interface RewardClaim {
	id: number;
	reward_id: number;
	status: 'pending' | 'approved' | 'rejected';
}

type Period = 'today' | 'week' | 'month' | 'all' | 'custom';

export default function AffiliateDashboard() {
	const { user, loading, logout } = useAuth();
	const [statistics, setStatistics] = useState<Statistics | null>(null);
	const [allTimeStats, setAllTimeStats] = useState<Statistics | null>(null);
	const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
	const [rewards, setRewards] = useState<Reward[]>([]);
	const [claims, setClaims] = useState<RewardClaim[]>([]);
	const [monthlyFtdCount, setMonthlyFtdCount] = useState(0);
	const [loadingStats, setLoadingStats] = useState(true);
	const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
	const [showPeriodMenu, setShowPeriodMenu] = useState(false);
	const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [salaryClaimStatus, setSalaryClaimStatus] = useState<{
		hasSalary: boolean;
		canClaim: boolean;
		claimStatus: string | null;
		dailyAmount: number;
	} | null>(null);
	const [showSalaryClaimModal, setShowSalaryClaimModal] = useState(false);
	const [proofLink, setProofLink] = useState('');
	const [submittingSalaryClaim, setSubmittingSalaryClaim] = useState(false);

	const navItems = getNavItems('affiliate');

	const periods: { value: Period; label: string }[] = [
		{ value: 'today', label: "Aujourd'hui" },
		{ value: 'week', label: 'Cette semaine' },
		{ value: 'month', label: 'Ce mois' },
		{ value: 'all', label: 'Tout' },
		{ value: 'custom', label: 'Période personnalisée' }
	];

	useEffect(() => {
		if (user && user.accountType === 'affiliate') {
			fetchStatistics();
			fetchAllTimeStats();
			fetchDailyRevenue();
			fetchRewards();
			fetchClaims();
			fetchMonthlyFtdCount();
			fetchSalaryClaimStatus();
		}
	}, [user, selectedPeriod, startDate, endDate]);

	const fetchStatistics = async () => {
		setLoadingStats(true);
		try {
			let url = `${import.meta.env.VITE_API_URL}/api/my-statistics?period=${selectedPeriod}`;
			if (selectedPeriod === 'custom' && startDate && endDate) {
				url += `&startDate=${startDate}&endDate=${endDate}`;
			}
			const response = await fetch(url, {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setStatistics(data);
			}
		} catch (error) {
			console.error('Error fetching statistics:', error);
		} finally {
			setLoadingStats(false);
		}
	};

	const fetchAllTimeStats = async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/my-statistics?period=all`, {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setAllTimeStats(data);
			}
		} catch (error) {
			console.error('Error fetching all time statistics:', error);
		}
	};

	const fetchDailyRevenue = async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/daily-revenue?days=30`, {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setDailyRevenue(data);
			}
		} catch (error) {
			console.error('Error fetching daily revenue:', error);
		}
	};

	const fetchRewards = async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rewards`, { credentials: 'include' });
			if (response.ok) {
				const data = await response.json();
				setRewards(data);
			}
		} catch (error) {
			console.error('Error fetching rewards:', error);
		}
	};

	const fetchMonthlyFtdCount = async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/my-monthly-ftd-count`, {
				credentials: 'include',
			});
			if (response.ok) {
				const data = await response.json();
				setMonthlyFtdCount(data.monthlyFtdCount || 0);
			}
		} catch (error) {
			console.error('Error fetching monthly FTD count:', error);
		}
	};

	const fetchClaims = async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rewards/claims/list`, {
				credentials: 'include',
			});
			if (response.ok) {
				const data = await response.json();
				setClaims(data);
			}
		} catch (error) {
			console.error('Error fetching claims:', error);
		}
	};

	const fetchSalaryClaimStatus = async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/salary-claims/today-status`, {
				credentials: 'include',
			});
			if (response.ok) {
				const data = await response.json();
				setSalaryClaimStatus(data);
			}
		} catch (error) {
			console.error('Error fetching salary claim status:', error);
		}
	};

	const submitSalaryClaim = async () => {
		if (!proofLink.trim()) {
			return;
		}

		setSubmittingSalaryClaim(true);
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/salary-claims/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ proofLink })
			});

			if (response.ok) {
				setShowSalaryClaimModal(false);
				setProofLink('');
				fetchSalaryClaimStatus();
			} else {
				const error = await response.json();
				alert(error.message || 'Erreur lors de la soumission');
			}
		} catch (error) {
			console.error('Error submitting salary claim:', error);
			alert('Erreur lors de la soumission');
		} finally {
			setSubmittingSalaryClaim(false);
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

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
				delayChildren: 0.2
			}
		}
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.5,
				ease: 'easeOut'
			}
		}
	};

	const formatChange = (change: number) => {
		const formatted = Math.abs(change).toFixed(1);
		return change >= 0 ? `+${formatted}%` : `-${formatted}%`;
	};

	const formatNumber = (num: number) => {
		return num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
	};

	const statCards = [
		{
			title: 'Unique Visitors',
			value: statistics?.uniqueVisitors || 0,
			change: 0,
			trend: 'Total des visiteurs uniques',
			icon: Eye,
			show: true
		},
		{
			title: 'Total FTDs',
			value: statistics?.totalFtds || 0,
			change: statistics?.ftdChange || 0,
			trend: 'Nouveaux joueurs',
			icon: Users,
			show: true
		},
		{
			title: 'Gains CPA',
			value: `${formatNumber(statistics?.cpaEarnings || 0)}€`,
			change: statistics?.cpaChange || 0,
			trend: 'Commissions fixes',
			icon: Euro,
			show: statistics?.cpaEnabled || false
		},
		{
			title: 'Gains parrainage',
			value: `${formatNumber(statistics?.referralEarnings || 0)}€`,
			change: statistics?.referralChange || 0,
			trend: 'Gains via sous affiliation',
			icon: DollarSign,
			show: true
		},
		{
			title: 'Gains Revshare',
			value: `${formatNumber(statistics?.revshareEarnings || 0)}€`,
			change: statistics?.revshareChange || 0,
			trend: 'Commissions récurrentes',
			icon: Percent,
			show: statistics?.revshareEnabled || false
		},
		{
			title: 'Total Gains',
			value: `${formatNumber(statistics?.totalEarnings || 0)}€`,
			change: statistics?.totalChange || 0,
			trend: 'Revenus totaux',
			icon: Wallet,
			show: true
		}
	].filter(card => card.show);

	return (
		<div className="min-h-screen bg-background">
			<Navbar user={user} navItems={navItems} onLogout={logout} />

			<div className="relative pt-24 px-4 pb-12">
				<div className="max-w-7xl mx-auto py-8">
					{salaryClaimStatus?.hasSalary && salaryClaimStatus?.canClaim && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6"
						>
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-xl font-bold text-blue-400 mb-2">
										Réclamez votre salaire du jour
									</h3>
									<p className="text-muted-foreground">
										Pour recevoir votre salaire quotidien de {salaryClaimStatus.dailyAmount.toFixed(2)}€, veuillez soumettre le lien de votre travail d'aujourd'hui
									</p>
								</div>
								<button
									onClick={() => setShowSalaryClaimModal(true)}
									className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium whitespace-nowrap"
								>
									Soumettre ma preuve
								</button>
							</div>
						</motion.div>
					)}

					{salaryClaimStatus?.hasSalary && salaryClaimStatus?.claimStatus === 'pending' && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6"
						>
							<div className="flex items-center gap-3">
								<Activity className="w-6 h-6 text-yellow-500" />
								<div>
									<h3 className="text-xl font-bold text-yellow-400">
										Demande en attente
									</h3>
									<p className="text-muted-foreground">
										Votre demande de salaire pour aujourd'hui est en cours de traitement
									</p>
								</div>
							</div>
						</motion.div>
					)}

					{salaryClaimStatus?.hasSalary && salaryClaimStatus?.claimStatus === 'approved' && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6"
						>
							<div className="flex items-center gap-3">
								<TrendingUp className="w-6 h-6 text-green-500" />
								<div>
									<h3 className="text-xl font-bold text-green-400">
										Salaire versé
									</h3>
									<p className="text-muted-foreground">
										Votre salaire du jour a été approuvé et versé sur votre balance
									</p>
								</div>
							</div>
						</motion.div>
					)}

					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
					>
						<div>
							<h1 className="text-4xl font-bold text-foreground">Tableau de bord</h1>
							<p className="text-muted-foreground mt-2">Suivez vos performances et vos gains</p>
						</div>

						<div className="relative">
							<button
								onClick={() => setShowPeriodMenu(!showPeriodMenu)}
								className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-lg hover:bg-accent transition-all"
							>
								<Calendar className="w-5 h-5 text-muted-foreground" />
								<span className="font-medium text-foreground">
									{selectedPeriod === 'custom' && startDate && endDate
										? `${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`
										: periods.find(p => p.value === selectedPeriod)?.label}
								</span>
								<ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showPeriodMenu ? 'rotate-180' : ''}`} />
							</button>

							{showPeriodMenu && (
								<motion.div
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									className="absolute right-0 mt-2 w-48 bg-card rounded-lg border border-border overflow-hidden z-10 shadow-lg"
								>
									{periods.map((period) => (
										<button
											key={period.value}
											onClick={() => {
												if (period.value === 'custom') {
													setShowCustomDatePicker(true);
													setShowPeriodMenu(false);
												} else {
													setSelectedPeriod(period.value);
													setShowPeriodMenu(false);
												}
											}}
											className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
												selectedPeriod === period.value ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground'
											}`}
										>
											{period.label}
										</button>
									))}
								</motion.div>
							)}

							{showCustomDatePicker && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
									onClick={() => setShowCustomDatePicker(false)}
								>
									<motion.div
										initial={{ scale: 0.9, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										onClick={(e) => e.stopPropagation()}
										className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4"
									>
										<h3 className="text-xl font-bold text-foreground mb-6">Sélectionner une période</h3>

										<div className="space-y-4">
											<div>
												<label className="block text-sm font-medium text-foreground mb-2">Date de début</label>
												<input
													type="date"
													value={startDate}
													onChange={(e) => setStartDate(e.target.value)}
													className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-foreground mb-2">Date de fin</label>
												<input
													type="date"
													value={endDate}
													onChange={(e) => setEndDate(e.target.value)}
													className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
												/>
											</div>
										</div>

										<div className="flex gap-3 mt-6">
											<button
												onClick={() => setShowCustomDatePicker(false)}
												className="flex-1 px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-accent transition-colors"
											>
												Annuler
											</button>
											<button
												onClick={() => {
													if (startDate && endDate) {
														setSelectedPeriod('custom');
														setShowCustomDatePicker(false);
													}
												}}
												disabled={!startDate || !endDate}
												className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												Appliquer
											</button>
										</div>
									</motion.div>
								</motion.div>
							)}
						</div>
					</motion.div>

					{loadingStats ? (
						<div className="flex justify-center py-20">
							<motion.div
								className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							/>
						</div>
					) : statistics ? (
						<motion.div
							variants={containerVariants}
							initial="hidden"
							animate="visible"
							className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
						>
							{statCards.map((card, index) => {
								const Icon = card.icon;
								const isPositive = card.change >= 0;
								return (
									<motion.div
										key={index}
										variants={itemVariants}
										className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all relative overflow-hidden"
									>
										<div className="flex items-start justify-between mb-4">
											<div className="flex-1">
												<p className="text-sm text-muted-foreground mb-1">{card.title}</p>
											</div>
											{selectedPeriod !== 'all' && (
												<div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
													isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
												}`}>
													{isPositive ? (
														<TrendingUp className="w-3 h-3" />
													) : (
														<TrendingDown className="w-3 h-3" />
													)}
													<span>{formatChange(card.change)}</span>
												</div>
											)}
										</div>

										<div className="mb-4">
											<h2 className="text-4xl font-bold text-foreground">{card.value}</h2>
										</div>

										<div className="space-y-1">
											<div className="flex items-center gap-1">
												<span className="text-sm font-medium text-foreground">{card.trend}</span>
												<Icon className="w-3 h-3 text-muted-foreground" />
											</div>
										</div>
									</motion.div>
								);
							})}
						</motion.div>
					) : (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="bg-card border border-border rounded-xl p-12 text-center"
						>
							<div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
								<TrendingUp className="w-8 h-8 text-muted-foreground" />
							</div>
							<p className="text-muted-foreground text-lg">Aucune donnée disponible pour cette période</p>
						</motion.div>
					)}

					{/* Calendrier de l'avent masqué */}
					{/* {!loadingStats && allTimeStats && (
						<div className="mt-8">
							<RewardsProgressBar rewards={rewards} claims={claims} ftdCount={monthlyFtdCount} />
						</div>
					)} */}

					{!loadingStats && dailyRevenue.length > 0 && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
							className="mt-8 bg-card border border-border rounded-xl p-6"
						>
							<h2 className="text-2xl font-bold text-foreground mb-6">Revenus des 30 derniers jours</h2>
							<div className="relative h-64">
								<svg className="w-full h-full" viewBox="0 0 800 256" preserveAspectRatio="none">
									<defs>
										<linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
											<stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
											<stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
										</linearGradient>
									</defs>
									{(() => {
										const maxRevenue = Math.max(...dailyRevenue.map(d => d.totalEarnings), 1);
										const points = dailyRevenue.map((d, i) => {
											const x = (i / (dailyRevenue.length - 1)) * 800;
											const y = 256 - (d.totalEarnings / maxRevenue) * 230;
											return `${x},${y}`;
										}).join(' ');

										const areaPoints = `0,256 ${points} 800,256`;

										return (
											<>
												<polyline
													points={areaPoints}
													fill="url(#revenueGradient)"
												/>
												<polyline
													points={points}
													fill="none"
													stroke="rgb(59, 130, 246)"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
												{dailyRevenue.map((d, i) => {
													const x = (i / (dailyRevenue.length - 1)) * 800;
													const y = 256 - (d.totalEarnings / maxRevenue) * 230;
													return (
														<circle
															key={i}
															cx={x}
															cy={y}
															r="3"
															fill="rgb(59, 130, 246)"
															className="hover:r-5 transition-all cursor-pointer"
														/>
													);
												})}
											</>
										);
									})()}
								</svg>
								<div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
									<span>{new Date(dailyRevenue[0]?.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
									<span>{new Date(dailyRevenue[dailyRevenue.length - 1]?.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
								</div>
							</div>
							<div className="mt-6 grid grid-cols-3 gap-4">
								<div className="text-center">
									<p className="text-sm text-muted-foreground mb-1">Total CPA</p>
									<p className="text-xl font-bold text-foreground">
										{dailyRevenue.reduce((sum, d) => sum + d.cpaEarnings, 0).toFixed(2)}€
									</p>
								</div>
								<div className="text-center">
									<p className="text-sm text-muted-foreground mb-1">Total Revshare</p>
									<p className="text-xl font-bold text-foreground">
										{dailyRevenue.reduce((sum, d) => sum + d.revshareEarnings, 0).toFixed(2)}€
									</p>
								</div>
								<div className="text-center">
									<p className="text-sm text-muted-foreground mb-1">Total</p>
									<p className="text-xl font-bold text-blue-500">
										{dailyRevenue.reduce((sum, d) => sum + d.totalEarnings, 0).toFixed(2)}€
									</p>
								</div>
							</div>
						</motion.div>
					)}
				</div>
			</div>

			{showSalaryClaimModal && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
					onClick={() => setShowSalaryClaimModal(false)}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						onClick={(e) => e.stopPropagation()}
						className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4"
					>
						<h3 className="text-2xl font-bold text-foreground mb-6">
							Soumettre ma preuve de travail
						</h3>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-foreground mb-2">
									Lien de votre vidéo ou travail réalisé
								</label>
								<input
									type="text"
									value={proofLink}
									onChange={(e) => setProofLink(e.target.value)}
									placeholder="https://..."
									className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
								/>
							</div>

							<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
								<p className="text-sm text-muted-foreground">
									Montant du salaire journalier: <span className="font-bold text-blue-400">{salaryClaimStatus?.dailyAmount.toFixed(2)}€</span>
								</p>
							</div>
						</div>

						<div className="flex gap-3 mt-6">
							<button
								onClick={() => {
									setShowSalaryClaimModal(false);
									setProofLink('');
								}}
								className="flex-1 px-4 py-3 border border-border rounded-lg text-muted-foreground hover:bg-accent transition-colors"
								disabled={submittingSalaryClaim}
							>
								Annuler
							</button>
							<button
								onClick={submitSalaryClaim}
								disabled={!proofLink.trim() || submittingSalaryClaim}
								className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{submittingSalaryClaim ? 'Envoi...' : 'Soumettre'}
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</div>
	);
}
