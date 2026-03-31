import React, { useEffect, useState, useMemo } from 'react';
import {
  Typography,
  Row,
  Col,
  Card,
  Button,
  Tag,
  Space,
  Input,
  Modal,
  Form,
  Empty,
  Tooltip,
  Spin,
  Alert,
  Popconfirm,
  Select,
  Avatar,
  message,
} from 'antd';
import {
  PlusOutlined,
  FolderOutlined,
  TeamOutlined,
  CheckSquareOutlined,
  LockOutlined,
  GlobalOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useProjectStore } from '../stores/projectStore';
import { adminService } from '../services/adminService';
import { templateService } from '../services/templateService';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { Project, CreateProjectRequest, ProjectTemplate } from '../types';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const PROJECT_COLORS = [
  '#1890ff', '#52c41a', '#fa8c16', '#eb2f96',
  '#722ed1', '#13c2c2', '#f5222d', '#faad14',
];

const getRoleColor = (role?: string) => {
  switch (role) {
    case 'OWNER': return 'gold';
    case 'ADMIN': return 'red';
    case 'MEMBER': return 'blue';
    case 'VIEWER': return 'default';
    default: return 'default';
  }
};

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'OWNER': return 'Quản trị viên';
    case 'ADMIN': return 'Quản trị';
    case 'MEMBER': return 'Thành viên';
    case 'VIEWER': return 'Người xem';
    default: return role ?? '';
  }
};

