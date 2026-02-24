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
  Badge,
  Popconfirm,
  Select,
  Avatar,
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
  UserOutlined,
} from '@ant-design/icons';
import { useProjectStore } from '../stores/projectStore';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../stores/authStore';
import type { Project, CreateProjectRequest } from '../types';

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
    case 'OWNER': return 'Owner';
    case 'ADMIN': return 'Admin';
    case 'MEMBER': return 'Member';
    case 'VIEWER': return 'Viewer';
    default: return role ?? '';
  }
};

const ProjectCard: React.FC<{
  project: Project;
  isAdmin: boolean;
  currentUserId?: string;
  onDelete: (id: string) => void;
}> = ({ project, isAdmin, currentUserId, onDelete }) => {
  const color = project.color || '#1890ff';
  const initial = project.name.charAt(0).toUpperCase();
  const canDelete = isAdmin || project.ownerId === currentUserId || project.currentUserRole === 'OWNER';

  return (
    <Card
      hoverable
      styles={{ body: { padding: 0 } }}
      style={{ borderRadius: 8, overflow: 'hidden', height: '100%' }}
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
            <Tooltip title="Public">
              <GlobalOutlined style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }} />
            </Tooltip>
          ) : (
            <Tooltip title="Private">
              <LockOutlined style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }} />
            </Tooltip>
          )}
          {project.isArchived && (
            <Tag color="orange" style={{ margin: 0 }}>Archived</Tag>
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
        await fetchProjects().catch(() => {});
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
    await deleteProject(id);
    if (isAdmin) {
      setAdminProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleCreate = async (values: CreateProjectRequest) => {
    setSubmitting(true);
    try {
      const newProject = await createProject(values);
      if (isAdmin) {
        setAdminProjects((prev) => [newProject, ...prev]);
      }
      form.resetFields();
      setCreateModalOpen(false);
    } catch {
      // error hiển thị qua store
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
              Projects
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {isAdmin ? (
                <Space size={4}>
                  <CrownOutlined style={{ color: '#faad14' }} />
                  Chế độ Admin – hiển thị tất cả projects
                </Space>
              ) : (
                'Projects bạn đang tham gia'
              )}
            </Text>
          </div>
        </Space>

        <Space>
          <Search
            placeholder="Tìm theo tên, key..."
            allowClear
            style={{ width: 240 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="Làm mới">
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            Tạo Project
          </Button>
        </Space>
      </div>

      {/* Admin badge */}
      {isAdmin && (
        <Alert
          type="info"
          icon={<CrownOutlined />}
          showIcon
          message={`Tổng cộng ${adminProjects.length} project trong hệ thống`}
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
                ? `Không tìm thấy project nào với từ khóa "${search}"`
                : isAdmin
                ? 'Chưa có project nào trong hệ thống'
                : 'Bạn chưa tham gia project nào'
            }
          >
            {!search && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                Tạo Project đầu tiên
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
            Tạo Project mới
          </Space>
        }
        open={createModalOpen}
        onCancel={() => {
          form.resetFields();
          setCreateModalOpen(false);
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="key"
            label="Project Key"
            rules={[
              { required: true, message: 'Nhập project key' },
              { pattern: /^[A-Z0-9]{2,10}$/, message: 'Key gồm 2-10 ký tự IN HOA hoặc số, ví dụ: PSBS' },
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
            label="Tên Project"
            rules={[{ required: true, message: 'Nhập tên project' }]}
          >
            <Input placeholder="Tên project của bạn" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về project..." />
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
              Tạo Project
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
