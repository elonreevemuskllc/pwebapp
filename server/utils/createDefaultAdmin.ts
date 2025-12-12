import pool from '../db/connection';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

export async function createDefaultAdmin() {
	const connection = await pool.getConnection();

	try {
		const [admins] = await connection.query(
			'SELECT COUNT(*) as count FROM users WHERE role = ?',
			['admin']
		);

		const adminCount = (admins as any)[0].count;

		if (adminCount === 0) {
			const hashedPassword = await bcrypt.hash(
				process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123',
				10
			);

			await connection.query(
				`INSERT INTO users (email, password, username, role, state, is_verified)
			VALUES (?, ?, ?, ?, ?, ?)`,
				[
					process.env.DEFAULT_ADMIN_EMAIL,
					hashedPassword,
					'Admin',
					'admin',
					'accepted',
					1
				]
			);

			console.log('Default admin created successfully');
		}
	} catch (error) {
		console.error('Error creating default admin:', error);
	} finally {
		connection.release();
	}
}
