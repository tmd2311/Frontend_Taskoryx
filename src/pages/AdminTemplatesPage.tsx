import React, { useEffect, useState } from 'react';
import {
  Typography, Table, Button, Space, Tag, Modal, Form, Input, Switch,
  Select, Tooltip, Popconfirm, message, Badge, ColorPicker, Divider,
  Empty, Row, Col, Alert,
} from 'antd';
import type { TableColumnsType } from 'antd';
type ColumnsType<T> = TableColumnsType<T>;
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  AppstoreAddOutlined, LockOutlined, MinusCircleOutlined, HolderOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePermissionStore } from '../stores/permissionStore';
import { templateService } from '../services/templateService';
import type { ProjectTemplate, TemplateColumn, TemplateConfig } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BOARD_TYPES = [
  { label: 'Scrum', value: 'SCRUM' },
  { label: 'Kanban', value: 'KANBAN' },
  { label: 'Personal', value: 'PERSONAL' },
];

const TASK_FIELDS = [
  { label: 'Ưu tiên', value: 'priority' },
  { label: 'Hạn chót', value: 'dueDate' },
  { label: 'Giờ ước tính', value: 'estimatedHours' },
  { label: 'Người phụ trách', value: 'assignee' },
  { label: 'Nhãn', value: 'labels' },
  { label: 'Sprint', value: 'sprint' },
];

const ENABLED_MODULES = [
  { label: 'Sprint', value: 'SPRINT' },
  { label: 'Theo dõi thời gian', value: 'TIME_TRACKING' },
  { label: 'Đính kèm file', value: 'ATTACHMENT' },
];

