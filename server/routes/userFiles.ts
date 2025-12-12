import { Router } from 'express';
import pool from '../db/connection';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const router = Router();

// Store files in server directory for security (not in public)
const UPLOAD_DIR = path.join(process.cwd(), 'server', 'storage', 'user-files');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Verify admin middleware
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

// Get files for a user (admin only)
router.get('/user/:userId/files', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const adminId = await verifyAdmin(sessionId);

  if (!adminId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const connection = await pool.getConnection();

  try {
    const [files] = await connection.query(
      `SELECT uf.*, u.username as uploaded_by_username
       FROM user_files uf
       JOIN users u ON uf.uploaded_by = u.id
       WHERE uf.user_id = ?
       ORDER BY uf.created_at DESC`,
      [req.params.userId]
    ) as any[];

    res.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Upload file (admin only)
router.post('/user/:userId/files', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const adminId = await verifyAdmin(sessionId);

  if (!adminId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { filename, data, mimeType } = req.body;

  if (!filename || !data || !mimeType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const connection = await pool.getConnection();

  try {
    // Generate unique filename
    const ext = path.extname(filename);
    const hash = crypto.randomBytes(16).toString('hex');
    const storedFilename = `${hash}${ext}`;
    const filePath = path.join(UPLOAD_DIR, storedFilename);

    // Decode base64 and save file
    const base64Data = data.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Save file metadata to database
    const [result] = await connection.query(
      `INSERT INTO user_files (user_id, original_filename, stored_filename, file_size, mime_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.userId, filename, storedFilename, buffer.length, mimeType, adminId]
    ) as any[];

    const [files] = await connection.query(
      `SELECT uf.*, u.username as uploaded_by_username
       FROM user_files uf
       JOIN users u ON uf.uploaded_by = u.id
       WHERE uf.id = ?`,
      [result.insertId]
    ) as any[];

    res.json({ file: files[0] });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Download/View file (admin only)
router.get('/file/:fileId', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const adminId = await verifyAdmin(sessionId);

  if (!adminId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const connection = await pool.getConnection();

  try {
    const [files] = await connection.query(
      'SELECT * FROM user_files WHERE id = ?',
      [req.params.fileId]
    ) as any[];

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    const filePath = path.join(UPLOAD_DIR, file.stored_filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Delete file (admin only)
router.delete('/file/:fileId', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const adminId = await verifyAdmin(sessionId);

  if (!adminId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const connection = await pool.getConnection();

  try {
    const [files] = await connection.query(
      'SELECT * FROM user_files WHERE id = ?',
      [req.params.fileId]
    ) as any[];

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    const filePath = path.join(UPLOAD_DIR, file.stored_filename);

    // Delete from database
    await connection.query('DELETE FROM user_files WHERE id = ?', [req.params.fileId]);

    // Delete from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

export default router;
