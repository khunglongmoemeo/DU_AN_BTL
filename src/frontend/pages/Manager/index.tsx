import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Space, message } from 'antd';
import { FileTextOutlined, BarChartOutlined, LogoutOutlined, UserOutlined, DashboardOutlined, MessageOutlined } from '@ant-design/icons';
import { history } from 'umi';
import { getCurrentUser, logout } from '../../utils/auth';
import ProfilesPage from './components/ProfilesPage';
import StatisticsPage from './components/StatisticsPage';
import AIChatPanel from './components/AIChatPanel';
import styles from './index.less';

const { Header } = Layout;

const ManagerPage: React.FC = () => {
  const user = getCurrentUser();
  const [activeMenu, setActiveMenu] = useState('profiles');
  const [collapsed, setCollapsed] = useState(false);

  if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
    message.error('Bạn không có quyền truy cập trang quản lý');
    history.replace('/user/login');
    return null;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Layout.Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.15)', height: '100vh', overflow: 'hidden', flexShrink: 0 }}
      >
        <div className={styles.siderWrapper}>
          <div className={styles.siderLogo}>
            {collapsed
              ? <DashboardOutlined style={{ fontSize: 22, color: '#fff' }} />
              : (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Quản lý tuyển sinh</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Admin Dashboard</div>
                </div>
              )
            }
          </div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeMenu]}
            onClick={({ key }) => setActiveMenu(key)}
            className={styles.siderMenu}
            items={[
              { key: 'profiles', icon: <FileTextOutlined />, label: 'Danh sách hồ sơ' },
              { key: 'statistics', icon: <BarChartOutlined />, label: 'Thống kê' },
              { key: 'aichat', icon: <MessageOutlined />, label: 'Chat AI' },
            ]}
          />

          <div className={styles.siderBottom}>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => { logout(); history.push('/user/login'); }}
              style={{ color: 'rgba(255,255,255,0.65)', width: '100%', textAlign: 'left' }}
            >
              {!collapsed && 'Đăng xuất'}
            </Button>
          </div>
        </div>
      </Layout.Sider>

      <div style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          height: 56,
          lineHeight: '56px',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}>
          <Space>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#c41e3a' }} />
            <div>
              <div style={{ fontWeight: 600, lineHeight: 1.2, color: 'rgba(0,0,0,0.88)' }}>{user.full_name}</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', lineHeight: 1.4 }}>Quản trị viên</div>
            </div>
          </Space>
        </Header>

        <div className={styles.content} style={{ overflow: 'hidden', flex: 1, minHeight: 0 }}>
          {activeMenu === 'profiles' && <ProfilesPage />}
          {activeMenu === 'statistics' && <StatisticsPage />}
          {activeMenu === 'aichat' && <AIChatPanel user={user} />}
        </div>
      </div>
    </div>
  );
};

export default ManagerPage;
