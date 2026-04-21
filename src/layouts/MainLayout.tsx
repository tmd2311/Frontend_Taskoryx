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
  SunOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  PartitionOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useThemeStore } from '../stores/themeStore';
import { useProjectStore } from '../stores/projectStore';
import { websocketService } from '../services/websocketService';
import NotificationDropdown from '../components/NotificationDropdown';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, checkAdminAccess } = useAuthStore();
  const { fetchUnreadCount, fetchNotifications } = useNotificationStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const [notifApi, notifContextHolder] = notification.useNotification();

  // Detect active project tab from URL
  const searchParams = new URLSearchParams(location.search);
  const activeProjectTab = searchParams.get('tab') || 'tasks';

  const isInProject = !!currentProject;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    return () => { websocketService.disconnect(); };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const siderBg = isDark ? '#141414' : '#ffffff';
  const siderBorder = isDark ? '#303030' : '#eef0f6';
  const headerBg = isDark ? '#1f1f1f' : '#ffffff';
  const headerBorder = isDark ? '#303030' : '#eef0f6';
  const iconColor = isDark ? '#a0a8b8' : '#5a6378';
  const iconHoverBg = isDark ? 'rgba(67,97,238,0.15)' : '#f0f2ff';
  const userTextColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const userBottomBorder = isDark ? '#2a2a2a' : '#eef0f6';
  const contentBg = isDark ? '#141414' : '#f5f6fa';

  const navTo = (path: string) => {
    navigate(path);
    if (isMobile) setMobileDrawerOpen(false);
  };

  // ── Global nav items ──
  const globalNavItems = [
    {
      key: '/dashboard',
      icon: <BarChartOutlined />,
      label: 'Dashboard',
      onClick: () => { navTo('/dashboard'); setCurrentProject(null); },
    },
    {
      key: '/projects',
      icon: <FolderOutlined />,
      label: 'Dự án',
      onClick: () => { navTo('/projects'); setCurrentProject(null); },
    },
    {
      key: '/tasks',
      icon: <CheckSquareOutlined />,
      label: 'Đầu việc của tôi',
      onClick: () => { navTo('/tasks'); setCurrentProject(null); },
    },
    {
      key: '/time-report',
      icon: <ClockCircleOutlined />,
      label: 'Báo cáo giờ',
      onClick: () => { navTo('/time-report'); setCurrentProject(null); },
    },
    ...(isAdmin ? [
      { type: 'divider' as const },
      {
        key: '/admin/users',
        icon: <TeamOutlined />,
        label: 'Quản lý người dùng',
        onClick: () => navTo('/admin/users'),
      },
      {
        key: '/admin/roles',
        icon: <SafetyCertificateOutlined />,
        label: 'Quản lý Role',
        onClick: () => navTo('/admin/roles'),
      },
    ] : []),
  ];

  // ── Project nav items ──
  const projectNavItems = currentProject ? [
    {
      key: 'tasks',
      icon: <CheckSquareOutlined />,
      label: 'Đầu việc',
      onClick: () => navTo(`/projects/${currentProject.id}?tab=tasks`),
    },
    {
      key: 'sprints',
      icon: <TableOutlined />,
      label: 'Sprints',
      onClick: () => navTo(`/projects/${currentProject.id}?tab=sprints`),
    },
    {
      key: 'members',
      icon: <TeamOutlined />,
      label: 'Thành viên',
      onClick: () => navTo(`/projects/${currentProject.id}?tab=members`),
    },
    {
      key: 'gantt',
      icon: <PartitionOutlined />,
      label: 'Gantt Chart',
      onClick: () => navTo(`/projects/${currentProject.id}?tab=gantt`),
    },
    {
      key: 'activity',
      icon: <ClockCircleOutlined />,
      label: 'Hoạt động',
      onClick: () => navTo(`/projects/${currentProject.id}?tab=activity`),
    },
    { type: 'divider' as const },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt dự án',
      onClick: () => navTo(`/projects/${currentProject.id}?tab=settings`),
    },
  ] : [];

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
    .split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();

  const iconBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    cursor: 'pointer',
    color: iconColor,
    fontSize: 16,
    transition: 'background 0.2s',
    flexShrink: 0,
  };

  const sidebarLeft = isMobile ? (mobileDrawerOpen ? 0 : -240) : 0;
  const projectColor = currentProject?.color || '#4361ee';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {notifContextHolder}

      {isMobile && mobileDrawerOpen && (
        <div onClick={() => setMobileDrawerOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 199,
        }} />
      )}

      {/* ─── Sidebar ─── */}
      <Sider
        trigger={null}
        collapsible
        collapsed={isMobile ? false : collapsed}
        width={220}
        style={{
          background: siderBg,
          borderRight: `1px solid ${siderBorder}`,
          position: 'fixed',
          left: sidebarLeft,
          top: 0,
          bottom: 0,
          zIndex: 200,
          overflow: 'hidden',
          transition: 'left 0.25s ease, background 0.3s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Project mode: header dự án ── */}
        {isInProject ? (
          <div style={{
            borderBottom: `1px solid ${siderBorder}`,
            overflow: 'hidden',
          }}>
            {/* Back button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px 8px',
                cursor: 'pointer',
                color: iconColor,
                fontSize: 12,
              }}
              onClick={() => { setCurrentProject(null); navTo('/projects'); }}
            >
              <ArrowLeftOutlined style={{ fontSize: 11 }} />
              <span>Tất cả dự án</span>
            </div>

            {/* Project identity */}
            <div style={{ padding: '8px 16px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: projectColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 14,
              }}>
                {currentProject.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: isDark ? '#e0e0e0' : '#1a1a2e',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {currentProject.name}
                  </div>
                  <div style={{ fontSize: 11, color: iconColor }}>{currentProject.key}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Global mode: logo ── */
          <div style={{
            height: 56,
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 10,
            borderBottom: `1px solid ${siderBorder}`,
          }}>
            <img src="/logo.png" alt="logo" style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, objectFit: 'cover' }} />
            {(isMobile || !collapsed) && (
              <span style={{
                fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap',
                background: 'linear-gradient(135deg, #4361ee, #7c3aed)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Taskoryx
              </span>
            )}
          </div>
        )}

        {/* ── Nav menu ── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {isInProject ? (
            <Menu
              mode="inline"
              selectedKeys={[activeProjectTab]}
              items={projectNavItems}
              theme={isDark ? 'dark' : 'light'}
              style={{ background: 'transparent', border: 'none', padding: '8px 6px' }}
            />
          ) : (
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={globalNavItems}
              theme={isDark ? 'dark' : 'light'}
              style={{ background: 'transparent', border: 'none', padding: '8px 6px' }}
            />
          )}
        </div>

        {/* ── User section ── */}
        {(isMobile || !collapsed) ? (
          <div style={{
            padding: '10px 14px',
            borderTop: `1px solid ${userBottomBorder}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Avatar src={user?.avatarUrl} style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)', flexShrink: 0 }} size={32}>
              {initials}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ fontSize: 12, display: 'block' }} ellipsis>
                {user?.fullName || user?.username}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }} ellipsis>{user?.email}</Text>
            </div>
            <Tooltip title="Hồ sơ">
              <SettingOutlined style={{ color: iconColor, cursor: 'pointer', fontSize: 14 }} onClick={() => navigate('/profile')} />
            </Tooltip>
          </div>
        ) : (
          <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center', borderTop: `1px solid ${userBottomBorder}` }}>
            <Avatar src={user?.avatarUrl} style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)' }} size={28}>{initials}</Avatar>
          </div>
        )}
      </Sider>

      {/* ─── Main area ─── */}
      <Layout style={{
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 220),
        transition: 'margin-left 0.2s',
        background: contentBg,
        minHeight: '100vh',
      }}>
        {/* Header */}
        <Header style={{
          background: headerBg,
          borderBottom: `1px solid ${headerBorder}`,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 52,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'background 0.3s',
          lineHeight: '52px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12 }}>
            <div
              onClick={() => isMobile ? setMobileDrawerOpen(!mobileDrawerOpen) : setCollapsed(!collapsed)}
              style={iconBtnStyle}
              onMouseEnter={e => (e.currentTarget.style.background = iconHoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {(isMobile ? mobileDrawerOpen : !collapsed) ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            </div>

            {/* Breadcrumb */}
            {isInProject && currentProject && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span
                  style={{ color: iconColor, cursor: 'pointer' }}
                  onClick={() => { setCurrentProject(null); navTo('/projects'); }}
                >
                  Dự án
                </span>
                <span style={{ color: isDark ? '#555' : '#ccc' }}>/</span>
                <span style={{ fontWeight: 600, color: isDark ? '#e0e0e0' : '#1a1a2e' }}>
                  {currentProject.name}
                </span>
              </div>
            )}
          </div>

          <div style={{ paddingRight: isMobile ? 8 : 16, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
              <div onClick={toggleTheme} style={iconBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = iconHoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {isDark ? <SunOutlined style={{ color: '#f59e0b' }} /> : <MoonOutlined />}
              </div>
            </Tooltip>

            <NotificationDropdown />

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '4px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = iconHoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar src={user?.avatarUrl} size={28} style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)', flexShrink: 0 }}>
                  {initials}
                </Avatar>
                {!isMobile && (
                  <Text style={{ fontSize: 13, fontWeight: 500, color: userTextColor }}>
                    {user?.fullName?.split(' ').pop() || user?.username}
                  </Text>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content style={{
          flex: 1,
          background: contentBg,
          minHeight: 'calc(100vh - 52px)',
          overflow: 'auto',
        }}>
          {/* Nếu đang trong project: bỏ padding để full-width như Jira */}
          {isInProject ? (
            <div style={{ padding: '16px 20px' }}>
              {children}
            </div>
          ) : (
            <div style={{ padding: isMobile ? 12 : '20px 24px' }}>
              {children}
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
