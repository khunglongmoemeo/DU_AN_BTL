import mysql from 'mysql2';
import { dbPool } from '../config/database';

// ──────────────────────────────────────────────
// Deterministic fake embedding (keyword-based hash)
// ──────────────────────────────────────────────
function generateFallbackEmbedding(text: string): number[] {
	const dim = 1536;
	const vec = new Array(dim).fill(0);
	const words = text.toLowerCase().split(/\s+/);
	words.forEach((word, wi) => {
		let hash = 0;
		for (let i = 0; i < word.length; i += 1) {
			hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
		}
		const seed = hash + wi * 31337;
		for (let d = 0; d < 16; d += 1) {
			const idx = Math.abs((seed * (d + 1) * 2654435761) >>> 0) % dim;
			vec[idx] += Math.sin(word.length + d) * (1 / (d + 1));
		}
	});
	const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
	return norm > 0 ? vec.map((v) => v / norm) : vec;
}

async function generateRealEmbedding(text: string, apiKey: string): Promise<number[] | null> {
	try {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: 'models/text-embedding-004',
					content: { parts: [{ text }] },
				}),
			},
		);
		if (!response.ok) return null;
		const data = (await response.json()) as { embedding: { values: number[] } };
		return data.embedding.values;
	} catch {
		return null;
	}
}

// ──────────────────────────────────────────────
// Schools definition
// ──────────────────────────────────────────────
const schools = [
	{
		id: 'ptit',
		name: 'Học viện Công nghệ Bưu chính Viễn thông',
		short_name: 'PTIT',
		description: 'Đại học công lập, chuyên ngành CNTT, Viễn thông, ATTT',
		website: 'https://ptit.edu.vn',
		hotline: '0243.768.9968',
		address: 'Km10, Đường Nguyễn Trãi, Q.Hà Đông, Hà Nội',
	},
	{
		id: 'hust',
		name: 'Trường Đại học Bách khoa Hà Nội',
		short_name: 'HUST',
		description: 'Đại học Bách khoa Hà Nội - đại học kỹ thuật hàng đầu Việt Nam',
		website: 'https://hust.edu.vn',
		hotline: '0243.869.2079',
		address: 'Số 1 Đại Cồ Việt, Q.Hai Bà Trưng, Hà Nội',
	},
	{
		id: 'bkhn',
		name: 'Trường Đại học Bách khoa Hà Nội',
		short_name: 'BKHN',
		description: 'Thuộc ĐHBKHN - chuyên ngành kỹ thuật, công nghệ',
		website: 'https://hust.edu.vn',
		hotline: '0243.869.2079',
		address: 'Số 1 Đại Cồ Việt, Q.Hai Bà Trưng, Hà Nội',
	},
	{
		id: 'uit',
		name: 'Trường Đại học Công nghệ Thông tin, ĐHQG TP.HCM',
		short_name: 'UIT',
		description: 'Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
		website: 'https://uit.edu.vn',
		hotline: '028.372.51993',
		address: 'Khu phố 6, P.Linh Trung, TP.Thủ Đức, TP.HCM',
	},
	{
		id: 'vnu',
		name: 'Trường Đại học Quốc gia Hà Nội',
		short_name: 'VNU',
		description: 'Đại học Quốc gia Hà Nội - các trường thành viên',
		website: 'https://vnu.edu.vn',
		hotline: '024.375.47.301',
		address: '19 Lê Thánh Tông, Q.Hoàn Kiếm, Hà Nội',
	},
	{
		id: 'fpt',
		name: 'Trường Đại học FPT',
		short_name: 'FPTU',
		description: 'Trường Đại học FPT - đào tạo CNTT và các ngành công nghệ',
		website: 'https://fpt.edu.vn',
		hotline: '024.7300.1888',
		address: 'Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội',
	},
	{
		id: 'hcmus',
		name: 'Trường Đại học Khoa học Tự nhiên, ĐHQG TP.HCM',
		short_name: 'HCMUS',
		description: 'Trường ĐH Khoa học Tự nhiên - chuyên ngành Toán, Lý, Hóa, Tin học',
		website: 'https://hcmus.edu.vn',
		hotline: '028.383.64494',
		address: '227 Nguyễn Văn Cừ, P.4, Q.5, TP.HCM',
	},
	{
		id: 'tlu',
		name: 'Trường Đại học Thủy lợi',
		short_name: 'TLU',
		description: 'Trường Đại học Thủy lợi - chuyên ngành thủy lợi, công trình, CNTT',
		website: 'https://tlu.edu.vn',
		hotline: '024.385.22201',
		address: '175 Tây Sơn, Q.Đống Đa, Hà Nội',
	},
	{
		id: 'ueb',
		name: 'Trường Đại học Kinh tế - Luật, ĐHQG TP.HCM',
		short_name: 'UEL',
		description: 'Trường Đại học Kinh tế - Luật, ĐHQG TP.HCM',
		website: 'https://uel.edu.vn',
		hotline: '028.372.44550',
		address: 'Khu phố 6, P.Linh Trung, TP.Thủ Đức, TP.HCM',
	},
	{
		id: 'ctu',
		name: 'Trường Đại học Cần Thơ',
		short_name: 'CTU',
		description: 'Trường Đại học Cần Thơ - trường đại học trọng điểm miền Tây',
		website: 'https://ctu.edu.vn',
		hotline: '0292.383.1164',
		address: 'Khu II, đường 3/2, P.Xuân Khánh, Q.Ninh Kiều, TP.Cần Thơ',
	},
];

