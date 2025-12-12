import express from 'express';
import pool from '../db/connection';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { emailService } from '../services/emailService';

const router = express.Router();

function generateSessionId(): string {
	return crypto.randomBytes(32).toString('hex');
}

async function createSession(userId: number): Promise<string> {
	const sessionId = generateSessionId();
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

	await pool.query(
		'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
		[sessionId, userId, expiresAt]
	);

	return sessionId;
}

async function cleanExpiredSessions(): Promise<void> {
	await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
}

router.post('/register', async (req, res) => {
	try {
		const { email, password, username, dateOfBirth, telegram, applicationData, referrer, manager } = req.body;

		if (!email || !password || !username || !dateOfBirth || !telegram) {
			return res.status(400).json({ error: 'L\'email, le mot de passe, le pseudonyme, la date de naissance et le Telegram sont requis' });
		}

		const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

		if ((existing as any[]).length > 0) {
			return res.status(400).json({ error: 'Cet email existe déjà' });
		}

		if (referrer) {
			const [referrerUser] = await pool.query('SELECT id FROM users WHERE id = ?', [referrer]);
			if ((referrerUser as any[]).length === 0) {
				return res.status(400).json({ error: 'Referrer invalide' });
			}
		}

		if (manager) {
			const [managerUser] = await pool.query('SELECT id FROM users WHERE id = ?', [manager]);
			if ((managerUser as any[]).length === 0) {
				return res.status(400).json({ error: 'Manager invalide' });
			}
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const appData = applicationData ? JSON.stringify(applicationData) : null;

		await pool.query(
			`INSERT INTO users (email, password, username, date_of_birth, telegram, application_data, referrer, manager)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[email, hashedPassword, username, dateOfBirth, telegram, appData, referrer || null, manager || null]
		);

		res.json({ success: true, message: 'Registration submitted successfully' });
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({ error: 'Échec de l\'inscription' });
	}
});

router.post('/check-email', async (req, res) => {
	try {
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({ error: 'L\'email est requis' });
		}

		const [users] = await pool.query(
			'SELECT state, is_verified, reject_reason, role FROM users WHERE email = ?',
			[email]
		);

		if ((users as any[]).length === 0) {
			return res.status(404).json({ error: 'Utilisateur introuvable' });
		}

		const user = (users as any[])[0];

		res.json({
			status: user.state,
			isVerified: user.is_verified,
			rejectionReason: user.reject_reason,
			accountType: user.role
		});
	} catch (error) {
		console.error('Check email error:', error);
		res.status(500).json({ error: 'Échec de la vérification de l\'email' });
	}
});

router.post('/send-verification', async (req, res) => {
	try {
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({ error: 'L\'email est requis' });
		}

		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
		const expiry = new Date(Date.now() + 15 * 60 * 1000);

		await pool.query(
			'UPDATE users SET verification_code = ?, verification_code_expiry = ? WHERE email = ?',
			[verificationCode, expiry, email]
		);

		await emailService.sendVerificationCode(email, verificationCode);

		res.json({ success: true, message: 'Verification code sent' });
	} catch (error) {
		console.error('Send verification error:', error);
		res.status(500).json({ error: 'Échec de l\'envoi du code de vérification' });
	}
});

router.post('/verify-code', async (req, res) => {
	try {
		const { email, code } = req.body;

		if (!email || !code) {
			return res.status(400).json({ error: 'L\'email et le code sont requis' });
		}

		const [users] = await pool.query(
			'SELECT verification_code, verification_code_expiry FROM users WHERE email = ?',
			[email]
		);

		if ((users as any[]).length === 0) {
			return res.status(404).json({ error: 'Utilisateur introuvable' });
		}

		const user = (users as any[])[0];

		if (!user.verification_code || user.verification_code !== code) {
			return res.status(400).json({ error: 'Code de vérification invalide' });
		}

		if (new Date() > new Date(user.verification_code_expiry)) {
			return res.status(400).json({ error: 'Code de vérification expiré' });
		}

		await pool.query(
			'UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_code_expiry = NULL WHERE email = ?',
			[email]
		);

		res.json({ success: true, message: 'Email verified successfully' });
	} catch (error) {
		console.error('Verify code error:', error);
		res.status(500).json({ error: 'Échec de la vérification du code' });
	}
});

router.post('/login', async (req, res) => {
	const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
	const userAgent = req.headers['user-agent'] || 'unknown';
	
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			// Log failed login attempt (disabled temporarily)
			try {
				await pool.query(
					'INSERT INTO login_logs (user_id, email, ip_address, user_agent, login_status, failure_reason) VALUES (NULL, ?, ?, ?, ?, ?)',
					[email, ipAddress, userAgent, 'failed', 'Email ou mot de passe manquant']
				);
			} catch (logError) {
				console.error('Failed to log login attempt:', logError);
			}
			return res.status(400).json({ error: 'L\'email et le mot de passe sont requis' });
		}

		const [users] = await pool.query(
			'SELECT id, email, password, username, role, state, is_verified, is_frozen, date_of_birth FROM users WHERE email = ?',
			[email]
		);

		if ((users as any[]).length === 0) {
			// Log failed login attempt (disabled temporarily)
			try {
				await pool.query(
					'INSERT INTO login_logs (user_id, email, ip_address, user_agent, login_status, failure_reason) VALUES (NULL, ?, ?, ?, ?, ?)',
					[email, ipAddress, userAgent, 'failed', 'Email introuvable']
				);
			} catch (logError) {
				console.error('Failed to log login attempt:', logError);
			}
			return res.status(401).json({ error: 'Identifiants invalides' });
		}

		const user = (users as any[])[0];

		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			// Log failed login attempt (disabled temporarily)
			try {
				await pool.query(
					'INSERT INTO login_logs (user_id, email, ip_address, user_agent, login_status, failure_reason) VALUES (?, ?, ?, ?, ?, ?)',
					[user.id, email, ipAddress, userAgent, 'failed', 'Mot de passe incorrect']
				);
			} catch (logError) {
				console.error('Failed to log login attempt:', logError);
			}
			return res.status(401).json({ error: 'Identifiants invalides' });
		}

		if (user.is_frozen) {
			// Log blocked login attempt (disabled temporarily)
			try {
				await pool.query(
					'INSERT INTO login_logs (user_id, email, ip_address, user_agent, login_status, failure_reason) VALUES (?, ?, ?, ?, ?, ?)',
					[user.id, email, ipAddress, userAgent, 'blocked', 'Compte gelé']
				);
			} catch (logError) {
				console.error('Failed to log login attempt:', logError);
			}
			return res.status(403).json({ error: 'Compte gelé. Veuillez contacter l\'administrateur' });
		}

		if (user.state !== 'accepted' || !user.is_verified) {
			// Log blocked login attempt (disabled temporarily)
			try {
				await pool.query(
					'INSERT INTO login_logs (user_id, email, ip_address, user_agent, login_status, failure_reason) VALUES (?, ?, ?, ?, ?, ?)',
					[user.id, email, ipAddress, userAgent, 'blocked', 'Compte non actif']
				);
			} catch (logError) {
				console.error('Failed to log login attempt:', logError);
			}
			return res.status(403).json({ error: 'Compte non actif' });
		}

		await cleanExpiredSessions();

		const sessionId = await createSession(user.id);

		// Log successful login (disabled temporarily)
		try {
			await pool.query(
				'INSERT INTO login_logs (user_id, email, ip_address, user_agent, login_status) VALUES (?, ?, ?, ?, ?)',
				[user.id, email, ipAddress, userAgent, 'success']
			);
		} catch (logError) {
			console.error('Failed to log successful login:', logError);
		}

		res.cookie('sessionId', sessionId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 24 * 60 * 60 * 1000
		});

		res.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				accountType: user.role,
				dateOfBirth: user.date_of_birth
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		// Log error
		try {
			await pool.query(
				'INSERT INTO login_logs (user_id, email, ip_address, user_agent, login_status, failure_reason) VALUES (NULL, ?, ?, ?, ?, ?)',
				[req.body.email || 'unknown', ipAddress, userAgent, 'failed', 'Erreur serveur']
			);
		} catch (logError) {
			console.error('Failed to log login error:', logError);
		}
		res.status(500).json({ error: 'Échec de la connexion' });
	}
});

router.get('/verify-session', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;

		if (!sessionId) {
			return res.status(401).json({ error: 'No session' });
		}

		await cleanExpiredSessions();

		const [sessions] = await pool.query(
			`SELECT s.user_id, s.expires_at, u.email, u.username, u.role, u.date_of_birth
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.id = ? AND s.expires_at > NOW()`,
			[sessionId]
		);

		if ((sessions as any[]).length === 0) {
			res.clearCookie('sessionId');
			return res.status(401).json({ error: 'Session expired' });
		}

		const session = (sessions as any[])[0];

		res.json({
			success: true,
			user: {
				id: session.user_id,
				email: session.email,
				username: session.username,
				accountType: session.role,
				dateOfBirth: session.date_of_birth
			}
		});
	} catch (error) {
		console.error('Verify session error:', error);
		res.status(500).json({ error: 'Session verification failed' });
	}
});

router.post('/logout', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;

		if (sessionId) {
			await pool.query('DELETE FROM sessions WHERE id = ?', [sessionId]);
		}

		res.clearCookie('sessionId');
		res.json({ success: true, message: 'Logged out successfully' });
	} catch (error) {
		console.error('Logout error:', error);
		res.status(500).json({ error: 'Logout failed' });
	}
});

router.post('/forgot-password', async (req, res) => {
	try {
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({ error: 'L\'email est requis' });
		}

		const [users] = await pool.query(
			'SELECT id, username, state FROM users WHERE email = ?',
			[email]
		);

		if ((users as any[]).length === 0) {
			return res.json({ success: true, message: 'Si l\'email existe, un code de réinitialisation a été envoyé' });
		}

		const user = (users as any[])[0];

		if (user.state !== 'accepted') {
			return res.json({ success: true, message: 'Si l\'email existe, un code de réinitialisation a été envoyé' });
		}

		const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

		await pool.query(
			'INSERT INTO password_resets (email, reset_code, expires_at) VALUES (?, ?, ?)',
			[email, resetCode, expiresAt]
		);

		await emailService.sendPasswordResetCode(email, resetCode);

		res.json({ success: true, message: 'Si l\'email existe, un code de réinitialisation a été envoyé' });
	} catch (error) {
		console.error('Forgot password error:', error);
		res.status(500).json({ error: 'Échec de la demande de réinitialisation' });
	}
});

router.post('/update-date-of-birth', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;

		if (!sessionId) {
			return res.status(401).json({ error: 'Non authentifié' });
		}

		const [sessions] = await pool.query(
			'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
			[sessionId]
		);

		if ((sessions as any[]).length === 0) {
			return res.status(401).json({ error: 'Session invalide' });
		}

		const userId = (sessions as any[])[0].user_id;
		const { dateOfBirth } = req.body;

		if (!dateOfBirth) {
			return res.status(400).json({ error: 'La date de naissance est requise' });
		}

		await pool.query(
			'UPDATE users SET date_of_birth = ? WHERE id = ?',
			[dateOfBirth, userId]
		);

		res.json({ success: true, message: 'Date de naissance mise à jour' });
	} catch (error) {
		console.error('Update date of birth error:', error);
		res.status(500).json({ error: 'Échec de la mise à jour' });
	}
});

router.post('/reset-password', async (req, res) => {
	try {
		const { email, code, newPassword } = req.body;

		if (!email || !code || !newPassword) {
			return res.status(400).json({ error: 'Tous les champs sont requis' });
		}

		const [resets] = await pool.query(
			'SELECT id, expires_at, used FROM password_resets WHERE email = ? AND reset_code = ? ORDER BY created_at DESC LIMIT 1',
			[email, code]
		);

		if ((resets as any[]).length === 0) {
			return res.status(400).json({ error: 'Code de réinitialisation invalide' });
		}

		const reset = (resets as any[])[0];

		if (reset.used) {
			return res.status(400).json({ error: 'Ce code a déjà été utilisé' });
		}

		if (new Date() > new Date(reset.expires_at)) {
			return res.status(400).json({ error: 'Code de réinitialisation expiré' });
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await pool.query(
			'UPDATE users SET password = ? WHERE email = ?',
			[hashedPassword, email]
		);

		await pool.query(
			'UPDATE password_resets SET used = 1 WHERE id = ?',
			[reset.id]
		);

		res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
	} catch (error) {
		console.error('Reset password error:', error);
		res.status(500).json({ error: 'Échec de la réinitialisation du mot de passe' });
	}
});

router.post('/change-password', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;

		if (!sessionId) {
			return res.status(401).json({ error: 'Non authentifié' });
		}

		const [sessions] = await pool.query(
			'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
			[sessionId]
		);

		if ((sessions as any[]).length === 0) {
			return res.status(401).json({ error: 'Session invalide' });
		}

		const userId = (sessions as any[])[0].user_id;
		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			return res.status(400).json({ error: 'Tous les champs sont requis' });
		}

		if (newPassword.length < 8) {
			return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
		}

		const [users] = await pool.query(
			'SELECT password FROM users WHERE id = ?',
			[userId]
		);

		if ((users as any[]).length === 0) {
			return res.status(404).json({ error: 'Utilisateur introuvable' });
		}

		const user = (users as any[])[0];
		const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

		if (!isPasswordValid) {
			return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await pool.query(
			'UPDATE users SET password = ? WHERE id = ?',
			[hashedPassword, userId]
		);

		res.json({ success: true, message: 'Mot de passe modifié avec succès' });
	} catch (error) {
		console.error('Change password error:', error);
		res.status(500).json({ error: 'Échec de la modification du mot de passe' });
	}
});

export default router;
