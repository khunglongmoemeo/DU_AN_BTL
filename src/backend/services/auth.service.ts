import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { dbPool } from '../config/database';
import type { LoginPayload, RegisterPayload, UserRecord } from '../types/auth';
import { sendPasswordResetEmail } from '../utils/email';

const SALT_ROUNDS = 10;

const validatePasswordStrength = (password: string) => {
	if (password.length < 8) {
		throw new Error('Mật khẩu phải có ít nhất 8 ký tự');
	}
	if (!/[a-z]/.test(password)) {
		throw new Error('Mật khẩu phải chứa ít nhất 1 chữ thường');
	}
	if (!/[A-Z]/.test(password)) {
		throw new Error('Mật khẩu phải chứa ít nhất 1 chữ hoa');
	}
	if (!/\d/.test(password)) {
		throw new Error('Mật khẩu phải chứa ít nhất 1 số');
	}
	if (!/[@$!%*?&]/.test(password)) {
		throw new Error('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (@$!%*?&)');
	}
};

const createToken = (user: Omit<UserRecord, 'password_hash'>) => {
	return jwt.sign(
		{
			id: user.id,
			username: user.username,
			role: user.role,
		},
		process.env.JWT_SECRET || 'dev_secret_key',
		{ expiresIn: '1d' },
	);
};

const findRoleIdByName = async (role: 'manager' | 'student') => {
	const [rows] = await dbPool.query<RowDataPacket[]>('SELECT id FROM roles WHERE name = ? LIMIT 1', [role]);
	return rows[0]?.id as number | undefined;
};

const sanitizeUser = (user: UserRecord): Omit<UserRecord, 'password_hash'> => {
	const { password_hash, ...safeUser } = user;
	return safeUser;
};

export const registerUser = async (payload: RegisterPayload) => {
	const normalizedEmail = payload.email?.trim().toLowerCase();
	const normalizedUsername = payload.username?.trim() || normalizedEmail?.split('@')[0] || '';
	const normalizedFullName = payload.fullName?.trim() || normalizedUsername;
	const normalizedStudentCode = payload.studentCode?.trim() || null;
	const normalizedPhone = payload.phone?.trim() || null;

	if (!normalizedEmail) {
		throw new Error('Email khong hop le');
	}

	if (!payload.password) {
		throw new Error('Mat khau khong duoc de trong');
	}

	if (!normalizedUsername) {
		throw new Error('Ten dang nhap khong hop le');
	}

	if (!normalizedFullName) {
		throw new Error('Ho va ten khong hop le');
	}

	const roleId = await findRoleIdByName('student');

	if (!roleId) {
		throw new Error('Vai trò tài khoản không hợp lệ');
	}

	// Validate password strength
	validatePasswordStrength(payload.password);

	// Check if password is same as username
	if (payload.password.toLowerCase() === normalizedUsername.toLowerCase()) {
		throw new Error('Mật khẩu không được trùng với tên đăng nhập');
	}

	const [existingUsers] = await dbPool.query<RowDataPacket[]>(
		'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
		[normalizedEmail, normalizedUsername],
	);

	if (existingUsers.length > 0) {
		throw new Error('Email hoặc tên đăng nhập đã tồn tại');
	}

	const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

	const [result] = await dbPool.query<ResultSetHeader>(
		`INSERT INTO users (
			full_name,
			email,
			username,
			password_hash,
			role_id,
			student_code,
			phone
		) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[
			normalizedFullName,
			normalizedEmail,
			normalizedUsername,
			passwordHash,
			roleId,
			normalizedStudentCode,
			normalizedPhone,
		],
	);

	await dbPool.query(
		`INSERT INTO admission_applications (
			user_id,
			status,
			documents_info,
			confirmation_checked
		) VALUES (?, ?, ?, ?)`,
		[
			result.insertId,
			'draft',
			JSON.stringify({
				items: [
					{ key: 'cccd_front', label: 'CCCD mặt trước', status: 'missing' },
					{ key: 'cccd_back', label: 'CCCD mặt sau', status: 'missing' },
					{ key: 'portrait', label: 'Ảnh chân dung', status: 'missing' },
				],
			}),
			0,
		],
	);

	return {
		id: result.insertId,
		fullName: normalizedFullName,
		email: normalizedEmail,
		username: normalizedUsername,
		role: 'student',
		studentCode: normalizedStudentCode,
		phone: normalizedPhone,
	};
};

export const loginUser = async (payload: LoginPayload) => {
	const [rows] = await dbPool.query<RowDataPacket[]>(
		`SELECT
			users.id,
			users.full_name,
			users.email,
			users.username,
			users.password_hash,
			users.student_code,
			users.phone,
			users.avatar,
			users.is_active,
			roles.name AS role
		FROM users
		JOIN roles ON users.role_id = roles.id
		WHERE (users.username = ? OR users.email = ?) AND users.is_active = TRUE
		LIMIT 1`,
		[payload.username, payload.username],
	);

	if (rows.length === 0) {
		throw new Error('Tài khoản hoặc mật khẩu không đúng');
	}

	const user = rows[0] as UserRecord;
	const isPasswordValid = await bcrypt.compare(payload.password, user.password_hash);

	if (!isPasswordValid) {
		throw new Error('Tài khoản hoặc mật khẩu không đúng');
	}

	const safeUser = sanitizeUser(user);
	const token = createToken(safeUser);

	return {
		token,
		user: safeUser,
	};
};

export const forgotPassword = async (email: string) => {
	const [rows] = await dbPool.query<RowDataPacket[]>(
		'SELECT id, email FROM users WHERE email = ? AND is_active = TRUE LIMIT 1',
		[email],
	);

	if (rows.length === 0) {
		throw new Error('Email không tồn tại trong hệ thống');
	}

	const user = rows[0];

	// Delete any existing tokens for this user
	await dbPool.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);

	// Generate new token
	const token = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

	// Save token to database
	await dbPool.query(
		'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
		[user.id, token, expiresAt],
	);

	// Generate reset link
	const resetLink = `${process.env.APP_URL || 'http://localhost:8000'}/user/reset-password?token=${token}`;

	// Send email
	await sendPasswordResetEmail(email, resetLink);

	return { message: 'Email khôi phục mật khẩu đã được gửi' };
};

export const resetPassword = async (token: string, newPassword: string) => {
	// Find valid token
	const [tokenRows] = await dbPool.query<RowDataPacket[]>(
		'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ? LIMIT 1',
		[token],
	);

	if (tokenRows.length === 0) {
		throw new Error('Token không hợp lệ');
	}

	const tokenData = tokenRows[0];

	// Check if token is expired
	if (new Date(tokenData.expires_at) < new Date()) {
		throw new Error('Token đã hết hạn');
	}

	// Get current password hash
	const [userRows] = await dbPool.query<RowDataPacket[]>(
		'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
		[tokenData.user_id],
	);

	if (userRows.length === 0) {
		throw new Error('Người dùng không tồn tại');
	}

	const currentPasswordHash = userRows[0].password_hash;

	// Check if new password is the same as old password
	const isSamePassword = await bcrypt.compare(newPassword, currentPasswordHash);
	if (isSamePassword) {
		throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ');
	}

	// Validate password strength
	validatePasswordStrength(newPassword);

	// Hash new password
	const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
	console.log('Updating password for user_id:', tokenData.user_id);

	// Update user password
	const [result] = await dbPool.query<ResultSetHeader>('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, tokenData.user_id]);
	console.log('Password update result:', result.affectedRows);

	// Delete used token
	await dbPool.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);

	return { message: 'Mật khẩu đã được đặt lại thành công' };
};
