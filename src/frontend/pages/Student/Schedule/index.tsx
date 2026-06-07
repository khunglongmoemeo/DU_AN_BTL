import { useState } from 'react';
import { history } from 'umi';
import {
	ArrowLeftOutlined,
	CalendarOutlined,
	ClockCircleOutlined,
	GlobalOutlined,
	TeamOutlined,
} from '@ant-design/icons';
import { Button, Tag, Typography } from 'antd';
import ChatBubble from '../../../components/ChatBubble';
import styles from './index.less';

const { Title, Text } = Typography;

const SCHEDULE_EVENTS = [
	{
		phase: 'PHASE 1',
		title: 'Giai đoạn 1 — Mở đăng ký xét tuyển',
		color: '#c41e3a',
		date: '01/06/2026 — 31/07/2026',
		tasks: [
			{ step: 1, title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản trên cổng tuyển sinh', date: '01/06/2026 — 15/06/2026', done: true },
			{ step: 2, title: 'Hoàn thiện hồ sơ tuyển sinh', desc: 'Điền đầy đủ thông tin cá nhân, tải hồ sơ minh chứng, nhập điểm THPT', date: '01/06/2026 — 20/07/2026', done: true },
			{ step: 3, title: 'Nộp hồ sơ xét tuyển', desc: 'Kiểm tra checklist và nhấn nộp hồ sơ', date: '15/07/2026 — 31/07/2026', done: false },
			{ step: 4, title: 'Công bố kết quả đợt 1', desc: 'Trường công bố điểm chuẩn và kết quả trúng tuyển đợt 1', date: '05/08/2026 — 10/08/2026', done: false },
		],
	},
	{
		phase: 'PHASE 2',
		title: 'Giai đoạn 2 — Xác nhận nhập học',
		color: '#1677ff',
		date: '01/08/2026 — 01/09/2026',
		tasks: [
			{ step: 1, title: 'Xác nhận nhập học', desc: 'Thí sinh trúng tuyển xác nhận nhập học trên hệ thống', date: '01/08/2026 — 25/08/2026', done: false },
			{ step: 2, title: 'Đóng đăng ký đợt 1', desc: 'Kết thúc đợt 1 xét tuyển', date: '31/07/2026', done: false },
			{ step: 3, title: 'Xét tuyển đợt bổ sung (nếu còn chỉ tiêu)', desc: 'Tiếp nhận hồ sơ đợt bổ sung', date: '01/08/2026 — 31/08/2026', done: false },
			{ step: 4, title: 'Công bố kết quả đợt 2', desc: 'Công bố kết quả đợt bổ sung', date: '10/09/2026 — 15/09/2026', done: false },
		],
	},
	{
		phase: 'PHASE 3',
		title: 'Giai đoạn 3 — Khai giảng',
		color: '#52c41a',
		date: '15/09/2026',
		tasks: [
			{ step: 1, title: 'Khai giảng năm học mới', desc: 'Lễ khai giảng và bắt đầu học kỳ 1 năm học 2026-2027', date: '15/09/2026', done: false },
			{ step: 2, title: 'Đào tạo chính thức', desc: 'Sinh viên bắt đầu tham gia chương trình đào tạo', date: 'Từ 16/09/2026', done: false },
		],
	},
];

const CONSULTATION_SCHEDULE = [
	{ day: 'Thứ 4 hàng tuần', time: '14:00 — 16:00', topic: 'Tư vấn chung về tuyển sinh', format: 'Zoom / Facebook Live' },
	{ day: 'Thứ 6 hàng tuần', time: '14:00 — 16:00', topic: 'Tư vấn chuyên ngành cụ thể', format: 'Zoom / Facebook Live' },
];

const SchedulePage: React.FC = () => {
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
						<CalendarOutlined style={{ color: '#c41e3a' }} /> Lịch tuyển sinh 2026
					</Title>
					<Text type="secondary" style={{ fontSize: 16 }}>
						Lịch trình chi tiết các giai đoạn tuyển sinh và hoạt động tư vấn năm 2026
					</Text>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<ClockCircleOutlined style={{ color: '#c41e3a' }} /> Tổng quan tiến độ
					</div>
					<div className={styles.timeline}>
						{SCHEDULE_EVENTS.map((event) => (
							<div key={event.phase} className={styles.timelinePhase} style={{ borderLeftColor: event.color }}>
								<div className={styles.phaseBadge} style={{ background: event.color }}>
									{event.phase}
								</div>
								<div className={styles.phaseInfo}>
									<div className={styles.phaseTitle}>{event.title}</div>
									<div className={styles.phaseDate}>
										<ClockCircleOutlined /> {event.date}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<CalendarOutlined style={{ color: '#c41e3a' }} /> Chi tiết từng giai đoạn
					</div>
					{SCHEDULE_EVENTS.map((event) => (
						<div key={event.phase} className={styles.phaseCard} style={{ borderTop: `4px solid ${event.color}` }}>
							<div className={styles.phaseCardHeader}>
								<Tag color={event.color}>{event.phase}</Tag>
								<Title level={4} style={{ margin: 0, flex: 1 }}>{event.title}</Title>
								<Text type="secondary" style={{ fontSize: 13 }}>
									<ClockCircleOutlined /> {event.date}
								</Text>
							</div>
							<div className={styles.taskList}>
								{event.tasks.map((task, idx) => (
									<div key={task.step} className={`${styles.taskItem} ${task.done ? styles.taskDone : ''}`}>
										<div className={styles.taskStep}>
											<div className={`${styles.stepCircle} ${task.done ? styles.stepDone : ''}`}>
												{task.done ? '✓' : task.step}
											</div>
											{idx < event.tasks.length - 1 && <div className={styles.stepLine} />}
										</div>
										<div className={styles.taskContent}>
											<div className={styles.taskTitle}>
												{task.title}
												{task.done && <Tag color="green" style={{ marginLeft: 8 }}>Hoàn thành</Tag>}
											</div>
											<Text type="secondary" style={{ fontSize: 13 }}>{task.desc}</Text>
											<div className={styles.taskDate}>
												<ClockCircleOutlined /> {task.date}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>
						<TeamOutlined style={{ color: '#c41e3a' }} /> Lịch tư vấn trực tuyến
					</div>
					<div className={styles.consultGrid}>
						{CONSULTATION_SCHEDULE.map((c, i) => (
							<div key={i} className={styles.consultCard}>
								<div className={styles.consultDay}>{c.day}</div>
								<div className={styles.consultTime}>
									<ClockCircleOutlined /> {c.time}
								</div>
								<div className={styles.consultTopic}>{c.topic}</div>
								<Tag color="blue">{c.format}</Tag>
							</div>
						))}
					</div>
				</div>
			</div>

			<ChatBubble isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
		</div>
	);
};

export default SchedulePage;
