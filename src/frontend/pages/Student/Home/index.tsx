import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  message,
  Popover,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  AccountBookOutlined,
  AuditOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileProtectOutlined,
  GlobalOutlined,
  LogoutOutlined,
  NotificationOutlined,
  PhoneOutlined,
  ReadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  StarOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history } from 'umi';
import { getCurrentUser, logout } from '../../../utils/auth';
import { getMyAdmissionApplication } from '../../../services/admission';
import ChatBubble from '../../../components/ChatBubble';
import styles from './index.less';

const { Title, Text } = Typography;

const STATS = [
  { num: '24', label: 'Ngành đào tạo' },
  { num: '12K+', label: 'Chỉ tiêu tuyển sinh' },
  { num: '95%', label: 'Sinh viên có việc làm' },
];

const NEWS = [
  {
    day: '28',
    month: 'THG 6',
    title: 'Thông báo tuyển sinh đại học chính quy năm 2026',
    meta: 'Phòng Đào tạo · 120 lượt xem',
  },
  {
    day: '25',
    month: 'THG 6',
    title: 'Điểm chuẩn trúng tuyển đợt 1 năm học 2026',
    meta: 'Phòng Tuyển sinh · 1.2K lượt xem',
  },
  {
    day: '20',
    month: 'THG 6',
    title: 'Hướng dẫn đăng ký xét tuyển trực tuyến năm 2026',
    meta: 'Hướng dẫn · 3.5K lượt xem',
  },
  {
    day: '15',
    month: 'THG 6',
    title: 'Chương trình đào tạo mới: Khoa học Dữ liệu & AI',
    meta: 'Phòng Đào tạo · 890 lượt xem',
  },
  {
    day: '10',
    month: 'THG 6',
    title: 'Thông tin học phí và chính sách hỗ trợ tài chính năm 2026',
    meta: 'Phòng Tài vụ · 560 lượt xem',
  },
  {
    day: '05',
    month: 'THG 6',
    title: 'Lịch trực tuyến tư vấn tuyển sinh tháng 6/2026',
    meta: 'Tuyển sinh · 2.1K lượt xem',
  },
];

const TIMELINE = [
  { color: 'blue', title: 'Mở đăng ký xét tuyển', date: '01/06/2026', done: true },
  { color: 'blue', title: 'Đóng đăng ký đợt 1', date: '31/07/2026', done: false },
  { color: 'gray', title: 'Công bố điểm chuẩn', date: '15/08/2026', done: false },
  { color: 'gray', title: 'Xác nhận nhập học', date: '01/09/2026', done: false },
  { color: 'gray', title: 'Khai giảng năm học mới', date: '15/09/2026', done: false },
];

const QUICK_LINKS = [
  { icon: <SolutionOutlined />, label: 'Xem thông tin tuyển sinh', path: '/student/form' },
  { icon: <FileProtectOutlined />, label: 'Tra cứu điểm chuẩn', path: '/student/cutoff' },
  { icon: <ReadOutlined />, label: 'Chương trình đào tạo', path: '/student/training' },
  { icon: <AccountBookOutlined />, label: 'Học phí & Hỗ trợ tài chính', path: '/student/tuition' },
  { icon: <ScheduleOutlined />, label: 'Lịch tuyển sinh', path: '/student/schedule' },
  { icon: <PhoneOutlined />, label: 'Liên hệ tư vấn', path: '/student/contact' },
];

interface ApplicationData {
  status: string;
  personalInfo?: Record<string, any>;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  checklist?: Array<{ key: string; label: string; done: boolean; step: number }>;
}

