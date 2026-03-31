import React, { useEffect, useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Avatar,
  Tooltip,
  Popconfirm,
  Modal,
  Form,
  message,
  Badge,
  Dropdown,
  Alert,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserAddOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  EditOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  StopOutlined,
  KeyOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import { useAuthStore } from '../stores/authStore';
import type { AdminUser } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const PAGE_SIZE = 15;

const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const {
    users,
    roles,
    totalElements,
    isLoading,
    fetchUsers,
    fetchRoles,
    createUser,
    updateUser,
    deactivateUser,
    activateUser,
    resetPassword,
    assignRole,
    removeRole,
  } = useAdminStore();

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string | undefined>(undefined);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Modal tạo user
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [createSaving, setCreateSaving] = useState(false);

  // Modal chỉnh sửa user
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetUser, setEditTargetUser] = useState<AdminUser | null>(null);
  const [editForm] = Form.useForm();
  const [editSaving, setEditSaving] = useState(false);

  // Modal gán role
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState<AdminUser | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Kiểm tra quyền admin
  useEffect(() => {
    if (isAdmin === false) {
      message.error('Bạn không có quyền truy cập trang này');
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    const params: any = { page: page - 1, size: PAGE_SIZE };
    if (search.trim()) params.search = search.trim();
    if (filterRole) params.roleId = filterRole;
    if (filterActive !== undefined) params.isActive = filterActive;
    fetchUsers(params);
  }, [page, search, filterRole, filterActive]);

  const reload = () => {
    setPage(1);
    const params: any = { page: 0, size: PAGE_SIZE };
    if (search.trim()) params.search = search.trim();
    if (filterRole) params.roleId = filterRole;
    if (filterActive !== undefined) params.isActive = filterActive;
    fetchUsers(params);
  };

  // ── Tạo user ──────────────────────────────────────────────
  const handleCreate = async (values: any) => {
    setCreateSaving(true);
    try {
      await createUser({
        username: values.username.trim(),
        email: values.email.trim(),
        fullName: values.fullName?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
      });
      message.success('Tạo tài khoản thành công. Mật khẩu đã được gửi về email của người dùng.');
      setCreateModalOpen(false);
      createForm.resetFields();
      reload();
    } catch (e: any) {
      message.error(e.message || 'Tạo người dùng thất bại');
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Chỉnh sửa user ────────────────────────────────────────
  const openEditUser = (user: AdminUser) => {
    setEditTargetUser(user);
    editForm.setFieldsValue({
      fullName: user.fullName,
      phone: user.phone,
      timezone: (user as any).timezone,
      language: (user as any).language,
    });
    setEditModalOpen(true);
  };

  const handleEditUser = async (values: any) => {
    if (!editTargetUser) return;
    setEditSaving(true);
    try {
      await updateUser(editTargetUser.id, {
        fullName: values.fullName?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        timezone: values.timezone?.trim() || undefined,
        language: values.language?.trim() || undefined,
      });
      message.success('Cập nhật thông tin thành công');
      setEditModalOpen(false);
    } catch (e: any) {
      message.error(e.message || 'Cập nhật thất bại');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Vô hiệu hóa / Kích hoạt ──────────────────────────────
  const handleDeactivate = async (user: AdminUser) => {
    try {
      await deactivateUser(user.id);
      message.success('Đã vô hiệu hóa tài khoản');
    } catch (e: any) {
      message.error(e.message || 'Vô hiệu hóa thất bại');
    }
  };

  const handleActivate = async (user: AdminUser) => {
    try {
      await activateUser(user.id);
      message.success('Đã kích hoạt tài khoản');
    } catch (e: any) {
      message.error(e.message || 'Kích hoạt thất bại');
    }
  };

  // ── Reset mật khẩu ─────────────────────────────────────────
  const handleResetPassword = (user: AdminUser) => {
    Modal.confirm({
      title: 'Đặt lại mật khẩu',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Đặt lại mật khẩu cho <strong>{user.fullName || user.username}</strong>?</p>
          <p style={{ color: '#8c9ab0', fontSize: 13 }}>
            Hệ thống sẽ tự tạo mật khẩu ngẫu nhiên và gửi về email <strong>{user.email}</strong>. Người dùng sẽ phải đổi mật khẩu khi đăng nhập lần tiếp theo.
          </p>
        </div>
      ),
      okText: 'Đặt lại',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await resetPassword(user.id);
          message.success(`Đã đặt lại mật khẩu. Email xác nhận đã được gửi tới ${user.email}`);
        } catch (e: any) {
          message.error(e.message || 'Đặt lại mật khẩu thất bại');
        }
      },
    });
  };

  // ── Gán / xóa role ────────────────────────────────────────
  const openAssignRole = (user: AdminUser) => {
    setRoleTargetUser(user);
    setSelectedRoleId('');
    setRoleModalOpen(true);
  };

  const handleAssignRole = async () => {
    if (!roleTargetUser || !selectedRoleId) return;
    setRoleSaving(true);
    try {
      await assignRole(roleTargetUser.id, { roleId: selectedRoleId });
      message.success('Đã gán vai trò');
      setRoleModalOpen(false);
      reload();
    } catch (e: any) {
      message.error(e.message || 'Gán vai trò thất bại');
    } finally {
      setRoleSaving(false);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string, roleName: string) => {
    try {
      await removeRole(userId, roleId);
      message.success(`Đã xóa vai trò ${roleName}`);
      reload();
    } catch (e: any) {
      message.error(e.message || 'Xóa vai trò thất bại');
    }
  };

  // ── Columns ───────────────────────────────────────────────
  const columns: ColumnsType<AdminUser> = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_, u) => (
        <Space>
          <Avatar src={u.avatarUrl} icon={<UserOutlined />} size={36} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              {u.fullName || u.username}
              {u.mustChangePassword && (
                <Tag color="orange" style={{ fontSize: 11, padding: '0 5px', lineHeight: '18px' }}>
                  Chưa đổi MK
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>@{u.username}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <Text style={{ fontSize: 13 }}>{email}</Text>,
    },
    {
      title: 'Vai trò hệ thống',
      key: 'roles',
      width: 220,
      render: (_, u) => (
        <Space size={4} wrap>
          {u.roles && u.roles.length > 0 ? (
            u.roles.map((r) => (
              <Popconfirm
                key={r.id}
                title={`Xóa vai trò "${r.name}" khỏi người dùng này?`}
                onConfirm={() => handleRemoveRole(u.id, r.id, r.name)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                disabled={r.isSystemRole}
              >
                <Tag
                  color={r.name.includes('ADMIN') || r.name.includes('SUPER') ? 'red' : 'blue'}
                  style={{ cursor: r.isSystemRole ? 'default' : 'pointer' }}
                  title={r.isSystemRole ? 'Vai trò hệ thống, không thể xóa' : 'Nhấn để xóa vai trò'}
                >
                  {r.name}
                </Tag>
              </Popconfirm>
            ))
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>Chưa có vai trò</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 120,
      render: (_, u) => (
        u.isActive
          ? <Badge status="success" text={<Text style={{ fontSize: 13 }}>Hoạt động</Text>} />
          : <Badge status="error" text={<Text style={{ fontSize: 13 }}>Vô hiệu</Text>} />
      ),
    },
    {
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 140,
      render: (d: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—'}
        </Text>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (d: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {d ? dayjs(d).format('DD/MM/YYYY') : '—'}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, u) => {
        const items: MenuProps['items'] = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Chỉnh sửa thông tin',
            onClick: () => openEditUser(u),
          },
          {
            key: 'role',
            icon: <UserOutlined />,
            label: 'Gán vai trò',
            onClick: () => openAssignRole(u),
          },
          {
            key: 'reset',
            icon: <KeyOutlined />,
            label: 'Đặt lại mật khẩu',
            onClick: () => handleResetPassword(u),
          },
          { type: 'divider' },
          u.isActive
            ? {
                key: 'deactivate',
                icon: <StopOutlined />,
                label: 'Vô hiệu hóa',
                danger: true,
                onClick: () => handleDeactivate(u),
              }
            : {
                key: 'activate',
                icon: <CheckCircleOutlined />,
                label: 'Kích hoạt lại',
                onClick: () => handleActivate(u),
              },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản lý người dùng</Title>
          <Text type="secondary">Tổng cộng {totalElements} tài khoản trong hệ thống</Text>
        </div>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={() => { createForm.resetFields(); setCreateModalOpen(true); }}
        >
          Tạo tài khoản
        </Button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm kiếm tên, email, username..."
          allowClear
          style={{ flex: '1 1 180px', minWidth: 160 }}
          onPressEnter={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }}
          onChange={(e) => { if (!e.target.value) { setSearch(''); setPage(1); } }}
          onBlur={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select
          placeholder="Lọc theo vai trò"
          allowClear
          style={{ width: 200 }}
          value={filterRole}
          onChange={(v) => { setFilterRole(v); setPage(1); }}
          options={roles.map((r) => ({ label: r.name, value: r.id }))}
        />
        <Select
          placeholder="Trạng thái"
          allowClear
          style={{ width: 150 }}
          value={filterActive}
          onChange={(v) => { setFilterActive(v); setPage(1); }}
          options={[
            { label: 'Đang hoạt động', value: true },
            { label: 'Vô hiệu hóa', value: false },
          ]}
        />
        <Tooltip title="Làm mới">
          <Button icon={<ReloadOutlined />} onClick={reload} loading={isLoading} />
        </Tooltip>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: totalElements,
          onChange: (p) => setPage(p),
          showTotal: (t) => `Tổng ${t} tài khoản`,
          showSizeChanger: false,
        }}
        scroll={{ x: 1000 }}
      />

      {/* Modal tạo tài khoản */}
      <Modal
        title={<Space><UserAddOutlined />Tạo tài khoản mới</Space>}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={480}
      >
        <Alert
          type="info"
          icon={<MailOutlined />}
          showIcon
          message="Hệ thống sẽ tự tạo mật khẩu ngẫu nhiên và gửi về email của người dùng. Người dùng phải đổi mật khẩu khi đăng nhập lần đầu."
          style={{ marginBottom: 16, marginTop: 12 }}
        />
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
          >
            <Input placeholder="Tên đăng nhập (không dấu, không khoảng trắng)" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' },
            ]}
          >
            <Input placeholder="email@domain.com" />
          </Form.Item>
          <Form.Item name="fullName" label="Họ và tên">
            <Input placeholder="Họ và tên (tùy chọn)" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Số điện thoại (tùy chọn)" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createSaving} icon={<UserAddOutlined />}>
                Tạo tài khoản
              </Button>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal chỉnh sửa user */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            Chỉnh sửa — {editTargetUser?.fullName || editTargetUser?.username}
          </Space>
        }
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={480}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
          style={{ marginTop: 12 }}
        >
          <Form.Item name="fullName" label="Họ và tên">
            <Input placeholder="Họ và tên" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Số điện thoại" />
          </Form.Item>
          <Form.Item name="timezone" label="Múi giờ">
            <Input placeholder="VD: Asia/Ho_Chi_Minh" />
          </Form.Item>
          <Form.Item name="language" label="Ngôn ngữ">
            <Select
              placeholder="Chọn ngôn ngữ"
              options={[
                { label: 'Tiếng Việt', value: 'vi' },
                { label: 'English', value: 'en' },
              ]}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={editSaving}>
                Lưu thay đổi
              </Button>
              <Button onClick={() => setEditModalOpen(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal gán vai trò */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            Gán vai trò — {roleTargetUser?.fullName || roleTargetUser?.username}
          </Space>
        }
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={handleAssignRole}
        okText="Gán vai trò"
        cancelText="Hủy"
        confirmLoading={roleSaving}
        okButtonProps={{ disabled: !selectedRoleId }}
        destroyOnHidden
      >
        <div style={{ marginTop: 12 }}>
          {roleTargetUser && roleTargetUser.roles?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Vai trò hiện tại:</Text>
              <div style={{ marginTop: 6 }}>
                {roleTargetUser.roles.map((r) => (
                  <Tag key={r.id} color="blue">{r.name}</Tag>
                ))}
              </div>
            </div>
          )}
          <Select
            placeholder="Chọn vai trò muốn gán"
            style={{ width: '100%' }}
            value={selectedRoleId || undefined}
            onChange={(v) => setSelectedRoleId(v)}
            options={roles
              .filter((r) => !roleTargetUser?.roles?.some((ur) => ur.id === r.id))
              .map((r) => ({ label: r.name, value: r.id }))}
            notFoundContent={<Text type="secondary">Người dùng đã có tất cả vai trò</Text>}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
