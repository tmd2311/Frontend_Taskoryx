import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography, Row, Col, Card, Statistic, Tag, Space, Avatar,
  Button, Empty, Tooltip, Progress, Badge, Table, theme,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  ProjectOutlined, FireOutlined, UserOutlined, LinkOutlined,
  WarningOutlined, CalendarOutlined, RiseOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { dashboardService } from '../services/dashboardService';
import { TaskPriority, TaskStatus } from '../types';
import type { DashboardStats, TaskSummary } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: '#6b7280',
  [TaskPriority.MEDIUM]: '#3b82f6',
  [TaskPriority.HIGH]: '#f97316',
  [TaskPriority.URGENT]: '#ef4444',
};
const PRIORITY_LABEL: Record<string, string> = {
  [TaskPriority.LOW]: 'Thấp',
  [TaskPriority.MEDIUM]: 'Trung bình',
  [TaskPriority.HIGH]: 'Cao',
  [TaskPriority.URGENT]: 'Khẩn cấp',
};

const STATUS_COLOR: Record<string, string> = {
  TODO: '#6b7280', IN_PROGRESS: '#3b82f6', IN_REVIEW: '#f59e0b',
  RESOLVED: '#8b5cf6', DONE: '#10b981', CANCELLED: '#ef4444',
};
const STATUS_LABEL: Record<string, string> = {
  TODO: 'Chưa làm', IN_PROGRESS: 'Đang làm', IN_REVIEW: 'Đang review',
  RESOLVED: 'Đã giải quyết', DONE: 'Hoàn thành', CANCELLED: 'Đã hủy',
};

