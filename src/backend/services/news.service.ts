export interface NewsItem {
	id: number;
	title: string;
	summary: string;
	content: string;
	source: string;
	views: number;
	publishedAt: string;
	day: string;
	month: string;
	tags: string[];
}

const NEWS_DATA: NewsItem[] = [
	{
		id: 1,
		title: 'Thông báo tuyển sinh đại học chính quy năm 2026',
		summary:
			'Trường chính thức thông báo tuyển sinh đại học chính quy năm 2026 với nhiều ngành học mới và chỉ tiêu tăng so với năm trước.',
		content: `Trường thông báo tuyển sinh đại học chính quy năm 2026 với các thông tin chi tiết như sau:

**1. Chỉ tiêu tuyển sinh**
Tổng chỉ tiêu: 12.000 sinh viên cho tất cả các ngành đào tạo.

**2. Phương thức tuyển sinh**
- Xét tuyển theo điểm thi THPT năm 2026
- Xét tuyển theo kết quả học tập THPT
- Xét tuyển thẳng cho thí sinh đạt giải quốc gia

**3. Các ngành tuyển sinh mới**
- Khoa học Dữ liệu & Trí tuệ Nhân tạo
- An toàn Không gian Số
- Kinh doanh Số

**4. Thời gian đăng ký**
- Đợt 1: 01/06/2026 - 31/07/2026
- Đợt 2: 01/08/2026 - 31/08/2026

**5. Học phí dự kiến**
Học phí dự kiến năm học 2026-2027: 18.000.000 - 24.000.000 VNĐ/năm học (tùy ngành).

Mọi thông tin chi tiết vui lòng liên hệ Phòng Đào tạo hoặc truy cập website chính thức của trường.`,
		source: 'Phòng Đào tạo',
		views: 120,
		publishedAt: '2026-06-28T00:00:00Z',
		day: '28',
		month: 'THG 6',
		tags: ['Tuyển sinh', 'Đại học', '2026'],
	},
	{
		id: 2,
		title: 'Điểm chuẩn trúng tuyển đợt 1 năm học 2026',
		summary:
			'Công bố điểm chuẩn trúng tuyển đợt 1 năm học 2026 cho tất cả các ngành và tổ hợp xét tuyển.',
		content: `Căn cứ kết quả xét tuyển và chỉ tiêu được giao, Trường công bố điểm chuẩn trúng tuyển đợt 1 năm học 2026 như sau:

**Điểm chuẩn theo ngành (thang 30 điểm, nhân hệ số)**

| Ngành | Tổ hợp A00 | Tổ hợp A01 | Tổ hợp D01 |
|-------|-----------|-----------|-----------|
| Công nghệ thông tin | 24.5 | 23.0 | 22.0 |
| Thương mại điện tử | 22.0 | 21.0 | 23.5 |
| Truyền thông số | 21.5 | 20.5 | 22.5 |
| An toàn thông tin | 23.0 | 24.0 | 21.0 |
| Kỹ thuật điện tử viễn thông | 22.5 | 21.5 | 20.5 |

**Ghi chú:**
- Điểm chuẩn đã bao gồm điểm ưu tiên theo quy chế
- Thí sinh trúng tuyển cần xác nhận nhập học trước ngày 01/09/2026
- Điểm chuẩn đợt 2 sẽ được công bố sau`,
		source: 'Phòng Tuyển sinh',
		views: 1200,
		publishedAt: '2026-06-25T00:00:00Z',
		day: '25',
		month: 'THG 6',
		tags: ['Điểm chuẩn', 'Tuyển sinh', '2026'],
	},
	{
		id: 3,
		title: 'Hướng dẫn đăng ký xét tuyển trực tuyến năm 2026',
		summary:
			'Hướng dẫn chi tiết các bước đăng ký xét tuyển trực tuyến qua hệ thống cổng tuyển sinh của trường.',
		content: `**Hướng dẫn đăng ký xét tuyển trực tuyến năm 2026**

**Bước 1: Đăng ký tài khoản**
Truy cập cổng tuyển sinh trực tuyến tại địa chỉ: tuyensinh.ptit.edu.vn
Nhấn "Đăng ký" và điền thông tin theo yêu cầu.

**Bước 2: Đăng nhập và khai hồ sơ**
Sau khi đăng nhập, vào mục "Nộp hồ sơ trực tuyến" và điền đầy đủ thông tin theo 5 bước:
1. Thông tin cá nhân (họ tên, CCCD, ngày sinh...)
2. Hồ sơ minh chứng (CCCD, ảnh chân dung)
3. Thông tin học tập (điểm THPT, trường THPT...)
4. Nguyện vọng xét tuyển (chọn trường, ngành, tổ hợp)
5. Xác nhận và nộp hồ sơ

**Bước 3: Nộp hồ sơ**
Sau khi hoàn thiện checklist, nhấn "Nộp hồ sơ" để gửi.

**Bước 4: Theo dõi trạng thái**
Sau khi nộp, bạn có thể theo dõi trạng thái hồ sơ trên hệ thống.

**Lưu ý quan trọng:**
- Thông tin CCCD phải trùng khớp với giấy tờ thực tế
- Ảnh chân dung cần nền trắng, chụp rõ mặt
- Điền đầy đủ thông tin học tập lớp 10, 11, 12
- Thứ tự nguyện vọng rất quan trọng — ưu tiên xếp nguyện vọng cao nhất lên đầu`,
		source: 'Hướng dẫn',
		views: 3500,
		publishedAt: '2026-06-20T00:00:00Z',
		day: '20',
		month: 'THG 6',
		tags: ['Hướng dẫn', 'Xét tuyển', '2026'],
	},
	{
		id: 4,
		title: 'Chương trình đào tạo mới: Khoa học Dữ liệu & AI',
		summary:
			'Trường giới thiệu chương trình đào tạo mới ngành Khoa học Dữ liệu & Trí tuệ Nhân tạo, đáp ứng nhu cầu nhân lực công nghệ cao.',
		content: `**Khoa học Dữ liệu & Trí tuệ Nhân tạo (Data Science & AI)**

Trường chính thức tuyển sinh ngành mới "Khoa học Dữ liệu & Trí tuệ Nhân tạo" từ năm 2026, đào tạo nguồn nhân lực chất lượng cao cho cuộc cách mạng công nghiệp 4.0.

**1. Mục tiêu đào tạo**
Đào tạo kỹ sư có kiến thức vững chắc về toán học, thống kê, khoa học máy tính và trí tuệ nhân tạo; có khả năng phân tích dữ liệu lớn, xây dựng mô hình AI và triển khai ứng dụng thông minh.

**2. Chương trình học**
- Năm 1: Toán học, Xác suất thống kê, Lập trình Python, Cấu trúc dữ liệu
- Năm 2: Học máy, Cơ sở dữ liệu, Big Data, Thị giác máy
- Năm 3: Deep Learning, NLP, AI nâng cao, Đồ án nghiên cứu
- Năm 4: Thực tập, Đồ án tốt nghiệp, Chuyên đề AI ứng dụng

**3. Cơ hội nghề nghiệp**
- Kỹ sư Khoa học Dữ liệu
- Kỹ sư Machine Learning / Deep Learning
- Chuyên gia AI / Data Analyst
- Kiến trúc sư giải pháp AI

**4. Điểm chuẩn dự kiến:** 24.0 (thang 30)`,
		source: 'Phòng Đào tạo',
		views: 890,
		publishedAt: '2026-06-15T00:00:00Z',
		day: '15',
		month: 'THG 6',
		tags: ['Đào tạo', 'AI', 'Ngành mới'],
	},
	{
		id: 5,
		title: 'Thông tin học phí và chính sách hỗ trợ tài chính năm 2026',
		summary:
			'Cập nhật mức học phí và các chính sách hỗ trợ tài chính dành cho sinh viên năm học 2026-2027.',
		content: `**Học phí và chính sách hỗ trợ tài chính năm học 2026-2027**

**1. Mức học phí**

| Nhóm ngành | Học phí/năm (VNĐ) |
|------------|-----------------|
| Công nghệ thông tin, An toàn thông tin | 24.000.000 |
| Kỹ thuật điện tử viễn thông | 22.000.000 |
| Thương mại điện tử, Truyền thông số | 20.000.000 |
| Quản trị kinh doanh, Marketing | 18.000.000 |

Học phí có thể thay đổi theo quy định của Bộ GD&ĐT.

**2. Chính sách hỗ trợ tài chính**

*Miễn giảm học phí:*
- Sinh viên có hoàn cảnh khó khăn đặc biệt
- Sinh viên dân tộc thiểu số
- Sinh viên tham gia các chương trình tình nguyện

*Học bổng:*
- Học bổng xuất sắc: 10.000.000 VNĐ/năm (cho sinh viên đạt điểm đầu vào cao)
- Học bổng khuyến khích: 5.000.000 VNĐ/năm (cho sinh viên có thành tích học tập tốt)
- Học bổng hỗ trợ: 3.000.000 VNĐ/năm (cho sinh viên có hoàn cảnh khó khăn)

**3. Phương thức thanh toán**
Học phí được thanh toán theo học kỳ qua chuyển khoản ngân hàng hoặc đóng trực tiếp tại phòng tài vụ.`,
		source: 'Phòng Tài vụ',
		views: 560,
		publishedAt: '2026-06-10T00:00:00Z',
		day: '10',
		month: 'THG 6',
		tags: ['Học phí', 'Hỗ trợ tài chính', '2026'],
	},
	{
		id: 6,
		title: 'Lịch trực tuyến tư vấn tuyển sinh tháng 6/2026',
		summary:
			'Thông báo lịch tư vấn tuyển sinh trực tuyến qua nền tảng Zoom và Facebook Live trong tháng 6 năm 2026.',
		content: `**Lịch tư vấn tuyển sinh trực tuyến tháng 6/2026**

Để hỗ trợ thí sinh và phụ huynh hiểu rõ hơn về quy trình tuyển sinh, trường tổ chức các buổi tư vấn trực tuyến miễn phí trong tháng 6/2026.

**Lịch cụ thể:**

**Tuần 1 (01-07/06):**
- Thứ 4, ngày 04/06/2026, 14:00 - 16:00: Tư vấn ngành Công nghệ thông tin & An toàn thông tin
- Thứ 6, ngày 06/06/2026, 14:00 - 16:00: Tư vấn ngành Kỹ thuật & Truyền thông

**Tuần 2 (08-14/06):**
- Thứ 4, ngày 11/06/2026, 14:00 - 16:00: Tư vấn ngành Kinh tế & Quản trị
- Thứ 6, ngày 13/06/2026, 14:00 - 16:00: Tư vấn chung về phương thức xét tuyển

**Tuần 3 (15-21/06):**
- Thứ 4, ngày 18/06/2026, 14:00 - 16:00: Tư vấn học phí & chính sách hỗ trợ tài chính
- Thứ 6, ngày 20/06/2026, 14:00 - 16:00: Tư vấn ngành mới: Khoa học Dữ liệu & AI

**Tuần 4 (22-30/06):**
- Thứ 4, ngày 25/06/2026, 14:00 - 16:00: Hướng dẫn đăng ký xét tuyển trực tuyến
- Thứ 6, ngày 27/06/2026, 14:00 - 16:00: Tư vấn sau khi công bố điểm chuẩn

**Phương thức tham gia:**
- Zoom: Liên kết tham gia được gửi qua email sau khi đăng ký
- Facebook Live: Theo dõi tại fanpage chính thức của trường
- Hotline: 1900 1234 (8:00 - 17:00, T2 - T6)`,
		source: 'Tuyển sinh',
		views: 2100,
		publishedAt: '2026-06-05T00:00:00Z',
		day: '05',
		month: 'THG 6',
		tags: ['Tư vấn', 'Lịch', '2026'],
	},
];

export const getAllNews = (): NewsItem[] => {
	return NEWS_DATA.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
};

export const getNewsById = (id: number): NewsItem | undefined => {
	return NEWS_DATA.find((item) => item.id === id);
};

export const getLatestNews = (limit = 6): NewsItem[] => {
	return getAllNews().slice(0, limit);
};
