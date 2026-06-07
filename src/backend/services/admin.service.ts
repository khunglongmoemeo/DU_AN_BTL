import { RowDataPacket } from 'mysql2';
import { dbPool } from '../config/database';
import type { ApplicationStatus } from '../types/admission';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const parseJson = <T>(value: string | null, fallback: T): T => {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
};

interface AppRow extends RowDataPacket {
	id: number;
	user_id: number;
	status: ApplicationStatus;
	personal_info: string | null;
	academic_info: string | null;
	documents_info: string | null;
	confirmation_checked: number;
	submitted_at: Date | null;
	reviewed_at: Date | null;
	rejection_reason: string | null;
	created_at: Date;
	updated_at: Date;
	full_name?: string;
	email?: string;
	username?: string;
	phone?: string | null;
}

interface UserRow extends RowDataPacket {
	full_name: string;
	email: string;
	username: string;
	phone: string | null;
}

interface CountRow extends RowDataPacket {
	total?: number;
	count?: number;
	status?: string;
	[key: string]: unknown;
}

// ──────────────────────────────────────────────
// Mappings
// ──────────────────────────────────────────────
const mapStatus = (status: string): string => {
	const map: Record<string, string> = {
		draft: 'DRAFT',
		submitted: 'PENDING',
		APPROVED: 'APPROVED',
		REJECTED: 'REJECTED',
		approved: 'APPROVED',
		rejected: 'REJECTED',
	};
	return map[status] || status.toUpperCase();
};

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export interface ProfileSummary {
	id: number;
	full_name: string;
	cccd_number: string;
	phone: string;
	status: string;
	final_score: number | null;
	created_at: string;
	email: string;
	username: string;
	gender: string;
	dob: string;
	ethnicity: string;
	pob: string;
	permanent_address: string;
	priority_area: string;
	priority_object: string;
	cccd_front_url: string;
	cccd_back_url: string;
	avatar_url: string;
	score_subject_1: number | null;
	score_subject_2: number | null;
	score_subject_3: number | null;
	total_score: number | null;
	priority_score: number | null;
	reject_reason: string | null;
	applications: Array<{
		id: number;
		priority_order: number;
		university_name: string;
		major_name: string;
		combination_code: string;
		subject_names: string;
	}>;
}

export interface ProfileListItem {
	id: number;
	full_name: string;
	email: string;
	username: string;
	phone: string | null;
	cccd_number: string;
	status: string;
	final_score: number | null;
	created_at: string;
}

export interface StatisticsData {
	total: number;
	byStatus: Array<{ status: string; count: number }>;
	byUniversity: Array<{ university_name: string; count: number }>;
	byMajor: Array<{ major_name: string; count: number }>;
	daily: Array<{ date: string; count: number }>;
}

// ──────────────────────────────────────────────
// GET /profiles
// ──────────────────────────────────────────────
export const getProfiles = async (params: {
	status?: string;
	search?: string;
	page?: number;
	pageSize?: number;
}): Promise<{ list: ProfileListItem[]; total: number }> => {
	const { status, search, page = 1, pageSize = 10 } = params;
	const offset = (Number(page) - 1) * Number(pageSize);

	const appRows = await dbPool.query<AppRow[]>(
		`SELECT a.*, u.full_name, u.email, u.username, u.phone
     FROM admission_applications a
     JOIN users u ON a.user_id = u.id
     ORDER BY a.updated_at DESC, a.id DESC
     LIMIT ${Number(pageSize)} OFFSET ${offset}`,
	);

	const [countRows] = await dbPool.query<CountRow[]>(
		'SELECT COUNT(*) as total FROM admission_applications',
	);

	const rows = appRows[0] || [];
	const total = (countRows[0] as CountRow).total || 0;

	const list: ProfileListItem[] = rows.map((row) => {
		const personal = parseJson<Record<string, unknown>>(row.personal_info, {});
		const academic = parseJson<Record<string, unknown>>(row.academic_info, {});
		const score = academic.total_score as number | null;
		const priority = academic.priority_score as number | null;
		const finalScore = score != null && priority != null ? score + priority : score;

		return {
			id: row.id,
			full_name: (personal.fullName as string) || row.full_name || '',
			email: row.email || '',
			username: row.username || '',
			phone: row.phone || null,
			cccd_number: (personal.citizenId as string) || '',
			status: mapStatus(row.status),
			final_score: finalScore,
			created_at: String(row.created_at || ''),
		};
	});

	return { list, total };
};