const STATUS_OPTIONS = [
  { label: 'TODO', value: 'TODO' },
  { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
  { label: 'IN_REVIEW', value: 'IN_REVIEW' },
  { label: 'RESOLVED', value: 'RESOLVED' },
  { label: 'DONE', value: 'DONE' },
  { label: 'CANCELLED', value: 'CANCELLED' },
];

const DEFAULT_COLUMNS: TemplateColumn[] = [
  { name: 'Cần làm', color: '#f59e0b', isCompleted: false, mappedStatus: 'TODO' },
  { name: 'Đang làm', color: '#3b82f6', isCompleted: false, mappedStatus: 'IN_PROGRESS' },
  { name: 'Done', color: '#22c55e', isCompleted: true, mappedStatus: 'DONE' },
];

const isSystemTemplate = (t: ProjectTemplate) => !t.createdBy;

type ModalMode = 'view' | 'create' | 'edit';

const AdminTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const { hasPermission } = usePermissionStore();
  const canManage = isAdmin || hasPermission('TEMPLATE_MANAGE');

  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [target, setTarget] = useState<ProjectTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Column builder state
  const [columns, setColumns] = useState<TemplateColumn[]>(DEFAULT_COLUMNS);
  const [taskFields, setTaskFields] = useState<string[]>(['priority', 'dueDate', 'assignee']);
  const [enabledModules, setEnabledModules] = useState<string[]>(['ATTACHMENT']);
  const [boardType, setBoardType] = useState<'KANBAN' | 'SCRUM' | 'PERSONAL'>('SCRUM');

  useEffect(() => {
    if (!isAdmin && !hasPermission('TEMPLATE_MANAGE')) {
      message.error('Bạn không có quyền truy cập trang này');
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await templateService.getAll();
      setTemplates(data);
    } catch (e: any) {
      message.error(e.message || 'Không thể tải danh sách template');
    } finally {
      setLoading(false);
    }
  };

  // ── Group by category ──────────────────────────────────────
  const grouped = templates.reduce((acc, t) => {
    const cat = t.category || 'Khác';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, ProjectTemplate[]>);

  // ── Column builder helpers ─────────────────────────────────
  const addColumn = () =>
    setColumns((prev) => [
      ...prev,
      { name: '', color: '#6b7280', isCompleted: false, mappedStatus: 'TODO' },
    ]);

  const removeColumn = (idx: number) =>
    setColumns((prev) => prev.filter((_, i) => i !== idx));

  const updateColumn = (idx: number, patch: Partial<TemplateColumn>) =>
    setColumns((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  // ── Build columnsConfig string ─────────────────────────────
  const buildColumnsConfig = (): string => {
    const config: TemplateConfig = {
      boardType,
      columns,
      taskFields,
      enabledModules,
    };
    return JSON.stringify(config);
  };

  // ── Populate form from template ────────────────────────────
  const populateFromTemplate = (t: ProjectTemplate) => {
    form.setFieldsValue({
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      color: t.color || '#1976d2',
      isPublic: t.isPublic,
    });
    if (t.config) {
      setBoardType(t.config.boardType || 'SCRUM');
      setColumns(t.config.columns?.length ? t.config.columns : DEFAULT_COLUMNS);
      setTaskFields(t.config.taskFields ?? []);
      setEnabledModules(t.config.enabledModules ?? []);
    } else {
      setBoardType('SCRUM');
      setColumns(DEFAULT_COLUMNS);
      setTaskFields(['priority', 'dueDate', 'assignee']);
      setEnabledModules(['ATTACHMENT']);
    }
  };

  // ── Open modals ────────────────────────────────────────────
  const openCreate = () => {
    setTarget(null);
    setModalMode('create');
    form.resetFields();
    form.setFieldsValue({ isPublic: true, color: '#1976d2' });
    setBoardType('SCRUM');
    setColumns(DEFAULT_COLUMNS);
    setTaskFields(['priority', 'dueDate', 'assignee']);
    setEnabledModules(['ATTACHMENT']);
  };

  const openEdit = async (t: ProjectTemplate) => {
    setTarget(t);
    setModalMode('edit');
    try {
      const detail = await templateService.getById(t.id);
      populateFromTemplate(detail);
    } catch {
      populateFromTemplate(t);
    }
  };

  const openView = async (t: ProjectTemplate) => {
    setTarget(t);
    setModalMode('view');
    try {
      const detail = await templateService.getById(t.id);
      populateFromTemplate(detail);
    } catch {
      populateFromTemplate(t);
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setTarget(null);
    form.resetFields();
    setColumns(DEFAULT_COLUMNS);
    setTaskFields([]);
    setEnabledModules([]);
    setBoardType('SCRUM');
  };

  // ── Validate ───────────────────────────────────────────────
  const validateColumns = (): string | null => {
    if (columns.length === 0) return 'Phải có ít nhất 1 cột';
    if (!columns.some((c) => c.isCompleted)) return 'Phải có ít nhất 1 cột đánh dấu "Hoàn thành"';
    if (columns.some((c) => !c.name.trim())) return 'Tên cột không được để trống';
    return null;
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    try { await form.validateFields(); } catch { return; }
    const colError = validateColumns();
    if (colError) { message.error(colError); return; }

    const values = form.getFieldsValue();
    const body = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      category: values.category?.trim() || undefined,
      icon: values.icon?.trim() || undefined,
      color: values.color || '#1976d2',
      isPublic: values.isPublic ?? true,
      columnsConfig: buildColumnsConfig(),
    };

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await templateService.create(body);
        message.success('Đã tạo template');
      } else if (modalMode === 'edit' && target) {
        await templateService.update(target.id, body);
        message.success('Đã cập nhật template');
      }
      closeModal();
      fetchAll();
    } catch (e: any) {
      message.error(e.message || 'Lưu template thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (t: ProjectTemplate) => {
    try {
      await templateService.delete(t.id);
      message.success(`Đã xóa template "${t.name}"`);
      fetchAll();
    } catch (e: any) {
      message.error(e.message || 'Xóa template thất bại');
    }
  };

  // ── Columns table ──────────────────────────────────────────
  const tableColumns: ColumnsType<ProjectTemplate> = [
    {
      title: 'Template', key: 'name',
      render: (_: unknown, t: ProjectTemplate) => (
        <Space>
          <span style={{ fontSize: 22 }}>{t.icon || '📋'}</span>
          <div>
            <Space size={6}>
              <Text strong style={{ fontSize: 13 }}>{t.name}</Text>
              {isSystemTemplate(t) && (
                <Tag icon={<LockOutlined />} color="red" style={{ fontSize: 11 }}>Hệ thống</Tag>
              )}
              {!isSystemTemplate(t) && (
                <Tag color="blue" style={{ fontSize: 11 }}>Của tôi</Tag>
              )}
            </Space>
            {t.description && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{t.description}</Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Danh mục', dataIndex: 'category', key: 'category', width: 130,
      render: (c: string) => c ? <Tag>{c}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Công khai', dataIndex: 'isPublic', key: 'isPublic', width: 100,
      render: (v: boolean) => (
        <Badge status={v ? 'success' : 'default'} text={v ? 'Có' : 'Không'} />
      ),
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', width: 115,
      render: (d: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {d ? dayjs(d).format('DD/MM/YYYY') : '—'}
        </Text>
      ),
    },
    {
      title: 'Thao tác', key: 'actions', width: 140,
      render: (_: unknown, t: ProjectTemplate) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openView(t)} />
          </Tooltip>
          {canManage && !isSystemTemplate(t) && (
            <>
              <Tooltip title="Chỉnh sửa">
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(t)} />
              </Tooltip>
              <Popconfirm
                title={`Xóa template "${t.name}"?`}
                description="Dự án đã tạo từ template này sẽ không bị ảnh hưởng."
                onConfirm={() => handleDelete(t)}
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

  const isViewMode = modalMode === 'view';
  const isEditable = modalMode === 'create' || modalMode === 'edit';

  // ── Column builder UI ─────────────────────────────────────
  const renderColumnBuilder = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 13 }}>Cột Kanban</Text>
        {isEditable && (
          <Button size="small" icon={<PlusOutlined />} onClick={addColumn}>
            Thêm cột
          </Button>
        )}
      </div>
      {columns.length === 0 && (
        <Text type="secondary" style={{ fontSize: 12 }}>Chưa có cột nào</Text>
      )}
      {columns.map((col, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            padding: '6px 10px', background: '#fafafa', borderRadius: 6,
            border: '1px solid #f0f0f0',
          }}
        >
          {isEditable && <HolderOutlined style={{ color: '#bbb', cursor: 'grab' }} />}
          <div
            style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0,
              background: col.color, border: '1px solid #ddd',
            }}
          />
          {isEditable ? (
            <>
              <Input
                size="small"
                placeholder="Tên cột"
                value={col.name}
                onChange={(e) => updateColumn(idx, { name: e.target.value })}
                style={{ flex: 1 }}
              />
              <Select
                size="small"
                value={col.mappedStatus}
                onChange={(v) => updateColumn(idx, { mappedStatus: v })}
                options={STATUS_OPTIONS}
                style={{ width: 130 }}
              />
              <ColorPicker
                size="small"
                value={col.color}
                onChange={(c) => updateColumn(idx, { color: c.toHexString().slice(0, 7) })}
                disabledAlpha
              />
              <Tooltip title="Cột hoàn thành">
                <Switch
                  size="small"
                  checked={col.isCompleted}
                  onChange={(v) => updateColumn(idx, { isCompleted: v })}
                />
              </Tooltip>
              <Tooltip title="Xóa cột">
                <Button
                  type="text" size="small" danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeColumn(idx)}
                />
              </Tooltip>
            </>
          ) : (
            <>
              <Text style={{ flex: 1, fontSize: 13 }}>{col.name}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{col.mappedStatus}</Text>
              {col.isCompleted && <Tag color="green" style={{ fontSize: 11 }}>Hoàn thành</Tag>}
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản lý Template</Title>
          <Text type="secondary">Tổng cộng {templates.length} template trong hệ thống</Text>
        </div>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo Template
          </Button>
        )}
      </div>

      {/* Grouped by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AppstoreAddOutlined style={{ color: '#4361ee' }} />
            <Text strong style={{ fontSize: 14, color: '#4361ee' }}>{category}</Text>
            <Badge count={items.length} color="#4361ee" size="small" />
          </div>
          <Table
            columns={tableColumns}
            dataSource={items}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: <Empty description="Chưa có template" /> }}
            scroll={{ x: 700 }}
            size="small"
          />
        </div>
      ))}

      {templates.length === 0 && !loading && (
        <Empty description="Chưa có template nào" />
      )}

      {/* Modal Tạo / Sửa / Xem */}
      <Modal
        title={
          <Space>
            <AppstoreAddOutlined />
            {modalMode === 'create' && 'Tạo Template mới'}
            {modalMode === 'edit' && `Chỉnh sửa — ${target?.name}`}
            {modalMode === 'view' && target?.name}
          </Space>
        }
        open={modalMode !== null}
        onCancel={closeModal}
        width={720}
        destroyOnHidden
        footer={
          isEditable ? (
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
                {modalMode === 'create' ? 'Tạo Template' : 'Lưu thay đổi'}
              </Button>
            </Space>
          ) : (
            <Button onClick={closeModal}>Đóng</Button>
          )
        }
      >
        {isViewMode && target && isSystemTemplate(target) && (
          <Alert
            type="info"
            showIcon
            icon={<LockOutlined />}
            message="System Template — không thể sửa hoặc xóa"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="name" label="Tên template"
                rules={[{ required: true, message: 'Vui lòng nhập tên template!' }, { max: 100 }]}
              >
                <Input placeholder="VD: Phát triển phần mềm" disabled={isViewMode} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="icon" label="Icon (emoji)">
                <Input placeholder="💻" maxLength={4} disabled={isViewMode} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="isPublic" label="Công khai" valuePropName="checked">
                <Switch disabled={isViewMode} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="category" label="Danh mục">
                <Input placeholder="VD: Software, Marketing..." disabled={isViewMode} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="color"
                label="Màu sắc"
                getValueFromEvent={(c) => c.toHexString().slice(0, 7)}
                getValueProps={(v) => ({ value: v })}
              >
                <ColorPicker format="hex" showText disabledAlpha disabled={isViewMode} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả template (tùy chọn)" disabled={isViewMode} />
          </Form.Item>
        </Form>

        <Divider style={{ margin: '12px 0' }} />

        {/* Board config */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Loại board</Text>
            <Select
              value={boardType}
              onChange={(v) => setBoardType(v)}
              options={BOARD_TYPES}
              style={{ width: '100%' }}
              disabled={isViewMode}
            />
          </Col>
          <Col span={16}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Modules bật sẵn</Text>
            <Select
              mode="multiple"
              value={enabledModules}
              onChange={setEnabledModules}
              options={ENABLED_MODULES}
              style={{ width: '100%' }}
              disabled={isViewMode}
              placeholder="Chọn modules"
            />
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Task fields hiển thị</Text>
          <Select
            mode="multiple"
            value={taskFields}
            onChange={setTaskFields}
            options={TASK_FIELDS}
            style={{ width: '100%' }}
            disabled={isViewMode}
            placeholder="Chọn các trường hiển thị trên task"
          />
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {renderColumnBuilder()}

        {isEditable && !columns.some((c) => c.isCompleted) && columns.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="Cần ít nhất 1 cột được đánh dấu là cột hoàn thành (toggle xanh)"
            style={{ marginTop: 8 }}
          />
        )}
      </Modal>
    </div>
  );
};

export default AdminTemplatesPage;
