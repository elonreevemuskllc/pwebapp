import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { buildApiUrl } from '../utils/api';

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
	status: 'pending' | 'approved' | 'rejected';
}

interface RewardsProgressBarProps {
	rewards: Reward[];
	claims: RewardClaim[];
	ftdCount: number;
}

export default function RewardsProgressBar({ rewards, claims, ftdCount }: RewardsProgressBarProps) {
	if (rewards.length === 0) return null;

	const sortedRewards = [...rewards].sort((a, b) => a.ftd_required - b.ftd_required);
	const maxFtd = sortedRewards[sortedRewards.length - 1]?.ftd_required || 1;
	const progressPercentage = Math.min((ftdCount / maxFtd) * 100, 100);
	const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
			className="bg-card border border-border rounded-xl p-6 mb-8"
		>
			<div className="mb-6">
				<h3 className="text-lg font-semibold text-foreground">Récompenses du {currentMonth}</h3>
			</div>

			<div className="relative pb-8 px-12">
				<div className="relative h-1.5 bg-muted rounded-full mt-32">
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: `${progressPercentage}%` }}
						transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
						className="h-full bg-green-500 rounded-full"
					/>

					{sortedRewards.map((reward, index) => {
						const isUnlocked = ftdCount >= reward.ftd_required;
						const isClaimed = claims.some(c => c.reward_id === reward.id && c.status !== 'rejected');
						const position = (reward.ftd_required / maxFtd) * 100;

						return (
							<div
								key={reward.id}
								className="absolute top-1/2"
								style={{
									left: `${position}%`,
									transform: 'translate(-50%, -50%)'
								}}
							>
								<motion.div
									initial={{ scale: 0, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{
										delay: index * 0.1 + 0.6,
										type: 'spring',
										stiffness: 200,
										damping: 15
									}}
									className="relative"
								>
									<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
										<div className="relative">
											<div className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center bg-card ${isClaimed
													? 'border-green-500'
													: isUnlocked
														? 'border-yellow-500'
														: 'border-border'
												}`}>
												<img
													src={`${buildApiUrl('')}${reward.image_url}`}
													alt={reward.name}
													className={`max-w-full max-h-full object-contain transition-all ${!isUnlocked ? 'opacity-40 grayscale' : ''
														}`}
												/>

												{!isUnlocked && (
													<div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-[1px]">
														<Lock className="text-muted-foreground" size={16} />
													</div>
												)}
											</div>

											{isClaimed && (
												<div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1.5 border-2 border-card">
													<Check className="text-white" size={12} strokeWidth={3} />
												</div>
											)}
										</div>

										<span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${isClaimed
												? 'bg-green-500/10 text-green-500'
												: isUnlocked
													? 'bg-yellow-500/10 text-yellow-600'
													: 'bg-muted text-muted-foreground'
											}`}>
											{reward.ftd_required} FTD
										</span>
									</div>

									<div
										className={`w-4 h-4 rounded-full transition-all border-4 border-card shadow-lg ${isClaimed
												? 'bg-green-500'
												: isUnlocked
													? 'bg-yellow-500'
													: 'bg-muted'
											}`}
									/>
								</motion.div>
							</div>
						);
					})}
				</div>
			</div>
		</motion.div>
	);
}