// ──────────────────────────────────────────────
// GET /profiles/:id
// ──────────────────────────────────────────────
export const getProfileDetail = async (id: number): Promise<ProfileSummary | null> => {
	const [appRows] = await dbPool.query<AppRow[]>(
		`SELECT a.*, u.full_name, u.email, u.username, u.phone
     FROM admission_applications a
     JOIN users u ON a.user_id = u.id
     WHERE a.id = ? LIMIT 1`,
		[id],
	);

	if (!appRows.length) return null;

	const row = appRows[0];
	const personal = parseJson<Record<string, unknown>>(row.personal_info, {});
	const academic = parseJson<Record<string, unknown>>(row.academic_info, {});
	const documents = parseJson<{ items?: Array<{ key: string; fileUrl?: string }> }>(row.documents_info, { items: [] });

	const score = academic.total_score as number | null;
	const priority = academic.priority_score as number | null;
	const finalScore = score != null && priority != null ? score + priority : score;

	// Get wishes (applications) — only use fields from admission_wishes table
	const [wishRows] = await dbPool.query<RowDataPacket[]>(
		`SELECT w.id, w.application_id, w.priority_order, w.school_name, w.major_name, w.subject_group
     FROM admission_wishes w
     WHERE w.application_id = ?
     ORDER BY w.priority_order ASC`,
		[id],
	);

	const applications = wishRows.map((w) => ({
		id: Number(w.id),
		priority_order: Number(w.priority_order),
		university_name: (w.school_name as string) || '',
		major_name: (w.major_name as string) || '',
		combination_code: '',
		subject_names: (w.subject_group as string) || '',
	}));

	return {
		id: row.id,
		full_name: (personal.fullName as string) || row.full_name || '',
		cccd_number: (personal.citizenId as string) || '',
		phone: row.phone || '',
		status: mapStatus(row.status),
		final_score: finalScore,
		created_at: String(row.created_at || ''),
		email: row.email || '',
		username: row.username || '',
		gender: ((personal.gender as string) || '').toUpperCase(),
		dob: (personal.birthday as string) || '',
		ethnicity: (personal.ethnicity as string) || '',
		pob: (personal.birthPlace as string) || '',
		permanent_address: (personal.address as string) || '',
		priority_area: (academic.priorityArea as string) || '',
		priority_object: (academic.priorityGroup as string) || '',
		cccd_front_url: documents.items?.find((i) => i.key === 'cccd_front')?.fileUrl || '',
		cccd_back_url: documents.items?.find((i) => i.key === 'cccd_back')?.fileUrl || '',
		avatar_url: documents.items?.find((i) => i.key === 'portrait')?.fileUrl || '',
		score_subject_1: academic.scoreSubject1 as number | null,
		score_subject_2: academic.scoreSubject2 as number | null,
		score_subject_3: academic.scoreSubject3 as number | null,
		total_score: (academic.totalScore as number | null) ?? score,
		priority_score: (academic.priorityScore as number | null) ?? priority,
		reject_reason: row.rejection_reason,
		applications,
	};
};

// ──────────────────────────────────────────────
// PUT /profiles/:id/approve
// ──────────────────────────────────────────────
export const approveProfile = async (id: number): Promise<void> => {
	const [result] = await dbPool.query(
		`UPDATE admission_applications
     SET status = 'approved', rejection_reason = NULL, reviewed_at = NOW()
     WHERE id = ? AND status = 'submitted'`,
		[id],
	);
	const r = result as { affectedRows: number };
	if (r.affectedRows === 0) {
		throw new Error('Hồ sơ không hợp lệ để duyệt (phải ở trạng thái submitted)');
	}
};

// ──────────────────────────────────────────────
// PUT /profiles/:id/reject
// ──────────────────────────────────────────────
export const rejectProfile = async (id: number, reason: string): Promise<void> => {
	if (!reason.trim()) throw new Error('Vui lòng nhập lý do từ chối');
	const [result] = await dbPool.query(
		`UPDATE admission_applications
     SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW()
     WHERE id = ? AND status = 'submitted'`,
		[reason.trim(), id],
	);
	const r = result as { affectedRows: number };
	if (r.affectedRows === 0) {
		throw new Error('Hồ sơ không hợp lệ để từ chối (phải ở trạng thái submitted)');
	}
};

