import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, notification, Tooltip } from 'antd';
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
  BellOutlined,
  SettingOutlined,
  AppstoreOutlined,
  SunOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useThemeStore } from '../stores/themeStore';
import { websocketService } from '../services/websocketService';
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
  const { fetchUnreadCount, fetchNotifications } = useNotificationStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const [notifApi, notifContextHolder] = notification.useNotification();

  // Apply dark class to <html> for CSS variables
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (isAdmin === null) checkAdminAccess();
    fetchUnreadCount();

    websocketService.connect({
      onNotification: (notif) => {
        fetchUnreadCount();
        fetchNotifications(0);
        notifApi.info({
          message: notif.title || 'Thông báo mới',
          description: notif.message,
          icon: <BellOutlined style={{ color: '#4361ee' }} />,
          placement: 'topRight',
          duration: 5,
        });
      },
    });

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Dynamic colors based on theme
  const siderBg = isDark ? '#141414' : '#ffffff';
  const siderBorder = isDark ? '#303030' : '#eef0f6';
  const headerBg = isDark ? '#1f1f1f' : '#ffffff';
  const headerBorder = isDark ? '#303030' : '#eef0f6';
  const iconColor = isDark ? '#a0a8b8' : '#5a6378';
  const iconHoverBg = isDark ? 'rgba(67,97,238,0.15)' : '#f0f2ff';
  const userTextColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const userBottomBorder = isDark ? '#2a2a2a' : '#eef0f6';
  const contentBg = isDark ? '#1f1f1f' : '#ffffff';
  const contentShadow = isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06)';

  const navItems = [
    {
      key: '/dashboard',
      icon: <BarChartOutlined />,
      label: 'Dashboard',
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
      label: 'Bảng Kanban',
      onClick: () => navigate('/boards'),
    },
    {
      key: '/time-report',
      icon: <BarChartOutlined />,
      label: 'Báo cáo giờ',
      onClick: () => navigate('/time-report'),
    },
    ...(isAdmin ? [
      { type: 'divider' as const },
      {
        key: '/admin/users',
        icon: <TeamOutlined />,
        label: 'Quản lý người dùng',
        onClick: () => navigate('/admin/users'),
      },
      {
        key: '/admin/roles',
        icon: <SafetyCertificateOutlined />,
        label: 'Quản lý Role',
        onClick: () => navigate('/admin/roles'),
      },
    ] : []),
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ cá nhân',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const initials = (user?.fullName || user?.username || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const iconBtnStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    cursor: 'pointer',
    color: iconColor,
    fontSize: 17,
    transition: 'background 0.2s, color 0.2s',
    flexShrink: 0,
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {notifContextHolder}

      {/* ─── Sidebar ─── */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        className="app-sider"
        style={{
          background: siderBg,
          borderRight: `1px solid ${siderBorder}`,
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 200,
          overflow: 'hidden',
          transition: 'background 0.3s',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 10,
          borderBottom: `1px solid ${siderBorder}`,
          overflow: 'hidden',
        }}>
          <img
            src="/logo.png"
            alt="logo"
            style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, objectFit: 'cover' }}
          />
          {!collapsed && (
            <span style={{
              fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #4361ee, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Taskoryx
            </span>
          )}
        </div>

        {/* Navigation – flex: 1 để đẩy user section xuống đáy */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={navItems}
            theme={isDark ? 'dark' : 'light'}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '12px 8px',
            }}
            className="app-menu"
          />
        </div>

        {/* User section at bottom */}
        {!collapsed ? (
          <div style={{
            padding: '12px 16px',
            borderTop: `1px solid ${userBottomBorder}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Avatar
              src={user?.avatarUrl}
              style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)', flexShrink: 0 }}
              size={36}
            >
              {initials}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                {user?.fullName || user?.username}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                {user?.email}
              </Text>
            </div>
            <Tooltip title="Hồ sơ">
              <SettingOutlined
                style={{ color: iconColor, cursor: 'pointer', flexShrink: 0 }}
                onClick={() => navigate('/profile')}
              />
            </Tooltip>
          </div>
        ) : (
          <div style={{
            padding: '12px 0',
            display: 'flex',
            justifyContent: 'center',
            borderTop: `1px solid ${userBottomBorder}`,
          }}>
            <Avatar
              src={user?.avatarUrl}
              style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)' }}
              size={32}
            >
              {initials}
            </Avatar>
          </div>
        )}
      </Sider>

      {/* ─── Main area ─── */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        {/* Header */}
        <Header style={{
          background: headerBg,
          borderBottom: `1px solid ${headerBorder}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'background 0.3s',
        }}>
          {/* Toggle */}
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ ...iconBtnStyle, marginLeft: 16 }}
            onMouseEnter={e => (e.currentTarget.style.background = iconHoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          {/* Right actions */}
          <div style={{ paddingRight: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Dark / Light toggle */}
            <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
              <div
                onClick={toggleTheme}
                style={iconBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = iconHoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {isDark ? <SunOutlined style={{ color: '#f59e0b' }} /> : <MoonOutlined />}
              </div>
            </Tooltip>

            <NotificationDropdown />

            {/* User menu */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginLeft: 4,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = iconHoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar
                  src={user?.avatarUrl}
                  size={32}
                  style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)', flexShrink: 0 }}
                >
                  {initials}
                </Avatar>
                <Text style={{ fontSize: 13, fontWeight: 500, color: userTextColor }}>
                  {user?.fullName?.split(' ').pop() || user?.username}
                </Text>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content style={{
          margin: 20,
          padding: 24,
          background: contentBg,
          borderRadius: 16,
          boxShadow: contentShadow,
          minHeight: 'calc(100vh - 104px)',
          transition: 'background 0.3s',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
