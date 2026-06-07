import mysql from 'mysql2';
import { dbPool } from '../config/database';
import type {
	ChatMessage,
	KnowledgeChunk,
	PotentialStudent,
	NERExtractedData,
} from '../types/ai';

// ──────────────────────────────────────────────
// Cấu hình môi trường
// ──────────────────────────────────────────────
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama'; // 'ollama' | 'gemini' | 'openai' | 'demo'
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || OPENAI_API_KEY;
const MAX_HISTORY_PAIRS = Number(process.env.MAX_HISTORY_PAIRS) || 10;
const TOP_K_CHUNKS = Number(process.env.TOP_K_CHUNKS) || 5;

// ──────────────────────────────────────────────
// Prompt hệ thống — Persona + Nguyên tắc phản hồi
// ──────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn tuyển sinh của Trường Đại học PTIT (Học viện Post, Telecom and Information).
Hãy xưng hô thân thiện: gọi thí sinh là "em", tự xưng là "mình".
Nhiệm vụ: Tư vấn chính xác về điểm chuẩn, học phí, ngành học, phương thức xét tuyển, hồ sơ cần chuẩn bị.

Nguyên tắc tuyệt đối:
- CHỈ trả lời dựa trên thông tin được cung cấp trong Context. Không bịa đặt điểm chuẩn, học phí.
- KHÔNG trả lời các câu hỏi chính trị, tôn giáo, hoặc yêu cầu giải bài tập thay.
- Nếu không có thông tin trong Context, hãy nói: "Hiện tại mình chưa có thông tin chính xác về vấn đề này. Em có thể liên hệ Phòng Đào tạo qua hotline để được hỗ trợ nhé."
- Khi phát hiện thí sinh gặp sự cố (mất giấy tờ, lỗi nộp lệ phí, than phiền), hãy báo hiệu để chuyển giao cho tư vấn viên.

Trả lời ngắn gọn, dễ hiểu, có emoji phù hợp. LUÔN dùng dấu tiếng Việt đầy đủ (á, ắ, ê, ô, ơ, ư, đ) trong mọi câu trả lời. KHÔNG viết không dấu.`;

// ──────────────────────────────────────────────
// Prompt phân loại ý định (Intent routing)
// ──────────────────────────────────────────────
const INTENT_PROMPT = `Bạn là bộ phân loại ý định (Intent Router) cho chatbot tuyển sinh.
Phân tích câu hỏi sau và trả về JSON với 2 trường:
- "intent": một trong các giá trị: "admission_info" | "technical_issue" | "emotional" | "small_talk" | "off_topic"
- "should_handoff": true nếu câu hỏi mang tính sự cố, than phiền, cần con người can thiệp; false trong các trường hợp còn lại.

Câu hỏi: {user_message}

Chỉ trả về JSON, không giải thích thêm.`;

// ──────────────────────────────────────────────
// Prompt trích xuất thông tin thí sinh (NER)
// ──────────────────────────────────────────────
const NER_PROMPT = `Bạn là bộ trích xuất thông tin thí sinh (NER) cho hệ thống tuyển sinh.
Từ câu hội thoại sau, trích xuất thông tin thí sinh nếu có.
Trả về JSON với các trường:
- "student_name": họ và tên thí sinh (nếu có)
- "score": điểm thi (số thập phân,VD: 26.5) (nếu có)
- "subject_group": khối thi (VD: A00, A01, D01) (nếu có)
- "target_major": ngành muốn xét tuyển (VD: Công nghệ thông tin) (nếu có)
- "phone": số điện thoại (nếu có)
- "email": email (nếu có)

Nếu không trích xuất được gì, trả về JSON rỗng: {{}}

Hội thoại: {conversation}

