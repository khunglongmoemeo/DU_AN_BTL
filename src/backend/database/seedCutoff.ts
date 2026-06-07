import { dbPool } from '../config/database';

async function seedCutoffData() {
	try {
	const years = [2026, 2025, 2024];
	const scoreOffsets: Record<number, number> = { 2026: 0, 2025: 0.25, 2024: 0.75 };

		for (const year of years) {
			const offset = scoreOffsets[year];

			const rows = [
				// BKH
				{ university_code: 'BKH', combination_code: 'A00', score: 27.75 - offset, notes: 'Khối A00 - Toán, Lý, Hóa' },
				{ university_code: 'BKH', combination_code: 'A01', score: 28.00 - offset, notes: 'Khối A01 - Toán, Lý, Anh' },
				{ university_code: 'BKH', combination_code: 'D01', score: 29.00 - offset, notes: 'Khối D01 - Toán, Văn, Anh' },
				{ university_code: 'BKH', combination_code: 'C00', score: 27.00 - offset, notes: 'Khối C00 - Văn, Sử, Địa' },
				// NEU
				{ university_code: 'NEU', combination_code: 'A00', score: 27.00 - offset, notes: 'Khối A00 - Toán, Lý, Hóa' },
				{ university_code: 'NEU', combination_code: 'D01', score: 26.50 - offset, notes: 'Khối D01 - Toán, Văn, Anh' },
				{ university_code: 'NEU', combination_code: 'C00', score: 26.00 - offset, notes: 'Khối C00 - Văn, Sử, Địa' },
				// VNU
				{ university_code: 'VNU', combination_code: 'A00', score: 28.25 - offset, notes: 'Khối A00 - Toán, Lý, Hóa' },
				{ university_code: 'VNU', combination_code: 'A01', score: 27.75 - offset, notes: 'Khối A01 - Toán, Lý, Anh' },
				{ university_code: 'VNU', combination_code: 'D01', score: 28.00 - offset, notes: 'Khối D01 - Toán, Văn, Anh' },
				{ university_code: 'VNU', combination_code: 'C00', score: 27.00 - offset, notes: 'Khối C00 - Văn, Sử, Địa' },
				// FTU
				{ university_code: 'FTU', combination_code: 'A00', score: 28.00 - offset, notes: 'Khối A00 - Toán, Lý, Hóa' },
				{ university_code: 'FTU', combination_code: 'D01', score: 27.50 - offset, notes: 'Khối D01 - Toán, Văn, Anh' },
				{ university_code: 'FTU', combination_code: 'C00', score: 27.00 - offset, notes: 'Khối C00 - Văn, Sử, Địa' },
				// PTIT
				{ university_code: 'PTIT', combination_code: 'A00', score: 27.75 - offset, notes: 'Khối A00 - Toán, Lý, Hóa' },
				{ university_code: 'PTIT', combination_code: 'A01', score: 27.50 - offset, notes: 'Khối A01 - Toán, Lý, Anh' },
				{ university_code: 'PTIT', combination_code: 'D01', score: 28.00 - offset, notes: 'Khối D01 - Toán, Văn, Anh' },
			];

			let inserted = 0;
			for (const row of rows) {
				try {
					await dbPool.query(
						`INSERT INTO cutoff_scores (university_id, combination_id, year, score, notes)
						 SELECT u.id, c.id, ?, ?, ?
						 FROM universities u, combinations c
						 WHERE u.code = ? AND c.code = ?`,
						[year, row.score, row.notes, row.university_code, row.combination_code],
					);
					inserted++;
					console.log(`  Inserted ${year}: ${row.university_code} - ${row.combination_code} = ${row.score}`);
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err);
					if (msg.includes('Duplicate')) {
						console.log(`  Skip (duplicate): ${year}: ${row.university_code} - ${row.combination_code}`);
					} else {
						console.error(`  ERROR ${year}: ${row.university_code} - ${row.combination_code}: ${msg}`);
					}
				}
			}
			console.log(`Year ${year}: ${inserted} inserted.`);
		}

		const [rows2] = await dbPool.query('SELECT DISTINCT year FROM cutoff_scores ORDER BY year DESC');
		console.log('\nAvailable years in DB:', (rows2 as Array<{ year: number }>).map((r) => r.year));
		process.exit(0);
	} catch (err) {
		console.error('Failed:', err);
		process.exit(1);
	}
}

seedCutoffData();
