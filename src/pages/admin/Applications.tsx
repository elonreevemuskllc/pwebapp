import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getNavItems } from '../../config/navigation';
import {
	Search,
	X,
	Check,
	Clock,
	XCircle,
	CheckCircle,
	User,
	Users,
	Eye,
	Calendar,
	Mail
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { buildApiUrl } from '../../utils/api';

interface Application {
	id: number;
	username: string;
	email: string;
	role: string;
	state: 'pending' | 'accepted' | 'rejected';
	reject_reason: string | null;
	is_verified: boolean;
	application_data: string | null;
	referrer: number | null;
	manager: number | null;
	created_at: string;
	referrer_username: string | null;
	referrer_email: string | null;
	manager_username: string | null;
	manager_email: string | null;
	cpa_enabled: boolean;
	cpa_amount: number;
	revshare_enabled: boolean;
	revshare_percentage: number;
}

interface UserSearchResult {
	id: number;
	username: string;
	email: string;
	role: string;
}

export default function Applications() {
	const { t } = useTranslation();
	const { user, loading, logout } = useAuth();
	const [applications, setApplications] = useState<Application[]>([]);
	const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
	const [loadingData, setLoadingData] = useState(true);
	const [selectedApp, setSelectedApp] = useState<Application | null>(null);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [showAcceptModal, setShowAcceptModal] = useState(false);
	const [rejectReason, setRejectReason] = useState('');
	const [acceptData, setAcceptData] = useState({
		role: 'affiliate',
		cpaEnabled: false,
		cpaAmount: 0,
		revshareEnabled: false,
		revsharePercentage: 0,
		managerCpaPerFtd: 0,
		salary: 0,
		salaryPaymentFrequencyDays: 7,
		trackingCodes: '' as string,
		referrerCommissionType: 'percentage' as 'percentage' | 'fixed_per_ftd',
		referrerShavePercentage: 0,
		referrerFixedPerFtd: 0
	});
	const [trackingCodesList, setTrackingCodesList] = useState<Array<{displayName: string, code: string}>>([{displayName: '', code: ''}]);
	const [showReferrerSearch, setShowReferrerSearch] = useState(false);
	const [showManagerSearch, setShowManagerSearch] = useState(false);
	const [userSearchQuery, setUserSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
	const [actionLoading, setActionLoading] = useState(false);

	const navItems = getNavItems('admin');

	useEffect(() => {
		if (user?.accountType === 'admin') {
			fetchApplications();
		}
	}, [user]);

	useEffect(() => {
		let filtered = applications;

		if (statusFilter !== 'all') {
			filtered = filtered.filter(app => app.state === statusFilter);
		}

		if (searchTerm) {
			filtered = filtered.filter(app =>
				app.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
				app.email.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		setFilteredApplications(filtered);
	}, [applications, searchTerm, statusFilter]);

	const fetchApplications = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/applications'), {
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Failed to fetch applications');

			const data = await response.json();
			setApplications(data.applications);
			setFilteredApplications(data.applications);
		} catch (error) {
			toast.error(t('applications.loadError'));
		} finally {
			setLoadingData(false);
		}
	};

	const searchUsers = async (query: string, role?: 'manager' | 'affiliate') => {
		if (!query.trim()) {
			setSearchResults([]);
			return;
		}

		try {
			const params = new URLSearchParams({ query });
			if (role) params.append('role', role);

			const response = await fetch(buildApiUrl('/api/admin/search-users?${params}'), {
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Search failed');

			const data = await response.json();
			setSearchResults(data.users);
		} catch (error) {
			toast.error(t('applications.searchError'));
		}
	};

	const handleReject = async () => {
		if (!selectedApp || !rejectReason.trim()) {
			toast.error(t('applications.reasonRequired'));
			return;
		}

		setActionLoading(true);
		try {
			const response = await fetch(buildApiUrl('/api/admin/applications/${selectedApp.id}/reject'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ reason: rejectReason })
			});

			if (!response.ok) throw new Error('Rejection failed');

			toast.success(t('applications.rejectSuccess'));
			setShowRejectModal(false);
			setRejectReason('');
			setSelectedApp(null);
			fetchApplications();
		} catch (error) {
			toast.error(t('applications.rejectError'));
		} finally {
			setActionLoading(false);
		}
	};

	const handleAccept = async () => {
		if (!selectedApp) return;

		setActionLoading(true);
		try {
			const filteredTrackingCodes = trackingCodesList.filter(tc => tc.code.trim() && tc.displayName.trim());

			const response = await fetch(buildApiUrl('/api/admin/applications/${selectedApp.id}/accept'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					...acceptData,
					trackingCodesWithNames: filteredTrackingCodes
				})
			});

			if (!response.ok) throw new Error('Acceptance failed');

			toast.success(t('applications.acceptSuccess'));
			setShowAcceptModal(false);
			setSelectedApp(null);
			setAcceptData({
				role: 'affiliate',
				cpaEnabled: false,
				cpaAmount: 0,
				revshareEnabled: false,
				revsharePercentage: 0,
				managerCpaPerFtd: 0,
				salary: 0,
				salaryPaymentFrequencyDays: 7,
				trackingCodes: '',
				referrerCommissionType: 'percentage',
				referrerShavePercentage: 0,
				referrerFixedPerFtd: 0
			});
			setTrackingCodesList([{displayName: '', code: ''}]);
			fetchApplications();
		} catch (error) {
			toast.error(t('applications.acceptError'));
		} finally {
			setActionLoading(false);
		}
	};

	const updateReferrer = async (appId: number, referrerId: number | null) => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/applications/${appId}/update-referrer'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ referrerId })
			});

			if (!response.ok) throw new Error('Update failed');

			toast.success(t('applications.referrerUpdateSuccess'));
			fetchApplications();
		} catch (error) {
			toast.error(t('applications.referrerUpdateError'));
		}
	};

	const updateManager = async (appId: number, managerId: number | null) => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/applications/${appId}/update-manager'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ managerId })
			});

			if (!response.ok) throw new Error('Update failed');

			toast.success(t('applications.managerUpdateSuccess'));
			fetchApplications();
		} catch (error) {
			toast.error(t('applications.managerUpdateError'));
		}
	};

	if (loading || loadingData) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!user || user.accountType !== 'admin') {
		return null;
	}

	const getStatusBadge = (state: string) => {
		switch (state) {
			case 'pending':
				return (
					<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
						<Clock className="w-3 h-3" />
						{t('applications.pending')}
					</span>
				);
			case 'accepted':
				return (
					<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
						<CheckCircle className="w-3 h-3" />
						{t('applications.accepted')}
					</span>
				);
			case 'rejected':
				return (
					<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
						<XCircle className="w-3 h-3" />
						{t('applications.rejected')}
					</span>
				);
			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
			<Navbar user={user} navItems={navItems} onLogout={logout} />

			<div className="pt-24 px-4 pb-12">
				<div className="max-w-7xl mx-auto py-8">
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-foreground">{t('applications.title')}</h1>
						<p className="text-muted-foreground mt-2">{t('applications.subtitle')}</p>
					</div>

					<div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 mb-6">
						<div className="flex flex-col sm:flex-row gap-4">
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
								<input
									type="text"
									placeholder={t('applications.searchPlaceholder')}
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground"
								/>
							</div>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value as any)}
								className="px-4 py-3 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground"
							>
								<option value="all">{t('applications.allStatuses')}</option>
								<option value="pending">{t('applications.pending')}</option>
								<option value="accepted">{t('applications.accepted')}</option>
								<option value="rejected">{t('applications.rejected')}</option>
							</select>
						</div>
					</div>

					<div className="space-y-4">
						{filteredApplications.map((app) => (
							<motion.div
								key={app.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
							>
								<div className="flex flex-col lg:flex-row gap-6">
									<div className="flex-1 space-y-4">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="text-xl font-semibold text-foreground">{app.username}</h3>
												<p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
													<Mail className="w-4 h-4" />
													{app.email}
												</p>
											</div>
											{getStatusBadge(app.state)}
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<p className="text-xs text-muted-foreground mb-1">{t('applications.accountType')}</p>
												<p className="text-sm font-medium text-foreground capitalize">{app.role}</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground mb-1">{t('applications.applicationDate')}</p>
												<p className="text-sm font-medium text-foreground flex items-center gap-2">
													<Calendar className="w-4 h-4" />
													{new Date(app.created_at).toLocaleDateString('fr-FR')} à {new Date(app.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
												</p>
											</div>
										</div>

										{app.application_data && (
											<div>
												<p className="text-xs text-muted-foreground mb-2">{t('applications.applicationInfo')}</p>
												<div className="bg-background/50 rounded-lg p-3 text-sm text-foreground space-y-1">
													{(() => {
														try {
															const data = JSON.parse(app.application_data);
															return (
																<>
																	{data.socialNetworks && (
																		<p><span className="text-muted-foreground">{t('applications.socialNetworks')}:</span> {data.socialNetworks}</p>
																	)}
																	{data.additionalInfo && (
																		<p><span className="text-muted-foreground">{t('applications.additionalInfo')}:</span> {data.additionalInfo}</p>
																	)}
																</>
															);
														} catch {
															return <p>{app.application_data}</p>;
														}
													})()}
												</div>
											</div>
										)}

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<p className="text-xs text-muted-foreground mb-2">{t('applications.referrer')}</p>
												{app.referrer ? (
													<div className="bg-background/50 rounded-lg p-3 flex items-center justify-between">
														<div>
															<p className="text-sm font-medium text-foreground">{app.referrer_username}</p>
															<p className="text-xs text-muted-foreground">{app.referrer_email}</p>
														</div>
														<button
															onClick={() => {
																setSelectedApp(app);
																setShowReferrerSearch(true);
																setUserSearchQuery('');
																setSearchResults([]);
															}}
															className="text-primary hover:text-primary/80"
														>
															<User className="w-4 h-4" />
														</button>
													</div>
												) : (
													<button
														onClick={() => {
															setSelectedApp(app);
															setShowReferrerSearch(true);
															setUserSearchQuery('');
															setSearchResults([]);
														}}
														className="w-full px-3 py-2 bg-background/50 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
													>
														+ {t('applications.assignReferrer')}
													</button>
												)}
											</div>

											<div>
												<p className="text-xs text-muted-foreground mb-2">{t('applications.manager')}</p>
												{app.manager ? (
													<div className="bg-background/50 rounded-lg p-3 flex items-center justify-between">
														<div>
															<p className="text-sm font-medium text-foreground">{app.manager_username}</p>
															<p className="text-xs text-muted-foreground">{app.manager_email}</p>
														</div>
														<button
															onClick={() => {
																setSelectedApp(app);
																setShowManagerSearch(true);
																setUserSearchQuery('');
																setSearchResults([]);
															}}
															className="text-primary hover:text-primary/80"
														>
															<Users className="w-4 h-4" />
														</button>
													</div>
												) : (
													<button
														onClick={() => {
															setSelectedApp(app);
															setShowManagerSearch(true);
															setUserSearchQuery('');
															setSearchResults([]);
														}}
														className="w-full px-3 py-2 bg-background/50 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
													>
														+ {t('applications.assignManager')}
													</button>
												)}
											</div>
										</div>

										{(app.cpa_enabled || app.revshare_enabled) && (
											<div>
												<p className="text-xs text-muted-foreground mb-2">{t('applications.configuredDeals')}</p>
												<div className="bg-background/50 rounded-lg p-3 space-y-2">
													{app.cpa_enabled && (
														<p className="text-sm text-foreground">
															<span className="text-muted-foreground">{t('applications.cpa')}:</span> {app.cpa_amount}€ {t('applications.perFtd')}
														</p>
													)}
													{app.revshare_enabled && (
														<p className="text-sm text-foreground">
															<span className="text-muted-foreground">{t('applications.revshare')}:</span> {app.revshare_percentage}%
														</p>
													)}
												</div>
											</div>
										)}

										{app.state === 'rejected' && app.reject_reason && (
											<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
												<p className="text-xs text-red-600 font-medium mb-1">{t('applications.rejectReason')}</p>
												<p className="text-sm text-foreground">{app.reject_reason}</p>
											</div>
										)}
									</div>

									{app.state === 'pending' && (
										<div className="flex lg:flex-col gap-3">
											<button
												onClick={() => {
													setSelectedApp(app);
													setShowAcceptModal(true);
												}}
												className="flex-1 lg:flex-none px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
											>
												<Check className="w-4 h-4" />
												{t('applications.accept')}
											</button>
											<button
												onClick={() => {
													setSelectedApp(app);
													setShowRejectModal(true);
												}}
												className="flex-1 lg:flex-none px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
											>
												<X className="w-4 h-4" />
												{t('applications.reject')}
											</button>
										</div>
									)}
								</div>
							</motion.div>
						))}
					</div>

					{filteredApplications.length === 0 && (
						<div className="text-center py-12">
							<Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground">{t('applications.noApplicationsFound')}</p>
						</div>
					)}
				</div>
			</div>

			<Modal
				isOpen={showRejectModal && !!selectedApp}
				onClose={() => setShowRejectModal(false)}
				title={t('applications.rejectApplicationTitle')}
			>
				{selectedApp && (
					<>
						<p className="text-sm text-muted-foreground mb-4">
							{t('applications.applicationFrom')} <strong className="text-foreground">{selectedApp.username}</strong>
						</p>
						<textarea
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							placeholder={t('applications.rejectReasonPlaceholder')}
							rows={4}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground resize-none mb-4"
						/>
						<div className="flex gap-3 pt-4 border-t border-gray-200">
							<button
								onClick={() => setShowRejectModal(false)}
								className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
							>
								{t('common.cancel')}
							</button>
							<button
								onClick={handleReject}
								disabled={actionLoading || !rejectReason.trim()}
								className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 font-medium text-sm"
							>
								{actionLoading ? t('applications.rejecting') : t('applications.confirmReject')}
							</button>
						</div>
					</>
				)}
			</Modal>

			<Modal
				isOpen={showAcceptModal && !!selectedApp}
				onClose={() => setShowAcceptModal(false)}
				title={t('applications.acceptApplicationTitle')}
			>
				{selectedApp && (
					<>
						<p className="text-sm text-muted-foreground mb-6">
							{t('applications.applicationFrom')} <strong className="text-foreground">{selectedApp.username}</strong>
						</p>

						<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">{t('applications.accountType')}</label>
									<select
										value={acceptData.role}
										onChange={(e) => setAcceptData({ ...acceptData, role: e.target.value })}
										className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
									>
										<option value="affiliate">{t('applications.affiliate')}</option>
										<option value="manager">{t('applications.manager')}</option>
									</select>
								</div>

								{acceptData.role === 'affiliate' && (
									<>
										<div className="space-y-3">
											<label className="flex items-center gap-3">
												<input
													type="checkbox"
													checked={acceptData.cpaEnabled}
													onChange={(e) => setAcceptData({ ...acceptData, cpaEnabled: e.target.checked })}
													className="w-4 h-4 rounded border-border text-blue-500 focus:ring-2 focus:ring-blue-500"
												/>
												<span className="text-sm font-medium text-foreground">{t('applications.enableCpa')}</span>
											</label>

											{acceptData.cpaEnabled && (
												<div>
													<label className="block text-sm text-muted-foreground mb-2">{t('applications.amountPerFtd')}</label>
													<input
														type="number"
														step="0.01"
														value={acceptData.cpaAmount}
														onChange={(e) => setAcceptData({ ...acceptData, cpaAmount: parseFloat(e.target.value) || 0 })}
														className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
													/>
												</div>
											)}
										</div>

										<div className="space-y-3">
											<label className="flex items-center gap-3">
												<input
													type="checkbox"
													checked={acceptData.revshareEnabled}
													onChange={(e) => setAcceptData({ ...acceptData, revshareEnabled: e.target.checked })}
													className="w-4 h-4 rounded border-border text-blue-500 focus:ring-2 focus:ring-blue-500"
												/>
												<span className="text-sm font-medium text-foreground">{t('applications.enableRevshare')}</span>
											</label>

											{acceptData.revshareEnabled && (
												<div>
													<label className="block text-sm text-muted-foreground mb-2">{t('applications.percentage')}</label>
													<input
														type="number"
														step="0.01"
														value={acceptData.revsharePercentage}
														onChange={(e) => setAcceptData({ ...acceptData, revsharePercentage: parseFloat(e.target.value) || 0 })}
														className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
													/>
												</div>
											)}
										</div>

										<div>
											<label className="block text-sm font-medium text-foreground mb-2">{t('applications.trackingCodes')}</label>
											<div className="space-y-3">
												{trackingCodesList.map((tc, index) => (
													<div key={index} className="flex gap-2">
														<div className="flex-1">
															<input
																type="text"
																value={tc.displayName}
																onChange={(e) => {
																	const newList = [...trackingCodesList];
																	newList[index].displayName = e.target.value;
																	setTrackingCodesList(newList);
																}}
																placeholder={t('applications.visibleNamePlaceholder')}
																className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
															/>
														</div>
														<div className="flex-1">
															<input
																type="text"
																value={tc.code}
																onChange={(e) => {
																	const newList = [...trackingCodesList];
																	newList[index].code = e.target.value;
																	setTrackingCodesList(newList);
																}}
																placeholder={t('applications.uniqueCodePlaceholder')}
																className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
															/>
														</div>
														{trackingCodesList.length > 1 && (
															<button
																type="button"
																onClick={() => {
																	const newList = trackingCodesList.filter((_, i) => i !== index);
																	setTrackingCodesList(newList);
																}}
																className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
															>
																<X className="w-4 h-4" />
															</button>
														)}
													</div>
												))}
												<button
													type="button"
													onClick={() => setTrackingCodesList([...trackingCodesList, {displayName: '', code: ''}])}
													className="w-full px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
												>
													+ {t('applications.addTrackingCode')}
												</button>
											</div>
										</div>

										{selectedApp.referrer && (
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">
														{t('applications.referrerCommissionType').replace('{username}', selectedApp.referrer_username || '')} <span className="text-red-500">*</span>
													</label>
													<div className="flex gap-4">
														<label className="flex items-center gap-2 cursor-pointer">
															<input
																type="radio"
																name="referrerCommissionType"
																value="percentage"
																checked={acceptData.referrerCommissionType === 'percentage'}
																onChange={(e) => setAcceptData({ ...acceptData, referrerCommissionType: e.target.value as 'percentage' | 'fixed_per_ftd' })}
																className="w-4 h-4 text-blue-600"
															/>
															<span className="text-sm text-foreground">{t('applications.shave')}</span>
														</label>
														<label className="flex items-center gap-2 cursor-pointer">
															<input
																type="radio"
																name="referrerCommissionType"
																value="fixed_per_ftd"
																checked={acceptData.referrerCommissionType === 'fixed_per_ftd'}
																onChange={(e) => setAcceptData({ ...acceptData, referrerCommissionType: e.target.value as 'percentage' | 'fixed_per_ftd' })}
																className="w-4 h-4 text-blue-600"
															/>
															<span className="text-sm text-foreground">{t('applications.fixedCommissionPerFtd')}</span>
														</label>
													</div>
												</div>

												{acceptData.referrerCommissionType === 'percentage' ? (
													<div>
														<label className="block text-sm font-medium text-foreground mb-2">
															{t('applications.referrerShave')} <span className="text-red-500">*</span>
														</label>
														<input
															type="number"
															step="0.01"
															value={acceptData.referrerShavePercentage}
															onChange={(e) => setAcceptData({ ...acceptData, referrerShavePercentage: parseFloat(e.target.value) || 0 })}
															className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
															placeholder={t('applications.referrerShavePlaceholder')}
															required
														/>
														<p className="text-xs text-muted-foreground mt-1">
															{t('applications.referrerShaveHint')}
														</p>
													</div>
												) : (
													<div>
														<label className="block text-sm font-medium text-foreground mb-2">
															{t('applications.commissionPerFtd')} <span className="text-red-500">*</span>
														</label>
														<input
															type="number"
															step="0.01"
															value={acceptData.referrerFixedPerFtd}
															onChange={(e) => setAcceptData({ ...acceptData, referrerFixedPerFtd: parseFloat(e.target.value) || 0 })}
															className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
															placeholder={t('applications.fixedAmountPerFtdPlaceholder')}
															required
														/>
														<p className="text-xs text-muted-foreground mt-1">
															{t('applications.fixedAmountPerFtdHint')}
														</p>
													</div>
												)}
											</div>
										)}
									</>
								)}

								{acceptData.role === 'manager' && (
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">{t('applications.managerAmountPerFtd')}</label>
										<input
											type="number"
											step="0.01"
											value={acceptData.managerCpaPerFtd}
											onChange={(e) => setAcceptData({ ...acceptData, managerCpaPerFtd: parseFloat(e.target.value) || 0 })}
											className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
											placeholder={t('applications.managerAmountPerFtdPlaceholder')}
										/>
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">{t('applications.fixedCommission')}</label>
									<input
										type="number"
										step="0.01"
										value={acceptData.salary}
										onChange={(e) => setAcceptData({ ...acceptData, salary: parseFloat(e.target.value) || 0 })}
										className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
										placeholder={t('applications.monthlyAmountPlaceholder')}
									/>
								</div>

								{acceptData.salary > 0 && (
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">{t('applications.fixedCommissionFrequency')}</label>
										<input
											type="number"
											min="1"
											value={acceptData.salaryPaymentFrequencyDays}
											onChange={(e) => setAcceptData({ ...acceptData, salaryPaymentFrequencyDays: parseInt(e.target.value) || 7 })}
											className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
											placeholder="7"
										/>
										<p className="text-xs text-muted-foreground mt-1">
											{t('applications.fixedCommissionFrequencyHint')}
										</p>
									</div>
								)}
							</div>

						<div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
							<button
								onClick={() => setShowAcceptModal(false)}
								className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
							>
								{t('common.cancel')}
							</button>
							<button
								onClick={handleAccept}
								disabled={actionLoading || !!(selectedApp?.referrer && (
									(acceptData.referrerCommissionType === 'percentage' && acceptData.referrerShavePercentage === 0) ||
									(acceptData.referrerCommissionType === 'fixed_per_ftd' && acceptData.referrerFixedPerFtd === 0)
								))}
								className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 font-medium text-sm"
							>
								{actionLoading ? t('applications.accepting') : t('applications.confirmAccept')}
							</button>
						</div>
					</>
				)}
			</Modal>

			<Modal
				isOpen={(showReferrerSearch || showManagerSearch) && !!selectedApp}
				onClose={() => {
					setShowReferrerSearch(false);
					setShowManagerSearch(false);
				}}
				title={showReferrerSearch ? t('applications.searchReferrerTitle') : t('applications.searchManagerTitle')}
			>
				{selectedApp && (
					<>
						<div className="relative mb-4">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									type="text"
									value={userSearchQuery}
									onChange={(e) => {
										setUserSearchQuery(e.target.value);
										searchUsers(e.target.value, showReferrerSearch ? 'affiliate' : 'manager');
									}}
									placeholder={t('applications.searchUserPlaceholder')}
									autoFocus
									className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								/>
							</div>

							{searchResults.length > 0 && (
								<div className="space-y-2 max-h-72 overflow-y-auto mb-4">
									{searchResults.map((result) => (
										<button
											key={result.id}
											onClick={() => {
												if (showReferrerSearch) {
													updateReferrer(selectedApp.id, result.id);
												} else {
													updateManager(selectedApp.id, result.id);
												}
												setShowReferrerSearch(false);
												setShowManagerSearch(false);
											}}
											className="w-full p-3 bg-secondary hover:bg-blue-50 rounded-xl text-left transition-colors border border-border hover:border-blue-300"
										>
											<p className="text-sm font-medium text-gray-900">{result.username}</p>
											<p className="text-xs text-gray-500">{result.email}</p>
										</button>
									))}
								</div>
							)}

							{userSearchQuery && searchResults.length === 0 && (
								<div className="py-8 text-center">
									<p className="text-sm text-gray-500">{t('applications.noResultsFound')}</p>
								</div>
							)}

							<div className="flex gap-3 pt-4 border-t border-gray-200">
								{(showReferrerSearch ? selectedApp.referrer : selectedApp.manager) && (
									<button
										onClick={() => {
											if (showReferrerSearch) {
												updateReferrer(selectedApp.id, null);
											} else {
												updateManager(selectedApp.id, null);
											}
											setShowReferrerSearch(false);
											setShowManagerSearch(false);
										}}
										className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium text-sm"
									>
										{t('applications.remove')}
									</button>
								)}
							<button
								onClick={() => {
									setShowReferrerSearch(false);
									setShowManagerSearch(false);
								}}
								className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
							>
								{t('common.close')}
							</button>
						</div>
					</>
				)}
			</Modal>
		</div>
	);
}