// ──────────────────────────────────────────────
// GET /statistics
// ──────────────────────────────────────────────
export const getStatistics = async (): Promise<StatisticsData> => {
	try {
		const [totalRows] = await dbPool.query<CountRow[]>(
			'SELECT COUNT(*) as total FROM admission_applications',
		);
		const total = (totalRows[0] as CountRow).total || 0;

		const [statusRows] = await dbPool.query<CountRow[]>(
			`SELECT status, COUNT(*) as count FROM admission_applications GROUP BY status`,
		);
		const byStatus = statusRows.map((r) => ({
			status: mapStatus((r as CountRow).status || ''),
			count: (r as CountRow).count || 0,
		}));

		// By university — count wishes per school (using school_name string field)
		let byUniversity: Array<{ university_name: string; count: number }> = [];
		try {
			const [uniRows] = await dbPool.query<RowDataPacket[]>(
				`SELECT w.school_name as university_name, COUNT(DISTINCT w.application_id) as count
             FROM admission_wishes w
             WHERE w.school_name IS NOT NULL AND w.school_name != ''
               AND w.priority_order = 1
             GROUP BY w.school_name
             ORDER BY count DESC
             LIMIT 10`,
			);
			byUniversity = (uniRows as RowDataPacket[]).map((r) => ({
				university_name: String(r.university_name || ''),
				count: Number(r.count) || 0,
			}));
		} catch (uniErr) {
			console.warn('[getStatistics] byUniversity query failed (table may not exist):', uniErr);
		}

		// By major — count wishes per major (using major_name string field)
		let byMajor: Array<{ major_name: string; count: number }> = [];
		try {
			const [majorRows] = await dbPool.query<RowDataPacket[]>(
				`SELECT w.major_name as major_name, COUNT(DISTINCT w.application_id) as count
             FROM admission_wishes w
             WHERE w.major_name IS NOT NULL AND w.major_name != ''
             GROUP BY w.major_name
             ORDER BY count DESC
             LIMIT 10`,
			);
			byMajor = (majorRows as RowDataPacket[]).map((r) => ({
				major_name: String(r.major_name || ''),
				count: Number(r.count) || 0,
			}));
		} catch (majorErr) {
			console.warn('[getStatistics] byMajor query failed (table may not exist):', majorErr);
		}

		// Daily — last 7 days
		const [dailyRows] = await dbPool.query<CountRow[]>(
			`SELECT DATE(created_at) as date, COUNT(*) as count
         FROM admission_applications
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
		);

		return {
			total,
			byStatus,
			byUniversity,
			byMajor,
			daily: dailyRows.map((r) => ({
				date: String((r as CountRow).date || ''),
				count: (r as CountRow).count || 0,
			})),
		};
	} catch (err) {
		console.error('[getStatistics] Error:', err);
		throw err;
	}
};

// ──────────────────────────────────────────────
// GET /universities
// ──────────────────────────────────────────────
export const getUniversities = async (): Promise<Array<{ id: number; name: string; code: string }>> => {
	const [rows] = await dbPool.query<RowDataPacket[]>('SELECT id, name, short_name as code FROM schools ORDER BY name');
	return rows.map((r) => ({
		id: Number(r.id),
		name: String(r.name),
		code: String(r.code || ''),
	}));
};

// ──────────────────────────────────────────────
// GET /export/profiles
// ──────────────────────────────────────────────
export const exportProfiles = async (status?: string): Promise<ProfileListItem[]> => {
	let query = `
     SELECT a.id, u.full_name, u.email, u.username, u.phone,
        a.personal_info, a.academic_info, a.status, a.created_at
     FROM admission_applications a
     JOIN users u ON a.user_id = u.id
  `;
	const params: string[] = [];
	if (status && status !== 'ALL') {
		query += ' WHERE a.status = ?';
		params.push(status === 'PENDING' ? 'submitted' : status.toLowerCase());
	}
	query += ' ORDER BY a.id';

	const [rows] = await dbPool.query<AppRow[]>(query, params);
	return rows.map((row) => {
		const personal = parseJson<Record<string, unknown>>(row.personal_info, {});
		const academic = parseJson<Record<string, unknown>>(row.academic_info, {});
		const score = academic.total_score as number | null;
		const priority = academic.priority_score as number | null;
		return {
			id: row.id,
			full_name: (personal.fullName as string) || row.full_name || '',
			email: row.email || '',
			username: row.username || '',
			phone: row.phone || null,
			cccd_number: (personal.citizenId as string) || '',
			status: mapStatus(row.status),
			final_score: score != null && priority != null ? score + priority : score,
			created_at: String(row.created_at || ''),
		};
	});
};
