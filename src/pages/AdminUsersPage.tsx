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
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserAddOutlined,
  SearchOutlined,
  ReloadOutlined,
  LockOutlined,
  UserOutlined,
  EditOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  StopOutlined,
  KeyOutlined,
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
    toggleUserStatus,
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

  // Modal reset mật khẩu
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<AdminUser | null>(null);
  const [resetForm] = Form.useForm();
  const [resetSaving, setResetSaving] = useState(false);

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

  // Load danh sách roles (để filter và gán)
  useEffect(() => {
    fetchRoles();
  }, []);

  // Load users khi filter/page thay đổi
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
        password: values.password,
        fullName: values.fullName?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
      });
      message.success('Tạo người dùng thành công');
      setCreateModalOpen(false);
      createForm.resetFields();
      reload();
    } catch (e: any) {
      message.error(e.message || 'Tạo người dùng thất bại');
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Toggle trạng thái ─────────────────────────────────────
  const handleToggleStatus = async (user: AdminUser) => {
    try {
      await toggleUserStatus(user.id);
      message.success(user.isActive ? 'Đã vô hiệu hóa tài khoản' : 'Đã kích hoạt tài khoản');
    } catch (e: any) {
      message.error(e.message || 'Thay đổi trạng thái thất bại');
    }
  };

  // ── Reset mật khẩu ─────────────────────────────────────────
  const openResetPassword = (user: AdminUser) => {
    setResetTargetUser(user);
    resetForm.resetFields();
    setResetModalOpen(true);
  };

  const handleResetPassword = async (values: any) => {
    if (!resetTargetUser) return;
    setResetSaving(true);
    try {
      await resetPassword(resetTargetUser.id, { newPassword: values.newPassword });
      message.success(`Đã đặt lại mật khẩu cho ${resetTargetUser.fullName || resetTargetUser.username}`);
      setResetModalOpen(false);
    } catch (e: any) {
      message.error(e.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setResetSaving(false);
    }
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
            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName || u.username}</div>
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
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
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
            key: 'toggle',
            icon: u.isActive ? <StopOutlined /> : <CheckCircleOutlined />,
            label: u.isActive ? 'Vô hiệu hóa' : 'Kích hoạt',
            onClick: () => handleToggleStatus(u),
          },
          {
            key: 'role',
            icon: <EditOutlined />,
            label: 'Gán vai trò',
            onClick: () => openAssignRole(u),
          },
          {
            key: 'reset',
            icon: <KeyOutlined />,
            label: 'Đặt lại mật khẩu',
            onClick: () => openResetPassword(u),
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
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
          style={{ width: 280 }}
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
        scroll={{ x: 900 }}
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
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          style={{ marginTop: 12 }}
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
          <Form.Item
            name="password"
            label="Mật khẩu tạm thời"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Tối thiểu 6 ký tự!' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Người dùng sẽ phải đổi khi đăng nhập lần đầu"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createSaving}>
                Tạo tài khoản
              </Button>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal đặt lại mật khẩu */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            Đặt lại mật khẩu — {resetTargetUser?.fullName || resetTargetUser?.username}
          </Space>
        }
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={resetForm}
          layout="vertical"
          onFinish={handleResetPassword}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 6, message: 'Tối thiểu 6 ký tự!' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={resetSaving} danger>
                Đặt lại mật khẩu
              </Button>
              <Button onClick={() => setResetModalOpen(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal gán vai trò */}
      <Modal
        title={
          <Space>
            <EditOutlined />
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
            options={roles.map((r) => ({ label: r.name, value: r.id }))}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
