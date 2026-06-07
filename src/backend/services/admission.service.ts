import fs from 'fs/promises';
import path from 'path';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool } from '../config/database';
import type {
	AdmissionAcademicInfoPayload,
	AdmissionChecklistItem,
	AdmissionDocumentsPayload,
	AdmissionPersonalInfoPayload,
	AdmissionWishPayload,
	ApplicationStatus,
} from '../types/admission';

interface ApplicationRow extends RowDataPacket {
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

interface WishRow extends RowDataPacket {
	id: number;
	priority_order: number;
	school_name: string;
	major_name: string;
	subject_group: string;
}

interface ManagerApplicationRow extends RowDataPacket {
	id: number;
	status: ApplicationStatus;
	submitted_at: Date | null;
	reviewed_at: Date | null;
	rejection_reason: string | null;
	full_name: string;
	email: string;
	username: string;
	phone: string | null;
}

interface AdmissionUserSummary {
	id: number;
	fullName: string;
	email: string;
	username: string;
	phone: string | null;
}

interface StoredAdmissionApplication {
	id: number;
	status: ApplicationStatus;
	personalInfo: Partial<AdmissionPersonalInfoPayload>;
	academicInfo: Partial<AdmissionAcademicInfoPayload>;
	documentsInfo: AdmissionDocumentsPayload;
	wishes: Array<{ id: number; school: string; major: string; group: string }>;
	confirmationChecked: boolean;
	submittedAt: Date | null;
	reviewedAt: Date | null;
	rejectionReason: string | null;
	checklist: AdmissionChecklistItem[];
	user?: AdmissionUserSummary;
}

const UPLOADS_ROOT = path.join(process.cwd(), 'src', 'backend', 'uploads', 'admission');
const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const parseJson = <T>(value: string | object | null, fallback: T): T => {
	if (!value) {
		return fallback;
	}
	if (typeof value === 'object') {
		return value as T;
	}
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
};

const ensureApplication = async (userId: number) => {
	const [rows] = await dbPool.query<ApplicationRow[]>('SELECT * FROM admission_applications WHERE user_id = ? LIMIT 1', [userId]);

	if (rows.length > 0) {
		return rows[0].id;
	}

	const [result] = await dbPool.query<ResultSetHeader>(
		'INSERT INTO admission_applications (user_id, status, documents_info) VALUES (?, ?, ?)',
		[
			userId,
			'draft',
			JSON.stringify({
				items: [
					{ key: 'cccd_front', label: 'CCCD mặt trước', status: 'missing' },
					{ key: 'cccd_back', label: 'CCCD mặt sau', status: 'missing' },
					{ key: 'portrait', label: 'Ảnh chân dung', status: 'missing' },
				],
			}),
		],
	);
	return result.insertId;
};

const buildChecklist = (
	personalInfo: Partial<AdmissionPersonalInfoPayload>,
	documentsInfo: AdmissionDocumentsPayload,
	academicInfo: Partial<AdmissionAcademicInfoPayload>,
	wishes: AdmissionWishPayload[],
): AdmissionChecklistItem[] => {
	const hasPersonalInfo = Boolean(
		personalInfo.fullName &&
			personalInfo.phone &&
			personalInfo.citizenId &&
			personalInfo.birthday &&
			personalInfo.gender &&
			personalInfo.ethnicity &&
			personalInfo.address,
	);
	const hasDocuments = ['cccd_front', 'cccd_back', 'portrait'].every((key) =>
		documentsInfo.items.some((item) => item.key === key && item.fileName && item.status === 'done'),
	);
	const hasAcademicInfo = Boolean(
		academicInfo.graduationYear &&
			academicInfo.grade12AcademicPerformance &&
			academicInfo.grade12Conduct &&
			academicInfo.grade10Province &&
			academicInfo.grade10School &&
			academicInfo.grade11Province &&
			academicInfo.grade11School &&
			academicInfo.grade12Province &&
			academicInfo.grade12School &&
			academicInfo.priorityArea &&
			academicInfo.priorityGroup,
	);
	const hasWishes = wishes.length > 0;

	return [
		{
			key: 'personal',
			label: 'Thông tin cá nhân',
			done: hasPersonalInfo,
			detail: hasPersonalInfo ? undefined : 'Chưa hoàn thành thông tin cá nhân',
			step: 0,
		},
		{
			key: 'documents',
			label: 'Hồ sơ minh chứng',
			done: hasDocuments,
			detail: hasDocuments ? undefined : 'Chưa tải đủ CCCD mặt trước, CCCD mặt sau và ảnh chân dung',
			step: 1,
		},
		{
			key: 'academic',
			label: 'Thông tin học tập',
			done: hasAcademicInfo,
			detail: hasAcademicInfo ? undefined : 'Chưa hoàn thành thông tin học tập',
			step: 2,
		},
		{
			key: 'wishes',
			label: 'Nguyện vọng xét tuyển',
			done: hasWishes,
			detail: hasWishes ? undefined : 'Chưa thêm nguyện vọng xét tuyển',
			step: 3,
		},
	];
};

const mapApplication = async (application: ApplicationRow, includeUser = false): Promise<StoredAdmissionApplication> => {
	const [wishRows] = await dbPool.query<WishRow[]>(
		'SELECT id, priority_order, school_name, major_name, subject_group FROM admission_wishes WHERE application_id = ? ORDER BY priority_order ASC',
		[application.id],
	);

	const personalInfo = parseJson<Partial<AdmissionPersonalInfoPayload>>(application.personal_info, {});
	const academicInfo = parseJson<Partial<AdmissionAcademicInfoPayload>>(application.academic_info, {});
	const documentsInfo = parseJson<AdmissionDocumentsPayload>(application.documents_info, { items: [] });
	const wishes = wishRows.map((wish) => ({
		id: wish.id,
		school: wish.school_name,
		major: wish.major_name,
		group: wish.subject_group,
	}));
	const checklist = buildChecklist(personalInfo, documentsInfo, academicInfo, wishes);

	return {
		id: application.id,
		status: application.status,
		personalInfo,
		academicInfo,
		documentsInfo,
		wishes,
		confirmationChecked: Boolean(application.confirmation_checked),
		submittedAt: application.submitted_at,
		reviewedAt: application.reviewed_at,
		rejectionReason: application.rejection_reason,
		checklist,
		user: includeUser
			? {
					id: application.user_id,
					fullName: application.full_name || '',
					email: application.email || '',
					username: application.username || '',
					phone: application.phone || null,
			  }
			: undefined,
	};
};

const getApplicationRowById = async (applicationId: number) => {
	const [applicationRows] = await dbPool.query<ApplicationRow[]>('SELECT * FROM admission_applications WHERE id = ? LIMIT 1', [applicationId]);

	if (applicationRows.length === 0) {
		throw new Error('Không tìm thấy hồ sơ tuyển sinh');
	}

	return applicationRows[0];
};

const getApplicationRowByUserId = async (userId: number) => {
	const applicationId = await ensureApplication(userId);
	return getApplicationRowById(applicationId);
};

const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

const getUploadExtension = (fileName: string, mimeType: string) => {
	const extFromName = path.extname(fileName).toLowerCase();
	if (extFromName) {
		return extFromName;
	}
	if (mimeType === 'image/jpeg') return '.jpg';
	if (mimeType === 'image/png') return '.png';
	if (mimeType === 'application/pdf') return '.pdf';
	return '';
};

const upsertDocumentInfo = (payload: AdmissionDocumentsPayload, key: string, patch: Record<string, unknown>) => {
	const items = Array.isArray(payload.items) ? [...payload.items] : [];
	const existingIndex = items.findIndex((item) => item.key === key);

	if (existingIndex >= 0) {
		items[existingIndex] = {
			...items[existingIndex],
			...patch,
		};
	} else {
		items.push({
			key,
			label: key,
			...patch,
		});
	}

	return { items };
};

export const getAdmissionApplicationByUserId = async (userId: number) => {
	const application = await getApplicationRowByUserId(userId);
	return mapApplication(application);
};

export const getAdmissionApplicationById = async (applicationId: number) => {
	const [rows] = await dbPool.query<ApplicationRow[]>(
		`SELECT
			applications.*,
			users.full_name,
			users.email,
			users.username,
			users.phone
		FROM admission_applications applications
		JOIN users ON users.id = applications.user_id
		WHERE applications.id = ?
		LIMIT 1`,
		[applicationId],
	);

	if (rows.length === 0) {
		throw new Error('Không tìm thấy hồ sơ tuyển sinh');
	}

	return mapApplication(rows[0], true);
};

export const updateAdmissionPersonalInfo = async (userId: number, payload: AdmissionPersonalInfoPayload) => {
	const applicationId = await ensureApplication(userId);
	const [userRows] = await dbPool.query<RowDataPacket[]>('SELECT full_name, phone FROM users WHERE id = ? LIMIT 1', [userId]);
	const currentUser = userRows[0] || {};
	const normalizedPayload = {
		...payload,
		fullName: payload.fullName || currentUser.full_name || '',
		phone: payload.phone || currentUser.phone || '',
	};

	if (!normalizedPayload.fullName) {
		throw new Error('Thiếu họ và tên');
	}

	await dbPool.query('UPDATE admission_applications SET personal_info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
		JSON.stringify(normalizedPayload),
		applicationId,
	]);