const ProjectCard: React.FC<{
  project: Project;
  isAdmin: boolean;
  currentUserId?: string;
  onDelete: (id: string) => void;
}> = ({ project, isAdmin, currentUserId, onDelete }) => {
  const navigate = useNavigate();
  const color = project.color || '#1890ff';
  const initial = project.name.charAt(0).toUpperCase();
  const canDelete = isAdmin || project.ownerId === currentUserId || project.currentUserRole === 'OWNER';

  return (
    <Card
      hoverable
      styles={{ body: { padding: 0 } }}
      style={{ borderRadius: 8, overflow: 'hidden', height: '100%', cursor: 'pointer' }}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Color bar + icon */}
      <div
        style={{
          background: color,
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space>
          <Avatar
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700 }}
            size={40}
          >
            {project.icon ?? initial}
          </Avatar>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
              {project.name}
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{project.key}</Text>
          </div>
        </Space>

        <Space>
          {project.isPublic ? (
            <Tooltip title="Công khai">
              <GlobalOutlined style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }} />
            </Tooltip>
          ) : (
            <Tooltip title="Riêng tư">
              <LockOutlined style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }} />
            </Tooltip>
          )}
          {project.isArchived && (
            <Tag color="orange" style={{ margin: 0 }}>Đã lưu trữ</Tag>
          )}
        </Space>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 20px 16px' }}>
        {project.description ? (
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ color: '#555', marginBottom: 12, fontSize: 13 }}
          >
            {project.description}
          </Paragraph>
        ) : (
          <div style={{ marginBottom: 12, height: 40 }} />
        )}

        {/* Stats */}
        <Space size={16} style={{ marginBottom: 12 }}>
          <Space size={4}>
            <TeamOutlined style={{ color: '#888' }} />
            <Text type="secondary" style={{ fontSize: 13 }}>
              {project.memberCount ?? 0} thành viên
            </Text>
          </Space>
          <Space size={4}>
            <CheckSquareOutlined style={{ color: '#888' }} />
            <Text type="secondary" style={{ fontSize: 13 }}>
              {project.taskCount ?? 0} tasks
            </Text>
          </Space>
        </Space>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size={6} wrap>
            {project.currentUserRole && (
              <Tag color={getRoleColor(project.currentUserRole)} style={{ margin: 0 }}>
                {getRoleLabel(project.currentUserRole)}
              </Tag>
            )}
            {isAdmin && project.ownerName && (
              <Tooltip title={`Owner: ${project.ownerName}`}>
                <Tag icon={<CrownOutlined />} color="gold" style={{ margin: 0 }}>
                  {project.ownerName}
                </Tag>
              </Tooltip>
            )}
          </Space>

          {canDelete && (
            <Popconfirm
              title="Xóa project?"
              description="Hành động này không thể hoàn tác."
              onConfirm={() => onDelete(project.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </div>
      </div>
    </Card>
  );
};

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, isLoading, error, fetchProjects, createProject, deleteProject } = useProjectStore();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminProjects, setAdminProjects] = useState<Project[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<CreateProjectRequest>();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Phát hiện admin & tải projects
  useEffect(() => {
    const init = async () => {
      setAdminLoading(true);
      setAdminError(null);

      try {
        // Gọi admin endpoint – nếu thành công → user là admin
        const allProjects = await adminService.getAllProjects();
        setIsAdmin(true);
        setAdminProjects(allProjects);
      } catch (err: any) {
        // 403 / 401 → không phải admin, dùng endpoint thường
        setIsAdmin(false);
        await fetchProjects().catch(() => { });
      } finally {
        setAdminLoading(false);
      }
    };

    init();
  }, []);

  const handleRefresh = async () => {
    if (isAdmin) {
      setAdminLoading(true);
      setAdminError(null);
      try {
        const allProjects = await adminService.getAllProjects();
        setAdminProjects(allProjects);
      } catch (err: any) {
        setAdminError(err.message || 'Không thể tải projects');
      } finally {
        setAdminLoading(false);
      }
    } else {
      await fetchProjects();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      if (isAdmin) {
        setAdminProjects((prev) => prev.filter((p) => p.id !== id));
      }
      message.success('Đã xóa dự án thành công');
    } catch (e: any) {
      const status = (e as any)?.status ?? (e as any)?.response?.status;
      if (status === 400) {
        Modal.warning({
          title: 'Không thể xóa dự án',
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>{e.message || 'Dự án vẫn còn task, vui lòng xóa hết task trước.'}</p>
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => { Modal.destroyAll(); navigate(`/projects/${id}`); }}
              >
                Xem danh sách task →
              </Button>
            </div>
          ),
          okText: 'Đóng',
        });
      } else if (status === 403) {
        message.error('Bạn không có quyền xóa dự án này');
      } else {
        message.error(e.message || 'Xóa dự án thất bại');
      }
    }
  };

  const openCreateModal = async () => {
    form.resetFields();
    setSelectedTemplate(null);
    setCreateModalOpen(true);
    try {
      const tmplList = await templateService.getPublic();
      setTemplates(tmplList);
    } catch { /* ignore */ }
  };

  const handleCreate = async (values: CreateProjectRequest) => {
    setSubmitting(true);
    try {
      let newProject;
      if (selectedTemplate) {
        newProject = await templateService.useTemplate(selectedTemplate, {
          name: values.name,
          key: values.key,
          description: values.description,
          color: values.color,
          isPublic: values.isPublic,
        });
      } else {
        newProject = await createProject(values);
      }
      if (isAdmin) {
        setAdminProjects((prev) => [newProject, ...prev]);
      }
      message.success('Đã tạo dự án');
      form.resetFields();
      setSelectedTemplate(null);
      setCreateModalOpen(false);
    } catch (e: any) {
      message.error(e.message || 'Tạo dự án thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const displayProjects: Project[] = isAdmin ? adminProjects : projects;

  const filtered = useMemo(() => {
    if (!search.trim()) return displayProjects;
    const q = search.toLowerCase();
    return displayProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.ownerName?.toLowerCase().includes(q),
    );
  }, [displayProjects, search]);

  const loading = adminLoading || isLoading;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Space align="center" size={12}>
          <FolderOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Dự án
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {isAdmin ? (
                <Space size={4}>
                  <CrownOutlined style={{ color: '#faad14' }} />
                  Chế độ Admin – hiển thị tất cả dự án
                </Space>
              ) : (
                'Dự án bạn đang tham gia'
              )}
            </Text>
          </div>
        </Space>

        <Space wrap>
          <Search
            placeholder="Tìm theo tên, key..."
            allowClear
            style={{ width: 200 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="Làm mới">
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Tạo dự án
          </Button>
        </Space>
      </div>

      {/* Admin badge */}
      {isAdmin && (
        <Alert
          type="info"
          icon={<CrownOutlined />}
          showIcon
          message={`Tổng cộng ${adminProjects.length} dự án trong hệ thống`}
          style={{ marginBottom: 20 }}
          closable
        />
      )}

      {/* Error */}
      {(adminError || error) && (
        <Alert
          type="error"
          message={adminError || error}
          style={{ marginBottom: 20 }}
          closable
        />
      )}

      {/* Content */}
      <Spin spinning={loading} tip="Đang tải...">
        {!loading && filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              search
                ? `Không tìm thấy dự án nào với từ khóa "${search}"`
                : isAdmin
                  ? 'Chưa có dự án nào trong hệ thống'
                  : 'Bạn chưa tham gia dự án nào'
            }
          >
            {!search && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                Tạo Dự án đầu tiên
              </Button>
            )}
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {filtered.map((project) => (
              <Col key={project.id} xs={24} sm={12} lg={8} xl={6}>
                <ProjectCard
                  project={project}
                  isAdmin={isAdmin}
                  currentUserId={user?.id}
                  onDelete={handleDelete}
                />
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {/* Create Modal */}
      <Modal
        title={
          <Space>
            <FolderOutlined style={{ color: '#1890ff' }} />
            Tạo dự án mới
          </Space>
        }
        open={createModalOpen}
        onCancel={() => {
          form.resetFields();
          setSelectedTemplate(null);
          setCreateModalOpen(false);
        }}
        footer={null}
        destroyOnClose
        width={560}
      >
        {templates.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#595959' }}>
              Chọn template (tùy chọn):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <div
                onClick={() => setSelectedTemplate(null)}
                style={{
                  padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                  border: `2px solid ${selectedTemplate === null ? '#1890ff' : '#d9d9d9'}`,
                  background: selectedTemplate === null ? '#e6f4ff' : '#fff',
                  color: selectedTemplate === null ? '#1890ff' : '#595959',
                }}
              >
                Trống
              </div>
              {templates.map((t) => (
                <div key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                    border: `2px solid ${selectedTemplate === t.id ? '#1890ff' : '#d9d9d9'}`,
                    background: selectedTemplate === t.id ? '#e6f4ff' : '#fff',
                    color: selectedTemplate === t.id ? '#1890ff' : '#595959',
                  }}
                >
                  {t.icon && <span style={{ marginRight: 4 }}>{t.icon}</span>}
                  {t.name}
                </div>
              ))}
            </div>
            {selectedTemplate && (
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 6 }}>
                ✅ Sử dụng template: {templates.find(t => t.id === selectedTemplate)?.name}
                {' '}(board + columns sẽ được tạo tự động)
              </div>
            )}
          </div>
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="key"
            label="Mã dự án"
            rules={[
              { required: true, message: 'Nhập mã dự án' },
              { pattern: /^[A-Z0-9]{2,10}$/, message: 'Mã gồm 2-10 ký tự IN HOA hoặc số, ví dụ: PSBS' },
            ]}
            extra="Mã viết hoa, ví dụ: PSBS, DEV, WEB"
          >
            <Input
              placeholder="PSBS"
              style={{ textTransform: 'uppercase' }}
              onChange={(e) =>
                form.setFieldValue('key', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên Dự án"
            rules={[{ required: true, message: 'Nhập tên dự án' }]}
          >
            <Input placeholder="Tên dự án của bạn" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về dự án..." />
          </Form.Item>

          <Form.Item name="color" label="Màu sắc">
            <Select placeholder="Chọn màu">
              {PROJECT_COLORS.map((c) => (
                <Select.Option key={c} value={c}>
                  <Space>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: c,
                      }}
                    />
                    {c}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="isPublic" label="Phạm vi" initialValue={false}>
            <Select>
              <Select.Option value={false}>
                <Space>
                  <LockOutlined />
                  Private – chỉ thành viên được mời
                </Space>
              </Select.Option>
              <Select.Option value={true}>
                <Space>
                  <GlobalOutlined />
                  Public – mọi người có thể xem
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              onClick={() => {
                form.resetFields();
                setCreateModalOpen(false);
              }}
            >
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Tạo dự án
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
