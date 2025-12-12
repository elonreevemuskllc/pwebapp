import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, AlertCircle, Upload, FileText, Trash2, DollarSign, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../hooks/useTranslation';
import usdtIcon from '../assets/crypto-icons/usdt.png';
import usdcIcon from '../assets/crypto-icons/usdc.png';
import ethIcon from '../assets/crypto-icons/eth.png';
import { buildApiUrl } from '../utils/api';

interface ExpenseRequestModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

interface CryptoOption {
	id: string;
	name: string;
	icon: string;
	networks: string[];
}

const cryptoOptions: CryptoOption[] = [
	// {
	// 	id: 'USDT',
	// 	name: 'USDT',
	// 	icon: usdtIcon,
	// 	networks: ['BEP20', 'TRC20', 'SOL']
	// },
	// {
	// 	id: 'USDC',
	// 	name: 'USDC',
	// 	icon: usdcIcon,
	// 	networks: ['BEP20', 'TRC20', 'SOL', 'ARBITRUM']
	// },
	// {
	// 	id: 'ETH',
	// 	name: 'ETH',
	// 	icon: ethIcon,
	// 	networks: ['ERC20']
	// }
	{
		id: 'USDC',
		name: 'USDC',
		icon: usdcIcon,
		networks: ['SOL']
	},
];

