import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import ManageFtdsModal from '../../components/ManageFtdsModal';
import { getNavItems } from '../../config/navigation';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Lock, Unlock, Plus, Trash2, Edit2, X as XIcon, FileText, Eye, AlertTriangle } from 'lucide-react';
import { buildApiUrl } from '../../utils/api';

interface UserData {
	id: number;
	username: string;
	email: string;
	role: string;
	salary: number;
	salary_payment_frequency_days: number;
	is_frozen: boolean;
	state: string;
	referrer?: number;
	referrer_username?: string;
	manager?: number;
	note?: string;
	date_of_birth?: string;
}

interface PendingSalaryChange {
	new_salary: number;
	effective_date: string;
}

interface Deal {
	cpa_enabled?: boolean;
	cpa_amount?: number;
	revshare_enabled?: boolean;
	revshare_percentage?: number;
	cpa_per_ftd?: number;
}

interface Shave {
	id: number;
	user_id: number;
	target_id: number;
	intermediary_id?: number;
	commission_type: 'percentage' | 'fixed_per_ftd';
	value: number;
	user_username?: string;
	target_username?: string;
	intermediary_username?: string;
}

interface TrackingCode {
	id: number;
	code: string;
	display_name: string;
	afp?: string;
	created_at: string;
}

export default function UserSettings() {
	const { user, loading, logout } = useAuth();
	const { userId } = useParams();
	const navigate = useNavigate();

	const [userData, setUserData] = useState<UserData | null>(null);
	const [pendingSalary, setPendingSalary] = useState<PendingSalaryChange | null>(null);
	const [deal, setDeal] = useState<Deal | null>(null);
	const [shaves, setShaves] = useState<Shave[]>([]);
	const [trackingCodes, setTrackingCodes] = useState<TrackingCode[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [totalExpensesPaid, setTotalExpensesPaid] = useState(0);

	const [editingField, setEditingField] = useState<string | null>(null);
	const [editValues, setEditValues] = useState<any>({});

	const [showSalaryModal, setShowSalaryModal] = useState(false);
	const [newSalary, setNewSalary] = useState('');

	const [showShaveModal, setShowShaveModal] = useState(false);
	const [shaveForm, setShaveForm] = useState({ target_id: '', intermediary_id: '', value: '' });

	const [showEditShaveModal, setShowEditShaveModal] = useState(false);
	const [editingShave, setEditingShave] = useState<Shave | null>(null);
	const [editShaveForm, setEditShaveForm] = useState({ commission_type: 'percentage' as 'percentage' | 'fixed_per_ftd', value: 0 });

	const [showAddTrackingCodeModal, setShowAddTrackingCodeModal] = useState(false);
	const [newTrackingCode, setNewTrackingCode] = useState('');
	const [newTrackingCodeDisplayName, setNewTrackingCodeDisplayName] = useState('');
	const [newTrackingCodeAfp, setNewTrackingCodeAfp] = useState('');

	const [showAddFtdModal, setShowAddFtdModal] = useState(false);
	const [ftdForm, setFtdForm] = useState({ ftd_user_id: '', registration_date: '', tracking_code: '', afp: '', note: '', is_bulk: false, quantity: 1 });

	const [showManageRevshareModal, setShowManageRevshareModal] = useState(false);
	const [ftdAssignments, setFtdAssignments] = useState<any[]>([]);
	const [revshareForm, setRevshareForm] = useState({ trader_id: '', date: '', revshare: '' });
	const [traderSearchQuery, setTraderSearchQuery] = useState('');
	const [showTraderDropdown, setShowTraderDropdown] = useState(false);

	const [userFiles, setUserFiles] = useState<any[]>([]);
	const [uploadingFile, setUploadingFile] = useState(false);

	const [allUsers, setAllUsers] = useState<UserData[]>([]);

	const [showReferrerModal, setShowReferrerModal] = useState(false);
	const [referrerSearch, setReferrerSearch] = useState('');
	const [referrerSearchResults, setReferrerSearchResults] = useState<UserData[]>([]);
	const [selectedReferrer, setSelectedReferrer] = useState<UserData | null>(null);
	const [referrerCommissionType, setReferrerCommissionType] = useState<'percentage' | 'fixed_per_ftd'>('percentage');
	const [referrerCommissionValue, setReferrerCommissionValue] = useState<number>(0);

	const [showManageFtdsModal, setShowManageFtdsModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showSecondDeleteModal, setShowSecondDeleteModal] = useState(false);

	const navItems = getNavItems('admin');

	useEffect(() => {
		if (user?.accountType === 'admin') {
			fetchUserData();
			fetchAllUsers();
			fetchUserFiles();
		}
	}, [user, userId]);

	const fetchAllUsers = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/users'), {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				setAllUsers(data);
			}
		} catch (error) {
			console.error('Error fetching all users:', error);
		}
	};

	const fetchUserData = async () => {
		try {
			setLoadingData(true);
			const [userRes, pendingRes, dealRes, shavesRes, trackingCodesRes, expensesRes] = await Promise.all([
				fetch(buildApiUrl('/api/admin/user/${userId}'), { credentials: '))include' }),
				fetch(buildApiUrl('/api/admin/user/${userId}/pending-salary'), { credentials: '))include' }),
				fetch(buildApiUrl('/api/admin/user/${userId}/deal'), { credentials: '))include' }),
				fetch(buildApiUrl('/api/admin/user/${userId}/shaves'), { credentials: '))include' }),
				fetch(buildApiUrl('/api/admin/user/${userId}/tracking-codes'), { credentials: '))include' }),
				fetch(buildApiUrl('/api/admin/user/${userId}/total-expenses'), { credentials: '))include' })
			]);

			if (userRes.ok) {
				const data = await userRes.json();
				setUserData(data);
				setEditValues({
					username: data.username,
					email: data.email,
					salary: data.salary,
					salary_payment_frequency_days: data.salary_payment_frequency_days || 7
				});
			}

			if (pendingRes.ok) {
				const data = await pendingRes.json();
				setPendingSalary(data.pending || null);
			}

			if (dealRes.ok) {
				const data = await dealRes.json();
				setDeal(data.deal || null);
			}

			if (shavesRes.ok) {
				const data = await shavesRes.json();
				setShaves(data.shaves || []);
			}

			if (trackingCodesRes.ok) {
				const data = await trackingCodesRes.json();
				setTrackingCodes(data.trackingCodes || []);
			}

			if (expensesRes.ok) {
				const data = await expensesRes.json();
				setTotalExpensesPaid(parseFloat(data.total) || 0);
			}
		} catch (error) {
			toast.error('Erreur lors du chargement des données');
			console.error(error);
		} finally {
			setLoadingData(false);
		}
	};

	const handleSaveField = async (field: string) => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/update'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ field, value: editValues[field] })
			});

			if (!response.ok) throw new Error('Update failed');

			toast.success('Mis à jour avec succès');
			setEditingField(null);
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la mise à jour');
		}
	};

	const handleToggleFreeze = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/freeze'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ freeze: !userData?.is_frozen })
			});

			if (!response.ok) throw new Error('Freeze toggle failed');

			toast.success(userData?.is_frozen ? 'Compte dégelé' : 'Compte gelé');
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la modification');
		}
	};

	const handleSalaryChange = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/salary'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ new_salary: parseFloat(newSalary) })
			});

			if (!response.ok) throw new Error('Salary change failed');

			toast.success('Changement de commission fixe programmé pour le 1er du mois prochain');
			setShowSalaryModal(false);
			setNewSalary('');
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la programmation');
		}
	};

	const handleApplySalaryNow = async () => {
		if (!confirm('Voulez-vous vraiment appliquer ce changement de commission fixe immédiatement ?')) return;

		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/salary/apply-now'), {
				method: 'POST',
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Apply salary now failed');

			toast.success('Commission fixe appliquée immédiatement');
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de l\'application de la commission fixe');
		}
	};

	const handleSaveDeal = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/deal'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ deal })
			});

			if (!response.ok) throw new Error('Deal update failed');

			toast.success('Deal mis à jour');
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la mise à jour du deal');
		}
	};

	const handleCreateShave = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/shaves'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					user_id: parseInt(userId!),
					target_id: parseInt(shaveForm.target_id),
					intermediary_id: shaveForm.intermediary_id ? parseInt(shaveForm.intermediary_id) : null,
					value: parseFloat(shaveForm.value)
				})
			});

			if (!response.ok) throw new Error('Shave creation failed');

			toast.success('Shave créé');
			setShowShaveModal(false);
			setShaveForm({ target_id: '', intermediary_id: '', value: '' });
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la création du shave');
		}
	};

	const handleDeleteShave = async (shaveId: number) => {
		if (!confirm('Voulez-vous vraiment révoquer ce shave ?')) return;

		try {
			const response = await fetch(buildApiUrl('/api/admin/shaves/${shaveId}'), {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Shave deletion failed');

			toast.success('Shave révoqué');
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la révocation');
		}
	};

	const handleUpdateShave = async () => {
		if (!editingShave) return;

		try {
			const response = await fetch(buildApiUrl('/api/admin/shaves/${editingShave.id}'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					commission_type: editShaveForm.commission_type,
					value: editShaveForm.value
				})
			});

			if (!response.ok) throw new Error('Shave update failed');

			toast.success('Shave mis à jour');
			setShowEditShaveModal(false);
			setEditingShave(null);
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la mise à jour');
		}
	};

	const handleAddTrackingCode = async () => {
		if (!newTrackingCode.trim()) {
			toast.error('Veuillez entrer un code');
			return;
		}

		if (!newTrackingCodeDisplayName.trim()) {
			toast.error('Veuillez entrer un nom visible');
			return;
		}

		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/tracking-codes'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					code: newTrackingCode.trim(),
					display_name: newTrackingCodeDisplayName.trim(),
					afp: newTrackingCodeAfp.trim() || null
				})
			});

			if (!response.ok) throw new Error('Failed to add tracking code');

			toast.success('Tracking code ajouté');
			setShowAddTrackingCodeModal(false);
			setNewTrackingCode('');
			setNewTrackingCodeDisplayName('');
			setNewTrackingCodeAfp('');
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de l\'ajout du tracking code');
		}
	};

	const handleDeleteTrackingCode = async (codeId: number) => {
		if (!confirm('Voulez-vous vraiment supprimer ce tracking code ?')) return;

		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/tracking-codes/${codeId}'), {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Failed to delete tracking code');

			toast.success('Tracking code supprimé');
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la suppression du tracking code');
		}
	};

	const searchReferrer = async (query: string) => {
		if (query.length < 2) {
			setReferrerSearchResults([]);
			return;
		}

		try {
			const response = await fetch(buildApiUrl('/api/admin/users/search?q=${encodeURIComponent(query)}'), {
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Search failed');

			const data = await response.json();
			setReferrerSearchResults(data.users.filter((u: UserData) => u.id !== parseInt(userId!)));
		} catch (error) {
			console.error('Error searching users:', error);
		}
	};

	const handleUpdateReferrer = async () => {
		if (!selectedReferrer) {
			toast.error('Veuillez sélectionner un parrain');
			return;
		}

		if (referrerCommissionValue <= 0) {
			toast.error('Veuillez entrer une valeur de commission valide');
			return;
		}

		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/referrer'), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					referrer_id: selectedReferrer.id,
					commission_type: referrerCommissionType,
					commission_value: referrerCommissionValue
				})
			});

			if (!response.ok) throw new Error('Update referrer failed');

			toast.success('Parrain mis à jour');
			setShowReferrerModal(false);
			setSelectedReferrer(null);
			setReferrerSearch('');
			setReferrerCommissionValue(0);
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de la mise à jour du parrain');
		}
	};

	const handleRemoveReferrer = async () => {
		if (!confirm('Voulez-vous vraiment retirer le parrain de cet utilisateur ?')) return;

		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/referrer'), {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Remove referrer failed');

			toast.success('Parrain retiré');
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors du retrait du parrain');
		}
	};

	const handleAddFtd = async () => {
		if (ftdForm.is_bulk) {
			if (!ftdForm.registration_date || !ftdForm.tracking_code || !ftdForm.quantity) {
				toast.error('Veuillez remplir tous les champs obligatoires');
				return;
			}
		} else {
			if (!ftdForm.ftd_user_id || !ftdForm.registration_date || !ftdForm.tracking_code) {
				toast.error('Veuillez remplir tous les champs');
				return;
			}
		}

		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/ftd'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					ftd_user_id: ftdForm.is_bulk ? '' : ftdForm.ftd_user_id,
					registration_date: ftdForm.registration_date,
					tracking_code: ftdForm.tracking_code,
					afp: ftdForm.afp || null,
					note: ftdForm.note || null,
					is_bulk: ftdForm.is_bulk,
					quantity: ftdForm.is_bulk ? ftdForm.quantity : 1
				})
			});

			if (!response.ok) throw new Error('Failed to add FTD');

			toast.success(ftdForm.is_bulk ? `${ftdForm.quantity} FTDs ajoutés avec succès` : 'FTD ajouté avec succès');
			setShowAddFtdModal(false);
			setFtdForm({ ftd_user_id: '', registration_date: '', tracking_code: '', afp: '', note: '', is_bulk: false, quantity: 1 });
			fetchUserData();
		} catch (error) {
			toast.error('Erreur lors de l\'ajout du FTD');
		}
	};

	const fetchFtdAssignments = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/ftd-assignments'), {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				setFtdAssignments(data.assignments || []);
			}
		} catch (error) {
			console.error('Error fetching FTD assignments:', error);
		}
	};

	const handleDeleteFtd = async (ftdId: number) => {
		if (!confirm('Voulez-vous vraiment supprimer ce FTD ?')) return;

		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/ftd/${ftdId}'), {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Failed to delete FTD');

			toast.success('FTD supprimé avec succès');
			fetchUserData();
			fetchFtdAssignments();
		} catch (error) {
			toast.error('Erreur lors de la suppression du FTD');
		}
	};

	const handleAddRevshare = async () => {
		if (!revshareForm.trader_id || !revshareForm.date || !revshareForm.revshare) {
			toast.error('Veuillez remplir tous les champs');
			return;
		}

		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/revshare'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					trader_id: revshareForm.trader_id,
					date: revshareForm.date,
					revshare: parseFloat(revshareForm.revshare)
				})
			});

			if (!response.ok) throw new Error('Failed to add revshare');

			toast.success('Revshare ajouté avec succès');
			setRevshareForm({ trader_id: '', date: '', revshare: '' });
			setTraderSearchQuery('');
		} catch (error) {
			toast.error('Erreur lors de l\'ajout du revshare');
		}
	};

	const filteredTraders = ftdAssignments.filter(assignment =>
		assignment.ftd_user_id.toString().includes(traderSearchQuery)
	);

	const fetchUserFiles = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/files'), {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				setUserFiles(data.files || []);
			}
		} catch (error) {
			console.error('Error fetching files:', error);
		}
	};

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (file.size > 10 * 1024 * 1024) {
			toast.error('Le fichier ne doit pas dépasser 10 MB');
			return;
		}

		setUploadingFile(true);

		try {
			const reader = new FileReader();
			reader.onloadend = async () => {
				const response = await fetch(buildApiUrl('/api/admin/user/${userId}/files'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						filename: file.name,
						data: reader.result,
						mimeType: file.type
					})
				});

				if (response.ok) {
					toast.success('Fichier uploadé avec succès');
					fetchUserFiles();
				} else {
					toast.error('Erreur lors de l\'upload du fichier');
				}
				setUploadingFile(false);
			};
			reader.readAsDataURL(file);
		} catch (error) {
			toast.error('Erreur lors de l\'upload du fichier');
			setUploadingFile(false);
		}

		event.target.value = '';
	};

	const handleFileView = (fileId: number) => {
		window.open(buildApiUrl('/api/admin/file/${fileId}'), '))_blank');
	};

	const handleFileDelete = async (fileId: number) => {
		if (!confirm('Voulez-vous vraiment supprimer ce fichier ?')) return;

		try {
			const response = await fetch(buildApiUrl('/api/admin/file/${fileId}'), {
				method: 'DELETE',
				credentials: 'include'
			});

			if (response.ok) {
				toast.success('Fichier supprimé avec succès');
				fetchUserFiles();
			} else {
				toast.error('Erreur lors de la suppression du fichier');
			}
		} catch (error) {
			toast.error('Erreur lors de la suppression du fichier');
		}
	};

	const handleDeleteAccount = async () => {
		try {
			const response = await fetch(buildApiUrl('/api/admin/user/${userId}/delete'), {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Delete failed');

			toast.success('Compte supprimé avec succès');
			setShowSecondDeleteModal(false);
			setShowDeleteModal(false);
			setTimeout(() => navigate('/admin/users'), 1000);
		} catch (error) {
			toast.error('Erreur lors de la suppression du compte');
		}
	};

	const handleSelectTrader = (traderId: string) => {
		setRevshareForm({ ...revshareForm, trader_id: traderId });
		setTraderSearchQuery(traderId);
		setShowTraderDropdown(false);
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

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
			<Navbar user={user} navItems={navItems} onLogout={logout} />

			<div className="pt-24 px-4 pb-8">
				<div className="max-w-5xl mx-auto py-8">
					<button
						onClick={() => navigate('/admin/users')}
						className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
					>
						<ArrowLeft className="w-5 h-5" />
						Retour aux utilisateurs
					</button>

					{loadingData ? (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
						</div>
					) : userData ? (
						<div className="space-y-6">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
							>
								<div className="flex items-center justify-between mb-6">
									<h2 className="text-2xl font-bold text-foreground">Informations du compte</h2>
									<div className="flex items-center gap-3">
										<button
											onClick={handleToggleFreeze}
											className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
												userData.is_frozen
													? 'bg-green-600 text-white hover:bg-green-700'
													: 'bg-red-600 text-white hover:bg-red-700'
											}`}
										>
											{userData.is_frozen ? (
												<>
													<Unlock className="w-4 h-4" />
													Dégeler
												</>
											) : (
												<>
													<Lock className="w-4 h-4" />
													Geler
												</>
											)}
										</button>
										<button
											onClick={() => setShowDeleteModal(true)}
											className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
										>
											<Trash2 className="w-4 h-4" />
											Supprimer le compte
										</button>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<label className="text-sm font-medium text-muted-foreground">Pseudo</label>
										{editingField === 'username' ? (
											<div className="flex gap-2 mt-1">
												<input
													type="text"
													value={editValues.username}
													onChange={(e) => setEditValues({ ...editValues, username: e.target.value })}
													className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
												/>
												<button onClick={() => handleSaveField('username')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
													<Save className="w-4 h-4" />
												</button>
												<button onClick={() => setEditingField(null)} className="px-4 py-2 bg-muted text-foreground rounded-lg">
													<XIcon className="w-4 h-4" />
												</button>
											</div>
										) : (
											<div className="flex items-center justify-between mt-1">
												<p className="text-foreground font-medium">{userData.username}</p>
												<button onClick={() => setEditingField('username')} className="text-primary hover:text-primary/80">
													<Edit2 className="w-4 h-4" />
												</button>
											</div>
										)}
									</div>

									<div>
										<label className="text-sm font-medium text-muted-foreground">Email</label>
										{editingField === 'email' ? (
											<div className="flex gap-2 mt-1">
												<input
													type="email"
													value={editValues.email}
													onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
													className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
												/>
												<button onClick={() => handleSaveField('email')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
													<Save className="w-4 h-4" />
												</button>
												<button onClick={() => setEditingField(null)} className="px-4 py-2 bg-muted text-foreground rounded-lg">
													<XIcon className="w-4 h-4" />
												</button>
											</div>
										) : (
											<div className="flex items-center justify-between mt-1">
												<p className="text-foreground font-medium">{userData.email}</p>
												<button onClick={() => setEditingField('email')} className="text-primary hover:text-primary/80">
													<Edit2 className="w-4 h-4" />
												</button>
											</div>
										)}
									</div>

									<div>
										<label className="text-sm font-medium text-muted-foreground">Rôle</label>
										<p className="text-foreground font-medium mt-1">{userData.role.toUpperCase()}</p>
									</div>

									{userData.date_of_birth && (
										<div>
											<label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
											<p className="text-foreground font-medium mt-1">
												{new Date(userData.date_of_birth).toLocaleDateString('fr-FR', {
													day: '2-digit',
													month: 'long',
													year: 'numeric'
												})}
											</p>
										</div>
									)}

									<div>
										<label className="text-sm font-medium text-muted-foreground">Note</label>
										{editingField === 'note' ? (
											<div className="flex gap-2 mt-1">
												<textarea
													value={editValues.note || ''}
													onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
													className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground min-h-[100px]"
													placeholder="Ajoutez une note..."
												/>
												<div className="flex flex-col gap-2">
													<button onClick={() => handleSaveField('note')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
														<Save className="w-4 h-4" />
													</button>
													<button onClick={() => setEditingField(null)} className="px-4 py-2 bg-muted text-foreground rounded-lg">
														<XIcon className="w-4 h-4" />
													</button>
												</div>
											</div>
										) : (
											<div className="flex items-start justify-between mt-1">
												<p className="text-foreground font-medium whitespace-pre-wrap">{userData.note || 'Aucune note'}</p>
												<button onClick={() => setEditingField('note')} className="text-primary hover:text-primary/80">
													<Edit2 className="w-4 h-4" />
												</button>
											</div>
										)}
									</div>

									{userData.role === 'affiliate' && (
										<div>
											<label className="text-sm font-medium text-muted-foreground">Parrain</label>
											<div className="flex items-center justify-between mt-1">
												{userData.referrer ? (
													<>
														<p className="text-foreground font-medium">{userData.referrer_username || `ID: ${userData.referrer}`}</p>
														<div className="flex gap-2">
															<button
																onClick={() => setShowReferrerModal(true)}
																className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
															>
																Modifier
															</button>
															<button
																onClick={handleRemoveReferrer}
																className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
															>
																Retirer
															</button>
														</div>
													</>
												) : (
													<>
														<p className="text-muted-foreground">Aucun parrain</p>
														<button
															onClick={() => setShowReferrerModal(true)}
															className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
														>
															Ajouter un parrain
														</button>
													</>
												)}
											</div>
										</div>
									)}

									<div>
										<label className="text-sm font-medium text-muted-foreground">Commission fixe actuelle</label>
										<div className="flex items-center justify-between mt-1">
											<p className="text-foreground font-medium">{userData.salary} €</p>
											<button
												onClick={() => setShowSalaryModal(true)}
												className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
											>
												Modifier
											</button>
										</div>
										{pendingSalary && (
											<div className="flex items-center justify-between mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
												<p className="text-sm text-orange-700">
													Changement prévu: <span className="font-semibold">{pendingSalary.new_salary} €</span> le {new Date(pendingSalary.effective_date).toLocaleDateString('fr-FR')}
												</p>
												<button
													onClick={handleApplySalaryNow}
													className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
												>
													Appliquer maintenant
												</button>
											</div>
										)}
									</div>

									{userData.salary > 0 && (
										<div>
											<label className="text-sm font-medium text-muted-foreground">Fréquence de paiement commission fixe</label>
											{editingField === 'salary_payment_frequency_days' ? (
												<div className="flex gap-2 mt-1">
													<input
														type="number"
														min="1"
														value={editValues.salary_payment_frequency_days}
														onChange={(e) => setEditValues({ ...editValues, salary_payment_frequency_days: parseInt(e.target.value) || 7 })}
														className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
													/>
													<button onClick={() => handleSaveField('salary_payment_frequency_days')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
														<Save className="w-4 h-4" />
													</button>
													<button onClick={() => setEditingField(null)} className="px-4 py-2 bg-muted text-foreground rounded-lg">
														<XIcon className="w-4 h-4" />
													</button>
												</div>
											) : (
												<div className="flex items-center justify-between mt-1">
													<p className="text-foreground font-medium">Tous les {userData.salary_payment_frequency_days || 7} jours</p>
													<button onClick={() => setEditingField('salary_payment_frequency_days')} className="text-primary hover:text-primary/80">
														<Edit2 className="w-4 h-4" />
													</button>
												</div>
											)}
											<p className="text-xs text-muted-foreground mt-1">
												L'utilisateur peut demander un paiement de commission fixe tous les X jours
											</p>
										</div>
									)}

									{userData.role === 'affiliate' && (
										<div>
											<label className="text-sm font-medium text-muted-foreground">Total dépenses payées</label>
											<p className="text-foreground font-medium mt-1 text-lg">{totalExpensesPaid.toFixed(2)} €</p>
										</div>
									)}
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 }}
								className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
							>
								<div className="flex items-center justify-between mb-6">
									<h2 className="text-2xl font-bold text-foreground">Deal</h2>
									<button
										onClick={handleSaveDeal}
										className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
									>
										<Save className="w-4 h-4" />
										Sauvegarder
									</button>
								</div>

								{userData.role === 'affiliate' && (
									<div className="space-y-4">
										<div className="flex items-center gap-4">
											<input
												type="checkbox"
												checked={deal?.cpa_enabled || false}
												onChange={(e) => setDeal({ ...deal, cpa_enabled: e.target.checked })}
												className="w-5 h-5"
											/>
											<label className="font-medium text-foreground">CPA activé</label>
										</div>
										{deal?.cpa_enabled ? (
											<div>
												<label className="text-sm font-medium text-muted-foreground">Montant CPA (€)</label>
												<input
													type="number"
													step="0.01"
													value={deal?.cpa_amount || 0}
													onChange={(e) => setDeal({ ...deal, cpa_amount: parseFloat(e.target.value) })}
													className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
												/>
											</div>
										) : (
											<div className="text-sm text-muted-foreground mt-2">Aucun montant CPA défini</div>
										)}

										<div className="flex items-center gap-4">
											<input
												type="checkbox"
												checked={deal?.revshare_enabled || false}
												onChange={(e) => setDeal({ ...deal, revshare_enabled: e.target.checked })}
												className="w-5 h-5"
											/>
											<label className="font-medium text-foreground">RevShare activé</label>
										</div>
										{deal?.revshare_enabled ? (
											<div>
												<label className="text-sm font-medium text-muted-foreground">Pourcentage RevShare (%)</label>
												<input
													type="number"
													step="0.01"
													value={deal?.revshare_percentage || 0}
													onChange={(e) => setDeal({ ...deal, revshare_percentage: parseFloat(e.target.value) })}
													className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
												/>
											</div>
										) : (
											<div className="text-sm text-muted-foreground mt-2">Aucun pourcentage RevShare défini</div>
										)}
									</div>
								)}

								{userData.role === 'manager' && (
									<div>
										<label className="text-sm font-medium text-muted-foreground">CPA par FTD (€)</label>
										<input
											type="number"
											step="0.01"
											value={deal?.cpa_per_ftd || 0}
											onChange={(e) => setDeal({ ...deal, cpa_per_ftd: parseFloat(e.target.value) })}
											className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
										/>
									</div>
								)}
							</motion.div>

							{userData.role === 'affiliate' && (
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
									className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
								>
									<div className="flex items-center justify-between mb-6">
										<h2 className="text-2xl font-bold text-foreground">Tracking Codes</h2>
										<button
											onClick={() => setShowAddTrackingCodeModal(true)}
											className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
										>
											<Plus className="w-4 h-4" />
											Ajouter
										</button>
									</div>

									<div className="space-y-3">
										{trackingCodes.length > 0 ? (
											trackingCodes.map((code) => (
												<div
													key={code.id}
													className="flex items-center justify-between p-4 bg-background/50 border border-border rounded-lg"
												>
													<div>
														<p className="font-medium text-foreground">{code.display_name}</p>
														<p className="text-xs text-muted-foreground mt-1">
															Code: {code.code}
														</p>
														<p className="text-xs text-muted-foreground mt-1">
															Créé le {new Date(code.created_at).toLocaleDateString('fr-FR')}
														</p>
													</div>
													<button
														onClick={() => handleDeleteTrackingCode(code.id)}
														className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											))
										) : (
											<div className="text-center py-8 text-muted-foreground">
												Aucun tracking code
											</div>
										)}
									</div>
								</motion.div>
							)}

							{userData.role === 'affiliate' && (
								<>
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.25 }}
										className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
									>
										<div className="flex items-center justify-between mb-6">
											<h2 className="text-2xl font-bold text-foreground">Gérer les FTDs</h2>
											<div className="flex items-center gap-2">
												<button
													onClick={() => setShowManageFtdsModal(true)}
													className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/70 transition-colors"
												>
													<Edit2 className="w-4 h-4" />
													Voir tout
												</button>
												<button
													onClick={() => setShowAddFtdModal(true)}
													className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
												>
													<Plus className="w-4 h-4" />
													Ajouter FTD
												</button>
											</div>
										</div>
										<div className="space-y-3">
											{ftdAssignments.length > 0 ? (
												ftdAssignments.slice(0, 10).map((ftd: any) => (
													<div key={ftd.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
														<div>
															<p className="font-medium text-foreground">
																{ftd.ftd_user_id || <span className="text-muted-foreground italic">FTD en masse</span>}
															</p>
															<p className="text-xs text-muted-foreground">
																{ftd.tracking_code} • {new Date(ftd.registration_date).toLocaleDateString('fr-FR')}
															</p>
														</div>
														<button
															onClick={() => handleDeleteFtd(ftd.id)}
															className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
														>
															<Trash2 className="w-4 h-4" />
														</button>
													</div>
												))
											) : (
												<div className="text-center py-8 text-muted-foreground">
													Aucun FTD
												</div>
											)}
											{ftdAssignments.length > 10 && (
												<p className="text-xs text-muted-foreground text-center">
													...et {ftdAssignments.length - 10} FTD(s) de plus
												</p>
											)}
										</div>
									</motion.div>

									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.27 }}
										className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
									>
										<div className="flex items-center justify-between mb-6">
											<h2 className="text-2xl font-bold text-foreground">Gérer Revshare</h2>
											<button
												onClick={() => {
													fetchFtdAssignments();
													setShowManageRevshareModal(true);
												}}
												className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
											>
												<Edit2 className="w-4 h-4" />
												Gérer
											</button>
										</div>
										<p className="text-sm text-muted-foreground">
											Ajouter ou modifier le revshare des traders liés à cet affilié
										</p>
									</motion.div>
								</>
							)}

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.29 }}
								className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
							>
								<div className="flex items-center justify-between mb-6">
									<h2 className="text-2xl font-bold text-foreground">Documents et Fichiers</h2>
									<label className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer">
										<input
											type="file"
											onChange={handleFileUpload}
											disabled={uploadingFile}
											className="hidden"
											accept="*/*"
										/>
										<Plus className="w-4 h-4" />
										{uploadingFile ? 'Upload en cours...' : 'Ajouter un fichier'}
									</label>
								</div>

								<div className="space-y-3">
									{userFiles.length > 0 ? (
										userFiles.map((file: any) => (
											<div key={file.id} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
												<div className="flex items-center gap-3 flex-1 min-w-0">
													<div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
														<FileText className="w-5 h-5 text-primary" />
													</div>
													<div className="flex-1 min-w-0">
														<p className="font-medium text-foreground truncate">{file.original_filename}</p>
														<p className="text-xs text-muted-foreground">
															{(file.file_size / 1024).toFixed(2)} KB • Uploadé le {new Date(file.created_at).toLocaleDateString('fr-FR')}
															{file.uploaded_by_username && ` par ${file.uploaded_by_username}`}
														</p>
													</div>
												</div>
												<div className="flex items-center gap-2 flex-shrink-0">
													<button
														onClick={() => handleFileView(file.id)}
														className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
														title="Voir le fichier"
													>
														<Eye className="w-4 h-4" />
													</button>
													<button
														onClick={() => handleFileDelete(file.id)}
														className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
														title="Supprimer le fichier"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</div>
										))
									) : (
										<div className="text-center py-8 text-muted-foreground">
											Aucun fichier
										</div>
									)}
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
							>
								<div className="flex items-center justify-between mb-6">
									<h2 className="text-2xl font-bold text-foreground">Shaves</h2>
									<button
										onClick={() => setShowShaveModal(true)}
										className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
									>
										<Plus className="w-4 h-4" />
										Nouveau shave
									</button>
								</div>

								<div className="space-y-3">
									{shaves.length === 0 ? (
										<p className="text-muted-foreground text-center py-4">Aucun shave</p>
									) : (
										shaves.map((shave) => (
											<div key={shave.id} className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
												<div className="flex-1">
													<p className="text-foreground font-medium">
														{shave.user_username} → {shave.intermediary_username && `${shave.intermediary_username} → `}{shave.target_username}
													</p>
													<p className="text-sm text-muted-foreground">
														{shave.commission_type === 'percentage' ? `${shave.value}%` : `${shave.value}€ par FTD`}
													</p>
												</div>
												<div className="flex gap-2">
													<button
														onClick={() => {
															setEditingShave(shave);
															setEditShaveForm({
																commission_type: shave.commission_type,
																value: shave.value
															});
															setShowEditShaveModal(true);
														}}
														className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
													>
														<Edit2 className="w-4 h-4" />
													</button>
													<button
														onClick={() => handleDeleteShave(shave.id)}
														className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</div>
										))
									)}
								</div>
							</motion.div>
						</div>
					) : (
						<p className="text-center text-muted-foreground">Utilisateur non trouvé</p>
					)}
				</div>
			</div>

			<Modal
				isOpen={showSalaryModal}
				onClose={() => setShowSalaryModal(false)}
				title="Modifier la commission fixe"
			>
				<p className="text-sm text-muted-foreground mb-4">
					La modification sera appliquée le 1er du mois prochain
				</p>
				<input
					type="number"
					step="0.01"
					placeholder="Nouvelle commission fixe"
					value={newSalary}
					onChange={(e) => setNewSalary(e.target.value)}
					className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground mb-4"
				/>
				<div className="flex gap-3 pt-4 border-t border-gray-200">
					<button
						onClick={() => setShowSalaryModal(false)}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Annuler
					</button>
					<button
						onClick={handleSalaryChange}
						className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm"
					>
						Confirmer
					</button>
				</div>
			</Modal>

			<Modal
				isOpen={showEditShaveModal}
				onClose={() => setShowEditShaveModal(false)}
				title="Modifier le shave"
			>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Type de rémunération</label>
						<div className="flex gap-4">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="editCommissionType"
									value="percentage"
									checked={editShaveForm.commission_type === 'percentage'}
									onChange={(e) => setEditShaveForm({ ...editShaveForm, commission_type: e.target.value as 'percentage' | 'fixed_per_ftd' })}
									className="w-4 h-4 text-blue-600"
								/>
								<span className="text-sm text-foreground">Shave (%)</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="editCommissionType"
									value="fixed_per_ftd"
									checked={editShaveForm.commission_type === 'fixed_per_ftd'}
									onChange={(e) => setEditShaveForm({ ...editShaveForm, commission_type: e.target.value as 'percentage' | 'fixed_per_ftd' })}
									className="w-4 h-4 text-blue-600"
								/>
								<span className="text-sm text-foreground">Commission fixe par FTD</span>
							</label>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							{editShaveForm.commission_type === 'percentage' ? 'Pourcentage (%)' : 'Montant par FTD (€)'}
						</label>
						<input
							type="number"
							step="0.01"
							placeholder={editShaveForm.commission_type === 'percentage' ? 'Pourcentage' : 'Montant'}
							value={editShaveForm.value}
							onChange={(e) => setEditShaveForm({ ...editShaveForm, value: parseFloat(e.target.value) || 0 })}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
						/>
					</div>
				</div>
				<div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
					<button
						onClick={() => setShowEditShaveModal(false)}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Annuler
					</button>
					<button
						onClick={handleUpdateShave}
						className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm"
					>
						Sauvegarder
					</button>
				</div>
			</Modal>

			<Modal
				isOpen={showReferrerModal}
				onClose={() => {
					setShowReferrerModal(false);
					setSelectedReferrer(null);
					setReferrerSearch('');
					setReferrerCommissionValue(0);
				}}
				title="Ajouter/Modifier le parrain"
			>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Rechercher un utilisateur</label>
						<input
							type="text"
							placeholder="Nom d'utilisateur ou email"
							value={referrerSearch}
							onChange={(e) => {
								setReferrerSearch(e.target.value);
								searchReferrer(e.target.value);
							}}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
						/>
						{referrerSearchResults.length > 0 && (
							<div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-lg bg-background">
								{referrerSearchResults.map((user) => (
									<button
										key={user.id}
										onClick={() => {
											setSelectedReferrer(user);
											setReferrerSearchResults([]);
											setReferrerSearch(user.username);
										}}
										className="w-full px-4 py-2 text-left hover:bg-accent transition-colors"
									>
										<p className="font-medium text-foreground">{user.username}</p>
										<p className="text-sm text-muted-foreground">{user.email}</p>
									</button>
								))}
							</div>
						)}
						{selectedReferrer && (
							<div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
								<p className="text-sm text-green-700">
									<span className="font-semibold">Sélectionné:</span> {selectedReferrer.username}
								</p>
							</div>
						)}
					</div>

					{selectedReferrer && (
						<>
							<div>
								<label className="block text-sm font-medium text-foreground mb-2">Type de rémunération</label>
								<div className="flex gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="referrerCommissionType"
											value="percentage"
											checked={referrerCommissionType === 'percentage'}
											onChange={(e) => setReferrerCommissionType(e.target.value as 'percentage' | 'fixed_per_ftd')}
											className="w-4 h-4 text-blue-600"
										/>
										<span className="text-sm text-foreground">Shave (%)</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="referrerCommissionType"
											value="fixed_per_ftd"
											checked={referrerCommissionType === 'fixed_per_ftd'}
											onChange={(e) => setReferrerCommissionType(e.target.value as 'percentage' | 'fixed_per_ftd')}
											className="w-4 h-4 text-blue-600"
										/>
										<span className="text-sm text-foreground">Commission fixe par FTD</span>
									</label>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-foreground mb-2">
									{referrerCommissionType === 'percentage' ? 'Pourcentage (%)' : 'Montant par FTD (€)'}
								</label>
								<input
									type="number"
									step="0.01"
									placeholder={referrerCommissionType === 'percentage' ? 'Ex: 10' : 'Ex: 50'}
									value={referrerCommissionValue || ''}
									onChange={(e) => setReferrerCommissionValue(parseFloat(e.target.value) || 0)}
									className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
								/>
							</div>
						</>
					)}
				</div>
				<div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
					<button
						onClick={() => {
							setShowReferrerModal(false);
							setSelectedReferrer(null);
							setReferrerSearch('');
							setReferrerCommissionValue(0);
						}}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Annuler
					</button>
					<button
						onClick={handleUpdateReferrer}
						disabled={!selectedReferrer || referrerCommissionValue <= 0}
						className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 font-medium text-sm"
					>
						Confirmer
					</button>
				</div>
			</Modal>

			<Modal
				isOpen={showAddTrackingCodeModal}
				onClose={() => setShowAddTrackingCodeModal(false)}
				title="Ajouter un tracking code"
			>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Nom visible</label>
						<input
							type="text"
							placeholder="Ex: Campagne Facebook"
							value={newTrackingCodeDisplayName}
							onChange={(e) => setNewTrackingCodeDisplayName(e.target.value)}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Code unique</label>
						<input
							type="text"
							placeholder="Entrez le tracking code unique"
							value={newTrackingCode}
							onChange={(e) => setNewTrackingCode(e.target.value)}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">AFP (optionnel)</label>
						<input
							type="text"
							placeholder="Ex: AFP123"
							value={newTrackingCodeAfp}
							onChange={(e) => setNewTrackingCodeAfp(e.target.value)}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						/>
					</div>
				</div>
				<div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
					<button
						onClick={() => setShowAddTrackingCodeModal(false)}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Annuler
					</button>
					<button
						onClick={handleAddTrackingCode}
						className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm"
					>
						Ajouter
					</button>
				</div>
			</Modal>

			<Modal
				isOpen={showShaveModal}
				onClose={() => setShowShaveModal(false)}
				title="Créer un shave"
			>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Cible</label>
						<select
							value={shaveForm.target_id}
							onChange={(e) => setShaveForm({ ...shaveForm, target_id: e.target.value })}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						>
							<option value="">Sélectionner un utilisateur</option>
							{allUsers.filter(u => u.id !== parseInt(userId!)).map(u => (
								<option key={u.id} value={u.id}>{u.username} ({u.role})</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Intermédiaire (optionnel)</label>
						<select
							value={shaveForm.intermediary_id}
							onChange={(e) => setShaveForm({ ...shaveForm, intermediary_id: e.target.value })}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						>
							<option value="">Aucun</option>
							{allUsers.filter(u => u.id !== parseInt(userId!) && u.id.toString() !== shaveForm.target_id).map(u => (
								<option key={u.id} value={u.id}>{u.username} ({u.role})</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Pourcentage</label>
						<input
							type="number"
							step="0.01"
							placeholder="Valeur du shave"
							value={shaveForm.value}
							onChange={(e) => setShaveForm({ ...shaveForm, value: e.target.value })}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						/>
					</div>
				</div>
				<div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
					<button
						onClick={() => setShowShaveModal(false)}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Annuler
					</button>
					<button
						onClick={handleCreateShave}
						className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm"
					>
						Créer
					</button>
				</div>
			</Modal>

			<Modal
				isOpen={showAddFtdModal}
				onClose={() => setShowAddFtdModal(false)}
				title="Ajouter un FTD"
			>
				<div className="space-y-4">
					<div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
						<input
							type="checkbox"
							id="bulk-ftd"
							checked={ftdForm.is_bulk}
							onChange={(e) => setFtdForm({ ...ftdForm, is_bulk: e.target.checked, ftd_user_id: '' })}
							className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
						/>
						<label htmlFor="bulk-ftd" className="text-sm font-medium text-blue-900 cursor-pointer">
							Ajouter plusieurs FTDs (en masse)
						</label>
					</div>

					{!ftdForm.is_bulk && (
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">User ID (compte casino)</label>
							<input
								type="text"
								placeholder="Ex: User_12345"
								value={ftdForm.ftd_user_id}
								onChange={(e) => setFtdForm({ ...ftdForm, ftd_user_id: e.target.value })}
								className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
							/>
						</div>
					)}

					{ftdForm.is_bulk && (
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">Quantité</label>
							<input
								type="number"
								min="1"
								placeholder="Nombre de FTDs"
								value={ftdForm.quantity}
								onChange={(e) => setFtdForm({ ...ftdForm, quantity: parseInt(e.target.value) || 1 })}
								className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
							/>
						</div>
					)}

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Date d'inscription</label>
						<input
							type="date"
							value={ftdForm.registration_date}
							onChange={(e) => setFtdForm({ ...ftdForm, registration_date: e.target.value })}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Tracking Code</label>
						<select
							value={ftdForm.tracking_code}
							onChange={(e) => setFtdForm({ ...ftdForm, tracking_code: e.target.value })}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						>
							<option value="">Sélectionner un tracking code</option>
							{trackingCodes.map(code => (
								<option key={code.id} value={code.code}>{code.display_name} ({code.code})</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">AFP (optionnel)</label>
						<input
							type="text"
							placeholder="Ex: AFP123"
							value={ftdForm.afp}
							onChange={(e) => setFtdForm({ ...ftdForm, afp: e.target.value })}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">Note (visible uniquement par les admins)</label>
						<textarea
							placeholder="Ajoutez une note sur ce FTD..."
							value={ftdForm.note}
							onChange={(e) => setFtdForm({ ...ftdForm, note: e.target.value })}
							rows={3}
							className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
						/>
					</div>
				</div>
				<div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
					<button
						onClick={() => setShowAddFtdModal(false)}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Annuler
					</button>
					<button
						onClick={handleAddFtd}
						className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm"
					>
						Ajouter
					</button>
				</div>
			</Modal>

			<Modal
				isOpen={showManageRevshareModal}
				onClose={() => {
					setShowManageRevshareModal(false);
					setShowTraderDropdown(false);
					setTraderSearchQuery('');
				}}
				title="Gérer le Revshare"
			>
				<div className="space-y-6" onClick={() => setShowTraderDropdown(false)}>
					<div>
						<h3 className="font-semibold text-foreground mb-3">Ajouter un Revshare</h3>
						<div className="space-y-3">
							<div className="relative" onClick={(e) => e.stopPropagation()}>
								<label className="block text-sm font-medium text-foreground mb-2">Trader ID</label>
								<input
									type="text"
									placeholder="Rechercher un Trader ID..."
									value={traderSearchQuery}
									onChange={(e) => {
										setTraderSearchQuery(e.target.value);
										setShowTraderDropdown(true);
									}}
									onFocus={() => setShowTraderDropdown(true)}
									className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								/>
								{showTraderDropdown && traderSearchQuery && filteredTraders.length > 0 && (
									<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
										{filteredTraders.slice(0, 50).map(assignment => (
											<button
												key={assignment.ftd_user_id}
												type="button"
												onClick={() => handleSelectTrader(assignment.ftd_user_id)}
												className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-b-0"
											>
												<p className="font-medium text-foreground">Trader ID: {assignment.ftd_user_id}</p>
												<p className="text-xs text-muted-foreground">
													Inscrit le {new Date(assignment.registration_date).toLocaleDateString('fr-FR')} • {assignment.tracking_code}
												</p>
											</button>
										))}
										{filteredTraders.length > 50 && (
											<div className="px-4 py-2 text-xs text-muted-foreground text-center">
												{filteredTraders.length - 50} autres résultats... Affinez votre recherche
											</div>
										)}
									</div>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-foreground mb-2">Date</label>
								<input
									type="date"
									value={revshareForm.date}
									onChange={(e) => setRevshareForm({ ...revshareForm, date: e.target.value })}
									className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-foreground mb-2">Montant Revshare (€)</label>
								<input
									type="number"
									step="0.01"
									placeholder="Ex: 150.00"
									value={revshareForm.revshare}
									onChange={(e) => setRevshareForm({ ...revshareForm, revshare: e.target.value })}
									className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								/>
							</div>
							<button
								onClick={handleAddRevshare}
								className="w-full px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm"
							>
								Ajouter
							</button>
						</div>
					</div>

					<div className="border-t border-border pt-4">
						<h3 className="font-semibold text-foreground mb-3">Traders liés à cet affilié</h3>
						<div className="space-y-2 max-h-60 overflow-y-auto">
							{ftdAssignments.length > 0 ? (
								ftdAssignments.map((assignment, index) => (
									<div key={index} className="p-3 bg-background/50 border border-border rounded-lg">
										<p className="text-sm font-medium text-foreground">Trader ID: {assignment.ftd_user_id}</p>
										<p className="text-xs text-muted-foreground">Inscrit le {new Date(assignment.registration_date).toLocaleDateString('fr-FR')}</p>
										<p className="text-xs text-muted-foreground">Tracking: {assignment.tracking_code}</p>
									</div>
								))
							) : (
								<p className="text-sm text-muted-foreground text-center py-4">Aucun trader lié</p>
							)}
						</div>
					</div>
				</div>
				<div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
					<button
						onClick={() => setShowManageRevshareModal(false)}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Fermer
					</button>
				</div>
			</Modal>

			<ManageFtdsModal
				isOpen={showManageFtdsModal}
				onClose={() => setShowManageFtdsModal(false)}
				userId={userData?.id || 0}
				onFtdDeleted={() => {
					fetchFtdAssignments();
				}}
			/>

			<Modal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				title="Supprimer le compte"
			>
				<div className="space-y-4">
					<div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
						<AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
						<div>
							<h3 className="font-semibold text-red-900 mb-1">Attention : Action irréversible</h3>
							<p className="text-sm text-red-700">
								Vous êtes sur le point de supprimer définitivement le compte de <span className="font-semibold">{userData?.username}</span>.
							</p>
						</div>
					</div>

					<div className="space-y-2">
						<p className="text-sm text-foreground font-medium">Cette action entraînera la suppression de :</p>
						<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
							<li>Toutes les données personnelles de l'utilisateur</li>
							<li>Les statistiques et l'historique des transactions</li>
							<li>Les fichiers et documents associés</li>
							<li>Les shaves et les tracking codes</li>
							<li>L'accès au compte</li>
						</ul>
					</div>

					<p className="text-sm text-red-600 font-medium">
						Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?
					</p>
				</div>

				<div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
					<button
						onClick={() => setShowDeleteModal(false)}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Annuler
					</button>
					<button
						onClick={() => {
							setShowDeleteModal(false);
							setShowSecondDeleteModal(true);
						}}
						className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm"
					>
						Continuer
					</button>
				</div>
			</Modal>

			<Modal
				isOpen={showSecondDeleteModal}
				onClose={() => setShowSecondDeleteModal(false)}
				title="Confirmation finale"
			>
				<div className="space-y-4">
					<div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
						<AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
						<div>
							<h3 className="font-bold text-red-900 mb-2 text-lg">Dernière confirmation</h3>
							<p className="text-sm text-red-700 font-medium">
								Vous allez supprimer définitivement le compte de <span className="font-bold">{userData?.username}</span>.
							</p>
							<p className="text-sm text-red-700 mt-2">
								Il n'y a pas de retour en arrière possible. Toutes les données seront perdues.
							</p>
						</div>
					</div>

					<p className="text-center text-lg font-semibold text-foreground">
						Voulez-vous vraiment supprimer ce compte ?
					</p>
				</div>

				<div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
					<button
						onClick={() => {
							setShowSecondDeleteModal(false);
							setShowDeleteModal(false);
						}}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						Annuler
					</button>
					<button
						onClick={handleDeleteAccount}
						className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold text-sm"
					>
						Supprimer définitivement
					</button>
				</div>
			</Modal>
		</div>
	);
}