	await dbPool.query('UPDATE users SET full_name = ?, phone = ? WHERE id = ?', [normalizedPayload.fullName, normalizedPayload.phone || null, userId]);

	return getAdmissionApplicationByUserId(userId);
};

export const updateAdmissionDocuments = async (userId: number, payload: AdmissionDocumentsPayload) => {
	const applicationId = await ensureApplication(userId);

	await dbPool.query('UPDATE admission_applications SET documents_info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
		JSON.stringify(payload),
		applicationId,
	]);

	return getAdmissionApplicationByUserId(userId);
};

export const uploadAdmissionDocument = async (
	userId: number,
	key: string,
	fileName: string,
	contentBase64: string,
	mimeType: string,
	label?: string,
) => {
	if (!key || !fileName || !contentBase64 || !mimeType) {
		throw new Error('Thông tin tệp tải lên không đầy đủ');
	}

	if (!ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType)) {
		throw new Error('Định dạng tệp không được hỗ trợ');
	}

	const buffer = Buffer.from(contentBase64, 'base64');
	if (buffer.byteLength === 0) {
		throw new Error('Nội dung tệp tải lên không hợp lệ');
	}
	if (buffer.byteLength > MAX_UPLOAD_BYTES) {
		throw new Error('Dung lượng tệp vượt quá 5MB');
	}

	const application = await getApplicationRowByUserId(userId);
	const currentDocuments = parseJson<AdmissionDocumentsPayload>(application.documents_info, { items: [] });
	const safeFileName = sanitizeFileName(fileName);
	const extension = getUploadExtension(safeFileName, mimeType);
	const targetDir = path.join(UPLOADS_ROOT, String(userId));
	const savedFileName = `${key}-${Date.now()}${extension}`;

	await fs.mkdir(targetDir, { recursive: true });
	await fs.writeFile(path.join(targetDir, savedFileName), buffer);

	const fileUrl = `/uploads/admission/${userId}/${savedFileName}`;
	const nextDocuments = upsertDocumentInfo(currentDocuments, key, {
		key,
		label: label || key,
		fileName: safeFileName,
		fileUrl,
		size: buffer.byteLength,
		status: 'done',
	});

	await dbPool.query('UPDATE admission_applications SET documents_info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
		JSON.stringify(nextDocuments),
		application.id,
	]);

	return {
		fileName: safeFileName,
		fileUrl,
		size: buffer.byteLength,
		status: 'done',
	};
};

