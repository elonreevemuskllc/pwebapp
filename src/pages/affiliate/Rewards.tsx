import { useState, useEffect } from 'react';
import { Award, Package, DollarSign, Trophy, Lock, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import RewardsProgressBar from '../../components/RewardsProgressBar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { toast } from 'sonner';
import { buildApiUrl } from '../../utils/api';

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
  claim_type: 'physical' | 'balance';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reward_name: string;
  reward_value: number;
  admin_note?: string;
}

interface ClaimFormData {
  claim_type: 'physical' | 'balance';
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_address: string;
  shipping_address_complement: string;
  shipping_country: string;
  shipping_postal_code: string;
}

export default function Rewards() {
  const { user, loading, logout } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [ftdCount, setFtdCount] = useState(0);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const navItems = getNavItems('affiliate');

  const [claimFormData, setClaimFormData] = useState<ClaimFormData>({
    claim_type: 'balance',
    shipping_first_name: '',
    shipping_last_name: '',
    shipping_address: '',
    shipping_address_complement: '',
    shipping_country: '',
    shipping_postal_code: '',
  });

  useEffect(() => {
    if (user && user.accountType === 'affiliate') {
      fetchRewards();
      fetchClaims();
      fetchFtdCount();
    }
  }, [user]);

  const fetchRewards = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/rewards'), { credentials: '))include' });
      if (response.ok) {
        const data = await response.json();
        setRewards(data);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClaims = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/rewards/claims/list'), {
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

  const fetchFtdCount = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/my-monthly-ftd-count'), {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFtdCount(data.monthlyFtdCount || 0);
      }
    } catch (error) {
      console.error('Error fetching FTD count:', error);
    }
  };

  const getRewardStatus = (reward: Reward) => {
    const claim = claims.find((c) => c.reward_id === reward.id);
    if (claim) {
      return {
        claimed: true,
        status: claim.status,
      };
    }
    return {
      claimed: false,
      unlocked: ftdCount >= reward.ftd_required,
    };
  };

  const openClaimModal = (reward: Reward) => {
    setSelectedReward(reward);
    setClaimFormData({
      claim_type: 'balance',
      shipping_first_name: '',
      shipping_last_name: '',
      shipping_address: '',
      shipping_address_complement: '',
      shipping_country: '',
      shipping_postal_code: '',
    });
    setIsClaimModalOpen(true);
  };

  const closeClaimModal = () => {
    setIsClaimModalOpen(false);
    setSelectedReward(null);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward) return;

    try {
      const response = await fetch(buildApiUrl('/api/rewards/claims'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reward_id: selectedReward.id,
          ...claimFormData,
        }),
      });

      if (response.ok) {
        fetchClaims();
        closeClaimModal();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la demande');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Erreur lors de la demande');
    }
  };

  const getProgressPercentage = (ftdRequired: number) => {
    return Math.min((ftdCount / ftdRequired) * 100, 100);
  };

  const getNextReward = () => {
    return rewards.find((r) => ftdCount < r.ftd_required);
  };

  const nextReward = getNextReward();

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
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} navItems={navItems} onLogout={logout} />

      <div className="relative pt-24 px-4 pb-12">
        <div className="max-w-7xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Récompenses</h1>
          <p className="text-muted-foreground">Débloquez des récompenses en augmentant vos FTD</p>
        </div>

      {/* Calendrier de l'avent masqué */}
      {/* <RewardsProgressBar rewards={rewards} claims={claims} ftdCount={ftdCount} /> */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {rewards.map((reward, index) => {
          const status = getRewardStatus(reward);
          const progress = getProgressPercentage(reward.ftd_required);

          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-card border rounded-xl sm:rounded-2xl overflow-hidden ${
                status.claimed
                  ? 'border-green-500/30'
                  : status.unlocked
                  ? 'border-yellow-500/30'
                  : 'border-border'
              }`}
            >
              <div className="relative aspect-square bg-muted">
                <img
                  src={`${buildApiUrl('')}${reward.image_url}`}
                  alt={reward.name}
                  className={`w-full h-full object-cover ${
                    !status.unlocked && !status.claimed ? 'opacity-30' : ''
                  }`}
                />
                {!status.unlocked && !status.claimed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background/50 dark:bg-black/50 backdrop-blur-sm rounded-full p-2 sm:p-3">
                      <Lock className="text-foreground" size={20} />
                    </div>
                  </div>
                )}
                {status.claimed && (
                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                    <div
                      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm font-semibold ${
                        status.status === 'pending'
                          ? 'bg-yellow-500/90 text-white'
                          : status.status === 'approved'
                          ? 'bg-green-500/90 text-white'
                          : 'bg-red-500/90 text-white'
                      }`}
                    >
                      {status.status === 'pending'
                        ? 'En attente'
                        : status.status === 'approved'
                        ? 'Approuvée'
                        : 'Refusée'}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-bold text-foreground mb-2 line-clamp-1">{reward.name}</h3>

                <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="text-foreground font-semibold">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        style={{ width: `${progress}%` }}
                        className={`absolute h-full rounded-full transition-all duration-500 ${
                          progress >= 100
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : 'bg-gradient-to-r from-yellow-500 to-amber-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">FTD requis</span>
                    <span className="text-foreground font-semibold">
                      {ftdCount} / {reward.ftd_required}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">Valeur</span>
                    <span className="text-foreground font-semibold">
                      {Number(reward.value_euros).toFixed(2)} €
                    </span>
                  </div>
                </div>

                {status.unlocked && !status.claimed && (
                  <button
                    onClick={() => openClaimModal(reward)}
                    className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold hover:from-yellow-600 hover:to-amber-700 transition-all"
                  >
                    <Award size={14} className="sm:w-4 sm:h-4" />
                    Demander
                  </button>
                )}

                {status.claimed && status.status === 'approved' && (
                  <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-green-500/10 text-green-500 px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold">
                    <Check size={14} className="sm:w-4 sm:h-4" />
                    Reçue
                  </div>
                )}

                {status.claimed && status.admin_note && status.status !== 'pending' && (
                  <div className="w-full bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-lg p-3 mt-3">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-400 mb-1">
                      Note de l'administrateur
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                      {status.admin_note}
                    </p>
                  </div>
                )}

                {!status.unlocked && !status.claimed && (
                  <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-muted text-muted-foreground px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold">
                    <Lock size={14} className="sm:w-4 sm:h-4" />
                    Verrouillée
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {rewards.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Aucune récompense disponible pour le moment
        </div>
      )}

      <Modal
        isOpen={isClaimModalOpen}
        onClose={closeClaimModal}
        title="Demander une récompense"
      >
        {selectedReward && (
          <form onSubmit={handleClaimSubmit} className="space-y-4">
            <div className="bg-muted rounded-xl p-4 mb-4">
              <h3 className="text-foreground font-semibold mb-2">{selectedReward.name}</h3>
              <p className="text-muted-foreground text-sm">
                Valeur: {Number(selectedReward.value_euros).toFixed(2)} €
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Type de réclamation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setClaimFormData({ ...claimFormData, claim_type: 'balance' })
                  }
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    claimFormData.claim_type === 'balance'
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border bg-muted'
                  }`}
                >
                  <DollarSign
                    size={24}
                    className={
                      claimFormData.claim_type === 'balance'
                        ? 'text-white'
                        : 'text-gray-400'
                    }
                  />
                  <span
                    className={`text-sm font-semibold ${
                      claimFormData.claim_type === 'balance'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Ajout au solde
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setClaimFormData({ ...claimFormData, claim_type: 'physical' })
                  }
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    claimFormData.claim_type === 'physical'
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border bg-muted'
                  }`}
                >
                  <Package
                    size={24}
                    className={
                      claimFormData.claim_type === 'physical'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }
                  />
                  <span
                    className={`text-sm font-semibold ${
                      claimFormData.claim_type === 'physical'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Livraison physique
                  </span>
                </button>
              </div>
            </div>

            {claimFormData.claim_type === 'physical' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={claimFormData.shipping_first_name}
                      onChange={(e) =>
                        setClaimFormData({
                          ...claimFormData,
                          shipping_first_name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={claimFormData.shipping_last_name}
                      onChange={(e) =>
                        setClaimFormData({
                          ...claimFormData,
                          shipping_last_name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={claimFormData.shipping_address}
                    onChange={(e) =>
                      setClaimFormData({
                        ...claimFormData,
                        shipping_address: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Complément d'adresse
                  </label>
                  <input
                    type="text"
                    value={claimFormData.shipping_address_complement}
                    onChange={(e) =>
                      setClaimFormData({
                        ...claimFormData,
                        shipping_address_complement: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Pays
                    </label>
                    <input
                      type="text"
                      value={claimFormData.shipping_country}
                      onChange={(e) =>
                        setClaimFormData({
                          ...claimFormData,
                          shipping_country: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Code postal
                    </label>
                    <input
                      type="text"
                      value={claimFormData.shipping_postal_code}
                      onChange={(e) =>
                        setClaimFormData({
                          ...claimFormData,
                          shipping_postal_code: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {claimFormData.claim_type === 'balance' && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-foreground text-sm">
                  Le montant de {Number(selectedReward.value_euros).toFixed(2)} € sera ajouté
                  à votre solde après approbation par un administrateur.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeClaimModal}
                className="flex-1 px-6 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all"
              >
                Confirmer
              </button>
            </div>
          </form>
        )}
      </Modal>
        </div>
      </div>
    </div>
  );
}
