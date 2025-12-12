import { Router } from 'express';
import pool from '../db/connection';

const router = Router();

async function verifyAdmin(sessionId: string): Promise<number | null> {
	if (!sessionId) return null;

	const [sessions] = await pool.query(
		'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
		[sessionId]
	);

	if ((sessions as any[]).length === 0) return null;

	const userId = (sessions as any[])[0].user_id;
	const [users] = await pool.query(
		'SELECT id, role FROM users WHERE id = ? AND role = ?',
		[userId, 'admin']
	);

	return (users as any[]).length > 0 ? userId : null;
}

router.get('/shaves', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const [shaves] = await pool.query(`
			SELECT
				s.id,
				s.user_id,
				s.target_id,
				s.intermediary_id,
				s.commission_type,
				s.value,
				s.created_at,
				u.username as user_username,
				u.email as user_email,
				u.role as user_role,
				t.username as target_username,
				t.email as target_email,
				t.role as target_role,
				i.username as intermediary_username,
				i.email as intermediary_email,
				i.role as intermediary_role
			FROM shaves s
			JOIN users u ON s.user_id = u.id
			JOIN users t ON s.target_id = t.id
			LEFT JOIN users i ON s.intermediary_id = i.id
			ORDER BY s.created_at DESC
		`);

		res.json({ shaves });
	} catch (error) {
		console.error('Get shaves error:', error);
		res.status(500).json({ error: 'Failed to fetch shaves' });
	}
});

router.post('/shaves', async (req, res) => {
	const connection = await pool.getConnection();
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { user_id, target_id, intermediary_id, value, commission_type } = req.body;

		if (!user_id || !target_id || !value) {
			return res.status(400).json({ error: 'user_id, target_id, and value are required' });
		}

		await connection.beginTransaction();

		const [result] = await connection.query(
			'INSERT INTO shaves (user_id, target_id, intermediary_id, commission_type, value) VALUES (?, ?, ?, ?, ?)',
			[user_id, target_id, intermediary_id || null, commission_type || 'percentage', value]
		);

		await connection.query(
			'INSERT INTO shave_history (user_id, target_id, commission_type, value, start_date) VALUES (?, ?, ?, ?, CURDATE())',
			[user_id, target_id, commission_type || 'percentage', value]
		);

		await connection.commit();
		res.json({ success: true, id: (result as any).insertId });
	} catch (error) {
		await connection.rollback();
		console.error('Create shave error:', error);
		res.status(500).json({ error: 'Failed to create shave' });
	} finally {
		connection.release();
	}
});

router.put('/shaves/:id', async (req, res) => {
	const connection = await pool.getConnection();
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { id } = req.params;
		const { user_id, target_id, intermediary_id, commission_type, value } = req.body;

		if (value === undefined || value === null) {
			return res.status(400).json({ error: 'value is required' });
		}

		const [currentShave] = await connection.query(
			'SELECT user_id, target_id, commission_type, value FROM shaves WHERE id = ?',
			[id]
		) as any[];

		if (currentShave.length === 0) {
			return res.status(404).json({ error: 'Shave not found' });
		}

		const current = currentShave[0];
		const newValue = value !== undefined ? value : current.value;
		const newCommissionType = commission_type !== undefined ? commission_type : current.commission_type;
		const finalTargetId = target_id !== undefined ? target_id : current.target_id;
		const finalUserId = user_id !== undefined ? user_id : current.user_id;

		if (newValue !== current.value || newCommissionType !== current.commission_type) {
			await connection.beginTransaction();

			await connection.query(
				'UPDATE shave_history SET end_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE user_id = ? AND target_id = ? AND end_date IS NULL',
				[current.user_id, current.target_id]
			);

			await connection.query(
				'INSERT INTO shave_history (user_id, target_id, commission_type, value, start_date) VALUES (?, ?, ?, ?, CURDATE())',
				[finalUserId, finalTargetId, newCommissionType, newValue]
			);
		}

		const updateFields = [];
		const updateValues = [];

		if (user_id !== undefined) {
			updateFields.push('user_id = ?');
			updateValues.push(user_id);
		}
		if (target_id !== undefined) {
			updateFields.push('target_id = ?');
			updateValues.push(target_id);
		}
		if (intermediary_id !== undefined) {
			updateFields.push('intermediary_id = ?');
			updateValues.push(intermediary_id || null);
		}
		if (commission_type !== undefined) {
			updateFields.push('commission_type = ?');
			updateValues.push(commission_type);
		}
		if (value !== undefined) {
			updateFields.push('value = ?');
			updateValues.push(value);
		}

		if (updateFields.length === 0) {
			return res.status(400).json({ error: 'No fields to update' });
		}

		updateValues.push(id);

		await connection.query(
			`UPDATE shaves SET ${updateFields.join(', ')} WHERE id = ?`,
			updateValues
		);

		if (newValue !== current.value || newCommissionType !== current.commission_type) {
			await connection.commit();
		}

		res.json({ success: true });
	} catch (error) {
		await connection.rollback();
		console.error('Update shave error:', error);
		res.status(500).json({ error: 'Failed to update shave' });
	} finally {
		connection.release();
	}
});

router.delete('/shaves/:id', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { id } = req.params;

		await pool.query('DELETE FROM shaves WHERE id = ?', [id]);

		res.json({ success: true });
	} catch (error) {
		console.error('Delete shave error:', error);
		res.status(500).json({ error: 'Failed to delete shave' });
	}
});

router.get('/shaves/graph', async (req, res) => {
	try {
		const sessionId = req.cookies.sessionId;
		const adminId = await verifyAdmin(sessionId);

		if (!adminId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const [users] = await pool.query(`
			SELECT id, username, email, role, referrer, manager
			FROM users
			WHERE role IN ('admin', 'manager', 'affiliate')
			AND state = 'accepted'
			ORDER BY
				CASE role
					WHEN 'admin' THEN 1
					WHEN 'manager' THEN 2
					WHEN 'affiliate' THEN 3
				END
		`);

		const [shaves] = await pool.query(`
			SELECT
				s.id,
				s.user_id,
				s.target_id,
				s.intermediary_id,
				s.commission_type,
				s.value
			FROM shaves s
		`);

		res.json({ users, shaves });
	} catch (error) {
		console.error('Get shaves graph error:', error);
		res.status(500).json({ error: 'Failed to fetch shaves graph' });
	}
});

export default router;
