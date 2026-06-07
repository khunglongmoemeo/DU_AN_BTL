import { useState } from 'react';
import { history } from 'umi';
import {
	ArrowLeftOutlined,
	AuditOutlined,
	BookOutlined,
	ClockCircleOutlined,
	GlobalOutlined,
	ReadOutlined,
	StarOutlined,
	TeamOutlined,
} from '@ant-design/icons';
import { Button, Card, Divider, Tag, Typography } from 'antd';
import ChatBubble from '../../../components/ChatBubble';
import styles from './index.less';

const { Title, Text } = Typography;

const PROGRAMS = [
	{
		key: 'cntt',
		code: 'CNTT',
		name: 'Công nghệ thông tin',
		degree: 'Kỹ sư',
		duration: '4 năm',
		description:
			'Đào tạo kỹ sư có kiến thức vững chắc về công nghệ phần mềm, mạng máy tính, an toàn thông tin, hệ thống thông tin và trí tuệ nhân tạo.',
		outcomes: [
			'Phát triển phần mềm ứng dụng web, mobile',
			'Quản trị hệ thống mạng doanh nghiệp',
			'Phân tích và thiết kế hệ thống thông tin',
			'Nghiên cứu và phát triển AI',
		],
		subjects: 'A00 (Toán, Lý, Hóa)',
		cutoff2025: '24.5',
		icon: <AuditOutlined />,
		tags: ['Hot', '4 năm', 'Kỹ sư'],
	},
	{
		key: 'tmdt',
		code: 'TMDT',
		name: 'Thương mại điện tử',
		degree: 'Kỹ sư',
		duration: '4 năm',
		description:
			'Chương trình kết hợp kiến thức kinh doanh và công nghệ, đào tạo chuyên gia thương mại điện tử, marketing số và quản lý nền tảng trực tuyến.',
		outcomes: [
			'Vận hành sàn thương mại điện tử',
			'Marketing số và quản lý nội dung đa kênh',
			'Phân tích dữ liệu khách hàng trực tuyến',
			'Xây dựng chiến lược kinh doanh số',
		],
		subjects: 'A00, A01, D01',
		cutoff2025: '22.0',
		icon: <ReadOutlined />,
		tags: ['4 năm', 'Kỹ sư'],
	},
	{
		key: 'tts',
		code: 'TTS',
		name: 'Truyền thông số',
		degree: 'Kỹ sư',
		duration: '4 năm',
		description:
			'Đào tạo kỹ sư truyền thông có năng lực sáng tạo nội dung số, thiết kế đồ họa, sản xuất phim và quản trị truyền thông đa nền tảng.',
		outcomes: [
			'Sáng tạo nội dung số đa phương tiện',
			'Thiết kế đồ họa và giao diện số',
			'Sản xuất phim và video truyền thông',
			'Quản trị truyền thông thương hiệu',
		],
		subjects: 'A00, A01, D01',
		cutoff2025: '21.5',
		icon: <StarOutlined />,
		tags: ['4 năm', 'Kỹ sư'],
	},
	{
		key: 'attt',
		code: 'ATTT',
		name: 'An toàn thông tin',
		degree: 'Kỹ sư',
		duration: '4 năm',
		description:
			'Đào tạo chuyên gia an toàn thông tin, có khả năng phòng chống tấn công mạng, bảo mật hệ thống và phát triển giải pháp an ninh mạng.',
		outcomes: [
			'Kiểm thử xâm nhập và đánh giá lỗ hổng bảo mật',
			'Thiết kế và triển khai hệ thống bảo mật',
			'Phân tích mã độc và forensic',
			'Tư vấn an ninh mạng cho doanh nghiệp',
		],
		subjects: 'A00, A01',
		cutoff2025: '23.0',
		icon: <TeamOutlined />,
		tags: ['Hot', '4 năm', 'Kỹ sư'],
	},
	{
		key: 'dttt',
		code: 'ĐTT',
		name: 'Kỹ thuật điện tử viễn thông',
		degree: 'Kỹ sư',
		duration: '4 năm',
		description:
			'Chương trình đào tạo kỹ sư về hệ thống viễn thông, truyền dẫn tín hiệu, IoT và mạng di động thế hệ mới.',
		outcomes: [
			'Thiết kế và vận hành hệ thống viễn thông',
			'Phát triển ứng dụng IoT',
			'Triển khai mạng 4G/5G',
			'Nghiên cứu truyền thông vô tuyến',
		],
		subjects: 'A00, A01',
		cutoff2025: '22.5',
		icon: <BookOutlined />,
		tags: ['4 năm', 'Kỹ sư'],
	},
	{
		key: 'ai',
		code: 'AI',
		name: 'Khoa học Dữ liệu & Trí tuệ Nhân tạo',
		degree: 'Kỹ sư',
		duration: '4 năm',
		description:
			'Chương trình mới 2026 — đào tạo kỹ sư AI và Khoa học Dữ liệu, đáp ứng nhu cầu nhân lực trí tuệ nhân tạo và phân tích dữ liệu lớn.',
		outcomes: [
			'Xây dựng và triển khai mô hình Machine Learning',
			'Phân tích dữ liệu lớn (Big Data)',
			'Phát triển ứng dụng Deep Learning & NLP',
			'Kiến trúc giải pháp AI cho doanh nghiệp',
		],
		subjects: 'A00, A01',
		cutoff2025: '— (mới)',
		icon: <AuditOutlined />,
		tags: ['Mới 2026', '4 năm', 'Kỹ sư'],
	},
];