Chỉ trả về JSON, không giải thích thêm.`;

// ──────────────────────────────────────────────
// 1. Tạo embedding vector
// ──────────────────────────────────────────────
export const generateEmbedding = async (text: string): Promise<number[]> => {
	// ── Embedding bằng Ollama ──
	if (LLM_PROVIDER === 'ollama') {
		try {
			const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
			});
			if (response.ok) {
				const data = (await response.json()) as { embedding: number[] };
				return data.embedding;
			}
		} catch {
		// Ollama không khả dụng, chuyển sang provider khác
		}
	}

	// ── Embedding bằng Gemini (có retry) ──
	if (GEMINI_API_KEY && GEMINI_API_KEY !== 'demo') {
		for (let attempt = 0; attempt < 3; attempt += 1) {
			try {
				const response = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: `models/${GEMINI_EMBEDDING_MODEL}`,
							content: { parts: [{ text }] },
						}),
					},
				);

				if (response.ok) {
					const data = (await response.json()) as { embedding: { values: number[] } };
					return data.embedding.values;
				}

			// 429 = rate limit, đợi và thử lại
				if (response.status === 429 && attempt < 2) {
					await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
					continue;
				}
				break; // lỗi không thể thử lại
			} catch (error) {
				console.warn(`[AI Service] Gemini embedding attempt ${attempt + 1} failed:`, (error as Error).message);
			}
		}
	}

	// ── Embedding bằng OpenAI ──
	if (EMBEDDING_API_KEY && EMBEDDING_API_KEY !== 'demo') {
		try {
			const response = await fetch('https://api.openai.com/v1/embeddings', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${EMBEDDING_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
			});

			if (response.ok) {
				const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
				return data.data[0]?.embedding || [];
			}
		} catch (error) {
			console.warn('[AI Service] OpenAI embedding failed:', (error as Error).message);
		}
	}

	// ── Fallback: trả về rỗng (bỏ qua RAG, dùng demo mode) ──
	return [];
};

// ──────────────────────────────────────────────
// 2. Tính độ tương đồng cosine (tính tại app)
// ──────────────────────────────────────────────
export const cosineSimilarity = (a: number[], b: number[]): number => {
	if (a.length !== b.length) return 0;
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i += 1) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// ──────────────────────────────────────────────
// 2b. Cơ sở tri thức mẫu (fallback khi không có embedding)
// ──────────────────────────────────────────────
type KnowledgeItem = { school_id: string; content: string };
const DEMO_KNOWLEDGE: KnowledgeItem[] = [
	// PTIT
	{ school_id: 'ptit', content: 'Điểm chuẩn ngành An toàn thông tin (ATTT) PTIT năm 2025 khối A00 là 27.5 điểm. Khối A01 là 27.0 điểm. Học phí: 28.500.000 VNĐ/năm học.' },
	{ school_id: 'ptit', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) PTIT năm 2025 khối A00 là 27.75 điểm. Khối A01 là 27.5 điểm. Khối D01 là 28.0 điểm. Học phí: 27.000.000 VNĐ/năm học.' },
	{ school_id: 'ptit', content: 'Điểm chuẩn ngành Khoa học máy tính (KHMT) PTIT năm 2025 khối A00 là 28.0 điểm. Khối A01 là 27.5 điểm. Học phí: 27.500.000 VNĐ/năm học.' },
	{ school_id: 'ptit', content: 'Điểm chuẩn ngành Kỹ thuật phần mềm (KTPM) PTIT năm 2025 khối A00 là 27.5 điểm. Khối A01 là 27.0 điểm. Học phí: 27.000.000 VNĐ/năm học.' },
	{ school_id: 'ptit', content: 'Điểm chuẩn ngành Logistics và Quản lý chuỗi cung ứng PTIT năm 2025 khối A00 là 25.5 điểm. Học phí: 23.500.000 VNĐ/năm học.' },
	{ school_id: 'ptit', content: 'Điểm chuẩn ngành Marketing PTIT năm 2025 khối A00 là 24.5 điểm. Học phí: 24.000.000 VNĐ/năm học.' },
	{ school_id: 'ptit', content: 'Điểm chuẩn ngành Truyền thông đa phương tiện (TTDL) PTIT năm 2025 khối A00 là 23.5 điểm. Học phí: 24.000.000 VNĐ/năm học.' },
	{ school_id: 'ptit', content: 'Điểm chuẩn ngành Điện tử - Viễn thông PTIT năm 2025 khối A00 là 24.0 điểm. Học phí: 24.500.000 VNĐ/năm học.' },
	{ school_id: 'ptit', content: 'Phương thức xét tuyển PTIT: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT kết hợp học bạ lớp 12.' },
	{ school_id: 'ptit', content: 'Hạn nộp hồ sơ xét tuyển PTIT năm 2025: từ ngày 01/07/2025 đến ngày 31/08/2025.' },
	{ school_id: 'ptit', content: 'Điểm ưu tiên PTIT: KV1 cộng 1.5 điểm; KV2 cộng 1.0 điểm; KV3 cộng 0.5 điểm.' },
	{ school_id: 'ptit', content: 'Ký túc xá PTIT có phí từ 800.000 - 1.500.000 VNĐ/tháng tùy loại phòng.' },
	{ school_id: 'ptit', content: 'PTIT cho phép chuyển ngành trong năm học đầu tiên với điều kiện điểm TB ≥ 2.5/4.0 ở HK1.' },
	// HUST
	{ school_id: 'hust', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) HUST năm 2025 khối A00 là 28.5 điểm. Khối A01 là 28.0 điểm. Học phí: 32.000.000 VNĐ/năm học.' },
	{ school_id: 'hust', content: 'Điểm chuẩn ngành Khoa học máy tính (KHMT) HUST năm 2025 khối A00 là 28.75 điểm. Khối A01 là 28.25 điểm. Học phí: 32.000.000 VNĐ/năm học.' },
	{ school_id: 'hust', content: 'Điểm chuẩn ngành Kỹ thuật điện tử HUST năm 2025 khối A00 là 27.5 điểm. Khối A01 là 27.0 điểm. Học phí: 30.000.000 VNĐ/năm học.' },
	{ school_id: 'hust', content: 'Điểm chuẩn ngành Kỹ thuật cơ khí HUST năm 2025 khối A00 là 26.5 điểm. Học phí: 28.000.000 VNĐ/năm học.' },
	{ school_id: 'hust', content: 'HUST tuyển sinh năm 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT (80%) và xét tuyển thẳng học sinh giỏi (20%).' },
	{ school_id: 'hust', content: 'Hạn nộp hồ sơ xét tuyển HUST năm 2025: từ ngày 15/07/2025 đến ngày 31/07/2025.' },
	// UIT
	{ school_id: 'uit', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) UIT năm 2025 khối A00 là 27.5 điểm. Khối A01 là 27.0 điểm. Học phí: 30.000.000 VNĐ/năm học.' },
	{ school_id: 'uit', content: 'Điểm chuẩn ngành Khoa học máy tính (KHMT) UIT năm 2025 khối A00 là 27.75 điểm. Học phí: 30.000.000 VNĐ/năm học.' },
	{ school_id: 'uit', content: 'Điểm chuẩn ngành An toàn thông tin (ATTT) UIT năm 2025 khối A00 là 27.25 điểm. Học phí: 30.000.000 VNĐ/năm học.' },
	{ school_id: 'uit', content: 'UIT xét tuyển năm 2025: Xét điểm thi tốt nghiệp THPT, ưu tiên chứng chỉ ngoại ngữ quốc tế. Hạn nộp: 22/07 - 20/08/2025.' },
	// FPT
	{ school_id: 'fpt', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) ĐH FPT năm 2025: xét học bạ từ 18.0 điểm. Học phí: 45.000.000 VNĐ/năm học.' },
	{ school_id: 'fpt', content: 'ĐH FPT tuyển sinh năm 2025: xét học bạ lớp 10-12 (60%) và phỏng vấn (40%). Ưu tiên tiếng Anh đầu vào.' },
	// HCMUS
	{ school_id: 'hcmus', content: 'Điểm chuẩn ngành Khoa học máy tính (KHMT) HCMUS năm 2025 khối A00 là 27.25 điểm. Học phí: 20.000.000 VNĐ/năm học.' },
	{ school_id: 'hcmus', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) HCMUS năm 2025 khối A00 là 27.0 điểm. Học phí: 20.000.000 VNĐ/năm học.' },
	// TLU
	{ school_id: 'tlu', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) ĐH Thủy lợi năm 2025 khối A00 là 24.0 điểm. Học phí: 22.000.000 VNĐ/năm học.' },
	// UEL
	{ school_id: 'uel', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) UEL năm 2025 khối A00 là 24.5 điểm. Học phí: 20.000.000 VNĐ/năm học.' },
	{ school_id: 'uel', content: 'Điểm chuẩn ngành Kinh tế UEL năm 2025 khối A00 là 23.0 điểm. Học phí: 18.000.000 VNĐ/năm học.' },
	// CTU
	{ school_id: 'ctu', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) ĐH Cần Thơ năm 2025 khối A00 là 24.5 điểm. Học phí: 16.000.000 VNĐ/năm học.' },
	{ school_id: 'ctu', content: 'Điểm chuẩn ngành Kỹ thuật xây dựng ĐH Cần Thơ năm 2025 khối A00 là 22.0 điểm. Học phí: 14.000.000 VNĐ/năm học.' },
	// VNU
	{ school_id: 'vnu', content: 'Điểm chuẩn ngành Công nghệ thông tin (CNTT) VNU năm 2025 khối A00 là 28.25 điểm. Học phí: 35.000.000 VNĐ/năm học.' },
	{ school_id: 'vnu', content: 'Điểm chuẩn ngành Luật VNU năm 2025 khối A00 là 26.5 điểm. Học phí: 25.000.000 VNĐ/năm học.' },
];

// ──────────────────────────────────────────────
// 2c. Tri thức hồ sơ & phương thức xét tuyển
// ──────────────────────────────────────────────
const DEMO_KNOWLEDGE_DOCS: Record<string, string> = {
	ptit: 'Hồ sơ xét tuyển PTIT gồm: (1) Đơn đăng ký xét tuyển (theo mẫu của trường), (2) CCCD/CMND bản sao công chứng, (3) Học bạ THPT bản sao công chứng, (4) Giấy chứng nhận tốt nghiệp THPT tạm thời hoặc bằng tốt nghiệp (bản sao), (5) Ảnh chân dung 3x4 (02 cái), (6) Giấy tờ ưu tiên (nếu có: hộ khẩu, chứng nhận khuyết tật, diện đối tượng ưu tiên).',
	hust: 'Hồ sơ xét tuyển HUST gồm: (1) Phiếu đăng ký xét tuyển (theo mẫu trường), (2) CCCD/CMND bản sao công chứng, (3) Học bạ lớp 12 (bản sao có công chứng), (4) Giấy chứng nhận tốt nghiệp tạm thời hoặc bằng tốt nghiệp (bản sao), (5) Ảnh 3x4 (02 cái), (6) Các chứng chỉ ưu tiên (nếu có).',
	uit: 'Hồ sơ xét tuyển UIT gồm: (1) Phiếu đăng ký xét tuyển trực tuyến, (2) CCCD/CMND bản sao, (3) Học bạ lớp 12 có công chứng, (4) Giấy chứng nhận tốt nghiệp tạm thời, (5) Ảnh 3x4 (02 cái), (6) Chứng chỉ ngoại ngữ quốc tế (nếu có để được ưu tiên).',
	fpt: 'Hồ sơ xét tuyển ĐH FPT gồm: (1) Phiếu đăng ký xét tuyển, (2) CCCD/CMND bản sao, (3) Học bạ lớp 10, 11, 12 (bản sao có công chứng), (4) Bằng tốt nghiệp hoặc giấy chứng nhận tốt nghiệp tạm thời, (5) Chứng chỉ tiếng Anh (IELTS, TOEFL iBT...) nếu có.',
	hcmus: 'Hồ sơ xét tuyển HCMUS gồm: (1) Phiếu đăng ký xét tuyển (theo mẫu ĐHQG TP.HCM), (2) CCCD/CMND bản sao, (3) Học bạ THPT bản sao có công chứng, (4) Giấy chứng nhận tốt nghiệp tạm thời, (5) Ảnh 3x4.',
	vnu: 'Hồ sơ xét tuyển VNU gồm: (1) Phiếu đăng ký xét tuyển theo mẫu ĐHQG Hà Nội, (2) CCCD/CMND bản sao, (3) Học bạ lớp 12 có công chứng, (4) Giấy chứng nhận tốt nghiệp tạm thời hoặc bằng tốt nghiệp, (5) Ảnh 3x4 (02 cái).',
	tlu: 'Hồ sơ xét tuyển ĐH Thủy lợi gồm: (1) Phiếu đăng ký xét tuyển, (2) CCCD/CMND bản sao, (3) Học bạ THPT bản sao có công chứng, (4) Giấy chứng nhận tốt nghiệp tạm thời, (5) Ảnh 3x4 (02 cái).',
	uel: 'Hồ sơ xét tuyển UEL gồm: (1) Phiếu đăng ký xét tuyển (theo mẫu trường), (2) CCCD/CMND bản sao công chứng, (3) Học bạ lớp 12 bản sao có công chứng, (4) Giấy chứng nhận tốt nghiệp tạm thời, (5) Ảnh 3x4.',
	ctu: 'Hồ sơ xét tuyển ĐH Cần Thơ gồm: (1) Phiếu đăng ký xét tuyển trực tuyến, (2) CCCD/CMND bản sao, (3) Học bạ THPT có công chứng, (4) Giấy chứng nhận tốt nghiệp tạm thời, (5) Ảnh 3x4 (02 cái).',
};

const DEMO_KNOWLEDGE_METHODS: Record<string, string> = {
	ptit: 'Phương thức xét tuyển PTIT 2025 gồm: (1) Xét tuyển dựa trên kết quả thi tốt nghiệp THPT năm 2025 (phương thức chính, chiếm khoảng 60% chỉ tiêu), (2) Xét tuyển dựa trên kết quả học bạ lớp 12 (điểm trung bình 3 năm THPT), (3) Xét tuyển thẳng cho thí sinh đạt giải quốc gia, quốc tế hoặc học sinh giỏi cấp tỉnh. Thí sinh có thể đăng ký xét tuyển online qua cổng thông tin của trường.',
	hust: 'Phương thức xét tuyển HUST 2025 gồm: (1) Xét tuyển dựa trên kết quả thi tốt nghiệp THPT (80% chỉ tiêu), (2) Xét tuyển thẳng học sinh giỏi quốc gia, quốc tế (20% chỉ tiêu). Thí sinh đăng ký qua cổng tuyển sinh của ĐHQG Hà Nội.',
	uit: 'Phương thức xét tuyển UIT 2025 gồm: (1) Xét điểm thi tốt nghiệp THPT 2025 (phương thức chính), (2) Xét tuyển thẳng học sinh giỏi. Ưu tiên thí sinh có chứng chỉ ngoại ngữ quốc tế (IELTS >= 5.5, TOEFL iBT >= 65).',
	fpt: 'Phương thức xét tuyển ĐH FPT 2025 gồm: (1) Xét học bạ lớp 10-12 (60%): điểm trung bình các môn học, ưu tiên tiếng Anh đầu vào, (2) Phỏng vấn trực tiếp hoặc online (40%): đánh giá năng lực tư duy và kỹ năng giao tiếp. Thí sinh đăng ký online qua website của ĐH FPT.',
	hcmus: 'Phương thức xét tuyển HCMUS 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT kết hợp xét học bạ. Thí sinh đăng ký qua cổng ĐHQG TP.HCM.',
	vnu: 'Phương thức xét tuyển VNU 2025 gồm: (1) Xét điểm thi tốt nghiệp THPT 2025 (theo khu vực ĐHQG Hà Nội), (2) Xét tuyển thẳng cho thí sinh giỏi quốc gia, quốc tế.',
	tlu: 'Phương thức xét tuyển ĐH Thủy lợi 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT 2025. Thí sinh đăng ký online qua cổng tuyển sinh của trường.',
	uel: 'Phương thức xét tuyển UEL 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT 2025 (phương thức chính). Thí sinh đăng ký qua cổng tuyển sinh của trường.',
	ctu: 'Phương thức xét tuyển ĐH Cần Thơ 2025: Xét tuyển dựa trên kết quả thi tốt nghiệp THPT 2025. Thí sinh đăng ký qua cổng tuyển sinh của trường.',
};

// ──────────────────────────────────────────────
// 3. Tìm kiếm theo từ khóa (fallback khi không có embedding)
// ──────────────────────────────────────────────
const KEYWORD_WEIGHTS: Record<string, number> = {
	'diem_chuan': 5, 'diem chuan': 5, 'diem': 2,
	'hoc_phi': 4, 'hoc phi': 4, 'phi': 1,
	'nganh': 3,
	'khoi': 3, 'a00': 3, 'a01': 3, 'd01': 3, 'b00': 3, 'c00': 3,
	'ho_so': 3, 'ho so': 3,
	'uu_tien': 3, 'uu tien': 3,
	'chuyen_nganh': 4, 'chuyen nganh': 4,
	'ky_tuc_xa': 3, 'ky tuc xa': 3, 'ktx': 3,
	'tuyen_sinh': 3, 'tuyen sinh': 3,
	'han_nop': 4, 'han nop': 4,
};

// Các từ khóa cho biết câu hỏi liên quan đến tuyển sinh / trường học
const ADMISSION_KEYWORDS = new Set([
	'diem', 'diem chuan', 'diem thi', 'diem san',
	'hoc phi', ' hoc bạ', 'hoc ba',
	'nganh', 'nganh hoc', 'xet tuyen', 'tuyen sinh',
	'khoi thi', 'a00', 'a01', 'd01', 'c00', 'b00',
	'ho so','ho so chuan bi' ,'giay to', 'chung nhan', 'tot nghiep',
	'uu tien', 'diem uu tien',
	'truong', 'dai hoc', 'hoc vien',
	'ptit', 'hust', 'uit', 'fpt', 'vnu', 'hcmus', 'tlu', 'uel', 'ctu',
	'bkhn', 'bach khoa', 'fptu',
	'phuong thuc', 'phuong thuc xet tuyen',
	'han nop', 'han chot',
	'chuyen nganh', 'chuyen doi',
	'ky tuc xa', 'ktx', 'noi tru',
	'luong', 'dieu kien', 'quy dinh',
	'bang', 'chung chi', 'ngoai ngu',
	'tra cuu', 'tim kiem',
	'thong tin', 'tu van', 'tuyen duong',
]);

// Kiểm tra câu hỏi có liên quan đến tuyển sinh không
const isAdmissionRelated = (query: string): boolean => {
	const ql = normalizeVietnamese(query.toLowerCase());
		// Kiểm tra từ khóa tuyển sinh
	for (const kw of ADMISSION_KEYWORDS) {
		if (ql.includes(kw)) return true;
	}
	// Đồng ý nếu có từ khóa trùng với knowledge base



	const words = ql.split(/\s+/).filter((w) => w.length > 2);
	if (words.length >= 3) {
		for (const chunk of DEMO_KNOWLEDGE) {
			const cl = normalizeVietnamese(chunk.content.toLowerCase());
			const matches = words.filter((w) => cl.includes(w)).length;
			if (matches >= 2) return true;
		}
	}
	return false;
};

// Kiểm tra câu hỏi có phải về học phí không
const isTuitionQuery = (query: string): boolean => {
	const ql = normalizeVietnamese(query.toLowerCase());
	return ql.includes('hoc phi') || ql.includes('học phí') || ql.includes('chi phi hoc tap') || ql.includes('phi');
};

// Kiểm tra câu hỏi có phải về hồ sơ / giấy tờ cần chuẩn bị không
const isDocumentQuery = (query: string): boolean => {
	const ql = normalizeVietnamese(query.toLowerCase());
	return ql.includes('ho so') || ql.includes('can chuan bi') || ql.includes('nop ho so')
		|| ql.includes('giay to') || ql.includes('chung nhan') || ql.includes('tot nghiep')
		|| ql.includes('cccd') || ql.includes('cmnd') || ql.includes('ho ba') || ql.includes('hoc ba');
};

// Kiểm tra câu hỏi có phải về phương thức xét tuyển không
const isMethodQuery = (query: string): boolean => {
	const ql = normalizeVietnamese(query.toLowerCase());
	return ql.includes('phuong thuc') || ql.includes('cach xet tuyen') || ql.includes('xet tuyen nao');
};

// Tìm thông tin hồ sơ trong knowledge base
const searchDocumentFromKnowledge = (schoolId?: string): string | null => {
	const school = schoolId || 'ho so';
	return DEMO_KNOWLEDGE_DOCS[school] || null;
};

// Tìm phương thức xét tuyển trong knowledge base
const searchMethodFromKnowledge = (schoolId?: string): string | null => {
	const school = schoolId || 'ptit';
	return DEMO_KNOWLEDGE_METHODS[school] || null;
};

// Tìm thông tin học phí trong knowledge base
const searchTuitionFromKnowledge = (query: string, schoolId?: string): string | null => {
	const ql = normalizeVietnamese(query.toLowerCase());

	// Lấy school target
	const targetSchoolId = schoolId;

	// Tìm tất cả entry trong DEMO_KNOWLEDGE có chứa học phí
	const tuitionChunks = DEMO_KNOWLEDGE.filter((chunk) => {
		if (chunk.content.toLowerCase().includes('học phí')) {
			if (targetSchoolId) return chunk.school_id === targetSchoolId;
			return true;
		}
		return false;
	});

	// Nếu có school cụ thể → trả entry đầu tiên cho trường đó
	if (targetSchoolId) {
		const found = tuitionChunks.find((c) => c.school_id === targetSchoolId);
		if (found) return found.content;
	}

	// Nếu query chứa tên trường cụ thể → match đúng trường
	for (const chunk of tuitionChunks) {
		if (chunk.content.toLowerCase().includes(ql)) {
			return chunk.content;
		}
	}

	// Không tìm thấy → trả null (sẽ dùng LLM fallback)
	return null;
};

// Chuẩn hóa dấu tiếng Việt để so khớp từ khóa
const normalizeVietnamese = (text: string): string => {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D');
};

// Ánh xạ từ khóa ngành sang các trường liên quan
const MAJOR_KEYWORDS: Record<string, { school_ids: string[]; content_keywords: string[] }> = {
	'cong nghe thong tin': { school_ids: ['ptit', 'hust', 'uit', 'fpt', 'vnu', 'hcmus', 'tlu', 'uel', 'ctu'], content_keywords: ['Công nghệ thông tin', 'CNTT'] },
	'cntt': { school_ids: ['ptit', 'hust', 'uit', 'fpt', 'vnu', 'hcmus', 'tlu', 'uel', 'ctu'], content_keywords: ['Công nghệ thông tin', 'CNTT'] },
	'an toan thong tin': { school_ids: ['ptit', 'uit'], content_keywords: ['An toàn thông tin', 'ATTT'] },
	'attt': { school_ids: ['ptit', 'uit'], content_keywords: ['An toàn thông tin', 'ATTT'] },
	'khoa hoc may tinh': { school_ids: ['ptit', 'hust', 'uit', 'hcmus'], content_keywords: ['Khoa học máy tính', 'KHMT'] },
	'khmt': { school_ids: ['ptit', 'hust', 'uit', 'hcmus'], content_keywords: ['Khoa học máy tính', 'KHMT'] },
	'ky thuat phan mem': { school_ids: ['ptit'], content_keywords: ['Kỹ thuật phần mềm', 'KTPM'] },
	'ktpm': { school_ids: ['ptit'], content_keywords: ['Kỹ thuật phần mềm', 'KTPM'] },
	'logistics': { school_ids: ['ptit'], content_keywords: ['Logistics', 'chuỗi cung ứng'] },
	'marketing': { school_ids: ['ptit'], content_keywords: ['Marketing'] },
	'truyen thong da phuong tien': { school_ids: ['ptit'], content_keywords: ['Truyền thông đa phương tiện', 'TTDL'] },
	'ttdl': { school_ids: ['ptit'], content_keywords: ['Truyền thông đa phương tiện', 'TTDL'] },
	'kinh te so': { school_ids: ['ptit'], content_keywords: ['Kinh tế số'] },
	'dien tu vien thong': { school_ids: ['ptit'], content_keywords: ['Điện tử', 'Viễn thông'] },
	'ky thuat dien tu': { school_ids: ['hust'], content_keywords: ['Kỹ thuật điện tử'] },
	'ky thuat co khi': { school_ids: ['hust'], content_keywords: ['Kỹ thuật cơ khí'] },
	'ky thuat hoa hoc': { school_ids: ['hust'], content_keywords: ['Kỹ thuật hóa học'] },
	'luat': { school_ids: ['vnu'], content_keywords: ['Luật'] },
	'kinh te': { school_ids: ['uel'], content_keywords: ['Kinh tế'] },
	'ky thuat xay dung': { school_ids: ['ctu'], content_keywords: ['Kỹ thuật xây dựng'] },
};

const keywordSearch = (query: string, schoolId?: string): { results: string[]; isMajorSpecific: boolean } => {
	const ql = normalizeVietnamese(query.toLowerCase());
	const queryWords = ql.split(/\s+/);

	// Kiểm tra câu hỏi có phải về ngành cụ thể không
	let isMajorSpecific = false;
	for (const [majorKey, config] of Object.entries(MAJOR_KEYWORDS)) {
		if (ql.includes(majorKey)) {
			isMajorSpecific = true;
			// Tìm entry phù hợp nhất cho ngành này
			const schools = schoolId ? [schoolId] : config.school_ids;
			for (const sid of schools) {
				for (const ck of config.content_keywords) {
					const found = DEMO_KNOWLEDGE.find(
						(k) => k.school_id === sid && k.content.includes(ck),
					);
					if (found) {
						return { results: [found.content], isMajorSpecific: true };
					}
				}
			}
		}
	}

	const scores: Array<{ content: string; score: number; school_id: string }> = [];

	// Tìm trong knowledge base bằng so khớp từ khóa
	const allChunks = DEMO_KNOWLEDGE.filter((k) => !schoolId || k.school_id === schoolId);

	for (const chunk of allChunks) {
		const cl = normalizeVietnamese(chunk.content.toLowerCase());
		let score = 0;

		for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
			if (cl.includes(keyword.replace(/_/g, ' ')) || cl.includes(keyword.replace(/_/g, ''))) {
				score += weight;
			}
		}

		for (const word of queryWords) {
			if (word.length > 2 && cl.includes(word)) score += 1;
		}

		if (score > 0) {
			scores.push({ content: chunk.content, score, school_id: chunk.school_id });
		}
	}

	scores.sort((a, b) => b.score - a.score);

	// Nếu câu hỏi về ngành cụ thể nhưng không tìm thấy trong major map, vẫn trả kết quả hàng đầu
	const results = scores.slice(0, 3).map((s) => s.content);
	return { results, isMajorSpecific };
};

// ──────────────────────────────────────────────
// 3b. Truy vấn điểm chuẩn từ DB theo tên ngành
// ──────────────────────────────────────────────
// Trích xuất năm từ câu hỏi (ví dụ: "điểm 2024", "năm 2024")
const extractYear = (query: string): number | null => {
	const match = query.match(/\b(20\d{2})\b/);
	return match ? parseInt(match[1]) : null;
};

// Trích xuất từ khóa trường từ câu hỏi (PTIT, Bách Khoa, NEU, etc.)
const extractSchoolKeywords = (query: string): string | null => {
	const schoolPatterns: Array<[string[], string[]]> = [
		[['ptit', 'học viện công nghệ bưu chính viễn thông'], ['PTIT', 'Học viện Công nghệ Bưu chính Viễn thông']],
		[['bkh', 'bách khoa hà nội', 'hust'], ['BKH', 'Trường Đại học Bách Khoa Hà Nội']],
		[['neu', 'kinh tế quốc dân'], ['NEU', 'Trường Đại học Kinh tế Quốc dân']],
		[['ftu', 'ngoại thương'], ['FTU', 'Trường Đại học Ngoại thương']],
		[['vnu', 'quốc gia hà nội'], ['VNU', 'Trường Đại học Quốc gia Hà Nội']],
		[['uit'], ['UIT', 'Trường Đại học Công nghệ Thông tin']],
		[['fpt'], ['FPT', 'Trường Đại học FPT']],
		[['hcmus', 'khoa học tự nhiên'], ['HCMUS', 'Trường Đại học Khoa học Tự nhiên']],
		[['tlu', 'thủy lợi'], ['TLU', 'Trường Đại học Thủy lợi']],
		[['uel', 'kinh tế luật'], ['UEL', 'Trường Đại học Kinh tế Luật']],
		[['ctu', 'cần thơ'], ['CTU', 'Trường Đại học Cần Thơ']],
	];
	const ql = normalizeVietnamese(query.toLowerCase());
	for (const [keywords, codes] of schoolPatterns) {
		if (keywords.some((kw) => ql.includes(kw))) {
			return codes.join('|');
		}
	}
	return null;
};

// Query điểm chuẩn theo TRƯỜNG + NĂM (không cần từ khóa ngành)
const searchCutoffBySchool = async (query: string): Promise<string[]> => {
	const schoolPattern = extractSchoolKeywords(query);
	if (!schoolPattern) return [];

	const targetYear = extractYear(query);
	const ql = normalizeVietnamese(query.toLowerCase());

	// Tên trường cho header (lấy từ pattern)
	const schoolNameMap: Record<string, string> = {
		PTIT: 'PTIT', 'Học viện Công nghệ Bưu chính Viễn thông': 'PTIT',
		BKH: 'HUST', 'Trường Đại học Bách Khoa Hà Nội': 'HUST',
		NEU: 'NEU', 'Trường Đại học Kinh tế Quốc dân': 'NEU',
		FTU: 'FTU', 'Trường Đại học Ngoại thương': 'FTU',
		VNU: 'VNU', 'Trường Đại học Quốc gia Hà Nội': 'VNU',
		UIT: 'UIT', 'Trường Đại học Công nghệ Thông tin': 'UIT',
		FPT: 'FPT', 'Trường Đại học FPT': 'FPT',
		HCMUS: 'HCMUS', 'Trường Đại học Khoa học Tự nhiên': 'HCMUS',
		TLU: 'TLU', 'Trường Đại học Thủy lợi': 'TLU',
		UEL: 'UEL', 'Trường Đại học Kinh tế Luật': 'UEL',
		CTU: 'CTU', 'Trường Đại học Cần Thơ': 'CTU',
	};
	const shortName = Object.keys(schoolNameMap).find((k) => schoolPattern.includes(k) && schoolNameMap[k]) || '';

	// Kiểm tra có hỏi ngành cụ thể không
	let majorFilter = '1=1';
	let majorParams: string[] = [];
	for (const [majorKey, config] of Object.entries(MAJOR_KEYWORDS)) {
		if (ql.includes(majorKey)) {
			majorFilter = 'm.name REGEXP ?';
			majorParams = config.content_keywords;
			break;
		}
	}

	const yearCondition = targetYear !== null
		? 'cs.year = ?'
		: 'cs.year = (SELECT MAX(cs2.year) FROM cutoff_scores cs2 WHERE cs2.university_id = cs.university_id AND cs2.combination_id = cs.combination_id)';

	const yearParams = targetYear !== null ? [targetYear] : [];
	const params = [...majorParams, yearParams, schoolPattern, schoolPattern].flat();

	const sql = `SELECT
			u.name AS university_name,
			m.name AS major_name,
			c.code AS combination_code,
			c.subject_names,
			cs.year,
			cs.score
		FROM cutoff_scores cs
		JOIN universities u ON cs.university_id = u.id
		JOIN combinations c ON cs.combination_id = c.id
		JOIN majors m ON m.university_id = u.id
		WHERE ${majorFilter}
		  AND ${yearCondition}
		  AND (u.code REGEXP ? OR u.name REGEXP ?)
		GROUP BY u.name, m.name, c.code, c.subject_names, cs.year, cs.score
		ORDER BY m.name, cs.score DESC`;

	try {
		const [rows] = await dbPool.query<mysql.RowDataPacket[]>(sql, params);

		if (rows.length === 0) return [];

		// Group by major
		const grouped: Record<string, { scores: string[]; year: number }> = {};
		for (const row of rows) {
			const major = row.major_name as string;
			if (!grouped[major]) {
				grouped[major] = { scores: [], year: row.year as number };
			}
			grouped[major].scores.push(
				`  - ${row.combination_code} (${row.subject_names}): ${row.score} điểm|MAJOR_SCORE|`,
			);
		}

		const yearLabel = targetYear !== null ? ` năm ${targetYear}` : ` năm ${Object.values(grouped)[0].year}`;
		const lines: string[] = [`Điểm chuẩn ${shortName}${yearLabel}:`];

		for (const [major, data] of Object.entries(grouped)) {
			const scoreLines = data.scores.join('');
			lines.push(`\nNgành: ${major}:`);
			lines.push(scoreLines);
		}

		lines.push('\nLưu ý: Điểm chuẩn có thể thay đổi từng năm. Em nên theo dõi thông báo chính thức từ trường nhé!');
		return lines;
	} catch (error) {
		console.warn('[AI Service] searchCutoffBySchool failed:', (error as Error).message);
		return [];
	}
};

// Query điểm chuẩn theo NGÀNH + TRƯỜNG + NĂM
const searchCutoffByMajor = async (query: string): Promise<string[]> => {
	const ql = normalizeVietnamese(query.toLowerCase());

	for (const [majorKey] of Object.entries(MAJOR_KEYWORDS)) {
		if (!ql.includes(majorKey)) continue;

		const config = MAJOR_KEYWORDS[majorKey];
		const majorNames = config.content_keywords;
		const targetYear = extractYear(query);
		const schoolPattern = extractSchoolKeywords(query);

		try {
			let sql: string;
			let params: (string | number)[];

			const baseSelect = `SELECT
				cs.university_id,
				u.name AS university_name,
				c.code AS combination_code,
				c.subject_names,
				cs.year,
				cs.score
			FROM cutoff_scores cs
			JOIN universities u ON cs.university_id = u.id
			JOIN combinations c ON cs.combination_id = c.id
			JOIN majors m ON m.university_id = u.id AND m.name REGEXP ?`;

			// Filter theo năm: nếu user chỉ định năm cụ thể thì dùng, không thì lấy năm mới nhất
			const yearSubquery = targetYear !== null
				? 'cs.year = ?'
				: 'cs.year = (SELECT MAX(cs2.year) FROM cutoff_scores cs2 WHERE cs2.university_id = cs.university_id AND cs2.combination_id = cs.combination_id)';

			const schoolFilter = schoolPattern
				? '(u.code REGEXP ? OR u.name REGEXP ?)'
				: '1=1';

			const whereClause = schoolPattern
				? `WHERE ${yearSubquery} AND ${schoolFilter}`
				: `WHERE ${yearSubquery}`;

			if (targetYear !== null) {
				params = schoolPattern
					? [majorNames.join('|'), targetYear, schoolPattern, schoolPattern]
					: [majorNames.join('|'), targetYear];
			} else {
				params = schoolPattern
					? [majorNames.join('|'), schoolPattern, schoolPattern]
					: [majorNames.join('|')];
			}

			sql = `${baseSelect} ${whereClause} ORDER BY u.name, cs.score DESC LIMIT 30`;

			const [rows] = await dbPool.query<mysql.RowDataPacket[]>(sql, params);

			if (rows.length === 0) return [];

			// Group by university
			const grouped: Record<string, { scores: string[]; year: number }> = {};
			for (const row of rows) {
				const uni = row.university_name as string;
				if (!grouped[uni]) {
					grouped[uni] = { scores: [], year: row.year as number };
				}
				grouped[uni].scores.push(
					`  - ${row.combination_code} (${row.subject_names}): ${row.score} điểm|SCHOOL_SCORE|`,
				);
			}

			return Object.entries(grouped).map(([uni, data]) => {
				const scoreLines = data.scores.join('');
				return `Trường: ${uni} (${data.year}):\n${scoreLines}`;
			});
		} catch (error) {
			console.warn('[AI Service] Cutoff DB query failed:', (error as Error).message);
			return [];
		}
	}

	return [];
};

// Trích xuất năm từ câu hỏi để định dạng response
const extractYearFromQuery = (query: string): number | null => {
	const match = query.match(/\b(20\d{2})\b/);
	return match ? parseInt(match[1]) : null;
};

// Tên viết tắt của các trường
const SCHOOL_SHORT_NAMES: Record<string, string> = {
	ptit: 'PTIT',
	hust: 'HUST',
	uit: 'UIT',
	fpt: 'FPT',
	vnu: 'VNU',
	hcmus: 'HCMUS',
	tlu: 'TLU',
	uel: 'UEL',
	ctu: 'CTU',
};

// Tạo phản hồi điểm chuẩn trực tiếp từ kết quả DB
const composeCutoffResponseFromDB = (dbCutoffResults: string[], userMessage: string, schoolId?: string): string => {
	const lines: string[] = [];

	for (const block of dbCutoffResults) {
		const idx = block.indexOf('|SCHOOL_SCORE|');
		if (idx === -1) continue;

		const headerPart = block.slice(0, idx).trim();
		const scoresPart = block.slice(idx + '|SCHOOL_SCORE|'.length);

		// Parse năm từ header: "Trường: Tên Trường (2025):"
		const headerMatch = headerPart.match(/^Trường:\s*.+?\s*\((\d{4})\):?/);
		if (!headerMatch) continue;
		const yearFromDB = headerMatch[1];

		// Tách từng dòng điểm
		const scoreLines = scoresPart
			.split('|SCHOOL_SCORE|')
			.map((s) => s.trim())
			.filter((s) => s.startsWith('-'));

		if (scoreLines.length === 0) continue;

		if (!lines.length) {
			const schoolShort = SCHOOL_SHORT_NAMES[schoolId || ''] || '';
			lines.push(`Điểm chuẩn ngành CNTT ${schoolShort} năm ${yearFromDB}:`);
		}

		for (const scoreLine of scoreLines) {
			// Dùng indexOf thay vì regex để tránh lỗi Unicode NFD vs NFC
			const diemIdx = scoreLine.toLowerCase().indexOf('điểm');
			if (diemIdx === -1) continue;

			const before = scoreLine.slice(0, diemIdx).trim();
			const parenIdx = before.lastIndexOf('(');
			const colonIdx = before.lastIndexOf(':');
			if (parenIdx === -1 || colonIdx === -1) continue;

			const combo = before.slice(0, parenIdx).replace(/^-\s*/, '').trim();
			const subjects = before.slice(parenIdx + 1, colonIdx).trim();
			const score = before.slice(colonIdx + 1).trim();

			lines.push(`  • Khối ${combo} (${subjects}): ${score} điểm`);
		}
	}

	if (lines.length === 0) {
		const targetYear = extractYearFromQuery(userMessage);
		return `Hiện mình chưa có dữ liệu điểm chuẩn ngành CNTT${schoolId ? ` cho ${SCHOOL_SHORT_NAMES[schoolId]}` : ''}${targetYear ? ` năm ${targetYear}` : ''} trong hệ thống. Em có thể hỏi về năm khác hoặc ngành khác nhé!`;
	}

	lines.push('\nLưu ý: Điểm chuẩn có thể thay đổi từng năm. Em nên theo dõi thông báo chính thức từ trường nhé!');
	return lines.join('\n');
};

// ──────────────────────────────────────────────
// 3c. Tìm kiếm RAG (vector search)
// ──────────────────────────────────────────────
export const retrieveRelevantChunks = async (
	queryEmbedding: number[],
	schoolId?: string,
	topK = TOP_K_CHUNKS,
): Promise<KnowledgeChunk[]> => {
	try {
		const query = schoolId
			? 'SELECT id, content, embedding, source_file, metadata, created_at, school_id FROM recruitment_knowledge WHERE school_id = ?'
			: 'SELECT id, content, embedding, source_file, metadata, created_at, school_id FROM recruitment_knowledge WHERE school_id IS NOT NULL';

		const [rows] = schoolId
			? await dbPool.query<mysql.RowDataPacket[]>(query, [schoolId])
			: await dbPool.query<mysql.RowDataPacket[]>(query);

		const scored = (rows as KnowledgeChunk[]).map((row) => {
			const embedding = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
			return {
				...row,
				embedding,
				score: cosineSimilarity(queryEmbedding, embedding as number[]),
			};
		});

		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK);
	} catch (error) {
		console.error('[AI Service] RAG retrieval failed:', error);
		return [];
	}
};

// ──────────────────────────────────────────────
// 4. Tạo document context từ các chunks tìm được
// ──────────────────────────────────────────────
const buildContextFromChunks = (chunks: KnowledgeChunk[]): string => {
	if (chunks.length === 0) return 'Không có thông tin liên quan trong cơ sở tri thức.';

	return (
		'TRI THỨC TUYỂN SINH (CHỈ TRẢ LỜI DỰA TRÊN ĐÂY):\n' +
		chunks.map((chunk, i) => `[Nguồn ${i + 1}${chunk.source_file ? ` - ${chunk.source_file}` : ''}]: ${chunk.content}`).join('\n\n')
	);
};

// ──────────────────────────────────────────────
// 4b. Nhận diện trường từ tin nhắn của user
// ──────────────────────────────────────────────
const SCHOOL_ALIASES: Record<string, string> = {
	// PTIT
	ptit: 'ptit',
	'hvpt': 'ptit',
	'hvbcvt': 'ptit',
	'bưu chính': 'ptit',
	'bưu điện': 'ptit',
	// HUST / BKHN
	'hust': 'hust',
	'bkhn': 'hust',
	'bách khoa': 'hust',
	'bách khoa hn': 'hust',
	'bách khoa hà nội': 'hust',
	// UIT
	uit: 'uit',
	// FPT
	fpt: 'fpt',
	'fptu': 'fpt',
	// VNU
	vnu: 'vnu',
	'vnu-hn': 'vnu',
	'đhqg': 'vnu',
	'quốc gia hà nội': 'vnu',
	// HCMUS
	hcmus: 'hcmus',
	// TLU
	tlu: 'tlu',
	'thủy lợi': 'tlu',
	// UEL
	uel: 'uel',
	'kinh tế luật': 'uel',
	// CTU
	ctu: 'ctu',
	'cần thơ': 'ctu',
};

// Tập trường hỗ trợ (chữ thường)
const SUPPORTED_SCHOOL_IDS = new Set(['ptit', 'hust', 'uit', 'fpt', 'vnu', 'hcmus', 'tlu', 'uel', 'ctu']);

// Regex pattern nhận diện tên trường (có thể không hỗ trợ)
const UNKNOWN_SCHOOL_PATTERNS: RegExp[] = [
	/uet(?![a-z])/i,
	/vnu-?uet/i,
	/đh khoa học tự nhiên/i,
	/nuce/i,
	/xây dựng(?!\s+(lực|miền))/i,
	/đại học xây dựng/i,
	/hanu/i,
	/đại học sư phạm(?!\s+hà nội)/i,
	/ueh/i,
	/đại học kinh tế(?!\s+(quốc|tp))/i,
	/hufl/i,
	/huflit/i,
	/luật(?!\s+(kinh|quốc))/i,
	/nông nghiệp/i,
	/đại học nông nghiệp/i,
];

export const detectSchoolFromMessage = (message: string): string | undefined => {
	const lower = normalizeVietnamese(message.toLowerCase());
	for (const [alias, schoolId] of Object.entries(SCHOOL_ALIASES)) {
		if (lower.includes(alias)) return schoolId;
	}
	return undefined;
};

const extractSchoolNameFromMessage = (message: string): string | null => {
	for (const pattern of UNKNOWN_SCHOOL_PATTERNS) {
		const match = message.match(pattern);
		if (match) return match[0];
	}
	return null;
};

const isUnknownSchoolMentioned = (message: string): boolean => {
	if (!extractSchoolNameFromMessage(message)) return false;
	const lower = normalizeVietnamese(message.toLowerCase());
	for (const id of SUPPORTED_SCHOOL_IDS) {
		if (lower.includes(id)) return false;
	}
	return true;
};

// ──────────────────────────────────────────────
// 5. Quản lý lịch sử hội thoại
// ──────────────────────────────────────────────
export const saveChatMessage = async (
	sessionId: string,
	role: ChatMessage['role'],
	content: string,
	userId?: number,
	metadata?: Record<string, unknown>,
) => {
	await dbPool.query(
		'INSERT INTO chat_history (session_id, user_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)',
		[sessionId, userId || null, role, content, metadata ? JSON.stringify(metadata) : null],
	);
};

export const getChatHistory = async (sessionId: string, maxPairs = MAX_HISTORY_PAIRS): Promise<ChatMessage[]> => {
	const limit = maxPairs * 2;
	const [rows] = await dbPool.query<mysql.RowDataPacket[]>(
		`SELECT role, content, created_at as timestamp FROM chat_history
     WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`,
		[sessionId, limit],
	);

	return (rows as ChatMessage[]).reverse();
};

// ──────────────────────────────────────────────
// 6. Phân loại ý định (Intent routing)
// ──────────────────────────────────────────────
export const classifyIntent = async (userMessage: string): Promise<{
	intent: string;
	shouldHandoff: boolean;
}> => {
	// Demo mode: không có API key hoặc được đặt là 'demo'
	const isDemoMode = !GEMINI_API_KEY || GEMINI_API_KEY === 'demo' || !OPENAI_API_KEY || OPENAI_API_KEY === 'demo';

	// Luôn kiểm tra từ khóa trước — từ khóa này luôn trigger handoff
	const lowerNorm = normalizeVietnamese(userMessage.toLowerCase());
	const isSosKeyword = lowerNorm.includes('loi') || lowerNorm.includes('bi') || lowerNorm.includes('mat')
		|| lowerNorm.includes('khong nop duoc') || lowerNorm.includes('thanh toan')
		|| lowerNorm.includes('su co') || lowerNorm.includes('gap su co')
		|| lowerNorm.includes('buon') || lowerNorm.includes('that vong') || lowerNorm.includes('tuc') || lowerNorm.includes('chan');

	if (isSosKeyword) {
		return { intent: 'technical_issue', shouldHandoff: true };
	}

	// Ở demo mode và không có từ khóa SOS → xem là câu hỏi tuyển sinh
	if (isDemoMode) {
		return { intent: 'admission_info', shouldHandoff: false };
	}

	// Dùng LLM để phân loại ý định khi có API key
	try {
		const prompt = INTENT_PROMPT.replace('{user_message}', userMessage);
		const result = await callLLM({ userMessage: prompt, isMainCall: false });
		const parsed = JSON.parse(result) as { intent: string; should_handoff: boolean };
		return { intent: parsed.intent, shouldHandoff: parsed.should_handoff };
	} catch (error) {
		console.error('[AI Service] Intent classification failed:', error);
		// Khi LLM lỗi, coi như câu hỏi tuyển sinh (không chuyển nguy hiểm)
		return { intent: 'admission_info', shouldHandoff: false };
	}
};

// ──────────────────────────────────────────────
// Regex-based NER fallback (luôn chạy, không phụ thuộc API)
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// Regex-based NER chỉ trích xuất từ user message gần nhất
// Không bao giờ bắt từ AI response
// ──────────────────────────────────────────────
const extractNERByRegex = (lastUserMessage: string): NERExtractedData => {
	const result: NERExtractedData = {};
	if (!lastUserMessage || lastUserMessage.trim().length < 3) return result;

	const msg = lastUserMessage.trim();

	// ── 1. Trích xuất tên ─────────────────────────────────────────────
	// [\p{L}]+ với non-capturing keyword group — bắt đầu bằng chữ hoa
	// Stop-words trim sau capture để loại "tên", "là" nếu bị include
	const STOP = ['tên', 'mình', 'tôi', 'đây', 'gọi', 'là'];
	const namePattern =
		/(?:tên\s*(?:tôi\s*)?|mình\s*|tôi\s*|đây\s*|gọi\s*)(?: là)?\s*([\p{L}]+(?:\s+[\p{L}]+){0,10})/u;
	const nameMatch = msg.match(namePattern);
	if (nameMatch && nameMatch[1]) {
		let name = nameMatch[1].trim();
		// Trim stop-words ở đầu (không trim cuối vì có thể là "Nguyễn Văn A")
		const parts = name.split(/\s+/);
		while (parts.length > 1 && STOP.includes(parts[0].toLowerCase())) parts.shift();
		name = parts.join(' ');
		name = name.replace(/[,.\-!?:;]+$/, '').trim();
		if (name.length >= 4 && name.length <= 60 && /^[\p{Lu}\p{Ll}]/u.test(name)) {
			result.student_name = name;
		}
	}

	// ── 2. Trích xuất điểm ─────────────────────────────────────────────
	const scorePatterns = [
		/(?:điểm\s*(?:của\s*)?|được\s*|score\s*)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:điểm)?/i,
		/(\d{1,2}[.,]\d)\s*điểm/i,
		/điểm\s+(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:là\s*)?$/i,
	];
	for (const pat of scorePatterns) {
		const m = msg.match(pat);
		if (m && m[1]) {
			const score = parseFloat(m[1].replace(',', '.'));
			if (score >= 5 && score <= 40) {
				result.score = score;
				break;
			}
		}
	}

	// ── 3. Trích xuất khối ─────────────────────────────────────────────
	const groupMatch = msg.match(/\b([A-D]\d{2})\b/i);
	if (groupMatch) {
		result.subject_group = groupMatch[1].toUpperCase();
	}

	// ── 4. Trích xuất ngành ─────────────────────────────────────────────
	const majorPatterns = [
		/(?:ngành|xét\s*ngành|theo\s*ngành|vào\s*ngành|thi\s*ngành|mong\s*muốn\s*ngành)\s*([^\n\t,.]{3,40})/i,
		/(?:ngành\s*)\s*([^\n\t,.]{3,40})/i,
	];
	for (const pat of majorPatterns) {
		const m = msg.match(pat);
		if (m && m[1]) {
			let major = m[1].trim();
			major = major.replace(/[,.\-!?:;]+$/, '').trim();
			if (major.length >= 3) {
				result.target_major = major;
				break;
			}
		}
	}

	return result;
};

// ──────────────────────────────────────────────
// 7. Trích xuất thông tin thí sinh (NER)
// ──────────────────────────────────────────────
export const extractNER = async (conversation: string): Promise<NERExtractedData> => {
	// Luôn chạy regex trước — không phụ thuộc API
	const regexResult = extractNERByRegex(conversation);
	if (regexResult.student_name || regexResult.score || regexResult.subject_group || regexResult.target_major) {
		console.log('[AI NER] Regex extracted:', regexResult);
		return regexResult;
	}

	// Nếu regex không bắt được và có API key thật → thử LLM
	if (GEMINI_API_KEY === 'demo' || !GEMINI_API_KEY) {
		return {};
	}

	try {
		const prompt = NER_PROMPT.replace('{conversation}', conversation);
		const result = await callLLM({ userMessage: prompt, isMainCall: false });
		const parsed = JSON.parse(result) as NERExtractedData;
		return parsed || {};
	} catch (error) {
		console.error('[AI Service] NER LLM extraction failed:', error);
		return {};
	}
};

// ──────────────────────────────────────────────
// 8. Lưu thông tin thí sinh tiềm năng vào DB
// ──────────────────────────────────────────────
export const savePotentialStudent = async (
	sessionId: string,
	nerData: NERExtractedData,
	userId?: number,
) => {
	const hasData = nerData.student_name || nerData.score || nerData.subject_group || nerData.target_major;
	if (!hasData) return;

	await dbPool.query(
		`INSERT INTO potential_students
     (session_id, user_id, student_name, score, subject_group, target_major, phone, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       student_name = IF(VALUES(student_name) IS NOT NULL AND VALUES(student_name) != '', VALUES(student_name), student_name),
       score = IF(VALUES(score) IS NOT NULL, VALUES(score), score),
       subject_group = IF(VALUES(subject_group) IS NOT NULL AND VALUES(subject_group) != '', VALUES(subject_group), subject_group),
       target_major = IF(VALUES(target_major) IS NOT NULL AND VALUES(target_major) != '', VALUES(target_major), target_major),
       phone = IF(VALUES(phone) IS NOT NULL, VALUES(phone), phone),
       email = IF(VALUES(email) IS NOT NULL, VALUES(email), email)`,
		[
			sessionId,
			userId || null,
			nerData.student_name || null,
			nerData.score || null,
			nerData.subject_group || null,
			nerData.target_major || null,
			nerData.phone || null,
			nerData.email || null,
		],
	);
};

// ──────────────────────────────────────────────
// 9. Gọi LLM (Gemini, OpenAI, hoặc Ollama)
// ──────────────────────────────────────────────
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

interface LLMMessage {
	role?: string;
	content: string;
}

const SCHOOL_NAMES: Record<string, string> = {
	ptit: 'Học viện Công nghệ Bưu chính Viễn thông (PTIT)',
	hust: 'Trường Đại học Bách khoa Hà Nội (HUST)',
	uit: 'Trường Đại học Công nghệ Thông tin, ĐHQG TP.HCM (UIT)',
	fpt: 'Trường Đại học FPT (FPTU)',
	vnu: 'Đại học Quốc gia Hà Nội (VNU)',
	hcmus: 'Trường Đại học Khoa học Tự nhiên, ĐHQG TP.HCM (HCMUS)',
	tlu: 'Trường Đại học Thủy lợi (TLU)',
	uel: 'Trường Đại học Kinh tế - Luật, ĐHQG TP.HCM (UEL)',
	ctu: 'Trường Đại học Cần Thơ (CTU)',
};

interface CallLLMOptions {
	history?: LLMMessage[];
	userMessage?: string;
	contextDocument?: string;
	schoolId?: string;
	isMainCall?: boolean;
}

const callLLM = async (options: CallLLMOptions): Promise<string> => {
	const { history = [], userMessage = '', contextDocument = '', schoolId, isMainCall = true } = options;
	const messages: LLMMessage[] = [...history];

	// Chỉ inject system prompt khi là lời gọi chính (phản hồi user), không phải intent/NER
	if (isMainCall && !userMessage.includes('Phân loại') && !userMessage.includes('trích xuất')) {
		const schoolInfo = schoolId && SCHOOL_NAMES[schoolId]
			? `Trường mà thí sinh đang hỏi: **${SCHOOL_NAMES[schoolId]}**. LUÔN trả lời dựa trên thông tin của đúng trường này.`
			: 'Nếu thí sinh hỏi về trường cụ thể (PTIT, HUST, UIT, FPT...), hãy trả lời dựa trên Context được cung cấp. Nếu Context không có thông tin về trường đó, hãy nói rõ: "Hiện mình chưa có dữ liệu chính xác về trường này."';
		const systemContent = SYSTEM_PROMPT.replace('Trả lời ngắn gọn, dễ hiểu, có emoji phù hợp.', `${schoolInfo}\n\nTrả lời ngắn gọn, dễ hiểu, có emoji phù hợp.`);
		messages.push({ role: 'system', content: systemContent });
	}

	// Đưa context + câu hỏi của user vào cuối cùng
	const finalContent = contextDocument
		? `Context:\n${contextDocument}\n\nCâu hỏi của thí sinh: ${userMessage}`
		: userMessage;
	messages.push({ role: 'user', content: finalContent });

	if (LLM_PROVIDER === 'ollama') {
		return callOllama(messages);
	}

	if (LLM_PROVIDER === 'gemini' && GEMINI_API_KEY && GEMINI_API_KEY !== 'demo') {
		try {
			return await callGemini(messages);
		} catch (err) {
			console.warn(`[AI Service] Gọi Gemini thất bại (${(err as Error).message}), chuyển sang demo mode`);
			return generateDemoResponse(userMessage, schoolId);
		}
	}

	if (OPENAI_API_KEY && OPENAI_API_KEY !== 'demo') {
		try {
			return await callOpenAI(messages);
		} catch (err) {
			console.warn(`[AI Service] Gọi OpenAI thất bại (${(err as Error).message}), chuyển sang demo mode`);
			return generateDemoResponse(userMessage, schoolId);
		}
	}

	return generateDemoResponse(userMessage, schoolId);
};

const callGemini = async (messages: LLMMessage[]): Promise<string> => {
	const systemInstruction = messages.find((m) => m.role === 'system')?.content || '';
	const conversation = messages.filter((m) => m.role !== 'system');

	const contents = conversation.map((msg) => ({
		role: msg.role === 'assistant' ? 'model' : 'user',
		parts: [{ text: msg.content }],
	}));

	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents,
				systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
				generationConfig: {
					temperature: 0.7,
					topP: 0.9,
					maxOutputTokens: 1024,
				},
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Gemini API error: ${response.status}`);
	}

	const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
	return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, mình chưa có câu trả lời phù hợp.';
};

