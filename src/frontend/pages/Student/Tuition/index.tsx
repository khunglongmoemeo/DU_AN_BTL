import { useState } from 'react';
import { history } from 'umi';
import {
	ArrowLeftOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	GlobalOutlined,
	StarOutlined,
	WalletOutlined,
} from '@ant-design/icons';
import { Button, Divider, Tag, Typography } from 'antd';
import ChatBubble from '../../../components/ChatBubble';
import styles from './index.less';

const { Title, Text } = Typography;

const TUITION_DATA = [
	{
		group: 'Nhóm ngành Công nghệ',
		majors: ['Công nghệ thông tin', 'An toàn thông tin', 'Khoa học Dữ liệu & AI'],
		tuitionPerYear: 24000000,
		tuitionPerSemester: 12000000,
	},
	{
		group: 'Nhóm ngành Kỹ thuật',
		majors: ['Kỹ thuật điện tử viễn thông'],
		tuitionPerYear: 22000000,
		tuitionPerSemester: 11000000,
	},
	{
		group: 'Nhóm ngành Kinh tế - Truyền thông',
		majors: ['Thương mại điện tử', 'Truyền thông số', 'Quản trị kinh doanh', 'Marketing'],
		tuitionPerYear: 20000000,
		tuitionPerSemester: 10000000,
	},
];

const SCHOLARSHIPS = [
	{
		name: 'Học bổng Xuất sắc',
		amount: 10000000,
		condition: 'Điểm xét tuyển đầu vào thuộc top 5% ngành',
		color: '#c41e3a',
	},
	{
		name: 'Học bổng Khuyến khích',
		amount: 5000000,
		condition: 'Sinh viên năm 1 có điểm đầu vào top 15%',
		color: '#1677ff',
	},
	{
		name: 'Học bổng Hỗ trợ',
		amount: 3000000,
		condition: 'Sinh viên có hoàn cảnh khó khăn, điểm đầu vào top 30%',
		color: '#52c41a',
	},
	{
		name: 'Học bổng Thể thao - Văn hóa',
		amount: 5000000,
		condition: 'Vận động viên, nghệ sĩ đạt giải cấp tỉnh/thành phố trở lên',
		color: '#722ed1',
	},
	{
		name: 'Học bổng Cộng đồng',
		amount: 3000000,
		condition: 'Sinh viên tham gia hoạt động tình nguyện từ 100h/năm',
		color: '#fa8c16',
	},
];

const FEE_REDUCTION = [
	{ name: 'Sinh viên dân tộc thiểu số', reduction: '50%' },
	{ name: 'Sinh viên hộ nghèo/cận nghèo', reduction: '100%' },
	{ name: 'Sinh viên khuyết tật', reduction: '100%' },
	{ name: 'Sinh viên tham gia RSQ', reduction: '30%' },
];

const PAYMENT_METHODS = [
	{ method: 'Chuyển khoản ngân hàng', detail: 'STK: 1234 5678 9012 — Ngân hàng VietinBank, chi nhánh Hà Nội' },
	{ method: 'Thanh toán trực tiếp', detail: 'Phòng Tài vụ, Tầng 2, Nhà A — Thứ 2 đến Thứ 6, 8:00–17:00' },
	{ method: 'Thanh toán online', detail: 'Qua cổng thanh toán trực tuyến trên website nhà trường' },
];

const formatVND = (n: number) =>
	new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const TuitionPage: React.FC = () => {
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
						<WalletOutlined style={{ color: '#c41e3a' }} /> Học phí & Hỗ trợ tài chính
					</Title>
					<Text type="secondary" style={{ fontSize: 16 }}>
						Thông tin học phí năm học 2026-2027 và các chính sách hỗ trợ tài chính dành cho sinh viên
					</Text>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<WalletOutlined style={{ color: '#c41e3a' }} /> Học phí theo nhóm ngành (năm học 2026-2027)
					</div>
					<div className={styles.tuitionGrid}>
						{TUITION_DATA.map((item) => (
							<div key={item.group} className={styles.tuitionCard}>
								<div className={styles.tuitionCardHeader}>{item.group}</div>
								<div className={styles.tuitionAmount}>{formatVND(item.tuitionPerYear)}</div>
								<Text type="secondary" style={{ fontSize: 13 }}>/năm học</Text>
								<Divider style={{ margin: '12px 0' }} />
								<Text strong style={{ fontSize: 13, color: '#64748b' }}>Ngành:</Text>
								<ul className={styles.majorList}>
									{item.majors.map((m) => (
										<li key={m}>{m}</li>
									))}
								</ul>
								<div className={styles.semesterNote}>
									<ClockCircleOutlined /> {formatVND(item.tuitionPerSemester)}/học kỳ
								</div>
							</div>
						))}
					</div>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<StarOutlined style={{ color: '#c41e3a' }} /> Học bổng năm học 2026-2027
					</div>
					<div className={styles.scholarshipGrid}>
						{SCHOLARSHIPS.map((s) => (
							<div key={s.name} className={styles.scholarshipCard} style={{ borderLeft: `4px solid ${s.color}` }}>
								<div className={styles.scholarshipName} style={{ color: s.color }}>
									<StarOutlined /> {s.name}
								</div>
								<div className={styles.scholarshipAmount}>{formatVND(s.amount)}</div>
								<Text type="secondary" style={{ fontSize: 13 }}>/năm</Text>
								<Divider style={{ margin: '10px 0' }} />
								<Text style={{ fontSize: 13, color: '#475569' }}>{s.condition}</Text>
							</div>
						))}
					</div>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<CheckCircleOutlined style={{ color: '#c41e3a' }} /> Miễn giảm học phí
					</div>
					<div className={styles.reductionList}>
						{FEE_REDUCTION.map((item) => (
							<div key={item.name} className={styles.reductionItem}>
								<CheckCircleOutlined style={{ color: '#52c41a' }} />
								<span>{item.name}</span>
								<Tag color="green">{item.reduction}</Tag>
							</div>
						))}
					</div>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<WalletOutlined style={{ color: '#c41e3a' }} /> Phương thức thanh toán
					</div>
					<div className={styles.paymentList}>
						{PAYMENT_METHODS.map((p, i) => (
							<div key={i} className={styles.paymentItem}>
								<div className={styles.paymentMethod}>{p.method}</div>
								<Text type="secondary" style={{ fontSize: 13 }}>{p.detail}</Text>
							</div>
						))}
					</div>
				</div>
			</div>

			<ChatBubble isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
		</div>
	);
};

export default TuitionPage;
