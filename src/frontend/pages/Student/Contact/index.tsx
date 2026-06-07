import { useState } from 'react';
import { history } from 'umi';
import {
	ArrowLeftOutlined,
	CommentOutlined,
	EnvironmentOutlined,
	GlobalOutlined,
	MailOutlined,
	PhoneOutlined,
	TeamOutlined,
} from '@ant-design/icons';
import { Button, Typography } from 'antd';
import ChatBubble from '../../../components/ChatBubble';
import styles from './index.less';

const { Title, Text, Paragraph } = Typography;

const CONTACTS = [
	{
		icon: <PhoneOutlined />,
		label: 'Tổng đài tư vấn',
		value: '1900 1234',
		note: 'Thứ 2 — Thứ 6: 8:00 — 17:00',
		color: '#c41e3a',
	},
	{
		icon: <MailOutlined />,
		label: 'Email tuyển sinh',
		value: 'tuyensinh@ptit.edu.vn',
		note: 'Phản hồi trong vòng 24 giờ làm việc',
		color: '#1677ff',
	},
	{
		icon: <EnvironmentOutlined />,
		label: 'Địa chỉ',
		value: 'Km 10, Nguyễn Trãi, Thanh Xuân, Hà Nội',
		note: 'Phòng Đào tạo & Tuyển sinh, Tầng 3, Nhà A',
		color: '#52c41a',
	},
	{
		icon: <TeamOutlined />,
		label: 'Fanpage Facebook',
		value: 'facebook.com/tuyensinh.ptit',
		note: 'Cập nhật tin tức và giải đáp thắc mắc 24/7',
		color: '#1677ff',
	},
];

const FAQ_DATA = [
	{
		q: 'Điểm chuẩn năm 2026 là bao nhiêu?',
		a: 'Điểm chuẩn năm 2026 sẽ được công bố sau khi kết thúc đợt xét tuyển đầu tiên (dự kiến 15/08/2026). Bạn có thể tham khảo điểm chuẩn năm 2025 tại mục Tra cứu điểm chuẩn.',
	},
	{
		q: 'Hồ sơ xét tuyển cần những gì?',
		a: 'Hồ sơ gồm: Thông tin cá nhân (CCCD, họ tên, ngày sinh...), hồ sơ minh chứng (CCCD, ảnh chân dung), thông tin học tập (điểm THPT, trường THPT...), và nguyện vọng xét tuyển (trường, ngành, tổ hợp).',
	},
	{
		q: 'Tôi có thể thay đổi nguyện vọng sau khi nộp không?',
		a: 'Sau khi nộp hồ sơ thành công, bạn không thể chỉnh sửa nguyện vọng. Hãy kiểm tra kỹ trước khi nhấn nộp.',
	},
	{
		q: 'Học phí thanh toán như thế nào?',
		a: 'Học phí được thanh toán theo học kỳ qua chuyển khoản ngân hàng hoặc đóng trực tiếp tại phòng Tài vụ. Xem chi tiết tại mục Học phí & Hỗ trợ tài chính.',
	},
	{
		q: 'Có học bổng cho sinh viên mới không?',
		a: 'Có nhiều loại học bổng: Học bổng xuất sắc (10 triệu/năm), học bổng khuyến khích (5 triệu/năm), và học bổng hỗ trợ (3 triệu/năm) dành cho sinh viên có hoàn cảnh khó khăn.',
	},
	{
		q: 'Làm sao để liên hệ tư vấn viên?',
		a: 'Bạn có thể gọi hotline 1900 1234, gửi email tuyensinh@ptit.edu.vn, hoặc tham gia buổi tư vấn trực tuyến vào thứ 4 và thứ 6 hàng tuần. Trợ lý AI cũng hỗ trợ 24/7.',
	},
];

const ContactPage: React.FC = () => {
	const [isChatOpen, setIsChatOpen] = useState(false);

	return (
		<div className={styles.page}>
			<div className={styles.topBar}>
				<div className={styles.topBarInner}>
					<div className={styles.topBarLeft}>
						<GlobalOutlined />
						<span>Cổng thông tin tuyển sinh trực tuyến</span>
					</div>
					<div className={styles.topBarRight}>
						<Button size="small" icon={<ArrowLeftOutlined />} onClick={() => history.push('/student')}>
							Quay lại
						</Button>
					</div>
				</div>
			</div>

			<div className={styles.layout}>
				<div className={styles.header}>
					<Title level={2}>
						<PhoneOutlined style={{ color: '#c41e3a' }} /> Liên hệ tư vấn
					</Title>
					<Text type="secondary" style={{ fontSize: 16 }}>
						Đội ngũ tư vấn tuyển sinh sẵn sàng hỗ trợ bạn 24/7
					</Text>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<PhoneOutlined style={{ color: '#c41e3a' }} /> Thông tin liên hệ
					</div>
					<div className={styles.contactList}>
						{CONTACTS.map((c) => (
							<div key={c.label} className={styles.contactCard} style={{ borderLeft: `4px solid ${c.color}` }}>
								<div className={styles.contactIcon} style={{ color: c.color }}>
									{c.icon}
								</div>
								<div>
									<Text type="secondary" style={{ fontSize: 12 }}>{c.label}</Text>
									<div className={styles.contactValue}>{c.value}</div>
									<Text type="secondary" style={{ fontSize: 12 }}>{c.note}</Text>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<CommentOutlined style={{ color: '#c41e3a' }} /> Câu hỏi thường gặp
					</div>
					<div className={styles.faqList}>
						{FAQ_DATA.map((item, i) => (
							<div key={i} className={styles.faqItem}>
								<div className={styles.faqQ}>
									<Title level={5} style={{ margin: 0, fontSize: 14 }}>{item.q}</Title>
								</div>
								<Paragraph type="secondary" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
									{item.a}
								</Paragraph>
							</div>
						))}
					</div>
				</div>
			</div>

			<ChatBubble isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
		</div>
	);
};

export default ContactPage;
