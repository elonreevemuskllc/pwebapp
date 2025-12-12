import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DateOfBirthModal from '../components/DateOfBirthModal';
import { api } from '../utils/httpClient';

interface User {
	id: number;
	email: string;
	username: string;
	accountType: 'admin' | 'manager' | 'affiliate';
	dateOfBirth?: string | null;
}

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [showDateOfBirthModal, setShowDateOfBirthModal] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		verifySession();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const verifySession = async () => {
		try {
			const response = await api.get('/api/auth/verify-session');

			if (!response.ok) {
				throw new Error('Session invalid');
			}

			const data = await response.json();
			setUser(data.user);

			if (!data.user.dateOfBirth) {
				setShowDateOfBirthModal(true);
			}
		} catch (error) {
			localStorage.removeItem('user');
			navigate('/login');
		} finally {
			setLoading(false);
		}
	};

	const handleDateOfBirthComplete = async () => {
		setShowDateOfBirthModal(false);
		await verifySession();
	};

	const logout = async () => {
		try {
			await api.post('/api/auth/logout');
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			localStorage.removeItem('user');
			setUser(null);
			navigate('/login');
		}
	};

	return {
		user,
		loading,
		logout,
		DateOfBirthModalComponent: showDateOfBirthModal ? (
			<DateOfBirthModal onComplete={handleDateOfBirthComplete} />
		) : null
	};
}
