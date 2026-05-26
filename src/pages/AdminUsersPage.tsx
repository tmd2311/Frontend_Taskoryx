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
  Modal,
  Form,
  message,
  Badge,
  Dropdown,
  Alert,
  Typography as Typo,
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
  CopyOutlined,
  LockOutlined,
  PlusOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
type ColumnsType<T> = TableColumnsType<T>;
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import { useAuthStore } from '../stores/authStore';
import type { AdminUser } from '../types';
import dayjs from 'dayjs';
import { resolveAvatarUrl } from '../utils/avatar';

const { Title, Text } = Typography;
const { Paragraph } = Typo;
const PAGE_SIZE = 15;

const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, user: currentUser } = useAuthStore();
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
  const [roleTargetUserId, setRoleTargetUserId] = useState<string | null>(null);
  const [roleAssigning, setRoleAssigning] = useState(false);
  const [roleRemoving, setRoleRemoving] = useState<string | null>(null); // roleId đang xóa

  // Luôn đọc từ store để có data mới nhất
  const roleTargetUser = users.find((u) => u.id === roleTargetUserId) ?? null;

  // Modal hiển thị temporary password sau khi tạo user
  const [tempPasswordModal, setTempPasswordModal] = useState<{ open: boolean; password: string; username: string }>({
    open: false, password: '', username: '',
  });

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
    if (search.trim()) params.keyword = search.trim();
    if (filterRole) params.roleId = filterRole;
    if (filterActive !== undefined) params.isActive = filterActive;
    fetchUsers(params);
  }, [page, search, filterRole, filterActive]);

  const reload = () => {
    setPage(1);
    const params: any = { page: 0, size: PAGE_SIZE };
    if (search.trim()) params.keyword = search.trim();
    if (filterRole) params.roleId = filterRole;
    if (filterActive !== undefined) params.isActive = filterActive;
    fetchUsers(params);
  };

  // ── Tạo user ──────────────────────────────────────────────
  const handleCreate = async (values: any) => {
    setCreateSaving(true);
    try {
      const newUser = await createUser({
        username: values.username.trim(),
        email: values.email.trim(),
        fullName: values.fullName?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        timezone: values.timezone?.trim() || undefined,
        language: values.language?.trim() || undefined,
      });
      setCreateModalOpen(false);
      createForm.resetFields();
      reload();
      if (newUser.temporaryPassword) {
        setTempPasswordModal({
          open: true,
          password: newUser.temporaryPassword,
          username: newUser.fullName || newUser.username,
        });
      } else {
        message.success('Tạo tài khoản thành công. Mật khẩu đã được gửi về email của người dùng.');
      }
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
  const openRoleModal = (user: AdminUser) => {
    setRoleTargetUserId(user.id);
    setRoleModalOpen(true);
  };

  const handleAssignRole = async (roleId: string) => {
    if (!roleTargetUser) return;
    setRoleAssigning(true);
    try {
      await assignRole(roleTargetUser.id, { roleId });
      message.success('Đã gán vai trò');
    } catch (e: any) {
      message.error(e.message || 'Gán vai trò thất bại');
    } finally {
      setRoleAssigning(false);
    }
  };

  const handleRemoveRole = async (roleId: string, roleName: string) => {
    if (!roleTargetUser) return;
    setRoleRemoving(roleId);
    try {
      await removeRole(roleTargetUser.id, roleId);
      message.success(`Đã thu hồi "${roleName}"`);
    } catch (e: any) {
      message.error(e.message || 'Thu hồi vai trò thất bại');
    } finally {
      setRoleRemoving(null);
    }
  };

  // ── Columns ───────────────────────────────────────────────
  const columns: ColumnsType<AdminUser> = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: unknown, u: AdminUser) => (
        <Space>
          <Avatar src={resolveAvatarUrl(u.avatarUrl)} icon={<UserOutlined />} size={36} />
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
      width: 260,
      render: (_: unknown, u: AdminUser) => (
        <Space size={4} wrap>
          {u.roles && u.roles.length > 0 ? (
            u.roles.map((r: any) => (
              <Tag
                key={r.id}
                color={r.name.includes('ADMIN') || r.name.includes('SUPER') ? 'red' : 'blue'}
              >
                {r.displayName || r.name}
              </Tag>
            ))
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>Chưa có vai trò</Text>
          )}
          <Tooltip title="Quản lý vai trò">
            <Tag
              onClick={() => openRoleModal(u)}
              style={{ cursor: 'pointer', borderStyle: 'dashed' }}
              icon={<EditOutlined />}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 120,
      render: (_: unknown, u: AdminUser) => (
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
      render: (_: unknown, u: AdminUser) => {
        const isSelf = currentUser?.id === u.id;
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
            label: 'Quản lý vai trò',
            onClick: () => openRoleModal(u),
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
                label: isSelf ? 'Không thể tự vô hiệu hóa' : 'Vô hiệu hóa',
                danger: !isSelf,
                disabled: isSelf,
                onClick: isSelf ? undefined : () => handleDeactivate(u),
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
          options={roles.map((r) => ({ label: r.displayName || r.name, value: r.id }))}
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

      {/* Modal quản lý vai trò */}
      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: '#4361ee' }} />
            <span>Vai trò — <strong>{roleTargetUser?.fullName || roleTargetUser?.username}</strong></span>
          </Space>
        }
        open={roleModalOpen}
        onCancel={() => { setRoleModalOpen(false); setRoleTargetUserId(null); }}
        footer={<Button onClick={() => { setRoleModalOpen(false); setRoleTargetUserId(null); }}>Đóng</Button>}
        destroyOnHidden
        width={480}
      >
        {roleTargetUser && (
          <div style={{ marginTop: 4 }}>
            {/* Vai trò hiện có */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Vai trò đang được gán
              </Text>
              {roleTargetUser.roles?.length > 0 ? (
                <Space size={6} wrap>
                  {roleTargetUser.roles.map((r) => (
                    <Tag
                      key={r.id}
                      color={r.name.includes('ADMIN') || r.name.includes('SUPER') ? 'red' : 'blue'}
                      closeIcon={roleRemoving === r.id ? <span style={{ fontSize: 10 }}>…</span> : <CloseOutlined style={{ fontSize: 10 }} />}
                      onClose={(e) => { e.preventDefault(); handleRemoveRole(r.id, r.displayName || r.name); }}
                      style={{ fontSize: 13, padding: '3px 10px', userSelect: 'none' }}
                    >
                      {r.displayName || r.name}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary" style={{ fontSize: 13 }}>Chưa có vai trò nào</Text>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '16px 0' }} />

            {/* Gán thêm role */}
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Gán thêm vai trò
            </Text>
            {(() => {
              const assignable = roles.filter(
                (r) => !roleTargetUser.roles?.some((ur) => ur.id === r.id)
              );
              if (assignable.length === 0) {
                return <Text type="secondary" style={{ fontSize: 13 }}>Người dùng đã có tất cả vai trò</Text>;
              }
              return (
                <Space size={6} wrap>
                  {assignable.map((r) => (
                    <Tag
                      key={r.id}
                      icon={roleAssigning ? undefined : <PlusOutlined />}
                      onClick={() => !roleAssigning && handleAssignRole(r.id)}
                      style={{
                        cursor: roleAssigning ? 'not-allowed' : 'pointer',
                        borderStyle: 'dashed',
                        fontSize: 13, padding: '3px 10px',
                        opacity: roleAssigning ? 0.5 : 1,
                      }}
                    >
                      {r.displayName || r.name}
                    </Tag>
                  ))}
                </Space>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Modal hiển thị mật khẩu tạm thời */}
      <Modal
        title={
          <Space>
            <LockOutlined style={{ color: '#f5a623' }} />
            Tài khoản đã tạo thành công
          </Space>
        }
        open={tempPasswordModal.open}
        onOk={() => setTempPasswordModal({ open: false, password: '', username: '' })}
        onCancel={() => setTempPasswordModal({ open: false, password: '', username: '' })}
        okText="Đã lưu mật khẩu"
        cancelButtonProps={{ style: { display: 'none' } }}
        closable={false}
        maskClosable={false}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message="Lưu ý quan trọng"
          description="Đây là lần duy nhất mật khẩu tạm thời được hiển thị. Sau khi đóng modal này, bạn không thể xem lại mật khẩu này nữa."
          style={{ marginBottom: 16, marginTop: 8 }}
        />
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Mật khẩu tạm thời cho <strong>{tempPasswordModal.username}</strong>:
          </Text>
        </div>
        <Paragraph
          copyable={{ text: tempPasswordModal.password, icon: [<CopyOutlined />, <CopyOutlined style={{ color: '#52c41a' }} />] }}
          style={{
            background: '#f5f5f5',
            padding: '10px 14px',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 16,
            letterSpacing: 2,
            marginBottom: 0,
            border: '1px solid #e8e8e8',
          }}
        >
          {tempPasswordModal.password}
        </Paragraph>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 10 }}>
          Người dùng sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
        </Text>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