const TrainingPage: React.FC = () => {
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
						<BookOutlined style={{ color: '#c41e3a' }} /> Chương trình đào tạo
					</Title>
					<Text type="secondary" style={{ fontSize: 16 }}>
						Danh sách các ngành đào tạo và chỉ tiêu tuyển sinh năm 2026
					</Text>
				</div>

				<div className={styles.programsGrid}>
					{PROGRAMS.map((program) => (
						<Card key={program.key} className={styles.programCard} bodyStyle={{ padding: 20 }}>
							<div className={styles.programHeader}>
								<div className={styles.programIcon}>{program.icon}</div>
								<div>
									<Title level={4} style={{ margin: 0, color: '#1e293b' }}>
										{program.name}
									</Title>
									<Text type="secondary" style={{ fontSize: 13 }}>
										Mã ngành: {program.code} · {program.degree} · {program.duration}
									</Text>
								</div>
							</div>

							<div className={styles.programTags}>
								{program.tags.map((tag) => (
									<Tag
										key={tag}
										color={tag.includes('Hot') ? 'red' : tag.includes('Mới') ? 'green' : 'blue'}
									>
										{tag}
									</Tag>
								))}
							</div>

							<Text className={styles.programDesc}>{program.description}</Text>

							<Divider style={{ margin: '12px 0' }} />

							<div className={styles.programDetails}>
								<div className={styles.detailRow}>
									<ClockCircleOutlined style={{ color: '#c41e3a' }} />
									<span>Thời gian đào tạo: {program.duration}</span>
								</div>
								<div className={styles.detailRow}>
									<BookOutlined style={{ color: '#c41e3a' }} />
									<span>Bằng cấp: {program.degree}</span>
								</div>
								<div className={styles.detailRow}>
									<GlobalOutlined style={{ color: '#c41e3a' }} />
									<span>Tổ hợp xét tuyển: {program.subjects}</span>
								</div>
								<div className={styles.detailRow}>
									<StarOutlined style={{ color: '#c41e3a' }} />
									<span>Điểm chuẩn 2025: {program.cutoff2025}</span>
								</div>
								<div style={{ marginTop: 10 }}>
									<Text strong style={{ fontSize: 13, color: '#1e293b' }}>
										Chuẩn đầu ra sau khi tốt nghiệp:
									</Text>
									<ul className={styles.outcomesList}>
										{program.outcomes.map((o, idx) => (
											<li key={idx}>{o}</li>
										))}
									</ul>
								</div>
							</div>
						</Card>
					))}
				</div>
			</div>

			<ChatBubble isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
		</div>
	);
};

export default TrainingPage;