const callOpenAI = async (messages: LLMMessage[]): Promise<string> => {
	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENAI_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: OPENAI_MODEL,
			messages: messages.map((m) => ({
				role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
				content: m.content,
			})),
			temperature: 0.7,
			max_tokens: 1024,
		}),
	});

	if (!response.ok) {
		throw new Error(`OpenAI API error: ${response.status}`);
	}

	const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
	return data.choices?.[0]?.message?.content || 'Xin lỗi, mình chưa có câu trả lời phù hợp.';
};

const callOllama = async (messages: LLMMessage[]): Promise<string> => {
	const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: OLLAMA_MODEL,
			messages: messages.map((m) => ({
				role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
				content: m.content,
			})),
			stream: false,
			options: {
				temperature: 0.7,
				num_predict: 1024,
			},
		}),
	});

	if (!response.ok) {
		throw new Error(`Ollama API error: ${response.status}`);
	}

	const data = (await response.json()) as { message?: { content?: string } };
	return data.message?.content || 'Xin lỗi, mình chưa có câu trả lời phù hợp.';
};

// ──────────────────────────────────────────────
// 10. Phản hồi mẫu (khi không có API key)
// ──────────────────────────────────────────────
const SCHOOL_LONG_NAMES: Record<string, string> = {
	ptit: 'PTIT',
	hust: 'HUST (Trường ĐH Bách khoa Hà Nội)',
	uit: 'UIT (Trường ĐH Công nghệ Thông tin, ĐHQG TP.HCM)',
	fpt: 'FPTU (Trường ĐH FPT)',
	vnu: 'VNU (ĐH Quốc gia Hà Nội)',
	hcmus: 'HCMUS (Trường ĐH Khoa học Tự nhiên TP.HCM)',
	tlu: 'TLU (Trường ĐH Thủy lợi)',
	uel: 'UEL (Trường ĐH Kinh tế - Luật, ĐHQG TP.HCM)',
	ctu: 'CTU (Trường ĐH Cần Thơ)',
};