// ──────────────────────────────────────────────
// Knowledge entries per school
// ──────────────────────────────────────────────
type KnowledgeEntry = { school_id: string; content: string; source: string };
const knowledgeEntries: KnowledgeEntry[] = [
	// ── PTIT ──
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành An toàn thông tin (ATTT) PTIT năm 2025 khối A00 là 27.5 điểm. Khối A01 là 27.0 điểm. Học phí: 28.500.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) PTIT năm 2025 khối A00 là 27.75 điểm. Khối A01 là 27.5 điểm. Khối D01 là 28.0 điểm. Học phí: 27.000.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành Khoa học máy tính (KHMT) PTIT năm 2025 khối A00 là 28.0 điểm. Khối A01 là 27.5 điểm. Học phí: 27.500.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành Kỹ thuật phần mềm (KTPM) PTIT năm 2025 khối A00 là 27.5 điểm. Khối A01 là 27.0 điểm. Khối D01 là 27.75 điểm. Học phí: 27.000.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành Logistics và Quản lý chuỗi cung ứng PTIT năm 2025 khối A00 là 25.5 điểm. Khối D01 là 26.0 điểm. Học phí: 23.500.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành Marketing PTIT năm 2025 khối A00 là 24.5 điểm. Khối D01 là 25.0 điểm. Khối C00 là 25.5 điểm. Học phí: 24.000.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành Truyền thông đa phương tiện (TTDL) PTIT năm 2025 khối A00 là 23.5 điểm. Khối D01 là 24.0 điểm. Học phí: 24.000.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành Kinh tế số PTIT năm 2025 khối A00 là 24.0 điểm. Khối D01 là 25.0 điểm. Học phí: 23.500.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm chuẩn ngành Điện tử - Viễn thông PTIT năm 2025 khối A00 là 24.0 điểm. Khối A01 là 24.5 điểm. Học phí: 24.500.000 VNĐ/năm học.',
		source: 'ptit_diem_chuan_2025.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Phương thức xét tuyển PTIT: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT năm 2025 kết hợp với học bạ lớp 12. Thí sinh cần đạt tổng điểm 3 môn theo tổ hợp xét tuyển >= điểm chuẩn.',
		source: 'ptit_phuong_thuc_tuyen_sinh.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Hạn nộp hồ sơ xét tuyển PTIT năm 2025: từ ngày 01/07/2025 đến ngày 31/08/2025. Thí sinh cần nộp đầy đủ hồ sơ và thanh toán lệ phí xét tuyển trực tuyến.',
		source: 'ptit_han_nop_ho_so.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Hồ sơ cần chuẩn bị xét tuyển PTIT: CCCD/CMND (bản sao công chứng), học bạ lớp 12 (có công chứng), giấy chứng nhận tốt nghiệp tạm thời hoặc bằng tốt nghiệp THPT, ảnh chân dung 3x4, các giấy tờ ưu tiên (nếu có).',
		source: 'ptit_ho_so_can_thiet.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Điểm ưu tiên PTIT: KV1 (miền núi, vùng sâu) được cộng 1.5 điểm; KV2 (nông thôn) được cộng 1.0 điểm; KV3 (thành phố) được cộng 0.5 điểm. Đối tượng ưu tiên 01-08 được cộng thêm theo quy định.',
		source: 'ptit_diem_uu_tien.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Các khối xét tuyển phổ biến tại PTIT: A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh), C00 (Văn, Sử, Địa), B00 (Toán, Hóa, Sinh).',
		source: 'ptit_khoi_xet_tuyen.txt',
	},
	{
		school_id: 'ptit',
		content:
			'PTIT cho phép chuyển ngành trong năm học đầu tiên với điều kiện: điểm trung bình học tập ≥ 2.5/4.0 ở học kỳ 1, không vi phạm kỷ luật, và còn chỉ tiêu ở ngành muốn chuyển sang.',
		source: 'ptit_quy_dinh_chuyen_nganh.txt',
	},
	{
		school_id: 'ptit',
		content:
			'Ký túc xá PTIT có phí từ 800.000 - 1.500.000 VNĐ/tháng tùy loại phòng. Điều kiện đăng ký: sinh viên có hộ khẩu ngoài Hà Nội hoặc có xác nhận khó khăn về chỗ ở.',
		source: 'ptit_ky_tuc_xa.txt',
	},

	// ── HUST / BKHN ──
	{
		school_id: 'hust',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) HUST năm 2025 khối A00 là 28.5 điểm. Khối A01 là 28.0 điểm. Khối D01 là 29.0 điểm. Học phí: 32.000.000 VNĐ/năm học.',
		source: 'hust_diem_chuan_2025.txt',
	},
	{
		school_id: 'hust',
		content:
			'Điểm chuẩn ngành Khoa học máy tính (KHMT) HUST năm 2025 khối A00 là 28.75 điểm. Khối A01 là 28.25 điểm. Học phí: 32.000.000 VNĐ/năm học.',
		source: 'hust_diem_chuan_2025.txt',
	},
	{
		school_id: 'hust',
		content:
			'Điểm chuẩn ngành Kỹ thuật điện tử HUST năm 2025 khối A00 là 27.5 điểm. Khối A01 là 27.0 điểm. Học phí: 30.000.000 VNĐ/năm học.',
		source: 'hust_diem_chuan_2025.txt',
	},
	{
		school_id: 'hust',
		content:
			'Điểm chuẩn ngành Kỹ thuật cơ khí HUST năm 2025 khối A00 là 26.5 điểm. Khối A01 là 26.0 điểm. Học phí: 28.000.000 VNĐ/năm học.',
		source: 'hust_diem_chuan_2025.txt',
	},
	{
		school_id: 'hust',
		content:
			'Điểm chuẩn ngành Kỹ thuật hóa học HUST năm 2025 khối A00 là 26.0 điểm. Khối B00 là 26.5 điểm. Học phí: 28.000.000 VNĐ/năm học.',
		source: 'hust_diem_chuan_2025.txt',
	},
	{
		school_id: 'hust',
		content:
			'HUST tuyển sinh năm 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT (80% chỉ tiêu) và xét tuyển thẳng học sinh giỏi (20% chỉ tiêu).',
		source: 'hust_phuong_thuc_tuyen_sinh.txt',
	},
	{
		school_id: 'hust',
		content:
			'Hạn nộp hồ sơ xét tuyển HUST năm 2025: từ ngày 15/07/2025 đến ngày 31/07/2025. Thí sinh đăng ký xét tuyển trên hệ thống tuyển sinh chung của Bộ.',
		source: 'hust_han_nop_ho_so.txt',
	},

	// ── UIT ──
	{
		school_id: 'uit',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) UIT năm 2025 khối A00 là 27.5 điểm. Khối A01 là 27.0 điểm. Khối D01 là 28.0 điểm. Học phí: 30.000.000 VNĐ/năm học.',
		source: 'uit_diem_chuan_2025.txt',
	},
	{
		school_id: 'uit',
		content:
			'Điểm chuẩn ngành Khoa học máy tính (KHMT) UIT năm 2025 khối A00 là 27.75 điểm. Khối A01 là 27.25 điểm. Học phí: 30.000.000 VNĐ/năm học.',
		source: 'uit_diem_chuan_2025.txt',
	},
	{
		school_id: 'uit',
		content:
			'Điểm chuẩn ngành An toàn thông tin (ATTT) UIT năm 2025 khối A00 là 27.25 điểm. Khối A01 là 26.75 điểm. Học phí: 30.000.000 VNĐ/năm học.',
		source: 'uit_diem_chuan_2025.txt',
	},
	{
		school_id: 'uit',
		content:
			'Điểm chuẩn ngành Truyền thông đa phương tiện (TTĐPT) UIT năm 2025 khối A00 là 25.0 điểm. Khối D01 là 25.5 điểm. Học phí: 25.000.000 VNĐ/năm học.',
		source: 'uit_diem_chuan_2025.txt',
	},
	{
		school_id: 'uit',
		content:
			'UIT (Trường ĐH Công nghệ Thông tin, ĐHQG TP.HCM) xét tuyển năm 2025: Xét điểm thi tốt nghiệp THPT theo tổ hợp môn, ưu tiên thí sinh có chứng chỉ ngoại ngữ quốc tế.',
		source: 'uit_phuong_thuc_tuyen_sinh.txt',
	},
	{
		school_id: 'uit',
		content:
			'Hạn nộp hồ sơ xét tuyển UIT năm 2025: từ ngày 22/07/2025 đến ngày 20/08/2025.',
		source: 'uit_han_nop_ho_so.txt',
	},

	// ── FPT ──
	{
		school_id: 'fpt',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) ĐH FPT năm 2025: xét học bạ, điểm thi THPT từ 18.0 điểm trở lên. Học phí: 45.000.000 VNĐ/năm học.',
		source: 'fpt_diem_chuan_2025.txt',
	},
	{
		school_id: 'fpt',
		content:
			'Điểm chuẩn ngành Kinh doanh số (Digital Business) ĐH FPT năm 2025: xét học bạ từ 18.0 điểm. Học phí: 42.000.000 VNĐ/năm học.',
		source: 'fpt_diem_chuan_2025.txt',
	},
	{
		school_id: 'fpt',
		content:
			'Điểm chuẩn ngành Kỹ thuật phần mềm (KTPM) ĐH FPT năm 2025: xét học bạ từ 18.0 điểm. Học phí: 45.000.000 VNĐ/năm học.',
		source: 'fpt_diem_chuan_2025.txt',
	},
	{
		school_id: 'fpt',
		content:
			'ĐH FPT tuyển sinh năm 2025: xét tuyển dựa trên học bạ lớp 10-12 (60%) và phỏng vấn (40%). Không yêu cầu điểm thi THPT cao. Ưu tiên tiếng Anh đầu vào.',
		source: 'fpt_phuong_thuc_tuyen_sinh.txt',
	},
	{
		school_id: 'fpt',
		content:
			'Hạn nộp hồ sơ xét tuyển ĐH FPT năm 2025: xét tuyển quanh năm, đợt chính thức đến hết ngày 31/08/2025.',
		source: 'fpt_han_nop_ho_so.txt',
	},

	// ── HCMUS ──
	{
		school_id: 'hcmus',
		content:
			'Điểm chuẩn ngành Khoa học máy tính (KHMT) HCMUS năm 2025 khối A00 là 27.25 điểm. Khối A01 là 26.75 điểm. Học phí: 20.000.000 VNĐ/năm học.',
		source: 'hcmus_diem_chuan_2025.txt',
	},
	{
		school_id: 'hcmus',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) HCMUS năm 2025 khối A00 là 27.0 điểm. Khối A01 là 26.5 điểm. Học phí: 20.000.000 VNĐ/năm học.',
		source: 'hcmus_diem_chuan_2025.txt',
	},
	{
		school_id: 'hcmus',
		content:
			'HCMUS tuyển sinh năm 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT, ưu tiên thí sinh có thành tích Olympic, HSG quốc gia.',
		source: 'hcmus_phuong_thuc_tuyen_sinh.txt',
	},

	// ── TLU ──
	{
		school_id: 'tlu',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) ĐH Thủy lợi năm 2025 khối A00 là 24.0 điểm. Khối A01 là 23.5 điểm. Học phí: 22.000.000 VNĐ/năm học.',
		source: 'tlu_diem_chuan_2025.txt',
	},
	{
		school_id: 'tlu',
		content:
			'Điểm chuẩn ngành Công nghệ điện tử, viễn thông ĐH Thủy lợi năm 2025 khối A00 là 23.5 điểm. Khối A01 là 23.0 điểm. Học phí: 22.000.000 VNĐ/năm học.',
		source: 'tlu_diem_chuan_2025.txt',
	},
	{
		school_id: 'tlu',
		content:
			'Điểm chuẩn ngành Kỹ thuật xây dựng ĐH Thủy lợi năm 2025 khối A00 là 22.5 điểm. Khối A01 là 22.0 điểm. Học phí: 20.000.000 VNĐ/năm học.',
		source: 'tlu_diem_chuan_2025.txt',
	},

	// ── UEL ──
	{
		school_id: 'uel',
		content:
			'Điểm chuẩn ngành Kinh tế (Economics) UEL năm 2025 khối A00 là 23.0 điểm. Khối D01 là 23.5 điểm. Học phí: 18.000.000 VNĐ/năm học.',
		source: 'uel_diem_chuan_2025.txt',
	},
	{
		school_id: 'uel',
		content:
			'Điểm chuẩn ngành Luật (Law) UEL năm 2025 khối A00 là 22.5 điểm. Khối C00 là 23.0 điểm. Học phí: 17.000.000 VNĐ/năm học.',
		source: 'uel_diem_chuan_2025.txt',
	},
	{
		school_id: 'uel',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) UEL năm 2025 khối A00 là 24.5 điểm. Khối A01 là 24.0 điểm. Học phí: 20.000.000 VNĐ/năm học.',
		source: 'uel_diem_chuan_2025.txt',
	},

	// ── CTU ──
	{
		school_id: 'ctu',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) ĐH Cần Thơ năm 2025 khối A00 là 24.5 điểm. Khối A01 là 24.0 điểm. Học phí: 16.000.000 VNĐ/năm học.',
		source: 'ctu_diem_chuan_2025.txt',
	},
	{
		school_id: 'ctu',
		content:
			'Điểm chuẩn ngành Kỹ thuật xây dựng ĐH Cần Thơ năm 2025 khối A00 là 22.0 điểm. Khối A01 là 21.5 điểm. Học phí: 14.000.000 VNĐ/năm học.',
		source: 'ctu_diem_chuan_2025.txt',
	},
	{
		school_id: 'ctu',
		content:
			'Điểm chuẩn ngành Nông nghiệp (Agriculture) ĐH Cần Thơ năm 2025 khối A00 là 20.0 điểm. Khối B00 là 20.5 điểm. Học phí: 12.000.000 VNĐ/năm học.',
		source: 'ctu_diem_chuan_2025.txt',
	},
	{
		school_id: 'ctu',
		content:
			'ĐH Cần Thơ tuyển sinh năm 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT. Điểm chuẩn dao động từ 18.0 đến 27.0 tùy ngành và khối.',
		source: 'ctu_phuong_thuc_tuyen_sinh.txt',
	},

	// ── VNU ──
	{
		school_id: 'vnu',
		content:
			'Điểm chuẩn ngành Công nghệ thông tin (CNTT) VNU năm 2025 khối A00 là 28.25 điểm. Khối A01 là 27.75 điểm. Học phí: 35.000.000 VNĐ/năm học.',
		source: 'vnu_diem_chuan_2025.txt',
	},
	{
		school_id: 'vnu',
		content:
			'Điểm chuẩn ngành Luật (Law) VNU năm 2025 khối A00 là 26.5 điểm. Khối C00 là 27.0 điểm. Học phí: 25.000.000 VNĐ/năm học.',
		source: 'vnu_diem_chuan_2025.txt',
	},
	{
		school_id: 'vnu',
		content:
			'Điểm chuẩn ngành Kinh tế (Economics) VNU năm 2025 khối A00 là 26.0 điểm. Khối D01 là 26.5 điểm. Học phí: 25.000.000 VNĐ/năm học.',
		source: 'vnu_diem_chuan_2025.txt',
	},
	{
		school_id: 'vnu',
		content:
			'VNU (ĐHQG Hà Nội) tuyển sinh năm 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT. Ưu tiên học sinh giỏi, học sinh các trường chuyên.',
		source: 'vnu_phuong_thuc_tuyen_sinh.txt',
	},
];

