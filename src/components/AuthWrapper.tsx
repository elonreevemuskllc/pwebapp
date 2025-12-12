import { useEffect, useState } from 'react';
import DateOfBirthModal from './DateOfBirthModal';
import { api } from '../utils/httpClient';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
	const [showDateOfBirthModal, setShowDateOfBirthModal] = useState(false);
	const [isChecking, setIsChecking] = useState(true);

	useEffect(() => {
		checkDateOfBirth();
	}, []);

	const checkDateOfBirth = async () => {
		try {
			const response = await api.get('/api/auth/verify-session');

			if (response.ok) {
				const data = await response.json();
				if (!data.user.dateOfBirth) {
					setShowDateOfBirthModal(true);
				}
			}
		} catch (error) {
			// Ignore error, user is not logged in
		} finally {
			setIsChecking(false);
		}
	};

	const handleDateOfBirthComplete = () => {
		setShowDateOfBirthModal(false);
		checkDateOfBirth();
	};

	if (isChecking) {
		return <>{children}</>;
	}

	return (
		<>
			{children}
			{showDateOfBirthModal && <DateOfBirthModal onComplete={handleDateOfBirthComplete} />}
		</>
	);
}