const generateDemoResponse = (userMessage: string, schoolId?: string): string => {
	const lower = normalizeVietnamese(userMessage.toLowerCase());

	// Greeting
	if (lower.includes('chao') || lower.includes('xin chao') || lower.includes('hello') || lower.includes('hi')) {
		return 'Xin chào em! Mình là trợ lý tư vấn tuyển sinh. Em muốn hỏi về trường nào? Mình có thông tin về PTIT, HUST, UIT, FPT, VNU, HCMUS, TLU, UEL, CTU...';
	}

	// Phương thức xét tuyển chung
	if (lower.includes('phuong thuc xet tuyen') || lower.includes('cach xet tuyen') || lower.includes('xet tuyen nao')) {
		const schoolName = schoolId ? SCHOOL_LONG_NAMES[schoolId] : 'các trường';
		const ptData = DEMO_KNOWLEDGE.find((k) => k.school_id === (schoolId || 'ptit') && k.content.includes('Phương thức xét tuyển'));
		if (ptData) return `${ptData.content}`;
		return `Mình có thông tin về phương thức xét tuyển của ${schoolName}. Em muốn hỏi cụ thể trường nào?`;
	}

	// Hồ sơ
	if (lower.includes('ho so') || lower.includes('can chuan bi') || lower.includes('nop ho so') || lower.includes('giay to')) {
		return 'Hồ sơ cần chuẩn bị gồm: (1) CCCD/CMND bản sao công chứng, (2) Học bạ lớp 12 có công chứng, (3) Giấy chứng nhận tốt nghiệp tạm thời, (4) Ảnh chân dung 3x4, (5) Giấy tờ ưu tiên (nếu có). Hạn nộp thường từ 01/07 đến 31/08 hàng năm. Em cần thêm thông tin gì không?';
	}

	// Ưu tiên
	if (lower.includes('uu tien') || lower.includes('diem uu tien')) {
		return 'Điểm ưu tiên: KV1 (miền núi, vùng sâu) được cộng 1.5 điểm; KV2 (nông thôn) được cộng 1.0 điểm; KV3 (thành phố) được cộng 0.5 điểm. Đối tượng ưu tiên 01-08 được cộng thêm theo quy định. Em thuộc khu vực và đối tượng nào?';
	}

	// Chuyển ngành
	if (lower.includes('chuyen nganh')) {
		return 'Hầu hết các trường cho phép chuyển ngành trong năm học đầu tiên với điều kiện: điểm TB ≥ 2.5/4.0 ở HK1, không vi phạm kỷ luật, và còn chỉ tiêu ở ngành muốn chuyển sang. Em hỏi cụ thể trường nào để mình tư vấn chi tiết hơn nhé!';
	}

	// Ký túc xá
	if (lower.includes('ky tuc xa') || lower.includes('ktx') || lower.includes('noi tru')) {
		return 'Ký túc xá của các trường thường có phí từ 800.000 - 1.500.000 VNĐ/tháng tùy loại phòng. Điều kiện đăng ký: sinh viên có hộ khẩu ngoài thành phố hoặc có xác nhận khó khăn về chỗ ở. Em muốn hỏi KTX của trường cụ thể nào?';
	}

	// Khối thi
	if (lower.includes('khoi') || lower.includes('a00') || lower.includes('a01') || lower.includes('d01') || lower.includes('c00') || lower.includes('b00')) {
		const schoolName = schoolId ? SCHOOL_LONG_NAMES[schoolId] : 'mỗi trường';
		return `Các khối xét tuyển phổ biến: A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh), C00 (Văn, Sử, Địa), B00 (Toán, Hóa, Sinh). Điểm chuẩn tùy thuộc ${schoolName}. Em thi khối nào vậy?`;
	}

	// Tìm bằng keyword search
	const { results } = keywordSearch(userMessage, schoolId);
	if (results.length > 0) {
		return results.join('\n\n');
	}

	// Trường không nhận diện được
	if (!schoolId) {
		return 'Hiện mình có thông tin về PTIT, HUST, UIT, FPT, VNU, HCMUS, TLU, UEL, CTU. Em hỏi cụ thể trường nào và ngành gì để mình tư vấn chính xác nhé!';
	}

	// Không có dữ liệu cho trường này
	return `Mình chưa có dữ liệu chi tiết cho ${SCHOOL_LONG_NAMES[schoolId] || schoolId} trong hệ thống. Em có thể hỏi về PTIT, HUST, UIT, FPT, VNU, HCMUS, TLU, UEL hoặc CTU nhé!`;
};

