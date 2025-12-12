import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { DollarSign, Check, X, Clock, ExternalLink, Calendar, PauseCircle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { buildApiUrl } from '../../utils/api';

interface SalaryClaim {
	id: number;
	user_id: number;
	username: string;
	email: string;
	claim_date: string;
	proof_link: string;
	amount: number;
	status: 'pending' | 'approved' | 'rejected';
	admin_note: string | null;
	processed_at: string | null;
	processed_by_username: string | null;
	created_at: string;
}

export default function Salaries() {
	const { user, loading, logout } = useAuth();
	const [claims, setClaims] = useState<SalaryClaim[]>([]);
	const [loadingClaims, setLoadingClaims] = useState(true);
	const [selectedClaim, setSelectedClaim] = useState<SalaryClaim | null>(null);
	const [showActionModal, setShowActionModal] = useState(false);
	const [actionType, setActionType] = useState<'approve' | 'reject' | 'postpone'>('approve');
	const [adminNote, setAdminNote] = useState('');
	const [processing, setProcessing] = useState(false);
	const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

	const navItems = getNavItems('admin');
	const { t } = useTranslation();

	useEffect(() => {
		if (user && user.accountType === 'admin') {
			fetchClaims();
		}
	}, [user]);

	const fetchClaims = async () => {
		setLoadingClaims(true);
		try {
			const response = await fetch(buildApiUrl('/api/admin/salary-claims'), {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				const normalizedData = data.map((claim: any) => ({
					...claim,
					amount: parseFloat(claim.amount)
				}));
				setClaims(normalizedData);
			}
		} catch (error) {
			console.error('Error fetching salary claims:', error);
		} finally {
			setLoadingClaims(false);
		}
	};

	const handleAction = async () => {
		if (!selectedClaim) return;

		setProcessing(true);
		try {
			const endpoint = actionType === 'approve' ? 'approve' : actionType === 'postpone' ? 'postpone' : 'reject';
			const response = await fetch(
				buildApiUrl('/api/admin/salary-claims/${selectedClaim.id}/${endpoint}'),
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ adminNote: adminNote || (actionType === 'postpone' ? 'À traiter plus tard' : adminNote) })
				}
			);

			if (response.ok) {
				setShowActionModal(false);
				setSelectedClaim(null);
				setAdminNote('');
				fetchClaims();
			} else {
				const error = await response.json();
				alert(error.message || t('adminSalaries.toast.processError'));
			}
		} catch (error) {
			console.error('Error processing claim:', error);
			alert(t('adminSalaries.toast.processError'));
		} finally {
			setProcessing(false);
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

	const filteredClaims = filterStatus === 'all'
		? claims
		: claims.filter(claim => claim.status === filterStatus);

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
						<h1 className="text-4xl font-bold text-foreground">{t('adminSalaries.title')}</h1>
						<p className="text-muted-foreground mt-2">{t('adminSalaries.description')}</p>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center justify-between mb-4">
								<div className="p-3 bg-blue-500/10 rounded-lg">
									<DollarSign className="w-6 h-6 text-blue-500" />
								</div>
							</div>
							<p className="text-muted-foreground text-sm mb-1">Total des salaires</p>
							<p className="text-3xl font-bold text-foreground">
								{claims.reduce((sum, claim) => sum + claim.amount, 0).toFixed(2)}€
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.15 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center justify-between mb-4">
								<div className="p-3 bg-yellow-500/10 rounded-lg">
									<Clock className="w-6 h-6 text-yellow-500" />
								</div>
							</div>
							<p className="text-muted-foreground text-sm mb-1">En attente</p>
							<p className="text-3xl font-bold text-foreground">
								{claims.filter(c => c.status === 'pending').reduce((sum, claim) => sum + claim.amount, 0).toFixed(2)}€
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center justify-between mb-4">
								<div className="p-3 bg-green-500/10 rounded-lg">
									<Check className="w-6 h-6 text-green-500" />
								</div>
							</div>
							<p className="text-muted-foreground text-sm mb-1">Approuvé</p>
							<p className="text-3xl font-bold text-foreground">
								{claims.filter(c => c.status === 'approved').reduce((sum, claim) => sum + claim.amount, 0).toFixed(2)}€
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.25 }}
							className="bg-card border border-border rounded-xl p-6"
						>
							<div className="flex items-center justify-between mb-4">
								<div className="p-3 bg-red-500/10 rounded-lg">
									<X className="w-6 h-6 text-red-500" />
								</div>
							</div>
							<p className="text-muted-foreground text-sm mb-1">Rejeté</p>
							<p className="text-3xl font-bold text-foreground">
								{claims.filter(c => c.status === 'rejected').reduce((sum, claim) => sum + claim.amount, 0).toFixed(2)}€
							</p>
						</motion.div>
					</div>

					<div className="mb-6 flex gap-2">
						{(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
							<button
								key={status}
								onClick={() => setFilterStatus(status)}
								className={`px-4 py-2 rounded-lg font-medium transition-colors ${
									filterStatus === status
										? 'bg-primary text-primary-foreground'
										: 'bg-card border border-border text-muted-foreground hover:bg-accent'
								}`}
							>
								{status === 'all' && t('adminSalaries.filter.all')}
								{status === 'pending' && t('adminSalaries.filter.pending')}
								{status === 'approved' && t('adminSalaries.filter.approved')}
								{status === 'rejected' && t('adminSalaries.filter.rejected')}
							</button>
						))}
					</div>

					{loadingClaims ? (
						<div className="flex justify-center py-20">
							<motion.div
								className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
							/>
						</div>
					) : filteredClaims.length === 0 ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="bg-card border border-border rounded-xl p-12 text-center"
						>
							<DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground text-lg">{t('adminSalaries.noClaims')}</p>
						</motion.div>
					) : (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="bg-card border border-border rounded-xl overflow-hidden"
						>
							<div className="p-6 border-b border-border">
								<h2 className="text-2xl font-bold text-foreground">Demandes de salaire</h2>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full table-fixed">
									<thead className="bg-accent">
										<tr>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[15%]">{t('adminSalaries.table.user')}</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[12%]">{t('adminSalaries.table.date')}</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[10%]">{t('adminSalaries.table.amount')}</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[15%]">Lien</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[12%]">{t('adminSalaries.table.status')}</th>
											<th className="text-left px-2 py-3 text-xs font-medium text-muted-foreground w-[16%]">{t('adminSalaries.table.actions')}</th>
										</tr>
									</thead>
									<tbody>
										{filteredClaims.map((claim) => (
											<tr key={claim.id} className="border-b border-border hover:bg-accent/50 transition-colors">
												<td className="px-2 py-3">
													<p className="font-medium text-foreground text-sm truncate" title={`${claim.username} (${claim.email})`}>
														{claim.username}
													</p>
												</td>
												<td className="px-2 py-3">
													<p className="text-xs text-muted-foreground">
														{new Date(claim.claim_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
													</p>
												</td>
												<td className="px-2 py-3">
													<p className="font-semibold text-foreground text-sm">{claim.amount.toFixed(2)}€</p>
												</td>
												<td className="px-2 py-3">
													<a
														href={claim.proof_link}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-xs"
													>
														<span className="truncate">Voir</span>
														<ExternalLink className="w-3 h-3 flex-shrink-0" />
													</a>
												</td>
												<td className="px-2 py-3">
													<span
														className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${
															claim.status === 'pending' && claim.admin_note
																? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
																: claim.status === 'pending'
																? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
																: claim.status === 'approved'
																? 'bg-green-500/10 text-green-500 border-green-500/20'
																: 'bg-red-500/10 text-red-500 border-red-500/20'
														}`}
													>
														{claim.status === 'pending' && claim.admin_note && 'Plus tard'}
														{claim.status === 'pending' && !claim.admin_note && t('adminSalaries.status.pending')}
														{claim.status === 'approved' && t('adminSalaries.status.approved')}
														{claim.status === 'rejected' && t('adminSalaries.status.rejected')}
													</span>
												</td>
												<td className="px-2 py-3">
													{claim.status === 'pending' ? (
														<div className="flex gap-1">
															<button
																onClick={() => {
																	setSelectedClaim(claim);
																	setActionType('approve');
																	setShowActionModal(true);
																}}
																className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition-colors"
															>
																<Check className="w-3.5 h-3.5" />
															</button>
															<button
																onClick={() => {
																	setSelectedClaim(claim);
																	setActionType('postpone');
																	setShowActionModal(true);
																}}
																className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
																title="Plus tard"
															>
																<PauseCircle className="w-3.5 h-3.5" />
															</button>
															<button
																onClick={() => {
																	setSelectedClaim(claim);
																	setActionType('reject');
																	setShowActionModal(true);
																}}
																className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
															>
																<X className="w-3.5 h-3.5" />
															</button>
														</div>
													) : (
														claim.processed_at && (
															<p className="text-[10px] text-muted-foreground">
																{new Date(claim.processed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
															</p>
														)
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</motion.div>
					)}
				</div>
			</div>

			{showActionModal && selectedClaim && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
					onClick={() => {
						setShowActionModal(false);
						setAdminNote('');
					}}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						onClick={(e) => e.stopPropagation()}
						className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4"
					>
						<h3 className="text-2xl font-bold text-foreground mb-6">
							{actionType === 'approve' 
								? t('adminSalaries.modal.approveTitle') 
								: actionType === 'postpone'
								? 'Reporter la demande de salaire'
								: t('adminSalaries.modal.rejectTitle')}
						</h3>

						<div className="space-y-4 mb-6">
							{actionType === 'postpone' && (
								<div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
									<PauseCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-medium text-blue-500">Reporter pour traitement ultérieur</p>
										<p className="text-sm text-muted-foreground mt-1">
											Cette demande sera placée en attente sans être acceptée ni refusée.
										</p>
									</div>
								</div>
							)}
							<div className="bg-accent rounded-lg p-4">
								<p className="text-sm text-muted-foreground mb-1">{t('adminSalaries.modal.user')}</p>
								<p className="font-medium text-foreground">{selectedClaim.username}</p>
							</div>
							<div className="bg-accent rounded-lg p-4">
								<p className="text-sm text-muted-foreground mb-1">{t('adminSalaries.modal.amount')}</p>
								<p className="font-bold text-foreground">{selectedClaim.amount.toFixed(2)}€</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-foreground mb-2">
									{actionType === 'postpone' ? 'Note (optionnel)' : t('adminSalaries.modal.adminNote')}
								</label>
								<textarea
									value={adminNote}
									onChange={(e) => setAdminNote(e.target.value)}
									placeholder={actionType === 'postpone' ? 'Ajouter une note sur pourquoi c\'est reporté...' : t('adminSalaries.modal.addNotePlaceholder')}
									rows={3}
									className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
								/>
							</div>
						</div>

						<div className="flex gap-3">
							<button
								onClick={() => {
									setShowActionModal(false);
									setAdminNote('');
								}}
								className="flex-1 px-4 py-3 border border-border rounded-lg text-muted-foreground hover:bg-accent transition-colors"
								disabled={processing}
							>
								{t('adminSalaries.modal.cancel')}
							</button>
							<button
								onClick={handleAction}
								disabled={processing}
								className={`flex-1 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
									actionType === 'approve'
										? 'bg-green-500 hover:bg-green-600 text-white'
										: actionType === 'postpone'
										? 'bg-blue-500 hover:bg-blue-600 text-white'
										: 'bg-red-500 hover:bg-red-600 text-white'
								}`}
							>
								{processing 
									? t('adminSalaries.modal.processing') 
									: actionType === 'approve' 
									? t('adminSalaries.modal.approve') 
									: actionType === 'postpone'
									? 'Reporter'
									: t('adminSalaries.modal.reject')}
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</div>
	);
}