export const updateAdmissionAcademicInfo = async (userId: number, payload: AdmissionAcademicInfoPayload) => {
	const applicationId = await ensureApplication(userId);

	await dbPool.query('UPDATE admission_applications SET academic_info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
		JSON.stringify(payload),
		applicationId,
	]);

	return getAdmissionApplicationByUserId(userId);
};

export const replaceAdmissionWishes = async (userId: number, wishes: AdmissionWishPayload[]) => {
	const applicationId = await ensureApplication(userId);

	await dbPool.query('DELETE FROM admission_wishes WHERE application_id = ?', [applicationId]);

	for (let index = 0; index < wishes.length; index += 1) {
		const wish = wishes[index];
		await dbPool.query<ResultSetHeader>(
			'INSERT INTO admission_wishes (application_id, priority_order, school_name, major_name, subject_group) VALUES (?, ?, ?, ?, ?)',
			[applicationId, index + 1, wish.school, wish.major, wish.group],
		);
	}

	return getAdmissionApplicationByUserId(userId);
};

export const submitAdmissionApplication = async (userId: number, confirmationChecked: boolean) => {
	const application = await getAdmissionApplicationByUserId(userId);

	const hasMissingChecklist = application.checklist.some((item) => !item.done);
	if (hasMissingChecklist) {
		throw new Error('Hồ sơ còn thiếu thông tin, chưa thể nộp');
	}

	if (!confirmationChecked) {
		throw new Error('Bạn cần xác nhận thông tin trước khi nộp');
	}

	await dbPool.query(
		`UPDATE admission_applications
		 SET status = ?, confirmation_checked = ?, submitted_at = CURRENT_TIMESTAMP, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE user_id = ?`,
		['submitted', 1, userId],
	);

	return getAdmissionApplicationByUserId(userId);
};