// ──────────────────────────────────────────────
// 11. Hàm chat chính
// ──────────────────────────────────────────────
export const generateChatResponse = async (
	sessionId: string,
	userMessage: string,
	userId?: number,
): Promise<{
	response: string;
	shouldHandoff: boolean;
	nerData: NERExtractedData;
}> => {
	// Bước 1: Phân loại ý định
	const { intent, shouldHandoff } = await classifyIntent(userMessage);
	console.log(`[AI Chat] Session=${sessionId} Intent=${intent} Handoff=${shouldHandoff}`);

	// Bước 2: Kiểm tra có cần chuyển giao không
	if (shouldHandoff) {
		return {
			response: 'Vấn đề của em cần sự can thiệp từ Phòng Đào tạo. Hệ thống đang kết nối trực tiếp với thầy cô, em vui lòng chờ trong giây lát nhé.',
			shouldHandoff: true,
			nerData: {},
		};
	}

	// Bước 3: Kiểm tra câu hỏi có liên quan đến tuyển sinh không
	if (!isAdmissionRelated(userMessage)) {
		return {
			response: 'Mình là trợ lý tư vấn tuyển sinh trực tuyến. Bạn có thể hỏi mình về điểm chuẩn, học phí, ngành học, phương thức xét tuyển, hồ sơ cần chuẩn bị nhé!',
			shouldHandoff: false,
			nerData: {},
		};
	}

	// Bước 4: Lấy lịch sử hội thoại
	const history = await getChatHistory(sessionId);
	const historyMessages: LLMMessage[] = history.map((msg) => ({
		role: msg.role,
		content: msg.content,
	}));

	// Bước 4: Nhận diện trường từ tin nhắn user
	const detectedSchool = detectSchoolFromMessage(userMessage);
	console.log(`[AI Chat] Detected school: ${detectedSchool || 'none'}`);

	// Bước 5: Nếu user hỏi trường không có trong hệ thống → trả lời hợp lý
	if (isUnknownSchoolMentioned(userMessage)) {
		const schoolName = extractSchoolNameFromMessage(userMessage) || '';
		return {
			response: `Mình chưa có dữ liệu chi tiết cho trường "${schoolName}" trong hệ thống. Em có thể hỏi về PTIT, HUST, UIT, FPT, VNU, HCMUS, TLU, UEL hoặc CTU nhé!`,
			shouldHandoff: false,
			nerData: {},
		};
	}

	// Bước 5: Tìm kiếm RAG — dùng keyword search nếu không có embedding API
	let contextDocument = '';
	let finalResponse = '';

	// 5a: Nếu hỏi về học phí → tìm trong knowledge base trước (không query điểm chuẩn)
	if (isTuitionQuery(userMessage)) {
		const tuitionInfo = searchTuitionFromKnowledge(userMessage, detectedSchool);
		if (tuitionInfo) {
			finalResponse = tuitionInfo;
		} else {
			finalResponse = await callLLM({
				history: historyMessages.slice(-19),
				userMessage,
				contextDocument: '',
				schoolId: detectedSchool,
				isMainCall: true,
			});
		}
	// 5b: Nếu hỏi về hồ sơ cần chuẩn bị → tìm trong DEMO_KNOWLEDGE_DOCS
	} else if (isDocumentQuery(userMessage)) {
		const docInfo = searchDocumentFromKnowledge(detectedSchool);
		if (docInfo) {
			finalResponse = docInfo;
		} else {
			finalResponse = await callLLM({
				history: historyMessages.slice(-19),
				userMessage,
				contextDocument: '',
				schoolId: detectedSchool,
				isMainCall: true,
			});
		}
	// 5c: Nếu hỏi về phương thức xét tuyển → tìm trong DEMO_KNOWLEDGE_METHODS
	} else if (isMethodQuery(userMessage)) {
		const methodInfo = searchMethodFromKnowledge(detectedSchool);
		if (methodInfo) {
			finalResponse = methodInfo;
		} else {
			finalResponse = await callLLM({
				history: historyMessages.slice(-19),
				userMessage,
				contextDocument: '',
				schoolId: detectedSchool,
				isMainCall: true,
			});
		}
	} else {
		// 5d: Thử truy vấn điểm chuẩn từ DB
		const dbCutoffResults = await searchCutoffByMajor(userMessage);

		if (dbCutoffResults.length > 0) {
			finalResponse = composeCutoffResponseFromDB(dbCutoffResults, userMessage, detectedSchool);
		} else {
			// 5e: Thử query theo trường (khi không có từ khóa ngành nhưng có tên trường)
			const schoolCutoffResults = await searchCutoffBySchool(userMessage);
			if (schoolCutoffResults.length > 0) {
				finalResponse = schoolCutoffResults.join('\n');
			} else {
				// 5f: Fallback sang keyword search / RAG
				const queryEmbedding = await generateEmbedding(userMessage);

				if (queryEmbedding.length > 0) {
					const relevantChunks = await retrieveRelevantChunks(queryEmbedding, detectedSchool, TOP_K_CHUNKS + 2);
					contextDocument = buildContextFromChunks(relevantChunks);
				} else {
					const { results: keywordResults } = keywordSearch(userMessage, detectedSchool);
					if (keywordResults.length > 0) {
						contextDocument = 'TRI THỨC TUYỂN SINH (CHỈ TRẢ LỜI DỰA TRÊN ĐÂY):\n' +
							keywordResults.map((content, i) => `[Nguồn ${i + 1}]: ${content}`).join('\n\n');
					}
				}

				// Bước 6: Sinh phản hồi với context được tiêm vào
				finalResponse = await callLLM({
					history: historyMessages.slice(-19),
					userMessage,
					contextDocument,
					schoolId: detectedSchool,
					isMainCall: true,
				});
			}
		}
	}

	// Bước 7: Trích xuất NER từ tin nhắn user gần nhất
	// KHÔNG dùng conversationText vì AI reply chứa số gây nhiễu (VD: "30 triệu")
	console.log('[NER Input] userMessage =', JSON.stringify(userMessage));
	const nerData = await extractNER(userMessage);
	console.log('[NER Output] nerData =', JSON.stringify(nerData));

	// Bước 8: Lưu thí sinh tiềm năng (lưu nếu có BẤT KỲ field NER nào)
	const hasAnyNerData = nerData.student_name || nerData.score || nerData.subject_group ||
		nerData.target_major || nerData.phone || nerData.email;
	if (hasAnyNerData) {
		console.log('[NER Save] Saving potential student:', JSON.stringify(nerData));
		await savePotentialStudent(sessionId, nerData, userId).catch((err) =>
			console.error('[AI Service] Failed to save potential student:', err),
		);
	} else {
		console.log('[NER Save] Skipped — no NER data found');
	}

	return { response: finalResponse, shouldHandoff: false, nerData };
};

