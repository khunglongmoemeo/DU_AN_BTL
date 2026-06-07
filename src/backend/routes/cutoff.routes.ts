import { Router } from 'express';
import { dbPool } from '../config/database';
import type mysql from 'mysql2/promise';

const router = Router();

router.get('/', async (req, res) => {
	try {
		const { university_id, year, combination_id } = req.query;

		let query = `
			SELECT
				cs.id,
				cs.university_id,
				u.name        AS university_name,
				u.code        AS university_short,
				cs.combination_id,
				c.code        AS combination_code,
				c.subject_names,
				cs.year,
				cs.score,
				cs.notes
			FROM cutoff_scores cs
			JOIN universities u ON cs.university_id = u.id
			JOIN combinations c ON cs.combination_id = c.id
		`;

		const params: (string | number)[] = [];
		const conditions: string[] = [];

		if (university_id) {
			conditions.push('cs.university_id = ?');
			params.push(Number(university_id));
		}

		if (year) {
			conditions.push('cs.year = ?');
			params.push(Number(year));
		}

		if (combination_id) {
			conditions.push('cs.combination_id = ?');
			params.push(Number(combination_id));
		}

		if (conditions.length > 0) {
			query += ' WHERE ' + conditions.join(' AND ');
		}

		query += ' ORDER BY u.name, c.code';

		const [rows] = await dbPool.query<mysql.RowDataPacket[]>(query, params);

		res.json({
			success: true,
			data: rows,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Không thể lấy danh sách điểm chuẩn',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.get('/universities', async (_req, res) => {
	try {
		const [rows] = await dbPool.query<mysql.RowDataPacket[]>(
			'SELECT id, code, name FROM universities ORDER BY name',
		);

		const data = rows.map((r) => ({
			id: r.id,
			code: r.code,
			name: r.name,
			short_name: r.code,
		}));

		res.json({
			success: true,
			data,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Không thể lấy danh sách trường',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.get('/years', async (_req, res) => {
	try {
		const [rows] = await dbPool.query<mysql.RowDataPacket[]>(
			'SELECT DISTINCT year FROM cutoff_scores ORDER BY year DESC',
		);

		res.json({
			success: true,
			data: rows.map((r) => r.year),
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Không thể lấy danh sách năm',
			error: error instanceof Error ? error.message : error,
		});
	}
});

router.get('/combinations', async (_req, res) => {
	try {
		const [rows] = await dbPool.query<mysql.RowDataPacket[]>(
			'SELECT id, code, subject_names FROM combinations ORDER BY code',
		);

		res.json({
			success: true,
			data: rows,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Không thể lấy danh sách tổ hợp',
			error: error instanceof Error ? error.message : error,
		});
	}
});

export default router;
