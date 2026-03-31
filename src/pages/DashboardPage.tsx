import React, { useEffect, useMemo, useState } from 'react';
import { Typography, Row, Col, Card, Statistic, List, Tag, Space, Avatar, Button, Empty, Tooltip } from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  ProjectOutlined, FireOutlined, UserOutlined,
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { dashboardService } from '../services/dashboardService';
import { TaskPriority, TaskStatus } from '../types';
import type { DashboardStats, TaskSummary } from '../types';
import { StatusTag } from '../components/StatusSelect';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: '#52c41a',
  [TaskPriority.MEDIUM]: '#1890ff',
  [TaskPriority.HIGH]: '#faad14',
  [TaskPriority.URGENT]: '#f5222d',
};
const PRIORITY_LABEL: Record<string, string> = {
  [TaskPriority.LOW]: 'Thấp',
  [TaskPriority.MEDIUM]: 'Trung bình',
  [TaskPriority.HIGH]: 'Cao',
  [TaskPriority.URGENT]: 'Khẩn cấp',
};

const DashboardPage: React.FC = () => {
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
      // Fallback: dùng myTasks để tính
    } finally {
      setStatsLoading(false);
    }
  };

  // Stats từ API hoặc tính từ myTasks
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

  // Chart: ưu tiên
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {
      [TaskPriority.LOW]: 0, [TaskPriority.MEDIUM]: 0,
      [TaskPriority.HIGH]: 0, [TaskPriority.URGENT]: 0,
    };
    myTasks.forEach((t) => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: PRIORITY_LABEL[key], value, color: PRIORITY_COLOR[key] }));
  }, [myTasks]);

  // Chart: dự án
  const projectData = useMemo(() => {
    const counts: Record<string, number> = {};
    myTasks.forEach((t) => {
      const key = t.taskKey?.split('-')[0] ?? 'OTHER';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [myTasks]);

  // Chart: hạn
  const overdueData = useMemo(() => {
    const overdue = myTasks.filter((t) => t.overdue).length;
    const onTime = myTasks.filter((t) => t.dueDate && !t.overdue).length;
    const noDue = myTasks.filter((t) => !t.dueDate).length;
    return [
      { name: 'Quá hạn', value: overdue, color: '#f5222d' },
      { name: 'Đúng hạn', value: onTime, color: '#52c41a' },
      { name: 'Chưa đặt hạn', value: noDue, color: '#d9d9d9' },
    ].filter((d) => d.value > 0);
  }, [myTasks]);

  // Danh sách task sắp đến hạn (7 ngày tới)
  const upcomingTasks = useMemo(() => {
    const now = dayjs();
    const in7Days = now.add(7, 'day');
    return myTasks
      .filter((t) => t.dueDate && !t.overdue && !t.completedAt && dayjs(t.dueDate).isBefore(in7Days))
      .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)))
      .slice(0, 5);
  }, [myTasks]);

  // Danh sách task quá hạn
  const overdueTasks = useMemo(() => {
    return myTasks.filter((t) => t.overdue).slice(0, 5);
  }, [myTasks]);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const loading = isLoading || statsLoading;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Xin chào, {user?.fullName?.split(' ').pop() || user?.username}! 👋
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Tổng quan hôm nay – {dayjs().format('DD/MM/YYYY')}</Text>
      </div>

      {/* Thẻ thống kê */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card loading={loading}>
            <Statistic
              title="Tổng công việc"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loading}>
            <Statistic
              title="Quá hạn"
              value={stats.overdue}
              valueStyle={{ color: stats.overdue > 0 ? '#f5222d' : '#52c41a' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loading}>
            <Statistic
              title="Đang thực hiện"
              value={stats.inProgress}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<FireOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loading}>
            <Statistic
              title="Số dự án"
              value={projectData.length}
              valueStyle={{ color: '#722ed1' }}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Hàng: Task sắp hạn + Task quá hạn */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><ClockCircleOutlined style={{ color: '#fa8c16' }} />Sắp đến hạn (7 ngày)</Space>}
            loading={loading}
            extra={<Button type="link" size="small" onClick={() => navigate('/tasks')}>Xem tất cả</Button>}
          >
            {upcomingTasks.length === 0 ? (
              <Empty description="Không có task nào sắp đến hạn" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={upcomingTasks}
                renderItem={(task: TaskSummary) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Space size={6} style={{ marginBottom: 4 }}>
                        <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{task.taskKey}</Tag>
                        <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0 }}>{PRIORITY_LABEL[task.priority]}</Tag>
                      </Space>
                      <Text style={{ display: 'block', fontSize: 13 }} ellipsis={{ tooltip: task.title }}>
                        {task.title}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Hạn: {dayjs(task.dueDate).format('DD/MM/YYYY')} ({dayjs(task.dueDate).fromNow()})
                      </Text>
                    </div>
                    <StatusTag status={task.status} />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><ExclamationCircleOutlined style={{ color: '#f5222d' }} />Quá hạn</Space>}
            loading={loading}
            extra={<Button type="link" size="small" onClick={() => navigate('/tasks')}>Xem tất cả</Button>}
          >
            {overdueTasks.length === 0 ? (
              <Empty description="Không có task quá hạn!" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={overdueTasks}
                renderItem={(task: TaskSummary) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Space size={6} style={{ marginBottom: 4 }}>
                        <Tag style={{ fontFamily: 'monospace', margin: 0 }}>{task.taskKey}</Tag>
                      </Space>
                      <Text style={{ display: 'block', fontSize: 13 }} ellipsis={{ tooltip: task.title }}>
                        {task.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#f5222d' }}>
                        Quá hạn {dayjs().diff(dayjs(task.dueDate), 'day')} ngày
                      </Text>
                    </div>
                    {task.assigneeName && (
                      <Tooltip title={task.assigneeName}>
                        <Avatar size={24} icon={<UserOutlined />} />
                      </Tooltip>
                    )}
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Hàng biểu đồ */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Phân bổ theo mức ưu tiên" loading={loading && myTasks.length === 0}>
            {priorityData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" labelLine={false}
                    label={renderCustomLabel} outerRadius={100} dataKey="value">
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value: any, name: any) => [value + ' task', name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Tình trạng hạn chót" loading={loading && myTasks.length === 0}>
            {overdueData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={overdueData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    labelLine={false} label={renderCustomLabel} dataKey="value">
                    {overdueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value: any, name: any) => [value + ' task', name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {projectData.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card title="Công việc theo dự án" loading={loading && myTasks.length === 0}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={projectData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip formatter={(value: any) => [value + ' task', 'Số task']} />
                  <Bar dataKey="value" name="Số task" fill="#1890ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default DashboardPage;