// ──────────────────────────────────────────────
// 12. Generator phản hồi streaming
// ──────────────────────────────────────────────
export const generateStreamingResponse = async function* (
	sessionId: string,
	userMessage: string,
	userId?: number,
): AsyncGenerator<string, void, unknown> {
	const { response, shouldHandoff: isHandoff, nerData } = await generateChatResponse(sessionId, userMessage, userId);

	if (isHandoff) {
		yield JSON.stringify({ status: 'handoff', trigger_socket: true, message: response, ner_data: nerData });
		return;
	}

	// Lưu phản hồi assistant vào DB (bất đồng bộ)
	saveChatMessage(sessionId, 'assistant', response, userId).catch((err) =>
		console.error('[AI Service] Failed to save assistant message:', err),
	);

	// Mô phỏng streaming bằng cách yield từng từ
	// Tách theo khoảng trắng (space, newline, tab) để \n là 1 token riêng
	const parts = response.split(/[\s]+/).filter(Boolean);
	for (let i = 0; i < parts.length; i += 1) {
		yield JSON.stringify({ token: parts[i] + (i < parts.length - 1 ? ' ' : '') });
		// Delay nhỏ để mô phỏng hiệu ứng typewriter
		await new Promise((resolve) => setTimeout(resolve, 15));
	}

	yield JSON.stringify({ status: 'done', ner_data: nerData });
};