const DashboardPage: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myTasks, fetchMyTasks, isLoading } = useTaskStore();

  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchMyTasks();
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setStatsLoading(true);
    try {
      const data = await dashboardService.getMyDashboard();
      setDashStats(data);
    } catch {
      // fallback: dùng myTasks
    } finally {
      setStatsLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (dashStats) {
      return {
        total: dashStats.totalTasks ?? myTasks.length,
        overdue: dashStats.overdueTasks ?? myTasks.filter((t) => t.overdue).length,
        completed: dashStats.completedTasks ?? myTasks.filter((t) => t.status === TaskStatus.DONE).length,
        inProgress: dashStats.inProgressTasks ?? myTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      };
    }
    const total = myTasks.length;
    const overdue = myTasks.filter((t) => t.overdue).length;
    const completed = myTasks.filter((t) => t.status === TaskStatus.DONE || t.status === TaskStatus.RESOLVED).length;
    const inProgress = myTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
    return { total, overdue, completed, inProgress };
  }, [dashStats, myTasks]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Biểu đồ xu hướng 7 ngày: group task theo ngày tạo/due
  const trendData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = dayjs().subtract(6 - i, 'day');
      return {
        date: d.format('MM/DD'),
        label: d.format('DD/MM'),
        done: myTasks.filter((t) =>
          t.completedAt && dayjs(t.completedAt).isSame(d, 'day')
        ).length,
        inProgress: myTasks.filter((t) =>
          t.status === TaskStatus.IN_PROGRESS && t.dueDate && dayjs(t.dueDate).isSame(d, 'day')
        ).length,
      };
    });
    return days;
  }, [myTasks]);

  // Phân bổ ưu tiên — dùng BarChart ngang
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {
      [TaskPriority.URGENT]: 0, [TaskPriority.HIGH]: 0,
      [TaskPriority.MEDIUM]: 0, [TaskPriority.LOW]: 0,
    };
    myTasks.forEach((t) => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: PRIORITY_LABEL[key], value, color: PRIORITY_COLOR[key] }));
  }, [myTasks]);

  // Theo dự án
  const projectData = useMemo(() => {
    const counts: Record<string, number> = {};
    myTasks.forEach((t) => {
      const key = t.taskKey?.split('-')[0] ?? 'OTHER';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [myTasks]);

  // Tình trạng deadline — donut
  const overdueData = useMemo(() => {
    const overdue = myTasks.filter((t) => t.overdue).length;
    const onTime = myTasks.filter((t) => t.dueDate && !t.overdue).length;
    const noDue = myTasks.filter((t) => !t.dueDate).length;
    return [
      { name: 'Quá hạn', value: overdue, color: '#ef4444' },
      { name: 'Đúng hạn', value: onTime, color: '#10b981' },
      { name: 'Chưa đặt', value: noDue, color: '#d9d9d9' },
    ].filter((d) => d.value > 0);
  }, [myTasks]);

  const upcomingTasks = useMemo(() => {
    const in7Days = dayjs().add(7, 'day');
    return myTasks
      .filter((t) => t.dueDate && !t.overdue && !t.completedAt && dayjs(t.dueDate).isBefore(in7Days))
      .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)))
      .slice(0, 8);
  }, [myTasks]);

  const overdueTasks = useMemo(() => myTasks.filter((t) => t.overdue).slice(0, 8), [myTasks]);

  const loading = isLoading || statsLoading;

  const alertCols = (type: 'overdue' | 'upcoming'): TableColumnsType<TaskSummary> => [
    {
      title: 'Task', dataIndex: 'taskKey', width: 100,
      render: (k: string) => (
        <Tag
          icon={<LinkOutlined />}
          style={{ fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}
          onClick={() => navigate(`/tasks/${k}`)}
        >{k}</Tag>
      ),
    },
    {
      title: 'Tiêu đề', dataIndex: 'title', ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Ưu tiên', dataIndex: 'priority', width: 110,
      render: (p: string) => <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_LABEL[p]}</Tag>,
    },
    {
      title: type === 'overdue' ? 'Quá hạn' : 'Trạng thái', width: 110,
      render: (_: unknown, r: TaskSummary) => type === 'overdue'
        ? <Tag color="red">+{dayjs().diff(dayjs(r.dueDate), 'day')} ngày</Tag>
        : (
          <Tag style={{ background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status], borderColor: STATUS_COLOR[r.status] + '40', fontSize: 11 }}>
            {STATUS_LABEL[r.status]}
          </Tag>
        ),
    },
    {
      title: 'Assignee', dataIndex: 'assigneeName', width: 130,
      render: (name?: string) => name
        ? <Space size={4}><Avatar size={20} icon={<UserOutlined />} /><Text style={{ fontSize: 12 }}>{name}</Text></Space>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Xin chào, {user?.fullName?.split(' ').pop() || user?.username}! 👋
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Tổng quan cá nhân – {dayjs().format('dddd, DD/MM/YYYY')}
        </Text>
      </div>

      {/* Row 1: Progress circle + 4 stat cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={4} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Card style={{ textAlign: 'center', width: '100%', borderRadius: 10 }} loading={loading}>
            <Progress
              type="circle"
              percent={completionRate}
              strokeColor="#4361ee"
              size={90}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Hoàn thành</Text>
              <br />
              <Text strong style={{ fontSize: 12 }}>{stats.total} task</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={20}>
          <Row gutter={[10, 10]}>
            {[
              { label: 'Tổng công việc', value: stats.total, color: '#3b82f6', icon: <CheckCircleOutlined /> },
              { label: 'Quá hạn', value: stats.overdue, color: '#ef4444', icon: <ExclamationCircleOutlined /> },
              { label: 'Đang thực hiện', value: stats.inProgress, color: '#f97316', icon: <FireOutlined /> },
              { label: 'Số dự án', value: projectData.length, color: '#8b5cf6', icon: <ProjectOutlined /> },
            ].map((item) => (
              <Col xs={12} sm={6} key={item.label}>
                <Card
                  loading={loading}
                  style={{ borderTop: `3px solid ${item.color}`, borderRadius: 10 }}
                >
                  <Statistic
                    title={item.label}
                    value={item.value}
                    valueStyle={{ color: item.color, fontSize: 22 }}
                    prefix={item.icon}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>

      {/* Row 2: AreaChart xu hướng 7 ngày */}
      <Card
        title={<Space><RiseOutlined style={{ color: '#10b981' }} />Xu hướng công việc (7 ngày gần nhất)</Space>}
        style={{ marginBottom: 16, borderRadius: 10 }}
        loading={loading && myTasks.length === 0}
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradInProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <ChartTooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="done" name="Hoàn thành" stroke="#10b981" fill="url(#gradDone)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="inProgress" name="Đang làm" stroke="#3b82f6" fill="url(#gradInProgress)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Row 3: Phân bổ ưu tiên + Tình trạng deadline */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={<Space><WarningOutlined style={{ color: '#f59e0b' }} />Phân bổ theo mức ưu tiên</Space>}
            style={{ borderRadius: 10, height: '100%' }}
            loading={loading && myTasks.length === 0}
          >
            {priorityData.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu" style={{ padding: '20px 0' }} />
            ) : (
              <>
                {priorityData.map((r) => (
                  <div key={r.name} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Space size={6}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
                        <Text style={{ fontSize: 13 }}>{r.name}</Text>
                      </Space>
                      <Text strong style={{ fontSize: 13 }}>{r.value}</Text>
                    </div>
                    <Progress
                      percent={stats.total > 0 ? Math.round((r.value / stats.total) * 100) : 0}
                      strokeColor={r.color}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                ))}
                {projectData.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Theo dự án:</Text>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={projectData} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <ChartTooltip formatter={(v: any) => [v + ' task', 'Số task']} />
                        <Bar dataKey="value" name="Số task" fill="#4361ee" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={<Space><CalendarOutlined style={{ color: '#3b82f6' }} />Tình trạng deadline</Space>}
            style={{ borderRadius: 10, height: '100%' }}
            loading={loading && myTasks.length === 0}
          >
            {overdueData.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu" style={{ padding: '20px 0' }} />
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={overdueData}
                        cx="50%" cy="50%"
                        innerRadius={52} outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {overdueData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip formatter={(v: any, name: any) => [v + ' task', name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none',
                  }}>
                    <Text strong style={{ fontSize: 20, display: 'block', color: token.colorText }}>{stats.total}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>task</Text>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  {overdueData.map((d) => (
                    <div key={d.name} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '5px 0', borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    }}>
                      <Space size={6}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                        <Text style={{ fontSize: 13 }}>{d.name}</Text>
                      </Space>
                      <Text strong style={{ fontSize: 13 }}>{d.value}</Text>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 4: Table cảnh báo */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            style={{ borderRadius: 10 }}
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
                Task quá hạn
                {overdueTasks.length > 0 && <Badge count={overdueTasks.length} style={{ backgroundColor: '#ef4444' }} />}
              </Space>
            }
            extra={<Button type="link" size="small" onClick={() => navigate('/tasks')}>Xem tất cả</Button>}
            loading={loading}
          >
            {overdueTasks.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có task quá hạn!" style={{ padding: '12px 0' }} />
            ) : (
              <Table
                dataSource={overdueTasks}
                columns={alertCols('overdue')}
                rowKey="id"
                size="small"
                scroll={{ x: 500 }}
                pagination={{ pageSize: 5, size: 'small', showSizeChanger: false }}
                rowClassName={() => 'row-dash-overdue'}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            style={{ borderRadius: 10 }}
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#f59e0b' }} />
                Sắp đến hạn (7 ngày tới)
                {upcomingTasks.length > 0 && <Badge count={upcomingTasks.length} style={{ backgroundColor: '#f59e0b' }} />}
              </Space>
            }
            extra={<Button type="link" size="small" onClick={() => navigate('/tasks')}>Xem tất cả</Button>}
            loading={loading}
          >
            {upcomingTasks.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có task nào sắp đến hạn" style={{ padding: '12px 0' }} />
            ) : (
              <Table
                dataSource={upcomingTasks}
                columns={alertCols('upcoming')}
                rowKey="id"
                size="small"
                scroll={{ x: 500 }}
                pagination={{ pageSize: 5, size: 'small', showSizeChanger: false }}
                rowClassName={() => 'row-dash-upcoming'}
              />
            )}
          </Card>
        </Col>
      </Row>

      <style>{`
        .row-dash-overdue td { background: ${token.colorErrorBg} !important; }
        .row-dash-overdue:hover td { background: ${token.colorErrorBgHover} !important; }
        .row-dash-upcoming td { background: ${token.colorWarningBg} !important; }
        .row-dash-upcoming:hover td { background: ${token.colorWarningBgHover} !important; }
      `}</style>
    </div>
  );
};

export default DashboardPage;
