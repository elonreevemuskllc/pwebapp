import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { BarChart3, TrendingUp, Users, Eye, Euro, Percent } from 'lucide-react';

interface TrackingCodeStats {
	trackingCode: string;
	displayName: string;
	afp: string;
	ftds: number;
	visitors: number;
	impressions: number;
	deposits: number;
	cpaEarnings: number;
	revshareEarnings: number;
	totalEarnings: number;
}

interface AffiliateDeal {
	cpa_enabled: boolean;
	revshare_enabled: boolean;
}

export default function Statistics() {
	const { user, loading, logout } = useAuth();
	const [stats, setStats] = useState<TrackingCodeStats[]>([]);
	const [loadingStats, setLoadingStats] = useState(true);
	const [deal, setDeal] = useState<AffiliateDeal>({ cpa_enabled: false, revshare_enabled: false });

	const navItems = getNavItems('affiliate');

	useEffect(() => {
		if (user && user.accountType === 'affiliate') {
			fetchDeal();
			fetchStatistics();
		}
	}, [user]);

	const fetchDeal = async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/my-deal`, {
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

	const fetchStatistics = async () => {
		setLoadingStats(true);
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tracking-code-stats`, {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				const formattedData = data.map((stat: TrackingCodeStats) => ({
					...stat,
					ftds: Number(stat.ftds),
					visitors: Number(stat.visitors),
					deposits: Number(stat.deposits),
					cpaEarnings: Number(stat.cpaEarnings),
					revshareEarnings: Number(stat.revshareEarnings),
					totalEarnings: Number(stat.totalEarnings)
				}));
				setStats(formattedData);
			}
		} catch (error) {
			console.error('Error fetching statistics:', error);
		} finally {
			setLoadingStats(false);
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

	const formatNumber = (num: number) => {
		return num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
	};

	const formatInteger = (num: number) => {
		const parsed = parseInt(num.toString(), 10);
		return parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	};

	const totals = stats.reduce(
		(acc, stat) => ({
			ftds: acc.ftds + stat.ftds,
			visitors: acc.visitors + stat.visitors,
			cpaEarnings: acc.cpaEarnings + stat.cpaEarnings,
			revshareEarnings: acc.revshareEarnings + stat.revshareEarnings,
			totalEarnings: acc.totalEarnings + stat.totalEarnings
		}),
		{
			ftds: 0,
			visitors: 0,
			cpaEarnings: 0,
			revshareEarnings: 0,
			totalEarnings: 0
		}
	);

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
						<h1 className="text-4xl font-bold text-foreground">Statistiques par Tracking Code</h1>
						<p className="text-muted-foreground mt-2">Suivez les performances de chaque tracking code</p>
					</motion.div>

					{loadingStats ? (
						<div className="flex justify-center py-20">
							<motion.div
								className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							/>
						</div>
					) : stats.length > 0 ? (
						<>
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
							>
								{deal.cpa_enabled && (
									<div className="bg-card border border-border rounded-xl p-6">
										<div className="flex items-center gap-3 mb-2">
											<div className="p-2 bg-blue-500/10 rounded-lg">
												<Users className="w-5 h-5 text-blue-500" />
											</div>
											<p className="text-sm text-muted-foreground">Total FTDs</p>
										</div>
										<p className="text-3xl font-bold text-foreground">{formatInteger(totals.ftds)}</p>
									</div>
								)}

								<div className="bg-card border border-border rounded-xl p-6">
									<div className="flex items-center gap-3 mb-2">
										<div className="p-2 bg-green-500/10 rounded-lg">
											<Eye className="w-5 h-5 text-green-500" />
										</div>
										<p className="text-sm text-muted-foreground">Total Visiteurs</p>
									</div>
									<p className="text-3xl font-bold text-foreground">{formatInteger(totals.visitors)}</p>
								</div>

								<div className="bg-card border border-border rounded-xl p-6">
									<div className="flex items-center gap-3 mb-2">
										<div className="p-2 bg-purple-500/10 rounded-lg">
											<Euro className="w-5 h-5 text-purple-500" />
										</div>
										<p className="text-sm text-muted-foreground">Total Gains</p>
									</div>
									<p className="text-3xl font-bold text-foreground">{formatNumber(totals.totalEarnings)}€</p>
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4 }}
								className="bg-card border border-border rounded-xl overflow-hidden"
							>
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-accent border-b border-border">
											<tr>
												<th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Nom du Tracking</th>
												<th className="text-center px-6 py-4 text-sm font-semibold text-foreground">AFP</th>
												{deal.cpa_enabled && <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">FTDs</th>}
												<th className="text-center px-6 py-4 text-sm font-semibold text-foreground">Visiteurs</th>
												{deal.cpa_enabled && <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">CPA</th>}
												{deal.revshare_enabled && <th className="text-center px-6 py-4 text-sm font-semibold text-foreground">Revshare</th>}
												<th className="text-center px-6 py-4 text-sm font-semibold text-foreground">Total</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border">
											{stats.map((stat, index) => (
												<motion.tr
													key={stat.trackingCode}
													initial={{ opacity: 0, x: -20 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ delay: 0.1 * index }}
													className="hover:bg-accent/50 transition-colors"
												>
													<td className="px-6 py-4">
														<div className="flex items-center gap-2">
															<div className="p-2 bg-blue-500/10 rounded-lg">
																<BarChart3 className="w-4 h-4 text-blue-500" />
															</div>
															<div>
																<span className="font-medium text-foreground">{stat.displayName}</span>
																<p className="text-xs text-muted-foreground mt-0.5 font-mono">{stat.trackingCode}</p>
															</div>
														</div>
													</td>
													<td className="px-6 py-4 text-center">
														<span className="text-muted-foreground font-medium font-mono text-xs">{stat.afp || '-'}</span>
													</td>
													{deal.cpa_enabled && (
														<td className="px-6 py-4 text-center">
															<span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full font-medium">
																<Users className="w-3 h-3" />
																{formatInteger(stat.ftds)}
															</span>
														</td>
													)}
													<td className="px-6 py-4 text-center">
														<span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-500 rounded-full font-medium">
															<Eye className="w-3 h-3" />
															{formatInteger(stat.visitors)}
														</span>
													</td>
													{deal.cpa_enabled && (
														<td className="px-6 py-4 text-center">
															<span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full font-medium">
																<Euro className="w-3 h-3" />
																{formatNumber(stat.cpaEarnings)}€
															</span>
														</td>
													)}
													{deal.revshare_enabled && (
														<td className="px-6 py-4 text-center">
															<span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/10 text-purple-500 rounded-full font-medium">
																<Percent className="w-3 h-3" />
																{formatNumber(stat.revshareEarnings)}€
															</span>
														</td>
													)}
													<td className="px-6 py-4 text-center">
														<span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full font-bold">
															<TrendingUp className="w-3 h-3" />
															{formatNumber(stat.totalEarnings)}€
														</span>
													</td>
												</motion.tr>
											))}
										</tbody>
										<tfoot className="bg-accent/50 border-t-2 border-primary">
											<tr>
												<td className="px-6 py-4 text-sm font-bold text-foreground">TOTAL</td>
												<td className="px-6 py-4 text-center"></td>
												{deal.cpa_enabled && (
													<td className="px-6 py-4 text-center">
														<span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-500 rounded-full font-bold">
															<Users className="w-3 h-3" />
															{formatInteger(totals.ftds)}
														</span>
													</td>
												)}
												<td className="px-6 py-4 text-center">
													<span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-500 rounded-full font-bold">
														<Eye className="w-3 h-3" />
														{formatInteger(totals.visitors)}
													</span>
												</td>
												{deal.cpa_enabled && (
													<td className="px-6 py-4 text-center">
														<span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-600 rounded-full font-bold">
															<Euro className="w-3 h-3" />
															{formatNumber(totals.cpaEarnings)}€
														</span>
													</td>
												)}
												{deal.revshare_enabled && (
													<td className="px-6 py-4 text-center">
														<span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-500 rounded-full font-bold">
															<Percent className="w-3 h-3" />
															{formatNumber(totals.revshareEarnings)}€
														</span>
													</td>
												)}
												<td className="px-6 py-4 text-center">
													<span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded-full font-bold text-lg">
														<TrendingUp className="w-4 h-4" />
														{formatNumber(totals.totalEarnings)}€
													</span>
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							</motion.div>
						</>
					) : (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="bg-card border border-border rounded-xl p-12 text-center"
						>
							<div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
								<BarChart3 className="w-8 h-8 text-muted-foreground" />
							</div>
							<p className="text-muted-foreground text-lg">Aucun tracking code configuré</p>
							<p className="text-muted-foreground text-sm mt-2">
								Contactez un administrateur pour ajouter des tracking codes à votre compte
							</p>
						</motion.div>
					)}
				</div>
			</div>
		</div>
	);
}
