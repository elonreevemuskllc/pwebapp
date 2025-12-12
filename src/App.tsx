import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { TranslationProvider } from './hooks/useTranslation';
import AuthWrapper from './components/AuthWrapper';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AffiliateDashboard from './pages/affiliate/Dashboard';
import AffiliateReferral from './pages/affiliate/Referral';
import AffiliateStatistics from './pages/affiliate/Statistics';
import AffiliatePayments from './pages/affiliate/Payments';
import AffiliateExpenses from './pages/affiliate/Expenses';
import AffiliateRewards from './pages/affiliate/Rewards';
import AdminDashboard from './pages/admin/Dashboard';
import AdminApplications from './pages/admin/Applications';
import AdminShave from './pages/admin/Shave';
import AdminUsers from './pages/admin/Users';
import AdminPayments from './pages/admin/Payments';
import AdminExpenses from './pages/admin/Expenses';
import AdminRewards from './pages/admin/Rewards';
import AdminSalaries from './pages/admin/Salaries';
import AdminCompta from './pages/admin/Compta';
import UserSettings from './pages/admin/UserSettings';
import ManagerDashboard from './pages/manager/Dashboard';
import ManagerPayments from './pages/manager/Payments';
import NotificationPrompt from './components/NotificationPrompt';
import { useNotificationPolling } from './hooks/useNotificationPolling';

function App() {
	const [showBetaNotice, setShowBetaNotice] = useState(() => {
		return localStorage.getItem('hideBetaNotice') !== 'true';
	});

	// Vérifier les notifications périodiquement
	useNotificationPolling();

	const handleDismiss = () => {
		localStorage.setItem('hideBetaNotice', 'true');
		setShowBetaNotice(false);
	};

	return (
		<BrowserRouter>
			<TranslationProvider>
				<AuthWrapper>
					<Toaster position="top-center" richColors offset="80px" />
					<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
				<Route path="/affiliate/referral" element={<AffiliateReferral />} />
				<Route path="/affiliate/statistics" element={<AffiliateStatistics />} />
				<Route path="/affiliate/payments" element={<AffiliatePayments />} />
				<Route path="/affiliate/expenses" element={<AffiliateExpenses />} />
				<Route path="/affiliate/rewards" element={<AffiliateRewards />} />
				<Route path="/admin/dashboard" element={<AdminDashboard />} />
				<Route path="/admin/applications" element={<AdminApplications />} />
				<Route path="/admin/shave" element={<AdminShave />} />
				<Route path="/admin/users" element={<AdminUsers />} />
				<Route path="/admin/payments" element={<AdminPayments />} />
				<Route path="/admin/expenses" element={<AdminExpenses />} />
				<Route path="/admin/rewards" element={<AdminRewards />} />
				<Route path="/admin/salaries" element={<AdminSalaries />} />
				<Route path="/admin/compta" element={<AdminCompta />} />
				<Route path="/admin/user/:userId/settings" element={<UserSettings />} />
				<Route path="/manager/dashboard" element={<ManagerDashboard />} />
				<Route path="/manager/payments" element={<ManagerPayments />} />
					</Routes>

					{showBetaNotice && (
					<div className="fixed bottom-4 right-4 max-w-sm bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 z-50">
					<button
						onClick={handleDismiss}
						className="absolute top-2 right-2 p-1 hover:bg-yellow-100 rounded-lg transition-colors"
					>
						<X className="w-4 h-4 text-yellow-700" />
					</button>
					<div className="flex items-start gap-3 pr-6">
						<AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
						<div>
							<h4 className="text-sm font-semibold text-yellow-900 mb-1">Site en version BETA</h4>
							<p className="text-xs text-yellow-800 leading-relaxed">
								En cas de questions ou de bugs, merci de nous contacter.
							</p>
						</div>
					</div>
					</div>
					)}
					<NotificationPrompt />
				</AuthWrapper>
			</TranslationProvider>
		</BrowserRouter>
	);
}

export default App;
