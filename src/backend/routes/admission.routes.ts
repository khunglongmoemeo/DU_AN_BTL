import { Router } from 'express';
import {
	getAdmissionApplicationById,
	getAdmissionApplicationByUserId,
	listAdmissionApplicationsForManager,
	replaceAdmissionWishes,
	reviewAdmissionApplication,
	submitAdmissionApplication,
	updateAdmissionAcademicInfo,
	updateAdmissionDocuments,
	updateAdmissionPersonalInfo,
	uploadAdmissionDocument,
} from '../services/admission.service';
import { AuthenticatedRequest, readBearerToken, verifyAccessToken } from '../utils/jwt';
import type { ApplicationStatus } from '../types/admission';

const router = Router();

router.use((req: AuthenticatedRequest, res, next) => {
	try {
		const token = readBearerToken(req.headers.authorization);

		if (!token) {
			res.status(401).json({
				success: false,
				message: 'Thiếu access token',
			});
			return;
		}

		req.user = verifyAccessToken(token);
		next();
	} catch (error) {
		res.status(401).json({
			success: false,
			message: 'Access token không hợp lệ',
			error: error instanceof Error ? error.message : error,
		});
	}
});

const ensureManager = (req: AuthenticatedRequest, res: any) => {
	if (req.user?.role !== 'manager') {
		res.status(403).json({
			success: false,
			message: 'Bạn không có quyền truy cập tính năng này',
		});
		return false;
	}

	return true;
};

router.get('/me', async (req: AuthenticatedRequest, res) => {
	try {
		const data = await getAdmissionApplicationByUserId(req.user!.id);
		res.json({
			success: true,
			data,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Không thể lấy hồ sơ tuyển sinh',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.put('/personal-info', async (req: AuthenticatedRequest, res) => {
	try {
		const data = await updateAdmissionPersonalInfo(req.user!.id, req.body);
		res.json({
			success: true,
			message: 'Đã cập nhật thông tin cá nhân',
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể cập nhật thông tin cá nhân',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.put('/documents', async (req: AuthenticatedRequest, res) => {
	try {
		const data = await updateAdmissionDocuments(req.user!.id, req.body);
		res.json({
			success: true,
			message: 'Đã cập nhật hồ sơ minh chứng',
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể cập nhật hồ sơ minh chứng',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.post('/documents/upload', async (req: AuthenticatedRequest, res) => {
	try {
		const { key, fileName, contentBase64, mimeType, label } = req.body || {};
		const data = await uploadAdmissionDocument(req.user!.id, key, fileName, contentBase64, mimeType, label);
		res.json({
			success: true,
			message: 'Đã tải tệp lên thành công',
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể tải tệp lên',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.put('/academic-info', async (req: AuthenticatedRequest, res) => {
	try {
		const data = await updateAdmissionAcademicInfo(req.user!.id, req.body);
		res.json({
			success: true,
			message: 'Đã cập nhật thông tin học tập',
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể cập nhật thông tin học tập',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.put('/wishes', async (req: AuthenticatedRequest, res) => {
	try {
		const wishes = Array.isArray(req.body?.wishes) ? req.body.wishes : [];
		const data = await replaceAdmissionWishes(req.user!.id, wishes);
		res.json({
			success: true,
			message: 'Đã cập nhật nguyện vọng xét tuyển',
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể cập nhật nguyện vọng xét tuyển',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.post('/submit', async (req: AuthenticatedRequest, res) => {
	try {
		const data = await submitAdmissionApplication(req.user!.id, Boolean(req.body?.confirmationChecked));
		res.json({
			success: true,
			message: 'Đã nộp hồ sơ thành công',
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể nộp hồ sơ',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.get('/manager/applications', async (req: AuthenticatedRequest, res) => {
	try {
		if (!ensureManager(req, res)) {
			return;
		}

		const status = req.query.status as ApplicationStatus | undefined;
		const data = await listAdmissionApplicationsForManager(status);
		res.json({
			success: true,
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể lấy danh sách hồ sơ',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.get('/manager/applications/:id', async (req: AuthenticatedRequest, res) => {
	try {
		if (!ensureManager(req, res)) {
			return;
		}

		const applicationId = Number(req.params.id);
		const data = await getAdmissionApplicationById(applicationId);
		res.json({
			success: true,
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể lấy chi tiết hồ sơ',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.patch('/manager/applications/:id/status', async (req: AuthenticatedRequest, res) => {
	try {
		if (!ensureManager(req, res)) {
			return;
		}

		const applicationId = Number(req.params.id);
		const { status, rejectionReason } = req.body || {};
		const data = await reviewAdmissionApplication(applicationId, status, rejectionReason);
		res.json({
			success: true,
			message: 'Đã cập nhật trạng thái hồ sơ',
			data,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: 'Không thể cập nhật trạng thái hồ sơ',
			error: error instanceof Error ? error.message : error,
		});
	}
});

export default router;
