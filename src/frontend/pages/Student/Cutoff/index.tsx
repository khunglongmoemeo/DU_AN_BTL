import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  message,
  Popover,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DownloadOutlined,
  FileProtectOutlined,
  GlobalOutlined,
  HomeOutlined,
  LogoutOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history } from 'umi';
import { getCurrentUser, logout } from '../../../utils/auth';
import { getCutoffScores, getCutoffUniversities, getCutoffYears, getCutoffCombinations } from '../../../services/admission';
import ChatBubble from '../../../components/ChatBubble';
import styles from './index.less';

const { Title, Text } = Typography;

interface CutoffRow {
  id: number;
  university_id: number;
  university_name: string;
  university_short: string;
  combination_id: number;
  combination_code: string;
  subject_names: string;
  year: number;
  score: number;
  notes: string | null;
}

interface University {
  id: number;
  code: string;
  name: string;
  short_name: string;
}

interface ScoreFilter {
  university_id?: number;
  year?: number;
  combination_id?: number;
}

interface Combination {
  id: number;
  code: string;
  subject_names: string;
}

const DEFAULT_YEAR = 2026;

const CutoffPage: React.FC = () => {
  const user = getCurrentUser();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<CutoffRow[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([DEFAULT_YEAR]);
  const [filter, setFilter] = useState<ScoreFilter>({ year: DEFAULT_YEAR });
  const [exporting, setExporting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!user || user.role !== 'student') {
    history.replace('/user/login');
    return null;
  }

  useEffect(() => {
    const init = async () => {
      try {
        const [uniRes, yearRes, comboRes] = await Promise.all([
          getCutoffUniversities(),
          getCutoffYears(),
          getCutoffCombinations(),
        ]);
        setUniversities(uniRes.data.data);
        setCombinations(comboRes.data.data);
        const years = yearRes.data.data as number[];
        setAvailableYears(years.length > 0 ? years : [DEFAULT_YEAR]);
        if (years.length > 0) {
          setFilter((f) => ({ ...f, year: years[0] }));
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      if (!filter.year) return;
      try {
        setLoading(true);
        const res = await getCutoffScores({
          university_id: filter.university_id,
          year: filter.year,
          combination_id: filter.combination_id,
        });
        setScores(res.data.data);
      } catch (err) {
        message.error('Không thể tải danh sách điểm chuẩn');
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [filter]);

  const handleLogout = () => {
    logout();
    history.push('/user/login');
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

  const handleExport = () => {
    setExporting(true);
    try {
      const headers = ['Trường', 'Mã trường', 'Khối', 'Tổ hợp môn', 'Điểm chuẩn', 'Ghi chú'];
      const rows = scores.map((s) => [
        s.university_name,
        s.university_short,
        s.combination_code,
        s.subject_names,
        s.score.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        s.notes || '',
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diem-chuan-${filter.year || 2026}${filter.university_id ? `-${universities.find((u) => u.id === filter.university_id)?.short_name || ''}` : ''}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Đã tải file CSV thành công');
    } catch {
      message.error('Không thể xuất file');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: 'Trường',
      dataIndex: 'university_name',
      key: 'university_name',
      width: 220,
      render: (name: string, record: CutoffRow) => (
        <div>
          <div style={{ fontWeight: 700, color: '#102a43' }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{record.university_short}</div>
        </div>
      ),
    },
    {
      title: 'Khối',
      dataIndex: 'combination_code',
      key: 'combination_code',
      width: 90,
      render: (code: string) => (
        <Tag color="red" style={{ fontWeight: 800, fontSize: '13px', minWidth: '56px', textAlign: 'center' }}>
          {code}
        </Tag>
      ),
    },
    {
      title: 'Tổ hợp môn',
      dataIndex: 'subject_names',
      key: 'subject_names',
      render: (names: string) => (
        <Text type="secondary" style={{ fontSize: '13px' }}>{names}</Text>
      ),
    },
    {
      title: 'Điểm chuẩn',
      dataIndex: 'score',
      key: 'score',
      width: 130,
      align: 'center' as const,
      sorter: (a: CutoffRow, b: CutoffRow) => Number(b.score) - Number(a.score),
      render: (score: number) => {
        const num = Number(score);
        return (
        <span style={{
          fontWeight: 900,
          fontSize: '18px',
          color: num >= 28 ? '#8b0000' : num >= 25 ? '#b91c1c' : '#92400e',
        }}>
          {num.toFixed(2)}
        </span>
        );
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (note: string | null) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>{note || '—'}</Text>
      ),
    },
  ];

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

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div>
            <div className={styles.breadcrumb}>
              <span onClick={() => history.push('/student')} style={{ cursor: 'pointer', color: '#c41e3a' }}>
                Trang chủ
              </span>
              <RightOutlined style={{ fontSize: '10px', color: '#94a3b8' }} />
              <span>Tra cứu điểm chuẩn</span>
            </div>
            <Title level={2} className={styles.pageTitle}>
              <FileProtectOutlined /> Tra cứu điểm chuẩn tuyển sinh
            </Title>
            <Text type="secondary">
              Xem điểm chuẩn trúng tuyển theo trường, khối xét tuyển và năm.
            </Text>
          </div>
          <div className={styles.headerActions}>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
              disabled={scores.length === 0}
            >
              Xuất CSV
            </Button>
            <Button
              icon={<HomeOutlined />}
              onClick={() => history.push('/student')}
            >
              Trang chủ
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Filters */}
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Trường</label>
            <Select
              allowClear
              showSearch
              placeholder="Tất cả trường"
              style={{ width: 280 }}
              optionFilterProp="label"
              value={filter.university_id}
              onChange={(val) => setFilter((f) => ({ ...f, university_id: val }))}
              options={universities.map((u) => ({
                label: `${u.name} (${u.short_name})`,
                value: u.id,
              }))}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Năm tuyển sinh</label>
            <Select
              style={{ width: 160 }}
              value={filter.year}
              onChange={(val) => setFilter((f) => ({ ...f, year: val }))}
              options={availableYears.map((y) => ({ label: `Năm ${y}`, value: y }))}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Khối xét tuyển</label>
            <Select
              allowClear
              placeholder="Tất cả khối"
              style={{ width: 160 }}
              value={filter.combination_id}
              onChange={(val) => setFilter((f) => ({ ...f, combination_id: val }))}
              options={combinations.map((c) => ({
                label: `${c.code} - ${c.subject_names}`,
                value: c.id,
              }))}
            />
          </div>
          <div className={styles.filterStats}>
            <span>{scores.length} ngành / tổ hợp</span>
          </div>
        </div>

        {/* Table */}
        <Card bodyStyle={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <Spin size="large" />
            </div>
          ) : scores.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <SafetyCertificateOutlined style={{ fontSize: '48px', color: '#d1d5db' }} />
              <Title level={4} style={{ marginTop: '16px', color: '#64748b' }}>
                Không có dữ liệu điểm chuẩn
              </Title>
              <Text type="secondary">
                Thử chọn năm hoặc trường khác.
              </Text>
            </div>
          ) : (
            <Table<CutoffRow>
              dataSource={scores}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (total) => `${total} kết quả` }}
              size="middle"
            />
          )}
        </Card>

        <Alert
          type="info"
          showIcon
          message="Lưu ý"
          description={`Điểm chuẩn năm ${filter.year} được cập nhật theo thông tin tuyển sinh chính thức của từng trường. Vui lòng theo dõi thông báo từ trường để có thông tin chính xác nhất.`}
          style={{ marginTop: '16px' }}
        />
      </div>

      <ChatBubble isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
    </div>
  );
};

export default CutoffPage;