export default function ExpenseRequestModal({ isOpen, onClose, onSuccess }: ExpenseRequestModalProps) {
	const { t } = useTranslation();
	const [amount, setAmount] = useState('');
	const [description, setDescription] = useState('');
	const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
	const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
	const [walletAddress, setWalletAddress] = useState('');
	const [confirmWallet, setConfirmWallet] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [uploadedFileId, setUploadedFileId] = useState<number | null>(null);
	const [isUploading, setIsUploading] = useState(false);

	const handleClose = () => {
		if (!isSubmitting) {
			setAmount('');
			setDescription('');
			setSelectedCrypto(null);
			setSelectedNetwork(null);
			setWalletAddress('');
			setConfirmWallet('');
			setUploadedFile(null);
			setUploadedFileId(null);
			onClose();
		}
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
		if (!validTypes.includes(file.type)) {
			toast.error(t('expenseRequestModal.unsupportedFormat'));
			return;
		}

		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			toast.error(t('expenseRequestModal.fileTooLarge'));
			return;
		}

		setIsUploading(true);
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('category', 'expense_attachment');

			const response = await fetch(buildApiUrl('/api/upload'), {
				method: 'POST',
				credentials: 'include',
				body: formData
			});

			if (response.ok) {
				const data = await response.json();
				setUploadedFile(file);
				setUploadedFileId(data.fileId);
				toast.success(t('expenseRequestModal.fileUploadedSuccess'));
			} else {
				const data = await response.json();
				toast.error(data.error || t('expenseRequestModal.fileUploadError'));
			}
		} catch (error) {
			toast.error(t('expenseRequestModal.fileUploadError'));
		} finally {
			setIsUploading(false);
		}
	};

	const handleRemoveFile = () => {
		setUploadedFile(null);
		setUploadedFileId(null);
	};

	const handleCryptoSelect = (cryptoId: string) => {
		setSelectedCrypto(cryptoId);
		setSelectedNetwork(null);
	};

	const validateForm = () => {
		if (!amount || parseFloat(amount) <= 0) {
			toast.error(t('expenseRequestModal.invalidAmount'));
			return false;
		}

		if (!description.trim()) {
			toast.error(t('expenseRequestModal.descriptionRequired'));
			return false;
		}

		if (description.trim().length < 10) {
			toast.error(t('expenseRequestModal.descriptionTooShort'));
			return false;
		}

		if (!selectedCrypto) {
			toast.error(t('expenseRequestModal.cryptoRequired'));
			return false;
		}

		if (!selectedNetwork) {
			toast.error(t('expenseRequestModal.networkRequired'));
			return false;
		}

		if (!walletAddress.trim()) {
			toast.error(t('expenseRequestModal.walletRequired'));
			return false;
		}

		if (walletAddress !== confirmWallet) {
			toast.error(t('expenseRequestModal.addressesDoNotMatch'));
			return false;
		}

		return true;
	};

	const handleSubmit = async () => {
		if (!validateForm()) return;

		setIsSubmitting(true);
		try {
			const response = await fetch(buildApiUrl('/api/expense-reimbursements'), {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					amount: parseFloat(amount),
					description: description.trim(),
					crypto_type: selectedCrypto,
					network: selectedNetwork,
					wallet_address: walletAddress.trim(),
					attachment_file_id: uploadedFileId
				})
			});

			if (response.ok) {
				toast.success(t('expenseRequestModal.requestSuccess'));
				handleClose();
				onSuccess();
			} else {
				const data = await response.json();
				toast.error(data.error || t('expenseRequestModal.requestError'));
			}
		} catch (error) {
			toast.error(t('expenseRequestModal.connectionError'));
		} finally {
			setIsSubmitting(false);
		}
	};

	const selectedCryptoData = cryptoOptions.find(c => c.id === selectedCrypto);

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
						onClick={handleClose}
					/>
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
						>
							<div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-lg">
										<Receipt className="w-5 h-5 text-primary" />
									</div>
									<h2 className="text-2xl font-bold text-foreground">{t('expenseRequestModal.title')}</h2>
								</div>
								<button
									onClick={handleClose}
									disabled={isSubmitting}
									className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
								>
									<X className="w-5 h-5 text-muted-foreground" />
								</button>
							</div>

							<div className="p-6 space-y-6">
								<div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
									<AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-medium text-blue-500 mb-1">{t('expenseRequestModal.infoTitle')}</p>
										<p className="text-sm text-muted-foreground">
											{t('expenseRequestModal.infoText')}
										</p>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('expenseRequestModal.amountLabel')} <span className="text-red-500">*</span>
									</label>
									<div className="relative">
										<input
											type="number"
											value={amount}
											onChange={(e) => setAmount(e.target.value)}
											placeholder="0.00"
											step="0.01"
											min="0"
											disabled={isSubmitting}
											className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground disabled:opacity-50"
										/>
										<span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('expenseRequestModal.descriptionLabel')} <span className="text-red-500">*</span>
									</label>
									<textarea
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder={t('expenseRequestModal.descriptionPlaceholder')}
										rows={5}
										disabled={isSubmitting}
										className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none disabled:opacity-50"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										{t('expenseRequestModal.descriptionHint')}
									</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('expenseRequestModal.attachmentLabel')}
									</label>
									{!uploadedFile ? (
										<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl hover:border-primary transition-colors cursor-pointer bg-background disabled:opacity-50">
											<div className="flex flex-col items-center justify-center pt-5 pb-6">
												<Upload className={`w-8 h-8 mb-2 ${isUploading ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
												<p className="mb-2 text-sm text-muted-foreground">
													{isUploading ? (
														<span className="font-semibold">{t('expenseRequestModal.uploading')}</span>
													) : (
														<>
															<span className="font-semibold">{t('expenseRequestModal.clickToUpload')}</span> {t('expenseRequestModal.dragAndDrop')}
														</>
													)}
												</p>
												<p className="text-xs text-muted-foreground">
													{t('expenseRequestModal.fileTypes')}
												</p>
											</div>
											<input
												type="file"
												className="hidden"
												accept="image/*,.pdf"
												onChange={handleFileSelect}
												disabled={isSubmitting || isUploading}
											/>
										</label>
									) : (
										<div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
											<div className="flex items-center gap-3">
												<FileText className="w-5 h-5 text-primary" />
												<div>
													<p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
													<p className="text-xs text-muted-foreground">
														{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
													</p>
												</div>
											</div>
											<button
												onClick={handleRemoveFile}
												disabled={isSubmitting}
												className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-3">
										{t('expenseRequestModal.cryptoLabel')} <span className="text-red-500">*</span>
									</label>
									<div className="grid grid-cols-3 gap-3">
										{cryptoOptions.map((crypto) => (
											<button
												key={crypto.id}
												onClick={() => handleCryptoSelect(crypto.id)}
												disabled={isSubmitting}
												className={`p-4 border rounded-xl transition-all disabled:opacity-50 ${
													selectedCrypto === crypto.id
														? 'border-primary bg-primary/10'
														: 'border-border hover:border-accent'
												}`}
											>
												<img src={crypto.icon} alt={crypto.name} className="w-8 h-8 mx-auto mb-2" />
												<p className="text-sm font-medium text-foreground">{crypto.name}</p>
											</button>
										))}
									</div>
								</div>

								{selectedCryptoData && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
									>
										<label className="block text-sm font-medium text-foreground mb-3">
											{t('expenseRequestModal.networkLabel')} <span className="text-red-500">*</span>
										</label>
										<div className="grid grid-cols-2 gap-3">
											{selectedCryptoData.networks.map((network) => (
												<button
													key={network}
													onClick={() => setSelectedNetwork(network)}
													disabled={isSubmitting}
													className={`p-3 border rounded-xl transition-all disabled:opacity-50 ${
														selectedNetwork === network
															? 'border-primary bg-primary/10'
															: 'border-border hover:border-accent'
													}`}
												>
													<p className="text-sm font-medium text-foreground">{network}</p>
												</button>
											))}
										</div>
									</motion.div>
								)}

								{selectedNetwork && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										className="space-y-4"
									>
										<div>
											<label className="block text-sm font-medium text-foreground mb-2">
												{t('expenseRequestModal.walletAddressLabel')} <span className="text-red-500">*</span>
											</label>
											<input
												type="text"
												value={walletAddress}
												onChange={(e) => setWalletAddress(e.target.value)}
												placeholder={t('expenseRequestModal.walletAddressPlaceholder')}
												disabled={isSubmitting}
												className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-mono text-sm disabled:opacity-50"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-foreground mb-2">
												{t('expenseRequestModal.confirmWalletLabel')} <span className="text-red-500">*</span>
											</label>
											<input
												type="text"
												value={confirmWallet}
												onChange={(e) => setConfirmWallet(e.target.value)}
												placeholder={t('expenseRequestModal.confirmWalletPlaceholder')}
												disabled={isSubmitting}
												className={`w-full px-4 py-3 bg-background border rounded-xl focus:outline-none focus:ring-2 text-foreground font-mono text-sm disabled:opacity-50 ${
													confirmWallet && walletAddress !== confirmWallet
														? 'border-red-500 focus:ring-red-500'
														: 'border-border focus:ring-primary'
												}`}
											/>
											{confirmWallet && walletAddress !== confirmWallet && (
												<p className="text-xs text-red-500 mt-1">{t('expenseRequestModal.addressesDoNotMatch')}</p>
											)}
										</div>
									</motion.div>
								)}

								<div className="flex gap-3 pt-4">
									<button
										onClick={handleClose}
										disabled={isSubmitting}
										className="flex-1 px-6 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
									>
										{t('expenseRequestModal.cancel')}
									</button>
									<button
										onClick={handleSubmit}
										disabled={isSubmitting}
										className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
									>
										{isSubmitting ? t('expenseRequestModal.submitting') : t('expenseRequestModal.submit')}
									</button>
								</div>
							</div>
						</motion.div>
					</div>
				</>
			)}
		</AnimatePresence>
	);
}