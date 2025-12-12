import express from 'express';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import pool from '../db/connection';
import multer from 'multer';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

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

router.post('/', upload.single('file'), async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = await verifySession(sessionId);

  if (!session) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const { category } = req.body;

  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (!validTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only images and PDF are allowed' });
  }

  const connection = await pool.getConnection();

  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads', category);

    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storedFilename = `${timestamp}_${sanitizedFilename}`;
    const filepath = join(uploadsDir, storedFilename);

    await writeFile(filepath, req.file.buffer);

    const [result] = await connection.query(
      `INSERT INTO user_files (user_id, original_filename, stored_filename, file_size, mime_type, category)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [session.userId, req.file.originalname, storedFilename, req.file.size, req.file.mimetype, category]
    ) as any;

    res.json({
      fileId: result.insertId,
      filename: req.file.originalname,
      storedFilename: storedFilename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  } finally {
    connection.release();
  }
});

router.post('/image', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = await verifySession(sessionId);

  if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { image, filename } = req.body;

    if (!image || !filename) {
      return res.status(400).json({ error: 'Missing image or filename' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'rewards');

    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFilename = `${timestamp}_${sanitizedFilename}`;
    const filepath = join(uploadsDir, finalFilename);

    await writeFile(filepath, buffer);

    const imageUrl = `/uploads/rewards/${finalFilename}`;

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
