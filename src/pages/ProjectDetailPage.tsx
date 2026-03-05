import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Tabs,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Badge,
  Avatar,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CommentOutlined,
  PaperClipOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import type { TaskSummary, ProjectMember } from '../types';
import { TaskPriority } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: 'green',
  [TaskPriority.MEDIUM]: 'blue',
  [TaskPriority.HIGH]: 'orange',
  [TaskPriority.URGENT]: 'red',
};

const PRIORITY_LABEL: Record<string, string> = {
  [TaskPriority.LOW]: 'Thấp',
  [TaskPriority.MEDIUM]: 'Trung bình',
  [TaskPriority.HIGH]: 'Cao',
  [TaskPriority.URGENT]: 'Khẩn cấp',
};

const ROLE_COLOR: Record<string, string> = {
  OWNER: 'gold',
  ADMIN: 'red',
  MEMBER: 'blue',
  VIEWER: 'default',
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

// ─── Task columns ────────────────────────────────────────────
const buildTaskColumns = (): ColumnsType<TaskSummary> => [
  {
    title: 'Mã',
    dataIndex: 'taskKey',
    key: 'taskKey',
    width: 110,
    render: (key: string) => <Tag style={{ fontFamily: 'monospace' }}>{key}</Tag>,
  },
  {
    title: 'Tiêu đề',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: 'Ưu tiên',
    dataIndex: 'priority',
    key: 'priority',
    width: 120,
    render: (p: string) => (
      <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p] ?? p}</Tag>
    ),
  },
  {
    title: 'Assignee',
    dataIndex: 'assigneeName',
    key: 'assigneeName',
    width: 150,
    render: (name?: string) =>
      name ? (
        <Space size={6}>
          <Avatar size={24} icon={<UserOutlined />} />
          <Text style={{ fontSize: 13 }}>{name}</Text>
        </Space>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
  {
    title: 'Hạn chót',
    dataIndex: 'dueDate',
    key: 'dueDate',
    width: 130,
    render: (date: string, record) => {
      if (!date) return <Text type="secondary">—</Text>;
      return (
        <Space size={4}>
          {record.overdue && (
            <Tooltip title="Quá hạn">
              <ExclamationCircleOutlined style={{ color: '#f5222d' }} />
            </Tooltip>
          )}
          <Text style={{ color: record.overdue ? '#f5222d' : undefined, fontSize: 13 }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </Text>
        </Space>
      );
    },
  },
  {
    title: '',
    key: 'meta',
    width: 80,
    render: (_: any, record) => (
      <Space size={8}>
        {record.commentCount > 0 && (
          <Tooltip title={`${record.commentCount} comment`}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              <CommentOutlined /> {record.commentCount}
            </span>
          </Tooltip>
        )}
        {record.attachmentCount > 0 && (
          <Tooltip title={`${record.attachmentCount} file`}>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              <PaperClipOutlined /> {record.attachmentCount}
            </span>
          </Tooltip>
        )}
      </Space>
    ),
  },
];

// ─── Member columns ──────────────────────────────────────────
const memberColumns: ColumnsType<ProjectMember> = [
  {
    title: 'Thành viên',
    key: 'user',
    render: (_, m) => (
      <Space>
        <Avatar src={m.avatarUrl} icon={<UserOutlined />} />
        <div>
          <div style={{ fontWeight: 500 }}>{m.fullName || m.username}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{m.email}</Text>
        </div>
      </Space>
    ),
  },
  {
    title: 'Vai trò',
    dataIndex: 'role',
    key: 'role',
    width: 110,
    render: (role: string) => (
      <Tag color={ROLE_COLOR[role] ?? 'default'}>{ROLE_LABEL[role] ?? role}</Tag>
    ),
  },
  {
    title: 'Tham gia',
    dataIndex: 'joinedAt',
    key: 'joinedAt',
    width: 130,
    render: (d: string) => (
      <Text type="secondary" style={{ fontSize: 13 }}>
        {d ? dayjs(d).format('DD/MM/YYYY') : '—'}
      </Text>
    ),
  },
];

// ─── ProjectDetailPage ───────────────────────────────────────
const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { currentProject, members, fetchProjectById, fetchMembers } = useProjectStore();
  const { projectTasks, isLoading, fetchProjectTasks } = useTaskStore();

  // Bộ lọc
  const [keyword, setKeyword] = useState('');
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterOverdue, setFilterOverdue] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (!projectId) return;
    fetchProjectById(projectId);
    fetchMembers(projectId);
  }, [projectId]);

  // Tải tasks khi filter/page thay đổi
  useEffect(() => {
    if (!projectId) return;
    const params: any = {
      page: page - 1, // Spring Boot 0-based
      size: PAGE_SIZE,
    };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (filterPriority.length) params.priorities = filterPriority.join(',');
    if (filterOverdue !== undefined) params.overdue = filterOverdue;

    fetchProjectTasks(projectId, params);
  }, [projectId, page, keyword, filterPriority, filterOverdue]);

  const handleSearch = (v: string) => {
    setKeyword(v);
    setPage(1);
  };

  const handleReload = () => {
    if (!projectId) return;
    setPage(1);
    fetchProjectTasks(projectId, { page: 0, size: PAGE_SIZE });
  };

  const tasks = projectTasks?.content ?? [];
  const total = projectTasks?.totalElements ?? 0;

  const project = currentProject?.id === projectId ? currentProject : null;
  const color = project?.color || '#1890ff';

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: color,
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/projects')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}
        />

        <div style={{ flex: 1 }}>
          <Space align="center" size={10}>
            <Tag
              style={{
                background: 'rgba(255,255,255,0.25)',
                border: 'none',
                color: '#fff',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              {project?.key ?? '...'}
            </Tag>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
              {project?.name ?? 'Đang tải...'}
            </Title>
          </Space>
          {project?.description && (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, display: 'block', marginTop: 4 }}>
              {project.description}
            </Text>
          )}
        </div>

        <Space size={16}>
          <Space size={4} style={{ color: 'rgba(255,255,255,0.9)' }}>
            <CheckSquareOutlined />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              {project?.taskCount ?? total} tasks
            </Text>
          </Space>
          <Space size={4}>
            <TeamOutlined style={{ color: 'rgba(255,255,255,0.9)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              {project?.memberCount ?? members.length} thành viên
            </Text>
          </Space>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="tasks"
        items={[
          {
            key: 'tasks',
            label: (
              <Space>
                <CheckSquareOutlined />
                Công việc
                <Badge count={total} color="#1890ff" />
              </Space>
            ),
            children: (
              <>
                {/* Filter bar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Tìm kiếm task..."
                    allowClear
                    style={{ width: 240 }}
                    onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
                    onChange={(e) => !e.target.value && handleSearch('')}
                    onBlur={(e) => handleSearch(e.target.value)}
                  />
                  <Select
                    mode="multiple"
                    placeholder="Lọc theo ưu tiên"
                    allowClear
                    style={{ minWidth: 200 }}
                    value={filterPriority}
                    onChange={(v) => { setFilterPriority(v); setPage(1); }}
                    options={[
                      { label: 'Thấp', value: TaskPriority.LOW },
                      { label: 'Trung bình', value: TaskPriority.MEDIUM },
                      { label: 'Cao', value: TaskPriority.HIGH },
                      { label: 'Khẩn cấp', value: TaskPriority.URGENT },
                    ]}
                  />
                  <Select
                    placeholder="Trạng thái hạn"
                    allowClear
                    style={{ width: 160 }}
                    value={filterOverdue}
                    onChange={(v) => { setFilterOverdue(v); setPage(1); }}
                    options={[
                      { label: 'Quá hạn', value: true },
                      { label: 'Còn hạn', value: false },
                    ]}
                  />
                  <Tooltip title="Làm mới">
                    <Button icon={<ReloadOutlined />} onClick={handleReload} loading={isLoading} />
                  </Tooltip>
                </div>

                <Table
                  columns={buildTaskColumns()}
                  dataSource={tasks}
                  rowKey="id"
                  loading={isLoading}
                  pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total,
                    onChange: (p) => setPage(p),
                    showTotal: (t) => `Tổng ${t} task`,
                    showSizeChanger: false,
                  }}
                  locale={{ emptyText: <Empty description="Không có task nào" /> }}
                  rowClassName={(record) => record.overdue ? 'row-overdue' : ''}
                  scroll={{ x: 700 }}
                />
              </>
            ),
          },
          {
            key: 'members',
            label: (
              <Space>
                <TeamOutlined />
                Thành viên
                <Badge count={members.length} color="#52c41a" />
              </Space>
            ),
            children: (
              <Table
                columns={memberColumns}
                dataSource={members}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: <Empty description="Không có thành viên" /> }}
              />
            ),
          },
        ]}
      />

      <style>{`
        .row-overdue td {
          background: #fff2f0 !important;
        }
      `}</style>
    </div>
  );
};

export default ProjectDetailPage;
