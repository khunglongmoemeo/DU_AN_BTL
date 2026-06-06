import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.middleware';
import {
	getProfiles,
	getProfileDetail,
	approveProfile,
	rejectProfile,
	getStatistics,
	getUniversities,
	exportProfiles,
} from '../services/admin.service';

const router = Router();

// Tất cả routes đều yêu cầu manager
router.use(requireAuth, (req: AuthRequest, res, next) => {
	console.log('[Admin] Role check, user:', req.user?.role, req.user?.id);
	if (req.user?.role !== 'manager' && req.user?.role !== 'admin') {
		res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập trang quản lý' });
		return;
	}
	next();
});

// GET /api/admin/profiles
router.get('/profiles', async (req: AuthRequest, res: Response) => {
	try {
		console.log('[Admin] /profiles - user:', req.user?.role, req.user?.id);
		const { status, search, page = '1', pageSize = '10' } = req.query;
		const result = await getProfiles({
			status: status as string,
			search: search as string,
			page: Number(page),
			pageSize: Number(pageSize),
		});
		res.json({ success: true, message: 'OK', data: result });
	} catch (err) {
		console.error('[Admin] /profiles error:', err);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// GET /api/admin/profiles/:id
router.get('/profiles/:id', async (req: AuthRequest, res: Response) => {
	try {
		const id = Number(req.params.id);
		const detail = await getProfileDetail(id);
		if (!detail) {
			return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
		}
		res.json({ success: true, message: 'OK', data: detail });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// PUT /api/admin/profiles/:id/approve
router.put('/profiles/:id/approve', async (req: AuthRequest, res: Response) => {
	try {
		const id = Number(req.params.id);
		await approveProfile(id);
		res.json({ success: true, message: 'Đã duyệt hồ sơ thành công' });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Duyệt hồ sơ thất bại';
		res.status(400).json({ success: false, message });
	}
});

// PUT /api/admin/profiles/:id/reject
router.put('/profiles/:id/reject', async (req: AuthRequest, res: Response) => {
	try {
		const id = Number(req.params.id);
		const { reject_reason } = req.body;
		await rejectProfile(id, reject_reason);
		res.json({ success: true, message: 'Đã từ chối hồ sơ' });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Từ chối thất bại';
		res.status(400).json({ success: false, message });
	}
});

// GET /api/admin/statistics
router.get('/statistics', async (req: AuthRequest, res: Response) => {
	console.log('[Admin] /statistics called, user:', req.user?.role, req.user?.id);
	try {
		const data = await getStatistics();
		res.json({ success: true, message: 'OK', data });
	} catch (err) {
		console.error('[Admin] /statistics error:', err);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// GET /api/admin/universities
router.get('/universities', async (_req: AuthRequest, res: Response) => {
	try {
		const data = await getUniversities();
		res.json({ success: true, message: 'OK', data });
	} catch (err) {
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// GET /api/admin/export/profiles
router.get('/export/profiles', async (req: AuthRequest, res: Response) => {
	try {
		const { status } = req.query;
		const data = await exportProfiles(status as string | undefined);
		res.json({ success: true, message: 'OK', data });
	} catch (err) {
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

export default router;