// ──────────────────────────────────────────────
// 13. Lấy danh sách thí sinh tiềm năng cho admin
// ──────────────────────────────────────────────
export const getPotentialStudents = async (
	page = 1,
	limit = 20,
	reviewed?: boolean,
): Promise<{ data: PotentialStudent[]; total: number }> => {
	const offset = (page - 1) * limit;
	let query = 'SELECT * FROM potential_students';
	let countQuery = 'SELECT COUNT(*) as total FROM potential_students';
	const params: unknown[] = [];

	if (reviewed !== undefined) {
		query += ' WHERE reviewed = ?';
		countQuery += ' WHERE reviewed = ?';
		params.push(reviewed ? 1 : 0);
	}

	query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
	const countParams = [...params];

	const [rows] = await dbPool.query<mysql.RowDataPacket[]>(query, [...params, limit, offset]);
	const [countRows] = await dbPool.query<mysql.RowDataPacket[]>(countQuery, countParams);

	return {
		data: rows as PotentialStudent[],
		total: (countRows[0] as { total: number }).total,
	};
};

export const markLeadReviewed = async (id: number, reviewedBy: number) => {
	await dbPool.query(
		'UPDATE potential_students SET reviewed = TRUE, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
		[reviewedBy, id],
	);
};

// ──────────────────────────────────────────────
// 14. Lấy số admin đang online
// ──────────────────────────────────────────────
export const getOnlineAdminCount = async (): Promise<number> => {
	try {
		const [rows] = await dbPool.query<mysql.RowDataPacket[]>(
			'SELECT COUNT(*) as count FROM admin_online_status WHERE is_online = TRUE',
		);
		return (rows[0] as { count: number }).count;
	} catch {
		return 0;
	}
};

// ──────────────────────────────────────────────
// 15. Lấy các phiên chat đang hoạt động (cho dashboard admin)
// ──────────────────────────────────────────────
export const getActiveChatSessions = async (limit = 50): Promise<Array<{
	session_id: string;
	user_id: number | null;
	last_message: string;
	last_message_at: string;
	unread_count: number;
}>> => {
	const [rows] = await dbPool.query<mysql.RowDataPacket[]>(
		`SELECT ch.session_id, ch.user_id, ch.content as last_message, ch.created_at as last_message_at
     FROM chat_history ch
     INNER JOIN (
       SELECT session_id, MAX(created_at) as max_created_at
       FROM chat_history
       GROUP BY session_id
     ) latest ON ch.session_id = latest.session_id AND ch.created_at = latest.max_created_at
     ORDER BY ch.created_at DESC
     LIMIT ?`,
		[limit],
	);

	return rows.map((row) => ({
		session_id: row.session_id as string,
		user_id: row.user_id as number | null,
		last_message: row.last_message as string,
		last_message_at: row.last_message_at as string,
		unread_count: 0,
	}));
};