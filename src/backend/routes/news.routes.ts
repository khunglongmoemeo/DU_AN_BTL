import { Router } from 'express';
import { getAllNews, getLatestNews, getNewsById } from '../services/news.service';

const router = Router();

router.get('/', (_req, res) => {
	const news = getAllNews();
	res.json({ success: true, data: news });
});

router.get('/latest', (_req, res) => {
	const limit = parseInt(_req.query.limit as string, 10) || 6;
	const news = getLatestNews(limit);
	res.json({ success: true, data: news });
});

router.get('/:id', (req, res) => {
	const id = parseInt(req.params.id, 10);
	if (isNaN(id)) {
		res.status(400).json({ success: false, error: 'ID không hợp lệ' });
		return;
	}

	const news = getNewsById(id);
	if (!news) {
		res.status(404).json({ success: false, error: 'Không tìm thấy tin tức' });
		return;
	}

	res.json({ success: true, data: news });
});

export default router;
