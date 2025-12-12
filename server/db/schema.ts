import pool from './connection';

export async function initDatabase() {
	const connection = await pool.getConnection();

	try {
		await connection.query(`
		CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			role ENUM('admin', 'manager', 'affiliate') DEFAULT 'affiliate',
			email VARCHAR(255) UNIQUE NOT NULL,
			password VARCHAR(255) NOT NULL,
			username VARCHAR(255) NOT NULL,
			date_of_birth DATE,
			application_data TEXT,
			referrer INT,
			manager INT,
			salary DECIMAL(10,2),
			salary_payment_frequency_days INT DEFAULT 7,
			state ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
			reject_reason TEXT,
			is_verified TINYINT(1) DEFAULT 0,
			is_frozen TINYINT(1) DEFAULT 0,
			verification_code VARCHAR(6),
			verification_code_expiry DATETIME,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (referrer) REFERENCES users(id) ON DELETE SET NULL,
			FOREIGN KEY (manager) REFERENCES users(id) ON DELETE SET NULL
		)
		`);

		// Add salary_payment_frequency_days column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_payment_frequency_days INT DEFAULT 7 AFTER salary
			`);
		} catch (error) {
			console.log('salary_payment_frequency_days column may already exist');
		}

		// Add note column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE users ADD COLUMN IF NOT EXISTS note TEXT AFTER is_frozen
			`);
		} catch (error) {
			console.log('note column may already exist');
		}

		// Add date_of_birth column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE AFTER username
			`);
		} catch (error) {
			console.log('date_of_birth column may already exist');
		}

		// Add telegram column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram VARCHAR(255) AFTER date_of_birth
			`);
		} catch (error) {
			console.log('telegram column may already exist');
		}

		// Add notifications_enabled column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled TINYINT(1) DEFAULT 0 AFTER is_frozen
			`);
		} catch (error) {
			console.log('notifications_enabled column may already exist');
		}

		await connection.query(`
		CREATE TABLE IF NOT EXISTS sessions (
			id VARCHAR(255) PRIMARY KEY,
			user_id INT NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_expires (expires_at),
			INDEX idx_user_id (user_id)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS affiliate_deals (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			cpa_enabled TINYINT(1) DEFAULT 0,
			cpa_amount DECIMAL(10,2) DEFAULT 0,
			revshare_enabled TINYINT(1) DEFAULT 0,
			revshare_percentage DECIMAL(5,2) DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_user_deal (user_id)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS manager_deals (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			cpa_per_ftd DECIMAL(10,2) DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_manager_deal (user_id)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS shaves (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			target_id INT NOT NULL,
			intermediary_id INT,
			commission_type ENUM('percentage', 'fixed_per_ftd') DEFAULT 'percentage',
			value DECIMAL(10,2) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (intermediary_id) REFERENCES users(id) ON DELETE CASCADE
		)
		`);

		// Add commission_type column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE shaves ADD COLUMN IF NOT EXISTS commission_type ENUM('percentage', 'fixed_per_ftd') DEFAULT 'percentage' AFTER intermediary_id
			`);
		} catch (error) {
			console.log('commission_type column may already exist');
		}

		await connection.query(`
		CREATE TABLE IF NOT EXISTS pending_salary_changes (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			new_salary DECIMAL(10,2) NOT NULL,
			effective_date DATE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_pending_change (user_id)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS tracking_codes (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			code VARCHAR(255) NOT NULL,
			display_name VARCHAR(255),
			afp VARCHAR(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_user_id (user_id)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS ftd_assignments (
			id INT AUTO_INCREMENT PRIMARY KEY,
			ftd_user_id VARCHAR(255) NOT NULL,
			assigned_user_id INT NOT NULL,
			registration_date DATETIME NOT NULL,
			tracking_code VARCHAR(255) NOT NULL,
			afp VARCHAR(255),
			note TEXT,
			FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_ftd_user (ftd_user_id),
			INDEX idx_assigned_user_id (assigned_user_id),
			INDEX idx_tracking_code (tracking_code),
			INDEX idx_afp (afp)
		)
		`);

		// Add note column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE ftd_assignments ADD COLUMN IF NOT EXISTS note TEXT AFTER afp
			`);
		} catch (error) {
			console.log('note column may already exist');
		}

		await connection.query(`
		CREATE TABLE IF NOT EXISTS daily_revshare (
			id INT AUTO_INCREMENT PRIMARY KEY,
			trader_id VARCHAR(255) NOT NULL,
			date DATE NOT NULL,
			revshare DECIMAL(10,2) NOT NULL DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			UNIQUE KEY unique_trader_date (trader_id, date),
			INDEX idx_date (date),
			INDEX idx_trader_id (trader_id)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS daily_media_stats (
			id INT AUTO_INCREMENT PRIMARY KEY,
			date DATE NOT NULL,
			tracking_code VARCHAR(255) NOT NULL,
			afp VARCHAR(255),
			impressions INT DEFAULT 0,
			unique_visitors INT DEFAULT 0,
			deposits DECIMAL(10,2) DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			UNIQUE KEY unique_date_tracking_afp (date, tracking_code, afp),
			INDEX idx_date (date),
			INDEX idx_tracking_code (tracking_code),
			INDEX idx_afp (afp)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS balances (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			total_balance DECIMAL(10,2) DEFAULT 0,
			paid_balance DECIMAL(10,2) DEFAULT 0,
			cpa_earnings DECIMAL(10,2) DEFAULT 0,
			revshare_earnings DECIMAL(10,2) DEFAULT 0,
			referral_earnings DECIMAL(10,2) DEFAULT 0,
			salary_earnings DECIMAL(10,2) DEFAULT 0,
			paid_ftd_referral DECIMAL(10,2) DEFAULT 0,
			paid_revshare DECIMAL(10,2) DEFAULT 0,
			last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_user_balance (user_id),
			INDEX idx_user_id (user_id)
		)
		`);

		await connection.query(`
		ALTER TABLE balances
		ADD COLUMN IF NOT EXISTS referral_earnings DECIMAL(10,2) DEFAULT 0 AFTER revshare_earnings,
		ADD COLUMN IF NOT EXISTS paid_ftd_referral DECIMAL(10,2) DEFAULT 0 AFTER referral_earnings,
		ADD COLUMN IF NOT EXISTS paid_revshare DECIMAL(10,2) DEFAULT 0 AFTER paid_ftd_referral
		`);

		try {
			await connection.query(`
				ALTER TABLE balances
				ADD COLUMN IF NOT EXISTS manager_ftd_earnings DECIMAL(10,2) DEFAULT 0 AFTER salary_earnings,
				ADD COLUMN IF NOT EXISTS manager_salary_earnings DECIMAL(10,2) DEFAULT 0 AFTER manager_ftd_earnings
			`);
		} catch (error) {
			console.log('manager earnings columns may already exist');
		}

		await connection.query(`
		CREATE TABLE IF NOT EXISTS daily_salary_payments (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			payment_date DATE NOT NULL,
			amount DECIMAL(10,2) NOT NULL,
			total_monthly_salary DECIMAL(10,2) NOT NULL,
			days_in_month INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_user_date (user_id, payment_date),
			INDEX idx_user_id (user_id),
			INDEX idx_payment_date (payment_date)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS payment_requests (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			amount DECIMAL(10,2) NOT NULL,
			payment_type ENUM('ftd_referral', 'revshare') NOT NULL DEFAULT 'ftd_referral',
			crypto_type ENUM('USDT', 'USDC', 'ETH') NOT NULL,
			network VARCHAR(20) NOT NULL,
			wallet_address VARCHAR(255) NOT NULL,
			note TEXT,
			status ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
			admin_note TEXT,
			processed_by INT,
			processed_at TIMESTAMP NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
			INDEX idx_user_status (user_id, status),
			INDEX idx_status (status),
			INDEX idx_created_at (created_at)
		)
		`);

		await connection.query(`
		ALTER TABLE payment_requests
		ADD COLUMN IF NOT EXISTS payment_type ENUM('ftd_referral', 'revshare', 'salary') NOT NULL DEFAULT 'ftd_referral' AFTER amount
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS expense_reimbursements (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			amount DECIMAL(10,2) NOT NULL,
			description TEXT NOT NULL,
			crypto_type ENUM('USDT', 'USDC', 'ETH') NOT NULL,
			network VARCHAR(20) NOT NULL,
			wallet_address VARCHAR(255) NOT NULL,
			attachment_file_id INT,
			status ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
			admin_note TEXT,
			processed_by INT,
			processed_at TIMESTAMP NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
			FOREIGN KEY (attachment_file_id) REFERENCES user_files(id) ON DELETE SET NULL,
			INDEX idx_user_status (user_id, status),
			INDEX idx_status (status),
			INDEX idx_created_at (created_at)
		)
		`);

		// Add attachment_file_id column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE expense_reimbursements ADD COLUMN IF NOT EXISTS attachment_file_id INT AFTER wallet_address
			`);
		} catch (error) {
			console.log('attachment_file_id column may already exist');
		}

		try {
			await connection.query(`
				ALTER TABLE expense_reimbursements ADD CONSTRAINT fk_expense_attachment
				FOREIGN KEY (attachment_file_id) REFERENCES user_files(id) ON DELETE SET NULL
			`);
		} catch (error) {
			console.log('fk_expense_attachment constraint may already exist');
		}

		await connection.query(`
		CREATE TABLE IF NOT EXISTS rewards (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			image_url VARCHAR(500) NOT NULL,
			value_euros DECIMAL(10,2) NOT NULL,
			ftd_required INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			INDEX idx_ftd_required (ftd_required)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS reward_claims (
			id INT AUTO_INCREMENT PRIMARY KEY,
			reward_id INT NOT NULL,
			user_id INT NOT NULL,
			claim_type ENUM('physical', 'balance') NOT NULL,
			status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
			shipping_first_name VARCHAR(255),
			shipping_last_name VARCHAR(255),
			shipping_address TEXT,
			shipping_address_complement TEXT,
			shipping_country VARCHAR(100),
			shipping_postal_code VARCHAR(20),
			claim_year INT,
			claim_month INT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			processed_at TIMESTAMP NULL,
			processed_by INT,
			admin_note TEXT,
			FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
			INDEX idx_user_id (user_id),
			INDEX idx_status (status),
			INDEX idx_reward_id (reward_id),
			INDEX idx_claim_period (user_id, reward_id, claim_year, claim_month)
		)
		`);

		await connection.query(`
		ALTER TABLE reward_claims
		ADD COLUMN IF NOT EXISTS claim_year INT AFTER shipping_postal_code,
		ADD COLUMN IF NOT EXISTS claim_month INT AFTER claim_year
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS password_resets (
			id INT AUTO_INCREMENT PRIMARY KEY,
			email VARCHAR(255) NOT NULL,
			reset_code VARCHAR(6) NOT NULL,
			expires_at DATETIME NOT NULL,
			used TINYINT(1) DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_email (email),
			INDEX idx_code (reset_code),
			INDEX idx_expires (expires_at)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS last_salary_payments (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			last_payment_date DATE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_user (user_id)
		)
		`);

		// Add admin_note column to reward_claims if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS admin_note TEXT AFTER processed_by
			`);
		} catch (error) {
			// Column may already exist
			console.log('admin_note column may already exist');
		}

		await connection.query(`
		CREATE TABLE IF NOT EXISTS user_files (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			original_filename VARCHAR(255) NOT NULL,
			stored_filename VARCHAR(255) NOT NULL,
			file_size INT NOT NULL,
			mime_type VARCHAR(100) NOT NULL,
			category VARCHAR(50),
			uploaded_by INT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
			INDEX idx_user_id (user_id),
			INDEX idx_uploaded_by (uploaded_by)
		)
		`);

		// Add category column if it doesn't exist
		try {
			await connection.query(`
				ALTER TABLE user_files ADD COLUMN IF NOT EXISTS category VARCHAR(50) AFTER mime_type
			`);
		} catch (error) {
			console.log('category column may already exist in user_files');
		}

		// Modify uploaded_by to allow NULL
		try {
			await connection.query(`
				ALTER TABLE user_files MODIFY COLUMN uploaded_by INT NULL
			`);
		} catch (error) {
			console.log('uploaded_by column modification may have failed or already nullable');
		}

		await connection.query(`
		CREATE TABLE IF NOT EXISTS shave_history (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			target_id INT NOT NULL,
			commission_type ENUM('percentage', 'fixed_per_ftd') DEFAULT 'percentage',
			value DECIMAL(10,2) NOT NULL,
			start_date DATE NOT NULL,
			end_date DATE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_target_dates (target_id, start_date, end_date),
			INDEX idx_user_id (user_id)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS daily_salary_claims (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			claim_date DATE NOT NULL,
			proof_link TEXT NOT NULL,
			amount DECIMAL(10,2) NOT NULL,
			status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
			admin_note TEXT,
			processed_by INT,
			processed_at TIMESTAMP NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
			UNIQUE KEY unique_user_claim_date (user_id, claim_date),
			INDEX idx_user_status (user_id, status),
			INDEX idx_status (status),
			INDEX idx_claim_date (claim_date)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS deleted_users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			original_user_id INT NOT NULL,
			user_data JSON NOT NULL,
			deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			deleted_by INT,
			reason TEXT,
			INDEX idx_original_user_id (original_user_id),
			INDEX idx_deleted_at (deleted_at)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS manager_affiliate_assignments (
			id INT AUTO_INCREMENT PRIMARY KEY,
			manager_id INT NOT NULL,
			affiliate_id INT NOT NULL,
			assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (affiliate_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE KEY unique_manager_affiliate (manager_id, affiliate_id),
			INDEX idx_manager_id (manager_id),
			INDEX idx_affiliate_id (affiliate_id),
			INDEX idx_assigned_at (assigned_at)
		)
		`);

		await connection.query(`
		CREATE TABLE IF NOT EXISTS login_logs (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT,
			email VARCHAR(255) NOT NULL,
			ip_address VARCHAR(45),
			user_agent TEXT,
			login_status ENUM('success', 'failed', 'blocked') NOT NULL,
			failure_reason VARCHAR(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
			INDEX idx_user_id (user_id),
			INDEX idx_email (email),
			INDEX idx_login_status (login_status),
			INDEX idx_created_at (created_at)
		)
		`);

		console.log('Database tables initialized successfully');
	} catch (error) {
		console.error('Error initializing database:', error);
		throw error;
	} finally {
		connection.release();
	}
}
