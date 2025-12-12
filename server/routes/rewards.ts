import express from 'express';
import pool from '../db/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { sendRewardClaimProcessed } from '../services/emailService';

const router = express.Router();

async function verifySession(sessionId: string): Promise<{ userId: number; role: string; id: number } | null> {
  const [sessions] = await pool.query(
    `SELECT s.user_id, u.role, u.id
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
    role: (sessions as any[])[0].role,
    id: (sessions as any[])[0].id
  };
}

interface Reward extends RowDataPacket {
  id: number;
  name: string;
  image_url: string;
  value_euros: number;
  ftd_required: number;
  created_at: Date;
  updated_at: Date;
}

interface RewardClaim extends RowDataPacket {
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
  created_at: Date;
  processed_at?: Date;
  processed_by?: number;
  reward_name?: string;
  reward_value?: number;
  user_email?: string;
  user_username?: string;
}

router.get('/', async (req, res) => {
  try {
    const [rewards] = await pool.query<Reward[]>(
      'SELECT * FROM rewards ORDER BY ftd_required ASC'
    );
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rewards] = await pool.query<Reward[]>(
      'SELECT * FROM rewards WHERE id = ?',
      [req.params.id]
    );

    if (rewards.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json(rewards[0]);
  } catch (error) {
    console.error('Error fetching reward:', error);
    res.status(500).json({ error: 'Failed to fetch reward' });
  }
});

router.post('/', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = await verifySession(sessionId);

  if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { name, image_url, value_euros, ftd_required } = req.body;

  if (!name || !image_url || !value_euros || !ftd_required) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO rewards (name, image_url, value_euros, ftd_required) VALUES (?, ?, ?, ?)',
      [name, image_url, Number(value_euros), Number(ftd_required)]
    );

    const [newReward] = await pool.query<Reward[]>(
      'SELECT * FROM rewards WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newReward[0]);
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

router.put('/:id', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = await verifySession(sessionId);

  if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { name, image_url, value_euros, ftd_required } = req.body;

  if (!name || !image_url || !value_euros || !ftd_required) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE rewards SET name = ?, image_url = ?, value_euros = ?, ftd_required = ? WHERE id = ?',
      [name, image_url, Number(value_euros), Number(ftd_required), req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    const [updatedReward] = await pool.query<Reward[]>(
      'SELECT * FROM rewards WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedReward[0]);
  } catch (error) {
    console.error('Error updating reward:', error);
    res.status(500).json({ error: 'Failed to update reward' });
  }
});

router.delete('/:id', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = await verifySession(sessionId);

  if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM rewards WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({ message: 'Reward deleted successfully' });
  } catch (error) {
    console.error('Error deleting reward:', error);
    res.status(500).json({ error: 'Failed to delete reward' });
  }
});

router.get('/claims/list', async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    const session = await verifySession(sessionId);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT
        rc.*,
        r.name as reward_name,
        r.value_euros as reward_value,
        u.email as user_email,
        u.username as user_username
      FROM reward_claims rc
      JOIN rewards r ON rc.reward_id = r.id
      JOIN users u ON rc.user_id = u.id
    `;

    const params: any[] = [];

    if (session.role === 'affiliate') {
      query += ` WHERE rc.user_id = ?
                 AND rc.claim_year = YEAR(CURDATE())
                 AND rc.claim_month = MONTH(CURDATE())`;
      params.push(session.id);
    }

    query += ' ORDER BY rc.created_at DESC';

    const [claims] = await pool.query<RewardClaim[]>(query, params);
    res.json(claims);
  } catch (error) {
    console.error('Error fetching reward claims:', error);
    res.status(500).json({ error: 'Failed to fetch reward claims' });
  }
});

router.post('/claims', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = await verifySession(sessionId);

  if (!session || session.role !== 'affiliate') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const {
    reward_id,
    claim_type,
    shipping_first_name,
    shipping_last_name,
    shipping_address,
    shipping_address_complement,
    shipping_country,
    shipping_postal_code
  } = req.body;

  if (!reward_id || !claim_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (claim_type === 'physical') {
    if (!shipping_first_name || !shipping_last_name || !shipping_address || !shipping_country || !shipping_postal_code) {
      return res.status(400).json({ error: 'Missing shipping information for physical claim' });
    }
  }

  try {
    const [existingClaims] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM reward_claims
       WHERE reward_id = ?
       AND user_id = ?
       AND claim_year = YEAR(CURDATE())
       AND claim_month = MONTH(CURDATE())
       AND status IN ("pending", "approved")`,
      [reward_id, session.id]
    );

    if (existingClaims.length > 0) {
      return res.status(400).json({ error: 'You already have a pending or approved claim for this reward this month' });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO reward_claims
       (reward_id, user_id, claim_type, shipping_first_name, shipping_last_name,
        shipping_address, shipping_address_complement, shipping_country, shipping_postal_code,
        claim_year, claim_month)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, YEAR(CURDATE()), MONTH(CURDATE()))`,
      [
        reward_id,
        session.id,
        claim_type,
        shipping_first_name || null,
        shipping_last_name || null,
        shipping_address || null,
        shipping_address_complement || null,
        shipping_country || null,
        shipping_postal_code || null
      ]
    );

    const [newClaim] = await pool.query<RewardClaim[]>(
      `SELECT
        rc.*,
        r.name as reward_name,
        r.value_euros as reward_value
       FROM reward_claims rc
       JOIN rewards r ON rc.reward_id = r.id
       WHERE rc.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newClaim[0]);
  } catch (error) {
    console.error('Error creating reward claim:', error);
    res.status(500).json({ error: 'Failed to create reward claim' });
  }
});

router.put('/claims/:id', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = await verifySession(sessionId);

  if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { status, admin_note } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const [claims] = await pool.query<RewardClaim[]>(
      `SELECT rc.*, r.name as reward_name, r.value_euros, u.email, u.username
       FROM reward_claims rc
       JOIN rewards r ON rc.reward_id = r.id
       JOIN users u ON rc.user_id = u.id
       WHERE rc.id = ?`,
      [req.params.id]
    );

    if (claims.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = claims[0];

    if (claim.status !== 'pending') {
      return res.status(400).json({ error: 'Claim has already been processed' });
    }

    await pool.query<ResultSetHeader>(
      'UPDATE reward_claims SET status = ?, processed_at = NOW(), processed_by = ?, admin_note = ? WHERE id = ?',
      [status, session.id, admin_note || null, req.params.id]
    );

    if (status === 'approved' && claim.claim_type === 'balance') {
      await pool.query(
        'UPDATE balances SET total_balance = total_balance + ? WHERE user_id = ?',
        [claim.value_euros, claim.user_id]
      );
    }

    const [updatedClaim] = await pool.query<RewardClaim[]>(
      `SELECT
        rc.*,
        r.name as reward_name,
        r.value_euros as reward_value,
        u.email as user_email,
        u.username as user_username
       FROM reward_claims rc
       JOIN rewards r ON rc.reward_id = r.id
       JOIN users u ON rc.user_id = u.id
       WHERE rc.id = ?`,
      [req.params.id]
    );

    await sendRewardClaimProcessed(
      claim.email,
      claim.username,
      claim.reward_name,
      claim.value_euros,
      claim.claim_type,
      status,
      admin_note
    );

    res.json({ claim: updatedClaim[0], shouldSendEmail: true });
  } catch (error) {
    console.error('Error updating reward claim:', error);
    res.status(500).json({ error: 'Failed to update reward claim' });
  }
});

export default router;