const StudentHome: React.FC = () => {
  const user = getCurrentUser();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState('draft');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!user || user.role !== 'student') {
    history.replace('/user/login');
    return null;
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMyAdmissionApplication();
        const data: ApplicationData = res.data.data;
        setApplicationStatus(data.status || 'draft');
        setSubmittedAt(data.submittedAt || null);
        setRejectionReason(data.rejectionReason || null);
      } catch {
        // chưa có hồ sơ
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    logout();
    history.push('/user/login');
  };

  const statusLabel = () => {
    if (applicationStatus === 'submitted') return 'Đã nộp';
    if (applicationStatus === 'reviewing') return 'Đang duyệt';
    if (applicationStatus === 'approved') return 'Đã duyệt';
    if (applicationStatus === 'rejected') return 'Từ chối';
    if (applicationStatus === 'needs_revision') return 'Cần bổ sung';
    return 'Chưa nộp';
  };

  const badgeClass = () => {
    if (applicationStatus === 'submitted' || applicationStatus === 'reviewing') return styles.badgeSubmitted;
    if (applicationStatus === 'approved') return styles.badgeApproved;
    return styles.badgeDraft;
  };

  const accountPopoverContent = (
    <div className={styles.accountPopover} onClick={(e) => e.stopPropagation()}>
      <div className={styles.accountPopoverHeader}>
        <div className={styles.avatar}>{user.full_name?.charAt(0) || 'S'}</div>
        <div>
          <Title level={5} style={{ margin: 0 }}>{user.full_name}</Title>
          <Text type="secondary">{user.email}</Text>
        </div>
      </div>
      <div className={styles.accountInfoList}>
        <div className={styles.accountInfoItem}>
          <span>Họ và tên</span>
          <strong>{user.full_name}</strong>
        </div>
        <div className={styles.accountInfoItem}>
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div className={styles.accountInfoItem}>
          <span>SĐT</span>
          <strong>{user.phone || 'Chưa cập nhật'}</strong>
        </div>
      </div>
      <Button
        icon={<LogoutOutlined />}
        onClick={() => { setAccountOpen(false); handleLogout(); }}
        className={styles.logoutBtn}
      >
        Đăng xuất
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.topBarLeft}>
            <GlobalOutlined />
            <span>Cổng thông tin tuyển sinh trực tuyến · Hệ thống Tuyển sinh Trực tuyến</span>
          </div>
          <div className={styles.topBarRight}>
            <Popover
              content={accountPopoverContent}
              trigger="click"
              placement="bottomRight"
              visible={accountOpen}
              onVisibleChange={setAccountOpen}
              overlayClassName={styles.accountPopoverOverlay}
            >
              <Button className={styles.accountBtn} icon={<UserOutlined />}>
                {user.full_name?.split(' ').pop()}
              </Button>
            </Popover>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <Title className={styles.bannerTitle}>
            Hệ thống Tuyển sinh<br />Trực tuyến
          </Title>
          <Text className={styles.bannerSub}>
            Chào mừng bạn đến với cổng tuyển sinh trực tuyến · Năm tuyển sinh 2026
          </Text>
          <div className={styles.bannerActions}>
            <Button
              className={styles.btnPrimary}
              onClick={() => history.push('/student/form')}
            >
              <EditOutlined /> Nộp hồ sơ trực tuyến
            </Button>
            <Button className={styles.btnOutline} onClick={() => history.push('/student/cutoff')}>
              <SafetyCertificateOutlined /> Tra cứu điểm chuẩn
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Main column */}
        <div>
          {/* Stats */}
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.statsRow}>
                {STATS.map((s) => (
                  <div className={styles.statItem} key={s.label}>
                    <span className={styles.statNum}>{s.num}</span>
                    <span className={styles.statLabel}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <ScheduleOutlined style={{ color: '#c41e3a' }} />
              Lịch trình tuyển sinh 2026
            </div>
            <div className={styles.cardBody}>
              <Timeline
                items={TIMELINE.map((t) => ({
                  color: t.color,
                  children: (
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineDot} style={{ background: t.color === 'blue' ? '#c41e3a' : '#e2e8f0' }} />
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>{t.title}</div>
                        <div className={styles.timelineDate}>{t.date}</div>
                      </div>
                    </div>
                  ),
                }))}
              />
            </div>
          </div>

          {/* Quick links */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <StarOutlined style={{ color: '#c41e3a' }} />
              Liên kết nhanh
            </div>
            <div className={styles.cardBody} style={{ padding: '12px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {QUICK_LINKS.map((link) => (
                  <div
                    key={link.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: '#f8fbff',
                      border: '1px solid #dce8f5',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#8b0000',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                    onClick={() => {
                      if (link.path) history.push(link.path);
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#c41e3a';
                      (e.currentTarget as HTMLDivElement).style.background = '#e8f3ff';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#dce8f5';
                      (e.currentTarget as HTMLDivElement).style.background = '#f8fbff';
                    }}
                  >
                    <span style={{ color: '#c41e3a', fontSize: '16px' }}>{link.icon}</span>
                    {link.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* News */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <NotificationOutlined style={{ color: '#c41e3a' }} />
              Tin tức tuyển sinh
              <Tag color="blue" style={{ marginLeft: 'auto', fontWeight: 700 }}>Mới nhất</Tag>
            </div>
            <div className={styles.cardBody} style={{ padding: '10px 18px' }}>
              {NEWS.map((item, i) => (
                <div
                  className={styles.newsItem}
                  key={i}
                  onClick={() => message.info(`Đang xem: ${item.title}`)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f0f7ff'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div className={styles.newsDate}>
                    <span className={styles.day}>{item.day}</span>
                    <span className={styles.month}>{item.month}</span>
                  </div>
                  <div className={styles.newsContent}>
                    <div className={styles.newsTitle}>{item.title}</div>
                    <div className={styles.newsMeta}>{item.meta}</div>
                  </div>
                  <RightOutlined style={{ color: '#94a3b8', flex: 'none', fontSize: '12px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* Application status card */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <AuditOutlined />
              Hồ sơ tuyển sinh của tôi
            </div>
            <div className={styles.sidebarCardBody}>
              <div className={badgeClass()}>
                {applicationStatus === 'approved' ? <CheckCircleOutlined /> : applicationStatus !== 'draft' ? <ClockCircleOutlined /> : <EditOutlined />}
                Trạng thái: {statusLabel()}
              </div>

              {rejectionReason && (
                <Alert
                  type="error"
                  showIcon
                  message="Lý do từ chối"
                  description={rejectionReason}
                  style={{ marginBottom: '12px', fontSize: '12px' }}
                />
              )}

              {applicationStatus === 'draft' && (
                <Alert
                  type="warning"
                  showIcon
                  message="Bạn chưa nộp hồ sơ"
                  description="Hoàn thiện hồ sơ và nộp để tham gia xét tuyển."
                  style={{ marginBottom: '12px', fontSize: '12px' }}
                />
              )}

              <Button
                block
                type="primary"
                className={styles.ctaButton}
                icon={<EditOutlined />}
                onClick={() => history.push('/student/form')}
              >
                Đăng ký hồ sơ tuyển sinh
              </Button>

              {applicationStatus === 'submitted' && submittedAt && (
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', textAlign: 'center' }}>
                  Đã nộp lúc {new Date(submittedAt).toLocaleDateString('vi-VN')}
                </Text>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <PhoneOutlined />
              Liên hệ tư vấn
            </div>
            <div className={styles.sidebarCardBody}>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><PhoneOutlined /></div>
                <div>
                  <div className={styles.infoLabel}>Tổng đài</div>
                  <div className={styles.infoValue}>1900 1234</div>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><BellOutlined /></div>
                <div>
                  <div className={styles.infoLabel}>Email</div>
                  <div className={styles.infoValue}>tuyensinh@ptit.edu.vn</div>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><TeamOutlined /></div>
                <div>
                  <div className={styles.infoLabel}>Giờ làm việc</div>
                  <div className={styles.infoValue}>T2–T6: 8:00–17:00</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Assistant shortcut */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>
              <SafetyCertificateOutlined />
              Trợ lý AI
            </div>
            <div className={styles.sidebarCardBody}>
              <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '12px', lineHeight: 1.6 }}>
                Bạn có câu hỏi về tuyển sinh? Hỏi ngay trợ lý AI của chúng tôi để được tư vấn 24/7.
              </Text>
              <Button
                block
                icon={<SafetyCertificateOutlined />}
                onClick={() => setIsChatOpen(true)}
                style={{
                  height: '40px',
                  fontWeight: 700,
                  borderColor: '#c41e3a',
                  color: '#c41e3a',
                  borderRadius: '8px',
                }}
              >
                Hỏi trợ lý AI
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ChatBubble isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
    </div>
  );
};

export default StudentHome;
