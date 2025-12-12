import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { Copy, CheckCircle, Users } from 'lucide-react';

interface ReferredUser {
	id: number;
	username: string;
	email: string;
	created_at: string;
	state: string;
	ftd_count: number;
	total_earnings: number;
	commission_earned: number;
	commission_type: 'percentage' | 'fixed_per_ftd' | null;
	commission_value: number | null;
}

type Period = 'today' | 'yesterday' | 'custom';

export default function ReferralPage() {
	const { user, loading, logout } = useAuth();
	const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
	const [loadingReferrals, setLoadingReferrals] = useState(true);
	const [copied, setCopied] = useState(false);
	const [period, setPeriod] = useState<Period>('today');
	const [customStartDate, setCustomStartDate] = useState('');
	const [customEndDate, setCustomEndDate] = useState('');

	const navItems = getNavItems('affiliate');

	const referralUrl = `${window.location.origin}/register?referrer=${user?.id || ''}`;

	useEffect(() => {
		if (user && user.accountType === 'affiliate') {
			fetchReferredUsers();
		}
	}, [user, period, customStartDate, customEndDate]);

	const fetchReferredUsers = async () => {
		setLoadingReferrals(true);
		try {
			let url = `${import.meta.env.VITE_API_URL}/api/my-referrals`;
			const params = new URLSearchParams();

			if (period === 'today') {
				const today = new Date().toISOString().split('T')[0];
				params.append('startDate', today);
				params.append('endDate', today);
			} else if (period === 'yesterday') {
				const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
				params.append('startDate', yesterday);
				params.append('endDate', yesterday);
			} else if (period === 'custom' && customStartDate && customEndDate) {
				params.append('startDate', customStartDate);
				params.append('endDate', customEndDate);
			}

			if (params.toString()) {
				url += `?${params.toString()}`;
			}

			const response = await fetch(url, {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setReferredUsers(data);
			}
		} catch (error) {
			console.error('Error fetching referrals:', error);
		} finally {
			setLoadingReferrals(false);
		}
	};

	const copyToClipboard = () => {
		navigator.clipboard.writeText(referralUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
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

	return (
		<div className="min-h-screen bg-background">
			<Navbar user={user} navItems={navItems} onLogout={logout} />

			<div className="relative pt-24 px-4 pb-12">
				<div className="max-w-6xl mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<h1 className="text-4xl font-bold mb-8 text-foreground">Parrainage</h1>

						{/* Period Filter */}
						<div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 mb-8">
							<h2 className="text-lg font-semibold mb-4 text-foreground">Période des gains</h2>
							<div className="flex flex-wrap gap-4 items-end">
								<div className="flex gap-2">
									<button
										onClick={() => setPeriod('today')}
										className={`px-4 py-2 rounded-lg font-medium transition-colors ${
											period === 'today'
												? 'bg-primary text-primary-foreground'
												: 'bg-secondary text-foreground hover:bg-accent'
										}`}
									>
										Aujourd'hui
									</button>
									<button
										onClick={() => setPeriod('yesterday')}
										className={`px-4 py-2 rounded-lg font-medium transition-colors ${
											period === 'yesterday'
												? 'bg-primary text-primary-foreground'
												: 'bg-secondary text-foreground hover:bg-accent'
										}`}
									>
										Hier
									</button>
									<button
										onClick={() => setPeriod('custom')}
										className={`px-4 py-2 rounded-lg font-medium transition-colors ${
											period === 'custom'
												? 'bg-primary text-primary-foreground'
												: 'bg-secondary text-foreground hover:bg-accent'
										}`}
									>
										Personnalisé
									</button>
								</div>

								{period === 'custom' && (
									<div className="flex gap-2 items-center">
										<input
											type="date"
											value={customStartDate}
											onChange={(e) => setCustomStartDate(e.target.value)}
											className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
										/>
										<span className="text-muted-foreground">→</span>
										<input
											type="date"
											value={customEndDate}
											onChange={(e) => setCustomEndDate(e.target.value)}
											className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
										/>
									</div>
								)}
							</div>
						</div>

						{/* Summary Cards */}
						{referredUsers.length > 0 && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
								<div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm text-muted-foreground">Filleuls actifs</span>
										<Users className="w-5 h-5 text-primary" />
									</div>
									<p className="text-3xl font-bold text-foreground">{referredUsers.length}</p>
								</div>
								<div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm text-muted-foreground">Commission totale</span>
										<Copy className="w-5 h-5 text-yellow-500" />
									</div>
									<p className="text-3xl font-bold text-foreground">
										{referredUsers.reduce((sum, r) => sum + r.commission_earned, 0).toFixed(2)}€
									</p>
								</div>
							</div>
						)}

						<div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 mb-8">
							<h2 className="text-xl font-semibold mb-4 text-foreground">Votre lien de parrainage</h2>
							<div className="flex gap-4 items-center">
								<input
									type="text"
									value={referralUrl}
									readOnly
									className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
								/>
								<button
									onClick={copyToClipboard}
									className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
								>
									{copied ? (
										<>
											<CheckCircle className="w-5 h-5" />
											Copié!
										</>
									) : (
										<>
											<Copy className="w-5 h-5" />
											Copier
										</>
									)}
								</button>
							</div>
							<p className="text-sm text-muted-foreground mt-4">
								Partagez ce lien pour parrainer de nouveaux affiliés. Vous pourrez les voir ici une fois leur profil vérifié par un admin.
							</p>
						</div>

						<div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8">
							<div className="flex items-center gap-3 mb-6">
								<Users className="w-6 h-6 text-primary" />
								<h2 className="text-xl font-semibold text-foreground">Personnes parrainées</h2>
								<span className="ml-auto text-sm text-muted-foreground">
									{referredUsers.length} {referredUsers.length > 1 ? 'personnes' : 'personne'}
								</span>
							</div>

							{loadingReferrals ? (
								<div className="flex justify-center py-12">
									<motion.div
										className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
										animate={{ rotate: 360 }}
										transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
									/>
								</div>
							) : referredUsers.length === 0 ? (
								<div className="text-center py-12">
									<Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
									<p className="text-muted-foreground">Aucune personne parrainée pour le moment</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead>
											<tr className="border-b border-border/50">
												<th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Utilisateur</th>
												<th className="text-left py-3 px-3 text-sm font-semibold text-muted-foreground">Email</th>
												<th className="text-right py-3 px-3 text-sm font-semibold text-muted-foreground">Ta commission</th>
												<th className="text-center py-3 px-3 text-sm font-semibold text-muted-foreground">Depuis</th>
											</tr>
										</thead>
										<tbody>
											{referredUsers.map((referral, index) => (
												<motion.tr
													key={referral.id}
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: index * 0.05 }}
													className="border-b border-border/30 hover:bg-accent/50 transition-colors"
												>
													<td className="py-3 px-3 w-[20%]">
														<div className="flex flex-col">
															<span className="text-foreground font-medium text-sm">{referral.username}</span>
															{referral.commission_type && (
																<span className="text-xs text-muted-foreground">
																	{referral.commission_type === 'percentage' 
																		? `${referral.commission_value}%`
																		: `${referral.commission_value}€/FTD`
																	}
																</span>
															)}
														</div>
													</td>
													<td className="py-3 px-3 text-foreground text-sm w-[30%]">{referral.email}</td>
													<td className="py-3 px-3 text-right w-[35%]">
														<span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-sm font-bold whitespace-nowrap">
															+{referral.commission_earned.toFixed(2)}€
														</span>
													</td>
													<td className="py-3 px-3 text-muted-foreground text-xs text-center w-[15%] whitespace-nowrap">
														{new Date(referral.created_at).toLocaleDateString('fr-FR', { 
															day: '2-digit',
															month: '2-digit',
															year: '2-digit'
														})}
													</td>
												</motion.tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