// ──────────────────────────────────────────────
// Main migration
// ──────────────────────────────────────────────
async function migrate() {
	const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
	const USE_REAL_EMBEDDING = GEMINI_API_KEY && GEMINI_API_KEY !== 'demo';
	console.log(`[Migration] Mode: ${USE_REAL_EMBEDDING ? 'REAL (Gemini API)' : 'FALLBACK (keyword hash)'}`);

	try {
		// ── 1. Schools table ──
		await dbPool.query(`
			CREATE TABLE IF NOT EXISTS schools (
				id VARCHAR(50) PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				short_name VARCHAR(50) NOT NULL,
				description TEXT NULL,
				website VARCHAR(255) NULL,
				hotline VARCHAR(50) NULL,
				address TEXT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
		`);

		// Seed schools
		for (const school of schools) {
			await dbPool.query(
				`INSERT IGNORE INTO schools (id, name, short_name, description, website, hotline, address)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[school.id, school.name, school.short_name, school.description, school.website, school.hotline, school.address],
			);
		}
		console.log(`Schools: ${schools.length} seeded.`);

		// ── 2. Add school_id to recruitment_knowledge ──
		await dbPool.query(`
			ALTER TABLE recruitment_knowledge
			ADD COLUMN IF NOT EXISTS school_id VARCHAR(50) NULL,
			ADD INDEX idx_recruitment_knowledge_school (school_id)
		`).catch(() => console.log('  school_id column may already exist or ALTER failed (MySQL version).'));

		// Update existing PTIT entries (those without school_id)
		await dbPool.query(
			`UPDATE recruitment_knowledge SET school_id = 'ptit' WHERE school_id IS NULL AND (
				content LIKE '%PTIT%' OR content LIKE '%Bưu chính%' OR content LIKE '%Viễn thông%'
			)`,
		);

		// ── 3. Seed knowledge entries ──
		console.log(`Seeding ${knowledgeEntries.length} knowledge entries...`);

		let inserted = 0;
		for (const entry of knowledgeEntries) {
			const [existing] = await dbPool.query<mysql.RowDataPacket[]>(
				'SELECT id FROM recruitment_knowledge WHERE content = ? AND school_id = ?',
				[entry.content, entry.school_id],
			);
			if (existing.length > 0) continue;

			let embedding: number[];
			if (USE_REAL_EMBEDDING) {
				process.stdout.write(`  [${entry.school_id}] "${entry.content.slice(0, 40)}..." `);
				const real = await generateRealEmbedding(entry.content, GEMINI_API_KEY);
				if (real) {
					embedding = real;
					console.log('OK');
				} else {
					console.log('FAILED — fallback');
					embedding = generateFallbackEmbedding(entry.content);
				}
			} else {
				embedding = generateFallbackEmbedding(entry.content);
			}

			await dbPool.query(
				'INSERT INTO recruitment_knowledge (school_id, content, embedding, source_file) VALUES (?, ?, ?, ?)',
				[entry.school_id, entry.content, JSON.stringify(embedding), entry.source],
			);
			inserted += 1;
		}

		// ── 4. Verify ──
		const [count] = await dbPool.query<mysql.RowDataPacket[]>(
			'SELECT school_id, COUNT(*) as total FROM recruitment_knowledge WHERE school_id IS NOT NULL GROUP BY school_id',
		);
		const total = (count as Array<{ school_id: string; total: number }>).reduce((s, r) => s + r.total, 0);
		console.log(`\nKnowledge base: ${total} entries across ${(count as Array<{ school_id: string; total: number }>).length} schools.`);
		if (USE_REAL_EMBEDDING) {
			console.log(`New entries inserted this run: ${inserted}`);
		}

		console.log('All migrations completed successfully.');
		process.exit(0);
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	}
}

migrate();
