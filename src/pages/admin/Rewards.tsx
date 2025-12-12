import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { toast } from 'sonner';
import { useTranslation } from '../../hooks/useTranslation';

interface Reward {
  id: number;
  name: string;
  image_url: string;
  value_euros: number;
  ftd_required: number;
  created_at: string;
  updated_at: string;
}

interface RewardClaim {
  id: number;
  reward_id: number;
  user_id: number;
  claim_type: 'physical' | 'balance';
  status: 'pending' | 'approved' | 'rejected';
  shipping_first_name?: string;
  shipping_last_name?: string;
  shipping_address?: string;
  shipping_address_complement?: string;
  shipping_country?: string;
  shipping_postal_code?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: number;
  admin_note?: string;
  reward_name: string;
  reward_value: number;
  user_email: string;
  user_username: string;
}

export default function Rewards() {
  const { user, loading, logout } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [activeTab, setActiveTab] = useState<'rewards' | 'claims'>('rewards');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteModalData, setNoteModalData] = useState<{ claimId: number; status: 'approved' | 'rejected' } | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const navItems = getNavItems('admin');
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    value_euros: 0,
    ftd_required: 1,
  });

  useEffect(() => {
    if (user && user.accountType === 'admin') {
      fetchRewards();
      fetchClaims();
    }
  }, [user]);

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

  const fetchClaims = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rewards/claims/list`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setClaims(data);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) {
      throw new Error('No image selected');
    }

    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              image: reader.result,
              filename: imageFile.name,
            }),
          });

          if (!response.ok) throw new Error('Upload failed');

          const data = await response.json();
          resolve(data.imageUrl);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = editingReward?.image_url || '';

      if (imageFile) {
        imageUrl = await uploadImage();
      } else if (!editingReward) {
        toast.error(t('adminRewards.toast.selectImage'));
        return;
      }

      const payload = {
        ...formData,
        image_url: imageUrl,
      };

      const url = editingReward
        ? `${import.meta.env.VITE_API_URL}/api/rewards/${editingReward.id}`
        : `${import.meta.env.VITE_API_URL}/api/rewards`;

      const response = await fetch(url, {
        method: editingReward ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingReward ? t('adminRewards.toast.rewardUpdated') : t('adminRewards.toast.rewardCreated'));
        fetchRewards();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      toast.error(t('adminRewards.toast.saveError'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('adminRewards.confirmDelete'))) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rewards/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success(t('adminRewards.toast.rewardDeleted'));
        fetchRewards();
      }
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast.error(t('adminRewards.toast.deleteError'));
    }
  };

  const openNoteModal = (claimId: number, status: 'approved' | 'rejected') => {
    setNoteModalData({ claimId, status });
    setAdminNote('');
    setShowNoteModal(true);
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setNoteModalData(null);
    setAdminNote('');
  };

  const handleProcessClaim = async () => {
    if (!noteModalData) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rewards/claims/${noteModalData.claimId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: noteModalData.status,
          admin_note: adminNote.trim() || null
        }),
      });

      if (response.ok) {
        toast.success(noteModalData.status === 'approved' ? t('adminRewards.toast.claimApproved') : t('adminRewards.toast.claimRejected'));
        closeNoteModal();
        fetchClaims();
      }
    } catch (error) {
      console.error('Error processing claim:', error);
      toast.error(t('adminRewards.toast.processError'));
    }
  };

  const openModal = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        name: reward.name,
        value_euros: Number(reward.value_euros),
        ftd_required: Number(reward.ftd_required),
      });
      setImagePreview(`${import.meta.env.VITE_API_URL}${reward.image_url}`);
    } else {
      setEditingReward(null);
      setFormData({
        name: '',
        value_euros: 0,
        ftd_required: 1,
      });
      setImagePreview('');
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReward(null);
    setImageFile(null);
    setImagePreview('');
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
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} navItems={navItems} onLogout={logout} />

      <div className="relative pt-24 px-4 pb-12">
        <div className="max-w-7xl mx-auto py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{t('adminRewards.title')}</h1>
            <p className="text-muted-foreground">{t('adminRewards.description')}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all"
          >
            <Plus size={20} />
            {t('adminRewards.newReward')}
          </motion.button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'rewards'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('adminRewards.tabs.rewards')} ({rewards.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'claims'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('adminRewards.tabs.claims')} ({claims.filter((c) => c.status === 'pending').length})
          </button>
        </div>

        {activeTab === 'rewards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-6 border border-border"
              >
                <div className="relative aspect-square mb-4 rounded-xl overflow-hidden bg-muted">
                  <img
                    src={`${import.meta.env.VITE_API_URL}${reward.image_url}`}
                    alt={reward.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">{reward.name}</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('adminRewards.card.ftdRequired')}</span>
                    <span className="text-foreground font-semibold">{reward.ftd_required}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('adminRewards.card.value')}</span>
                    <span className="text-foreground font-semibold">{Number(reward.value_euros).toFixed(2)} €</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(reward)}
                    className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground px-4 py-2 rounded-xl hover:bg-muted/80 transition-all"
                  >
                    <Edit size={16} />
                    {t('adminRewards.card.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-xl hover:bg-destructive/20 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
            {rewards.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {t('adminRewards.noRewards')}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-6 border border-border"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-muted rounded-xl p-3">
                    {claim.claim_type === 'physical' ? (
                      <Package className="text-foreground" size={24} />
                    ) : (
                      <DollarSign className="text-foreground" size={24} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {claim.reward_name}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {claim.user_username} ({claim.user_email})
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                          claim.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            : claim.status === 'approved'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {claim.status === 'pending'
                          ? t('adminRewards.claims.status.pending')
                          : claim.status === 'approved'
                          ? t('adminRewards.claims.status.approved')
                          : t('adminRewards.claims.status.rejected')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">{t('adminRewards.claims.type')}</p>
                        <p className="text-foreground font-semibold">
                          {claim.claim_type === 'physical' ? t('adminRewards.claims.typePhysical') : t('adminRewards.claims.typeBalance')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">{t('adminRewards.claims.value')}</p>
                        <p className="text-foreground font-semibold">
                          {Number(claim.reward_value).toFixed(2)} €
                        </p>
                      </div>
                    </div>

                    {claim.claim_type === 'physical' && (
                      <div className="bg-muted rounded-xl p-4 mb-4">
                        <h4 className="text-foreground font-semibold mb-2">
                          {t('adminRewards.claims.shippingInfo')}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            {claim.shipping_first_name} {claim.shipping_last_name}
                          </p>
                          <p className="text-muted-foreground">{claim.shipping_address}</p>
                          {claim.shipping_address_complement && (
                            <p className="text-muted-foreground">
                              {claim.shipping_address_complement}
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            {claim.shipping_postal_code} {claim.shipping_country}
                          </p>
                        </div>
                      </div>
                    )}

                    {claim.admin_note && claim.status !== 'pending' && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-lg p-4 mt-4">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-1">
                          {t('adminRewards.claims.adminNote')}
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          {claim.admin_note}
                        </p>
                      </div>
                    )}

                    {claim.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openNoteModal(claim.id, 'approved')}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl hover:bg-green-500/20 transition-all"
                        >
                          <CheckCircle size={16} />
                          {t('adminRewards.claims.approve')}
                        </button>
                        <button
                          onClick={() => openNoteModal(claim.id, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all"
                        >
                          <XCircle size={16} />
                          {t('adminRewards.claims.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {claims.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {t('adminRewards.noClaims')}
              </div>
            )}
          </div>
        )}

        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingReward ? t('adminRewards.modal.editTitle') : t('adminRewards.modal.newTitle')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('adminRewards.modal.image')}
            </label>
            <div className="space-y-3">
              {imagePreview && (
                <div className="relative aspect-square w-full max-w-xs mx-auto rounded-xl overflow-hidden bg-muted">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('adminRewards.modal.name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('adminRewards.modal.value')} (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.value_euros || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  value_euros: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('adminRewards.modal.ftdRequired')}
            </label>
            <input
              type="number"
              min="1"
              value={formData.ftd_required || ''}
              onChange={(e) =>
                setFormData({ ...formData, ftd_required: parseInt(e.target.value) || 1 })
              }
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-all"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-6 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-all"
            >
              {t('adminRewards.modal.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
            >
              {editingReward ? t('adminRewards.modal.update') : t('adminRewards.modal.create')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showNoteModal}
        onClose={closeNoteModal}
        title={noteModalData?.status === 'approved' ? t('adminRewards.noteModal.approveTitle') : t('adminRewards.noteModal.rejectTitle')}
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {noteModalData?.status === 'approved'
              ? t('adminRewards.noteModal.approveDescription')
              : t('adminRewards.noteModal.rejectDescription')}
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('adminRewards.noteModal.noteLabel')}
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={t('adminRewards.noteModal.notePlaceholder')}
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={closeNoteModal}
              className="flex-1 px-6 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-all"
            >
              {t('adminRewards.noteModal.cancel')}
            </button>
            <button
              onClick={handleProcessClaim}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                noteModalData?.status === 'approved'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {noteModalData?.status === 'approved' ? t('adminRewards.noteModal.approve') : t('adminRewards.noteModal.reject')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
