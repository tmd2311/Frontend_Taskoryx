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
  Steps,
  Divider,
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
  AppstoreOutlined,
  RocketOutlined,
  CodeOutlined,
  BugOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useProjectStore } from '../stores/projectStore';
import { adminService } from '../services/adminService';
import { sprintService } from '../services/sprintService';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { Project, CreateProjectRequest } from '../types';

interface FrontendTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  sprints: { name: string; goal?: string }[];
}

const FRONTEND_TEMPLATES: FrontendTemplate[] = [
  {
    id: 'blank',
    name: 'Trống',
    description: 'Bắt đầu từ đầu với 1 sprint trống',
    icon: <AppstoreOutlined />,
    color: '#8c8c8c',
    sprints: [{ name: 'Sprint 1' }],
  },
  {
    id: 'scrum',
    name: 'Scrum Cơ bản',
    description: '3 sprint theo quy trình Scrum tiêu chuẩn',
    icon: <RocketOutlined />,
    color: '#1890ff',
    sprints: [
      { name: 'Sprint 1 – Khởi động', goal: 'Thiết lập nền tảng dự án' },
      { name: 'Sprint 2 – Phát triển', goal: 'Xây dựng tính năng chính' },
      { name: 'Sprint 3 – Hoàn thiện', goal: 'Kiểm thử và ra mắt' },
    ],
  },
  {
    id: 'software',
    name: 'Phát triển Phần mềm',
    description: '4 sprint: Phân tích → Thiết kế → Dev → QA',
    icon: <CodeOutlined />,
    color: '#722ed1',
    sprints: [
      { name: 'Sprint 1 – Phân tích', goal: 'Thu thập yêu cầu và phân tích hệ thống' },
      { name: 'Sprint 2 – Thiết kế', goal: 'Thiết kế kiến trúc và UI/UX' },
      { name: 'Sprint 3 – Phát triển', goal: 'Lập trình các tính năng chính' },
      { name: 'Sprint 4 – QA & Deploy', goal: 'Kiểm thử và triển khai' },
    ],
  },
  {
    id: 'bugfix',
    name: 'Sửa lỗi & Cải tiến',
    description: '2 sprint: Bug triage → Fix & Release',
    icon: <BugOutlined />,
    color: '#f5222d',
    sprints: [
      { name: 'Sprint 1 – Phân loại lỗi', goal: 'Liệt kê và ưu tiên các lỗi cần sửa' },
      { name: 'Sprint 2 – Sửa & Phát hành', goal: 'Sửa lỗi và phát hành phiên bản mới' },
    ],
  },
  {
    id: 'launch',
    name: 'Ra mắt Sản phẩm',
    description: '5 sprint từ ý tưởng đến ra mắt',
    icon: <StarOutlined />,
    color: '#fa8c16',
    sprints: [
      { name: 'Sprint 1 – Khám phá', goal: 'Nghiên cứu thị trường và xác định MVP' },
      { name: 'Sprint 2 – Prototype', goal: 'Xây dựng nguyên mẫu sản phẩm' },
      { name: 'Sprint 3 – Alpha', goal: 'Phát triển phiên bản Alpha nội bộ' },
      { name: 'Sprint 4 – Beta', goal: 'Kiểm thử với người dùng Beta' },
      { name: 'Sprint 5 – Ra mắt', goal: 'Phát hành chính thức và theo dõi' },
    ],
  },
];

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const PROJECT_COLORS = [
  '#1890ff', '#52c41a', '#fa8c16', '#eb2f96',
  '#722ed1', '#13c2c2', '#f5222d', '#faad14',
];

