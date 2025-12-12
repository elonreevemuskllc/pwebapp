import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getNavItems } from '../../config/navigation';
import ReactFlow, {
	Node,
	Edge,
	Controls,
	Background,
	useNodesState,
	useEdgesState,
	MarkerType,
	BackgroundVariant,
	Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface User {
	id: number;
	username: string;
	email: string;
	role: string;
	referrer?: number;
	manager?: number;
}

interface Shave {
	id: number;
	user_id: number;
	target_id: number;
	intermediary_id?: number;
	value: number;
}

interface ShaveFormData {
	user_id: string;
	target_id: string;
	intermediary_id: string;
	value: string;
}

export default function Shave() {
	const { user, loading, logout } = useAuth();
	const [users, setUsers] = useState<User[]>([]);
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [formData, setFormData] = useState<ShaveFormData>({
		user_id: '',
		target_id: '',
		intermediary_id: '',
		value: ''
	});
	const [actionLoading, setActionLoading] = useState(false);

	const navItems = getNavItems('admin');
	const { t } = useTranslation();

	const fetchGraphData = async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/shaves/graph`, {
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Failed to fetch graph data');
			}

			const data = await response.json();
			setUsers(data.users);
			generateGraph(data.users, data.shaves);
		} catch (error) {
			console.error('Error fetching graph data:', error);
			toast.error(t('adminShave.toast.loadError'));
		}
	};

	const generateGraph = useCallback((users: User[], shaves: Shave[]) => {
		const adminUsers = users.filter(u => u.role === 'admin');
		const managerUsers = users.filter(u => u.role === 'manager');
		const affiliateUsers = users.filter(u => u.role === 'affiliate');

		const nodeWidth = 200;
		const horizontalSpacing = 150;
		const verticalSpacing = 250;

		const newNodes: Node[] = [];

		adminUsers.forEach((user, index) => {
			const xPos = (index - (adminUsers.length - 1) / 2) * (nodeWidth + horizontalSpacing);
			newNodes.push({
				id: `user-${user.id}`,
				type: 'default',
				position: { x: xPos, y: 0 },
				zIndex: 1000,
				data: {
					label: (
						<div className="text-center">
							<div className="font-bold text-sm">{user.username}</div>
							<div className="text-xs text-gray-500">{user.email}</div>
							<div className="text-xs font-semibold text-red-600 mt-1">{t('adminShave.role.admin')}</div>
						</div>
					),
				},
				style: {
					background: '#fee2e2',
					border: '2px solid #dc2626',
					borderRadius: '12px',
					padding: '10px',
					width: nodeWidth,
				},
			});
		});

		managerUsers.forEach((user, index) => {
			const xPos = (index - (managerUsers.length - 1) / 2) * (nodeWidth + horizontalSpacing);
			newNodes.push({
				id: `user-${user.id}`,
				type: 'default',
				position: { x: xPos, y: verticalSpacing },
				zIndex: 1000,
				data: {
					label: (
						<div className="text-center">
							<div className="font-bold text-sm">{user.username}</div>
							<div className="text-xs text-gray-500">{user.email}</div>
							<div className="text-xs font-semibold text-blue-600 mt-1">{t('adminShave.role.manager')}</div>
						</div>
					),
				},
				style: {
					background: '#dbeafe',
					border: '2px solid #2563eb',
					borderRadius: '12px',
					padding: '10px',
					width: nodeWidth,
				},
			});
		});

		affiliateUsers.forEach((user, index) => {
			const xPos = (index - (affiliateUsers.length - 1) / 2) * (nodeWidth + horizontalSpacing);
			newNodes.push({
				id: `user-${user.id}`,
				type: 'default',
				position: { x: xPos, y: verticalSpacing * 2 },
				zIndex: 1000,
				data: {
					label: (
						<div className="text-center">
							<div className="font-bold text-sm">{user.username}</div>
							<div className="text-xs text-gray-500">{user.email}</div>
							<div className="text-xs font-semibold text-green-600 mt-1">{t('adminShave.role.affiliate')}</div>
						</div>
					),
				},
				style: {
					background: '#dcfce7',
					border: '2px solid #16a34a',
					borderRadius: '12px',
					padding: '10px',
					width: nodeWidth,
				},
			});
		});

		const newEdges: Edge[] = [];

		shaves.forEach((shave) => {
			if (shave.intermediary_id) {
				newEdges.push({
					id: `shave-${shave.id}-1`,
					source: `user-${shave.user_id}`,
					target: `user-${shave.intermediary_id}`,
					label: `${shave.value}% (${t('adminShave.graph.shared')})`,
					type: 'straight',
					animated: true,
					markerEnd: {
						type: MarkerType.ArrowClosed,
					},
					style: { stroke: '#f59e0b', strokeWidth: 2 },
					labelStyle: { fill: '#f59e0b', fontWeight: 700, background: 'white' },
					labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
					zIndex: 1,
				});
				newEdges.push({
					id: `shave-${shave.id}-2`,
					source: `user-${shave.intermediary_id}`,
					target: `user-${shave.target_id}`,
					label: `${shave.value}% (${t('adminShave.graph.shared')})`,
					type: 'straight',
					animated: true,
					markerEnd: {
						type: MarkerType.ArrowClosed,
					},
					style: { stroke: '#f59e0b', strokeWidth: 2 },
					labelStyle: { fill: '#f59e0b', fontWeight: 700, background: 'white' },
					labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
					zIndex: 1,
				});
			} else {
				newEdges.push({
					id: `shave-${shave.id}`,
					source: `user-${shave.user_id}`,
					target: `user-${shave.target_id}`,
					label: `${shave.value}%`,
					type: 'straight',
					animated: true,
					markerEnd: {
						type: MarkerType.ArrowClosed,
					},
					style: { stroke: '#8b5cf6', strokeWidth: 2 },
					labelStyle: { fill: '#8b5cf6', fontWeight: 700, background: 'white' },
					labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
					zIndex: 1,
				});
			}
		});

		users.forEach((user) => {
			if (user.referrer) {
				newEdges.push({
					id: `referrer-${user.id}`,
					source: `user-${user.referrer}`,
					target: `user-${user.id}`,
					label: t('adminShave.graph.referral'),
					type: 'straight',
					animated: false,
					markerEnd: {
						type: MarkerType.ArrowClosed,
					},
					style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '5,5' },
					labelStyle: { fill: '#10b981', fontWeight: 600, fontSize: 11, background: 'white' },
					labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
					zIndex: 1,
				});
			}
			if (user.manager) {
				newEdges.push({
					id: `manager-${user.id}`,
					source: `user-${user.manager}`,
					target: `user-${user.id}`,
					type: 'straight',
					animated: false,
					markerEnd: {
						type: MarkerType.ArrowClosed,
					},
					style: { stroke: '#2563eb', strokeWidth: 1.5 },
					zIndex: 1,
				});
			}
		});

		setNodes(newNodes);
		setEdges(newEdges);
	}, [setNodes, setEdges]);

	useEffect(() => {
		if (user?.accountType === 'admin') {
			fetchGraphData();
		}
	}, [user]);

	const handleAddShave = async () => {
		try {
			if (!formData.user_id || !formData.target_id || !formData.value) {
				toast.error(t('adminShave.toast.fillFields'));
				return;
			}

			setActionLoading(true);

			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/shaves`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					user_id: parseInt(formData.user_id),
					target_id: parseInt(formData.target_id),
					intermediary_id: formData.intermediary_id ? parseInt(formData.intermediary_id) : null,
					value: parseFloat(formData.value),
				}),
			});

			if (!response.ok) throw new Error('Failed to add shave');

			toast.success(t('adminShave.toast.shaveAdded'));
			setShowAddModal(false);
			setFormData({ user_id: '', target_id: '', intermediary_id: '', value: '' });
			fetchGraphData();
		} catch (error) {
			console.error('Error adding shave:', error);
			toast.error(t('adminShave.toast.addError'));
		} finally {
			setActionLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!user || user.accountType !== 'admin') {
		return null;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
			<Navbar user={user} navItems={navItems} onLogout={logout} />

			<div className="pt-24 px-4 pb-12">
				<div className="max-w-7xl mx-auto py-8">
					<div className="mb-6 flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-foreground">{t('adminShave.title')}</h1>
							<p className="text-muted-foreground mt-2">{t('adminShave.description')}</p>
						</div>
						<motion.button
							onClick={() => setShowAddModal(true)}
							whileHover={{ scale: 1.05, y: -2 }}
							whileTap={{ scale: 0.95 }}
							className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium"
						>
							<Plus className="w-5 h-5" />
							{t('adminShave.addShave')}
						</motion.button>
					</div>

					<div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden" style={{ height: '70vh' }}>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						fitView
						attributionPosition="bottom-left"
						elevateNodesOnSelect={false}
					>
						<Background variant={BackgroundVariant.Dots} gap={16} size={1} />
						<Controls />
						<Panel position="top-right" className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200/50 m-4">
							<div className="space-y-2 text-sm">
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 bg-red-100 border-2 border-red-600 rounded"></div>
									<span className="text-gray-700">{t('adminShave.legend.admin')}</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 bg-blue-100 border-2 border-blue-600 rounded"></div>
									<span className="text-gray-700">{t('adminShave.legend.manager')}</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 bg-green-100 border-2 border-green-600 rounded"></div>
									<span className="text-gray-700">{t('adminShave.legend.affiliate')}</span>
								</div>
								<hr className="my-2 border-gray-200" />
								<div className="flex items-center gap-2">
									<div className="w-8 h-0.5 bg-purple-600"></div>
									<span className="text-gray-700">{t('adminShave.legend.shave')}</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-8 h-0.5 bg-orange-600"></div>
									<span className="text-gray-700">{t('adminShave.legend.sharedShave')}</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-8 h-0.5 bg-green-600 border-dashed" style={{ borderTop: '2px dashed' }}></div>
									<span className="text-gray-700">{t('adminShave.legend.referral')}</span>
								</div>
							</div>
						</Panel>
						</ReactFlow>
					</div>
				</div>
			</div>

			<Modal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				title={t('adminShave.modal.title')}
			>
				<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('adminShave.modal.user')}
									</label>
									<select
										value={formData.user_id}
										onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
										className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
									>
										<option value="">{t('adminShave.modal.selectUser')}</option>
										{users.map((user) => (
											<option key={user.id} value={user.id}>
												{user.username} - {user.email} ({user.role})
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('adminShave.modal.target')}
									</label>
									<select
										value={formData.target_id}
										onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
										className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
									>
										<option value="">{t('adminShave.modal.selectTarget')}</option>
										{users.map((user) => (
											<option key={user.id} value={user.id}>
												{user.username} - {user.email} ({user.role})
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('adminShave.modal.intermediary')}
									</label>
									<select
										value={formData.intermediary_id}
										onChange={(e) => setFormData({ ...formData, intermediary_id: e.target.value })}
										className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
									>
										<option value="">{t('adminShave.modal.noIntermediary')}</option>
										{users.map((user) => (
											<option key={user.id} value={user.id}>
												{user.username} - {user.email} ({user.role})
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										{t('adminShave.modal.percentage')}
									</label>
									<input
										type="number"
										step="0.01"
										value={formData.value}
										onChange={(e) => setFormData({ ...formData, value: e.target.value })}
										className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
										placeholder={t('adminShave.modal.percentagePlaceholder')}
									/>
								</div>
							</div>

				<div className="flex gap-3 pt-4 border-t border-border mt-6">
					<button
						onClick={() => setShowAddModal(false)}
						className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
					>
						{t('adminShave.modal.cancel')}
					</button>
					<button
						onClick={handleAddShave}
						disabled={actionLoading || !formData.user_id || !formData.target_id || !formData.value}
						className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 font-medium text-sm"
					>
						{actionLoading ? t('adminShave.modal.adding') : t('adminShave.modal.confirm')}
					</button>
				</div>
			</Modal>
		</div>
	);
}
