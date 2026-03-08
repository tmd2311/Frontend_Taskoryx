import React, { useEffect, useRef } from 'react';
import {
  Badge,
  Button,
  Dropdown,
  Empty,
  Spin,
  Tooltip,
  Typography,
  Space,
  Divider,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  EditOutlined,
  CommentOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { useNotificationStore } from '../stores/notificationStore';
import type { Notification } from '../types';
import { NotificationType } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

// ─── Icon theo loại thông báo ────────────────────────────────
const TYPE_ICON: Record<string, React.ReactNode> = {
  [NotificationType.TASK_ASSIGNED]:  <UserAddOutlined style={{ color: '#1890ff' }} />,
  [NotificationType.TASK_UPDATED]:   <EditOutlined style={{ color: '#722ed1' }} />,
  [NotificationType.TASK_COMMENTED]: <CommentOutlined style={{ color: '#13c2c2' }} />,
  [NotificationType.TASK_MENTIONED]: <CommentOutlined style={{ color: '#eb2f96' }} />,
  [NotificationType.TASK_DUE_SOON]:  <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
  [NotificationType.TASK_OVERDUE]:   <ExclamationCircleOutlined style={{ color: '#f5222d' }} />,
  [NotificationType.PROJECT_INVITED]:<ProjectOutlined style={{ color: '#52c41a' }} />,
};

// ─── Item thông báo ──────────────────────────────────────────
const NotifItem: React.FC<{
  notif: Notification;
  onRead: (id: string) => void;
}> = ({ notif, onRead }) => (
  <div
    onClick={() => !notif.isRead && onRead(notif.id)}
    style={{
      padding: '10px 16px',
      background: notif.isRead ? '#fff' : '#e6f7ff',
      cursor: notif.isRead ? 'default' : 'pointer',
      transition: 'background .15s',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}
    onMouseEnter={(e) => {
      if (!notif.isRead) (e.currentTarget as HTMLDivElement).style.background = '#bae7ff';
    }}
    onMouseLeave={(e) => {
      if (!notif.isRead) (e.currentTarget as HTMLDivElement).style.background = '#e6f7ff';
    }}
  >
    {/* Icon */}
    <div style={{ fontSize: 18, marginTop: 2, flexShrink: 0 }}>
      {TYPE_ICON[notif.type] ?? <BellOutlined style={{ color: '#8c8c8c' }} />}
    </div>

    {/* Nội dung */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: notif.isRead ? 400 : 600, lineHeight: 1.4 }}>
        {notif.title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#595959',
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {notif.message}
      </div>
      <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 4 }}>
        {dayjs(notif.createdAt).fromNow()}
      </div>
    </div>

    {/* Chấm chưa đọc */}
    {!notif.isRead && (
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#1890ff',
          flexShrink: 0,
          marginTop: 6,
        }}
      />
    )}
  </div>
);

// ─── NotificationDropdown ─────────────────────────────────────
const NotificationDropdown: React.FC = () => {
  const {
    notifications,
    unreadCount,
    totalPages,
    currentPage,
    isLoading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load lần đầu + poll 60 giây
  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 60_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (open) fetchNotifications(0);
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  const handleLoadMore = () => {
    if (currentPage + 1 < totalPages) {
      fetchNotifications(currentPage + 1);
    }
  };

  // ─── Panel nội dung dropdown ─────────────────────────────
  const panel = (
    <div
      style={{
        width: 360,
        maxHeight: 480,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px rgba(0,0,0,.12)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <Space size={8}>
          <Text strong style={{ fontSize: 15 }}>Thông báo</Text>
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ fontSize: 11 }} />
          )}
        </Space>
        {unreadCount > 0 && (
          <Tooltip title="Đánh dấu tất cả là đã đọc">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={handleMarkAll}
              style={{ color: '#1890ff', fontSize: 12 }}
            >
              Đọc tất cả
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Danh sách */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isLoading && notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có thông báo"
            style={{ padding: '32px 0' }}
          />
        ) : (
          <>
            {notifications.map((n) => (
              <NotifItem key={n.id} notif={n} onRead={markAsRead} />
            ))}

            {currentPage + 1 < totalPages && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <Button
                  type="link"
                  size="small"
                  loading={isLoading}
                  onClick={handleLoadMore}
                >
                  Tải thêm
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: '8px 16px', textAlign: 'center', flexShrink: 0 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Hiển thị {notifications.length} thông báo gần nhất
            </Text>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => panel}
      trigger={['click']}
      placement="bottomRight"
      onOpenChange={handleOpenChange}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationDropdown;
