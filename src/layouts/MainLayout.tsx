import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CheckSquareOutlined,
  FolderOutlined,
  UserOutlined,
  LogoutOutlined,
  BarChartOutlined,
  TableOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import NotificationDropdown from '../components/NotificationDropdown';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, checkAdminAccess } = useAuthStore();

  useEffect(() => {
    if (isAdmin === null) checkAdminAccess();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <BarChartOutlined />,
      label: 'Biểu đồ',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/projects',
      icon: <FolderOutlined />,
      label: 'Dự án',
      onClick: () => navigate('/projects'),
    },
    {
      key: '/tasks',
      icon: <CheckSquareOutlined />,
      label: 'Đầu việc',
      onClick: () => navigate('/tasks'),
    },
    {
      key: '/boards',
      icon: <TableOutlined />,
      label: 'Bảng làm việc',
      onClick: () => navigate('/boards'),
    },
    ...(isAdmin ? [
      { type: 'divider' as const },
      {
        key: '/admin/users',
        icon: <TeamOutlined />,
        label: 'Quản lý người dùng',
        onClick: () => navigate('/admin/users'),
      },
    ] : []),
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? 20 : 24,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? 'TM' : 'Taskoryx'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: 18, padding: '0 24px', cursor: 'pointer' },
            })}
          </div>
          <div style={{ paddingRight: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationDropdown />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} src={user?.avatarUrl} />
                <Text>{user?.fullName || user?.username}</Text>
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#fff',
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
