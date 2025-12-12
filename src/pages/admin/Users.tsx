import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import { getNavItems } from '../../config/navigation';
import { Search, Settings, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserStatsModal from '../../components/UserStatsModal';
import { useTranslation } from '../../hooks/useTranslation';
import { buildApiUrl } from '../../utils/api';

interface User {
	id: number;
	username: string;
	email: string;
	role: string;
	state: string;
	is_frozen: boolean;
	note?: string;
}

interface Birthday {
	id: number;
	username: string;
	date_of_birth: string;
	birth_day: number;
	birth_month: number;
}

export default function UsersPage() {
	const { user, loading, logout } = useAuth();
	const navigate = useNavigate();
	const [users, setUsers] = useState<User[]>([]);
	const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [showStatsModal, setShowStatsModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [birthdays, setBirthdays] = useState<Birthday[]>([]);

	const navItems = getNavItems('admin');
	const { t } = useTranslation();

	useEffect(() => {
		if (user?.accountType === 'admin') {
			fetchUsers();
			fetchBirthdays();
		}
	}, [user]);

	useEffect(() => {
		const filtered = users.filter(u =>
			u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
			u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			u.role.toLowerCase().includes(searchTerm.toLowerCase())
		);
		setFilteredUsers(filtered);
	}, [searchTerm, users]);

	const fetchUsers = async () => {
		try {
			setLoadingUsers(true);
			const response = await fetch(buildApiUrl('/api/admin/users'), {
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Failed to fetch users');

			const data = await response.json();
			setUsers(data);
			setFilteredUsers(data);
		} catch (error) {
			toast.error(t('adminUsers.toast.loadError'));
			console.error(error);
		} finally {
			setLoadingUsers(false);
		}
	};

	const fetchBirthdays = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/users/birthdays'), {
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Failed to fetch birthdays');

			const data = await response.json();
			setBirthdays(data);
		} catch (error) {
			console.error('Error fetching birthdays:', error);
		}
	};

	if (loading || !user) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (user.accountType !== 'admin') {
		return null;
	}

	const getRoleBadgeColor = (role: string) => {
		switch (role) {
			case 'admin': return 'bg-red-100 text-red-700 border-red-200';
			case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
			case 'affiliate': return 'bg-green-100 text-green-700 border-green-200';
			default: return 'bg-accent text-foreground border-gray-200';
		}
	};

	const getStateBadgeColor = (state: string) => {
		switch (state) {
			case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
			case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
			case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
			default: return 'bg-accent text-foreground border-gray-200';
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
			<Navbar user={user} navItems={navItems} onLogout={logout} />

			<div className="pt-24 px-4 pb-8">
				<div className="max-w-7xl mx-auto py-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="mb-8"
					>
						<h1 className="text-4xl font-bold text-foreground mb-2">{t('adminUsers.title')}</h1>
						<p className="text-muted-foreground">{t('adminUsers.description')}</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="mb-6 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6"
					>
						<h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
							{t('adminUsers.birthdaysTitle')}
						</h3>
						{birthdays.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{birthdays.map((birthday) => (
									<div
										key={birthday.id}
										className="bg-secondary/50 rounded-lg p-4 border border-border/50 hover:bg-secondary transition-colors"
									>
										<p className="font-medium text-foreground">{birthday.username}</p>
										<p className="text-sm text-muted-foreground">
											{new Date(birthday.date_of_birth).toLocaleDateString('fr-FR', {
												day: '2-digit',
												month: 'long'
											})}
										</p>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8">
								<p className="text-muted-foreground">{t('adminUsers.noBirthdays')}</p>
							</div>
						)}
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="mb-6"
					>
						<div className="relative">
							<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
							<input
								type="text"
								placeholder={t('adminUsers.searchPlaceholder')}
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-12 pr-4 py-3 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
							/>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden"
					>
						{loadingUsers ? (
							<div className="flex items-center justify-center py-12">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-border/50">
											<th className="px-6 py-4 text-left text-sm font-semibold text-foreground">{t('adminUsers.table.username')}</th>
											<th className="px-6 py-4 text-left text-sm font-semibold text-foreground">{t('adminUsers.table.email')}</th>
											<th className="px-6 py-4 text-left text-sm font-semibold text-foreground">{t('adminUsers.table.type')}</th>
											<th className="px-6 py-4 text-left text-sm font-semibold text-foreground">{t('adminUsers.table.state')}</th>
											<th className="px-6 py-4 text-left text-sm font-semibold text-foreground">{t('adminUsers.table.status')}</th>
											<th className="px-6 py-4 text-left text-sm font-semibold text-foreground">{t('adminUsers.table.note')}</th>
											<th className="px-6 py-4 text-right text-sm font-semibold text-foreground">{t('adminUsers.table.actions')}</th>
										</tr>
									</thead>
									<tbody>
										{filteredUsers.length === 0 ? (
											<tr>
												<td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
													{t('adminUsers.noUsersFound')}
												</td>
											</tr>
										) : (
											filteredUsers.map((u, index) => (
												<motion.tr
													key={u.id}
													initial={{ opacity: 0, x: -20 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ delay: index * 0.05 }}
													className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
												>
													<td className="px-6 py-4 text-sm font-medium text-foreground">{u.username}</td>
													<td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
													<td className="px-6 py-4">
														<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(u.role)}`}>
															{u.role.toUpperCase()}
														</span>
													</td>
													<td className="px-6 py-4">
														<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStateBadgeColor(u.state)}`}>
															{u.state === 'accepted' ? t('adminUsers.state.accepted') : u.state === 'pending' ? t('adminUsers.state.pending') : t('adminUsers.state.rejected')}
														</span>
													</td>
													<td className="px-6 py-4">
														{u.is_frozen ? (
															<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-accent text-foreground border-gray-200">
																{t('adminUsers.status.frozen')}
															</span>
														) : (
															<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-700 border-green-200">
																{t('adminUsers.status.active')}
															</span>
														)}
													</td>
													<td className="px-6 py-4 text-sm text-muted-foreground">
														{u.note ? (u.note.length > 10 ? u.note.substring(0, 10) + '...' : u.note) : '-'}
													</td>
													<td className="px-6 py-4 text-right">
														<div className="flex items-center gap-2 justify-end">
															{u.state === 'accepted' && u.role === 'affiliate' && (
																<button
																	onClick={() => {
																		setSelectedUser(u);
																		setShowStatsModal(true);
																	}}
																	className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
																>
																	<BarChart3 className="w-4 h-4" />
																	{t('adminUsers.actions.statistics')}
																</button>
															)}
															{u.state === 'accepted' ? (
																<button
																	onClick={() => navigate(`/admin/user/${u.id}/settings`)}
																	className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
																>
																	<Settings className="w-4 h-4" />
																	{t('adminUsers.actions.settings')}
																</button>
															) : (
																<button
																	disabled
																	className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed text-sm font-medium opacity-50"
																>
																	<Settings className="w-4 h-4" />
																	{t('adminUsers.actions.settings')}
																</button>
															)}
														</div>
													</td>
												</motion.tr>
											))
										)}
									</tbody>
								</table>
							</div>
						)}
					</motion.div>
				</div>
			</div>

			{showStatsModal && selectedUser && (
				<UserStatsModal
					isOpen={showStatsModal}
					user={selectedUser}
					onClose={() => {
						setShowStatsModal(false);
						setSelectedUser(null);
					}}
				/>
			)}
		</div>
	);
}
