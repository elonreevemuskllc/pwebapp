import express from 'express';
import pool from '../db/connection';
import { sendExpenseReimbursementConfirmation, sendExpenseReimbursementProcessed } from '../services/emailService';

const router = express.Router();

async function verifySession(sessionId: string): Promise<{ userId: number; role: string } | null> {
	const [sessions] = await pool.query(
		`SELECT s.user_id, u.role
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.id = ? AND s.expires_at > NOW()`,
		[sessionId]
	);

	if ((sessions as any[]).length === 0) {
		return null;
	}

	return {
		userId: (sessions as any[])[0].user_id,
		role: (sessions as any[])[0].role
	};
}

async function verifyAdmin(sessionId: string): Promise<number | null> {
	const [sessions] = await pool.query(
		`SELECT s.user_id, u.role
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.id = ? AND s.expires_at > NOW() AND u.role = 'admin'`,
		[sessionId]
	);

	if ((sessions as any[]).length === 0) {
		return null;
	}

	return (sessions as any[])[0].user_id;
}

router.post('/expense-reimbursements', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	const { amount, description, crypto_type, network, wallet_address, attachment_file_id } = req.body;

	if (!amount || !description || !crypto_type || !network || !wallet_address) {
		return res.status(400).json({ error: 'Missing required fields' });
	}

	if (amount <= 0) {
		return res.status(400).json({ error: 'Amount must be positive' });
	}

	if (!description.trim()) {
		return res.status(400).json({ error: 'Description is required' });
	}

	const validNetworks: Record<string, string[]> = {
		// 'USDT': ['BEP20', 'TRC20', 'SOL'],
		// 'USDC': ['BEP20', 'TRC20', 'SOL', 'ARBITRUM'],
		// 'ETH': ['ERC20']
		'USDC': ['SOL'],
	};

	if (!validNetworks[crypto_type] || !validNetworks[crypto_type].includes(network)) {
		return res.status(400).json({ error: 'Invalid network for selected cryptocurrency' });
	}

	const connection = await pool.getConnection();

	try {
		await connection.query(
			`INSERT INTO expense_reimbursements (user_id, amount, description, crypto_type, network, wallet_address, attachment_file_id)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[session.userId, amount, description, crypto_type, network, wallet_address, attachment_file_id || null]
		);

		const [userRows] = await connection.query(
			`SELECT email, username FROM users WHERE id = ?`,
			[session.userId]
		) as any[];

		if (userRows.length > 0) {
			await sendExpenseReimbursementConfirmation(
				userRows[0].email,
				userRows[0].username,
				amount,
				description,
				crypto_type,
				network
			);
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Error creating expense reimbursement:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/my-expense-reimbursements', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const session = await verifySession(sessionId);

	if (!session) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	if (session.role !== 'affiliate') {
		return res.status(403).json({ error: 'Access denied - affiliates only' });
	}

	const connection = await pool.getConnection();

	try {
		const [requests] = await connection.query(
			`SELECT er.*,
				u.username as processed_by_username,
				uf.original_filename, uf.stored_filename, uf.mime_type, uf.file_size
			FROM expense_reimbursements er
			LEFT JOIN users u ON er.processed_by = u.id
			LEFT JOIN user_files uf ON er.attachment_file_id = uf.id
			WHERE er.user_id = ?
			ORDER BY er.created_at DESC`,
			[session.userId]
		) as any[];

		res.json(requests);
	} catch (error) {
		console.error('Error fetching expense reimbursements:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.get('/admin/expense-reimbursements', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [requests] = await connection.query(
			`SELECT er.*, u.username, u.email,
				admin_user.username as processed_by_username,
				uf.original_filename, uf.stored_filename, uf.mime_type, uf.file_size
			FROM expense_reimbursements er
			JOIN users u ON er.user_id = u.id
			LEFT JOIN users admin_user ON er.processed_by = admin_user.id
			LEFT JOIN user_files uf ON er.attachment_file_id = uf.id
			ORDER BY
				CASE er.status
					WHEN 'pending' THEN 1
					WHEN 'accepted' THEN 2
					WHEN 'declined' THEN 3
				END,
				CASE 
					WHEN er.status = 'pending' AND er.admin_note IS NOT NULL THEN 2
					ELSE 1
				END,
				er.created_at DESC`
		) as any[];

		res.json(requests);
	} catch (error) {
		console.error('Error fetching expense reimbursements:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.put('/admin/expense-reimbursements/:id/accept', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const connection = await pool.getConnection();

	try {
		const [requestRows] = await connection.query(
			`SELECT er.*, u.email, u.username FROM expense_reimbursements er
			JOIN users u ON er.user_id = u.id
			WHERE er.id = ? AND er.status = 'pending'`,
			[req.params.id]
		) as any[];

		if (requestRows.length === 0) {
			return res.status(404).json({ error: 'Expense reimbursement not found or already processed' });
		}

		const request = requestRows[0];

		await connection.query(
			`UPDATE expense_reimbursements
			SET status = 'accepted', processed_by = ?, processed_at = NOW()
			WHERE id = ?`,
			[adminId, req.params.id]
		);

		await sendExpenseReimbursementProcessed(
			request.email,
			request.username,
			parseFloat(request.amount),
			request.description,
			request.crypto_type,
			'accepted',
			null
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error accepting expense reimbursement:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.put('/admin/expense-reimbursements/:id/decline', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { admin_note } = req.body;

	if (!admin_note || !admin_note.trim()) {
		return res.status(400).json({ error: 'Reason for declining is required' });
	}

	const connection = await pool.getConnection();

	try {
		const [requestRows] = await connection.query(
			`SELECT er.*, u.email, u.username FROM expense_reimbursements er
			JOIN users u ON er.user_id = u.id
			WHERE er.id = ? AND er.status = 'pending'`,
			[req.params.id]
		) as any[];

		if (requestRows.length === 0) {
			return res.status(404).json({ error: 'Expense reimbursement not found or already processed' });
		}

		const request = requestRows[0];

		await connection.query(
			`UPDATE expense_reimbursements
			SET status = 'declined', admin_note = ?, processed_by = ?, processed_at = NOW()
			WHERE id = ?`,
			[admin_note, adminId, req.params.id]
		);

		await sendExpenseReimbursementProcessed(
			request.email,
			request.username,
			parseFloat(request.amount),
			request.description,
			request.crypto_type,
			'declined',
			admin_note
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error declining expense reimbursement:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

router.put('/admin/expense-reimbursements/:id/postpone', async (req, res) => {
	const sessionId = req.cookies.sessionId;
	const adminId = await verifyAdmin(sessionId);

	if (!adminId) {
		return res.status(403).json({ error: 'Access denied' });
	}

	const { admin_note } = req.body;

	const connection = await pool.getConnection();

	try {
		const [requestRows] = await connection.query(
			`SELECT er.*, u.email, u.username FROM expense_reimbursements er
			JOIN users u ON er.user_id = u.id
			WHERE er.id = ? AND er.status = 'pending'`,
			[req.params.id]
		) as any[];

		if (requestRows.length === 0) {
			return res.status(404).json({ error: 'Expense reimbursement not found or already processed' });
		}

		await connection.query(
			`UPDATE expense_reimbursements
			SET admin_note = ?, processed_by = ?, processed_at = NOW()
			WHERE id = ?`,
			[admin_note || 'À traiter plus tard', adminId, req.params.id]
		);

		res.json({ success: true });
	} catch (error) {
		console.error('Error postponing expense reimbursement:', error);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		connection.release();
	}
});

export default router;