export const listAdmissionApplicationsForManager = async (status?: ApplicationStatus) => {
	const params: unknown[] = [];
	let query = `
		SELECT
			applications.id,
			applications.status,
			applications.submitted_at,
			applications.reviewed_at,
			applications.rejection_reason,
			users.full_name,
			users.email,
			users.username,
			users.phone
		FROM admission_applications applications
		JOIN users ON users.id = applications.user_id
	`;

	if (status) {
		query += ' WHERE applications.status = ?';
		params.push(status);
	}

	query += ' ORDER BY applications.updated_at DESC, applications.id DESC';

	const [rows] = await dbPool.query<ManagerApplicationRow[]>(query, params);
	return rows.map((row) => ({
		id: row.id,
		status: row.status,
		submittedAt: row.submitted_at,
		reviewedAt: row.reviewed_at,
		rejectionReason: row.rejection_reason,
		student: {
			fullName: row.full_name,
			email: row.email,
			username: row.username,
			phone: row.phone,
		},
	}));
};

export const reviewAdmissionApplication = async (applicationId: number, status: ApplicationStatus, rejectionReason?: string) => {
	const reviewableStatuses: ApplicationStatus[] = ['reviewing', 'approved', 'rejected', 'needs_revision'];
	if (!reviewableStatuses.includes(status)) {
		throw new Error('Trạng thái cập nhật không hợp lệ');
	}

	if ((status === 'rejected' || status === 'needs_revision') && !rejectionReason?.trim()) {
		throw new Error('Cần nhập lý do khi từ chối hoặc yêu cầu bổ sung');
	}

	await getApplicationRowById(applicationId);

	await dbPool.query(
		`UPDATE admission_applications
		 SET status = ?, rejection_reason = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ?`,
		[status, rejectionReason?.trim() || null, applicationId],
	);

	return getAdmissionApplicationById(applicationId);
};