const getRoleColor = (role?: string) => {
  switch (role) {
    case 'OWNER': return 'gold';
    case 'MANAGER': return 'blue';
    case 'DEVELOPER': return 'green';
    case 'VIEWER': return 'default';
    default: return 'default';
  }
};

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'OWNER': return 'Quản trị viên';
    case 'MANAGER': return 'Quản lý';
    case 'DEVELOPER': return 'Lập trình viên';
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
  const { setCurrentProject } = useProjectStore();
  const color = project.color || '#1890ff';
  const initial = project.name.charAt(0).toUpperCase();
  const canDelete = isAdmin || project.ownerId === currentUserId || project.currentUserRole === 'OWNER';

  const handleProjectClick = () => {
    setCurrentProject(project);
    navigate(`/projects/${project.id}`);
  };

  return (
    <Card
      hoverable
      styles={{ body: { padding: 0 } }}
      style={{ borderRadius: 8, overflow: 'hidden', height: '100%', cursor: 'pointer' }}
      onClick={handleProjectClick}
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
  const [createStep, setCreateStep] = useState<0 | 1>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<FrontendTemplate>(FRONTEND_TEMPLATES[0]);

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

  const openCreateModal = () => {
    form.resetFields();
    setCreateStep(0);
    setSelectedTemplate(FRONTEND_TEMPLATES[0]);
    setCreateModalOpen(true);
  };

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      const newProject = await createProject({
        name: values.name,
        key: values.key,
        description: values.description,
        color: values.color,
        isPublic: values.isPublic,
      });
      // Tạo các sprint theo template đã chọn
      for (const sprint of selectedTemplate.sprints) {
        await sprintService.create(newProject.id, { name: sprint.name, goal: sprint.goal });
      }
      if (isAdmin) {
        setAdminProjects((prev) => [newProject, ...prev]);
      }
      const sprintCount = selectedTemplate.sprints.length;
      message.success(`Đã tạo dự án với ${sprintCount} sprint từ template "${selectedTemplate.name}"`);
      form.resetFields();
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
          setCreateModalOpen(false);
        }}
        footer={null}
        destroyOnClose
        width={620}
      >
        <Steps
          current={createStep}
          size="small"
          style={{ marginBottom: 20, marginTop: 8 }}
          items={[
            { title: 'Chọn template' },
            { title: 'Thông tin dự án' },
          ]}
        />

        {/* Step 0: Template selection */}
        {createStep === 0 && (
          <div>
            <Row gutter={[10, 10]}>
              {FRONTEND_TEMPLATES.map(tpl => (
                <Col key={tpl.id} span={12}>
                  <div
                    onClick={() => setSelectedTemplate(tpl)}
                    style={{
                      border: `2px solid ${selectedTemplate.id === tpl.id ? tpl.color : '#f0f0f0'}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background: selectedTemplate.id === tpl.id ? `${tpl.color}08` : '#fff',
                      transition: 'all .15s',
                    }}
                  >
                    <Space align="start">
                      <span style={{ fontSize: 20, color: tpl.color }}>{tpl.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{tpl.name}</div>
                        <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{tpl.description}</div>
                      </div>
                    </Space>
                  </div>
                </Col>
              ))}
            </Row>

            {/* Sprint preview */}
            <Divider style={{ margin: '16px 0 10px' }} />
            <div style={{ fontSize: 12, color: '#595959', marginBottom: 6, fontWeight: 500 }}>
              Sprint sẽ được tạo ({selectedTemplate.sprints.length}):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedTemplate.sprints.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                  <Tag style={{ margin: 0, minWidth: 28, textAlign: 'center', flexShrink: 0 }}>{i + 1}</Tag>
                  <div>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    {s.goal && <span style={{ color: '#8c8c8c', marginLeft: 6 }}>– {s.goal}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button type="primary" onClick={() => setCreateStep(1)}>
                Tiếp theo →
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Project details */}
        {createStep === 1 && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
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
                  <Space><LockOutlined />Private – chỉ thành viên được mời</Space>
                </Select.Option>
                <Select.Option value={true}>
                  <Space><GlobalOutlined />Public – mọi người có thể xem</Space>
                </Select.Option>
              </Select>
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Button onClick={() => setCreateStep(0)}>← Quay lại</Button>
              <Space>
                <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Tạo dự án
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ProjectsPage;
