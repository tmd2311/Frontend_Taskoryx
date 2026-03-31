import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography, Table, Button, Space, Tag, Modal, Form, Input,
  Checkbox, Tooltip, Popconfirm, message, Badge, Spin, Empty, Divider,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SafetyCertificateOutlined, LockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import { useAuthStore } from '../stores/authStore';
import type { Role, Permission } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const groupByResource = (permissions: Permission[]): Record<string, Permission[]> =>
  permissions.reduce((acc, p) => {
    const res = p.resource || 'OTHER';
    if (!acc[res]) acc[res] = [];
    acc[res].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

type ModalMode = 'view' | 'create' | 'edit';

const AdminRolesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const {
    roles, permissions, isLoading,
    fetchRoles, fetchPermissions,
    createRole, updateRole, deleteRole,
    assignPermissions, removePermissions,
  } = useAdminStore();

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [targetRole, setTargetRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [checkedPerms, setCheckedPerms] = useState<string[]>([]);

  useEffect(() => {
    if (isAdmin === false) {
      message.error('Bạn không có quyền truy cập trang này');
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const grouped = useMemo(() => groupByResource(permissions), [permissions]);
  const isViewMode = modalMode === 'view';
  const isEditable = modalMode === 'create' || modalMode === 'edit';

  // ── Mở modal ──────────────────────────────────────────────
  const openCreate = () => {
    setTargetRole(null);
    setModalMode('create');
    form.resetFields();
    setCheckedPerms([]);
  };

  const openView = (role: Role) => {
    setTargetRole(role);
    setModalMode('view');
    setCheckedPerms((role.permissions ?? []).map((p) => p.id));
  };

  const openEdit = (role: Role) => {
    setTargetRole(role);
    setModalMode('edit');
    form.setFieldsValue({ name: role.name, description: role.description });
    setCheckedPerms((role.permissions ?? []).map((p) => p.id));
  };

  const closeModal = () => {
    setModalMode(null);
    setTargetRole(null);
    form.resetFields();
    setCheckedPerms([]);
  };

  // ── Lưu ───────────────────────────────────────────────────
  const handleSave = async () => {
    try { await form.validateFields(); } catch { return; }
    const values = form.getFieldsValue();
    setSaving(true);
    try {
      if (modalMode === 'create') {
        await createRole({
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          permissionIds: checkedPerms.length > 0 ? checkedPerms : undefined,
        });
        message.success('Tạo role thành công');
      } else if (modalMode === 'edit' && targetRole) {
        await updateRole(targetRole.id, {
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
        });
        const currentIds = new Set((targetRole.permissions ?? []).map((p) => p.id));
        const toAdd = checkedPerms.filter((id) => !currentIds.has(id));
        const toRemove = [...currentIds].filter((id) => !new Set(checkedPerms).has(id));
        if (toAdd.length > 0) await assignPermissions(targetRole.id, { permissionIds: toAdd });
        if (toRemove.length > 0) await removePermissions(targetRole.id, { permissionIds: toRemove });
        message.success('Cập nhật role thành công');
      }
      closeModal();
      fetchRoles();
    } catch (e: any) {
      message.error(e.message || 'Lưu role thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ── Xóa ───────────────────────────────────────────────────
  const handleDelete = async (role: Role) => {
    try {
      await deleteRole(role.id);
      message.success(`Đã xóa role "${role.name}"`);
      fetchRoles();
    } catch (e: any) {
      message.error(e.message || 'Xóa role thất bại');
    }
  };

  // ── Columns ───────────────────────────────────────────────
  const columns: ColumnsType<Role> = [
    {
      title: 'Tên role', key: 'name',
      render: (_, r) => (
        <Space size={8}>
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
          {r.isSystemRole && (
            <Tag icon={<LockOutlined />} color="red" style={{ fontSize: 11 }}>System</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Mô tả', dataIndex: 'description', key: 'description',
      render: (d: string) => <Text type="secondary" style={{ fontSize: 13 }}>{d || '—'}</Text>,
    },
    {
      title: 'Quyền hạn', key: 'permissions', width: 140,
      render: (_, r) => {
        const count = (r.permissions ?? []).length;
        return <Tag color={count > 0 ? 'blue' : 'default'}>{count} quyền</Tag>;
      },
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', width: 120,
      render: (d: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {d ? dayjs(d).format('DD/MM/YYYY') : '—'}
        </Text>
      ),
    },
    {
      title: 'Thao tác', key: 'actions', width: 150,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)} />
          </Tooltip>
          {!r.isSystemRole && (
            <>
              <Tooltip title="Chỉnh sửa">
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              </Tooltip>
              <Popconfirm
                title={`Xóa role "${r.name}"?`}
                description="Người dùng đang có role này sẽ bị ảnh hưởng."
                onConfirm={() => handleDelete(r)}
                okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  // ── Permissions grouped checkboxes ────────────────────────
  const renderPermissions = () => {
    if (permissions.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="small" />
          <div style={{ marginTop: 8, color: '#8c9ab0', fontSize: 13 }}>Đang tải permissions...</div>
        </div>
      );
    }
    return (
      <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
        {Object.entries(grouped).map(([resource, perms], idx) => {
          const allChecked = perms.every((p) => checkedPerms.includes(p.id));
          const someChecked = perms.some((p) => checkedPerms.includes(p.id));
          const checkedCount = perms.filter((p) => checkedPerms.includes(p.id)).length;
          return (
            <div key={resource}>
              {idx > 0 && <Divider style={{ margin: '10px 0' }} />}
              {/* Resource header with select-all */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {!isViewMode && (
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={(e) => {
                      const ids = perms.map((p) => p.id);
                      setCheckedPerms((prev) =>
                        e.target.checked
                          ? [...new Set([...prev, ...ids])]
                          : prev.filter((id) => !ids.includes(id))
                      );
                    }}
                  />
                )}
                <Text strong style={{ fontSize: 12, color: '#4361ee' }}>{resource}</Text>
                {checkedCount > 0 && (
                  <Badge count={checkedCount} color="#4361ee" size="small" />
                )}
              </div>
              {/* Permission checkboxes */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 0', paddingLeft: isViewMode ? 0 : 22 }}>
                {perms.map((p) => (
                  <div key={p.id} style={{ width: '50%' }}>
                    <Checkbox
                      checked={checkedPerms.includes(p.id)}
                      disabled={isViewMode}
                      onChange={(e) =>
                        setCheckedPerms((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                        )
                      }
                    >
                      <Tooltip title={p.description}>
                        <Text style={{ fontSize: 12 }}>{p.name}</Text>
                      </Tooltip>
                    </Checkbox>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản lý Role</Title>
          <Text type="secondary">Tổng cộng {roles.length} role trong hệ thống</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Tạo Role
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: <Empty description="Chưa có role nào" /> }}
        scroll={{ x: 700 }}
      />

      {/* Modal Tạo / Sửa / Xem */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined />
            {modalMode === 'create' && 'Tạo Role mới'}
            {modalMode === 'edit' && `Chỉnh sửa — ${targetRole?.name}`}
            {modalMode === 'view' && targetRole?.name}
          </Space>
        }
        open={modalMode !== null}
        onCancel={closeModal}
        width={620}
        destroyOnHidden
        footer={
          isEditable ? (
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
                {modalMode === 'create' ? 'Tạo Role' : 'Lưu thay đổi'}
              </Button>
            </Space>
          ) : (
            <Button onClick={closeModal}>Đóng</Button>
          )
        }
      >
        {/* Form tên / mô tả — chỉ khi tạo/sửa */}
        {isEditable && (
          <Form form={form} layout="vertical" style={{ marginBottom: 16 }}>
            <Form.Item
              name="name" label="Tên Role"
              rules={[
                { required: true, message: 'Vui lòng nhập tên role!' },
                { max: 100, message: 'Tối đa 100 ký tự!' },
              ]}
            >
              <Input placeholder="VD: Team Lead, Reviewer..." />
            </Form.Item>
            <Form.Item
              name="description" label="Mô tả"
              rules={[{ max: 255, message: 'Tối đa 255 ký tự!' }]}
            >
              <Input.TextArea rows={2} placeholder="Mô tả vai trò này (tùy chọn)" />
            </Form.Item>
          </Form>
        )}

        {/* Header khi xem */}
        {isViewMode && targetRole && (
          <div style={{ marginBottom: 12 }}>
            <Space size={8}>
              <Text strong style={{ fontSize: 15 }}>{targetRole.name}</Text>
              {targetRole.isSystemRole && (
                <Tag icon={<LockOutlined />} color="red">System Role</Tag>
              )}
            </Space>
            {targetRole.description && (
              <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                {targetRole.description}
              </Text>
            )}
            <Divider style={{ margin: '12px 0' }} />
          </div>
        )}

        {/* Permissions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text strong>Quyền hạn</Text>
            {!isViewMode && checkedPerms.length > 0 && (
              <Tag color="blue">{checkedPerms.length} đã chọn</Tag>
            )}
          </div>
          {renderPermissions()}
        </div>
      </Modal>
    </div>
  );
};

export default AdminRolesPage;
