import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../hooks/useTranslation';
import { buildApiUrl } from '../utils/api';

interface Ftd {
	id: number;
	ftd_user_id: string;
	registration_date: string;
	tracking_code: string;
	afp: string | null;
	note: string | null;
}

interface ManageFtdsModalProps {
	isOpen: boolean;
	onClose: () => void;
	userId: number;
	onFtdDeleted: () => void;
}

type SortField = 'registration_date' | 'tracking_code';
type SortOrder = 'asc' | 'desc';

export default function ManageFtdsModal({ isOpen, onClose, userId, onFtdDeleted }: ManageFtdsModalProps) {
	const { t, language } = useTranslation();
	const [ftds, setFtds] = useState<Ftd[]>([]);
	const [filteredFtds, setFilteredFtds] = useState<Ftd[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [sortField, setSortField] = useState<SortField>('registration_date');
	const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
	const [deletingId, setDeletingId] = useState<number | null>(null);

	useEffect(() => {
		if (isOpen && userId) {
			fetchFtds();
		}
	}, [isOpen, userId]);

	useEffect(() => {
		applyFiltersAndSort();
	}, [ftds, searchQuery, sortField, sortOrder]);

	const fetchFtds = async () => {
		setLoading(true);
		try {
			const response = await fetch(buildApiUrl('/api/admin/users/${userId}/ftds'), {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				setFtds(data);
			} else {
				toast.error(t('manageFtdsModal.loadError'));
			}
		} catch (error) {
			console.error('Error fetching FTDs:', error);
			toast.error(t('manageFtdsModal.connectionError'));
		} finally {
			setLoading(false);
		}
	};

	const applyFiltersAndSort = () => {
		let filtered = [...ftds];

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(ftd =>
				ftd.ftd_user_id?.toLowerCase().includes(query) ||
				ftd.tracking_code?.toLowerCase().includes(query) ||
				ftd.afp?.toLowerCase().includes(query)
			);
		}

		filtered.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			if (sortField === 'registration_date') {
				aValue = new Date(a[sortField]).getTime();
				bValue = new Date(b[sortField]).getTime();
			} else {
				aValue = (a[sortField] || '').toString();
				bValue = (b[sortField] || '').toString();
			}

			if (sortOrder === 'asc') {
				return aValue > bValue ? 1 : -1;
			} else {
				return aValue < bValue ? 1 : -1;
			}
		});

		setFilteredFtds(filtered);
	};

	const handleDelete = async (ftdId: number) => {
		if (!confirm(t('manageFtdsModal.confirmDelete'))) {
			return;
		}

		setDeletingId(ftdId);
		try {
			const response = await fetch(buildApiUrl('/api/admin/users/${userId}/ftds/${ftdId}'), {
				method: 'DELETE',
				credentials: 'include'
			});

			if (response.ok) {
				toast.success(t('manageFtdsModal.deleteSuccess'));
				setFtds(ftds.filter(ftd => ftd.id !== ftdId));
				onFtdDeleted();
			} else {
				const data = await response.json();
				toast.error(data.error || t('manageFtdsModal.deleteError'));
			}
		} catch (error) {
			console.error('Error deleting FTD:', error);
			toast.error(t('manageFtdsModal.connectionError'));
		} finally {
			setDeletingId(null);
		}
	};

	const toggleSort = (field: SortField) => {
		if (sortField === field) {
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortOrder('desc');
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="fixed inset-0 z-50 flex items-center justify-center p-4"
					>
						<div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
								<h2 className="text-2xl font-bold text-foreground">{t('manageFtdsModal.title')}</h2>
								<button
									onClick={onClose}
									className="p-2 hover:bg-accent rounded-lg transition-colors"
								>
									<X className="w-5 h-5 text-muted-foreground" />
								</button>
							</div>

							<div className="p-6 border-b border-border">
								<div className="flex items-center gap-4 mb-4">
									<div className="relative flex-1">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
										<input
											type="text"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											placeholder={t('manageFtdsModal.searchPlaceholder')}
											className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
										/>
									</div>
								</div>

								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-sm text-muted-foreground">{t('manageFtdsModal.sortBy')}</span>
									<button
										onClick={() => toggleSort('registration_date')}
										className={`px-3 py-1 text-sm rounded-lg transition-colors ${
											sortField === 'registration_date'
												? 'bg-primary text-primary-foreground'
												: 'bg-accent text-foreground hover:bg-accent/70'
										}`}
									>
										{t('manageFtdsModal.registrationDate')} {sortField === 'registration_date' && (sortOrder === 'asc' ? '↑' : '↓')}
									</button>
									<button
										onClick={() => toggleSort('tracking_code')}
										className={`px-3 py-1 text-sm rounded-lg transition-colors ${
											sortField === 'tracking_code'
												? 'bg-primary text-primary-foreground'
												: 'bg-accent text-foreground hover:bg-accent/70'
										}`}
									>
										{t('manageFtdsModal.trackingCode')} {sortField === 'tracking_code' && (sortOrder === 'asc' ? '↑' : '↓')}
									</button>
								</div>
							</div>

							<div className="flex-1 overflow-y-auto p-6">
								{loading ? (
									<div className="flex justify-center py-20">
										<motion.div
											className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
											animate={{ rotate: 360 }}
											transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
										/>
									</div>
								) : filteredFtds.length > 0 ? (
									<div className="space-y-3">
										{filteredFtds.map((ftd) => (
											<motion.div
												key={ftd.id}
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												className="bg-accent/50 border border-border rounded-xl p-4 hover:border-primary/50 transition-all"
											>
												<div className="flex items-start justify-between gap-4">
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-3 mb-2">
															<p className="font-bold text-foreground text-lg">{ftd.ftd_user_id}</p>
														</div>

														<div className="grid grid-cols-2 gap-3 text-sm">
															<div>
																<p className="text-muted-foreground mb-1">{t('manageFtdsModal.trackingCode')}</p>
																<p className="font-medium text-foreground">{ftd.tracking_code}</p>
															</div>

															{ftd.afp && (
																<div>
																	<p className="text-muted-foreground mb-1">{t('manageFtdsModal.afp')}</p>
																	<p className="font-medium text-foreground">{ftd.afp}</p>
																</div>
															)}

															<div>
																<p className="text-muted-foreground mb-1">{t('manageFtdsModal.registrationDate')}</p>
																<div className="flex items-center gap-2">
																	<Calendar className="w-4 h-4 text-primary" />
																	<p className="font-medium text-foreground">{formatDate(ftd.registration_date)}</p>
																</div>
															</div>
														</div>

														{ftd.note && (
															<div className="mt-3 p-3 bg-background/50 border border-border rounded-lg">
																<p className="text-xs text-muted-foreground mb-1">{t('manageFtdsModal.noteLabel')}</p>
																<p className="text-sm text-foreground">{ftd.note}</p>
															</div>
														)}
													</div>

													<button
														onClick={() => handleDelete(ftd.id)}
														disabled={deletingId === ftd.id}
														className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
													>
														{deletingId === ftd.id ? (
															<motion.div
																className="w-4 h-4 border-2 border-red-500/20 border-t-red-500 rounded-full"
																animate={{ rotate: 360 }}
																transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
															/>
														) : (
															<Trash2 className="w-5 h-5" />
														)}
													</button>
												</div>
											</motion.div>
										))}
									</div>
								) : (
									<div className="flex flex-col items-center justify-center py-20">
										<div className="p-4 bg-accent rounded-full mb-4">
											<AlertCircle className="w-8 h-8 text-muted-foreground" />
										</div>
										<p className="text-lg font-medium text-foreground mb-2">{t('manageFtdsModal.noFtdsFound')}</p>
										<p className="text-sm text-muted-foreground">
											{searchQuery ? t('manageFtdsModal.tryAnotherSearch') : t('manageFtdsModal.noFtdsForUser')}
										</p>
									</div>
								)}
							</div>

							<div className="border-t border-border px-6 py-4 bg-accent/30">
								<div className="flex items-center justify-between">
									<p className="text-sm text-muted-foreground">
										{filteredFtds.length > 1 ? t('manageFtdsModal.ftdCount_plural').replace('{count}', filteredFtds.length.toString()) : t('manageFtdsModal.ftdCount').replace('{count}', filteredFtds.length.toString())} {searchQuery && `(${t('manageFtdsModal.total').replace('{count}', ftds.length.toString())})`}
									</p>
									<button
										onClick={onClose}
										className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
									>
										{t('manageFtdsModal.close')}
									</button>
								</div>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}