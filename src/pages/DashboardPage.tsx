import React, { useEffect, useMemo } from 'react';
import { Typography, Row, Col, Card, Statistic } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { TaskPriority } from '../types';

const { Title } = Typography;

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
  const { user } = useAuthStore();
  const { myTasks, fetchMyTasks, isLoading } = useTaskStore();

  useEffect(() => {
    fetchMyTasks();
  }, []);

  // --- Thống kê tổng hợp ---
  const stats = useMemo(() => {
    const total = myTasks.length;
    const overdue = myTasks.filter((t) => t.overdue).length;
    const hasDueDate = myTasks.filter((t) => t.dueDate).length;

    return { total, overdue, onTime: hasDueDate - overdue };
  }, [myTasks]);

  // --- Dữ liệu biểu đồ theo ưu tiên ---
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {
      [TaskPriority.LOW]: 0,
      [TaskPriority.MEDIUM]: 0,
      [TaskPriority.HIGH]: 0,
      [TaskPriority.URGENT]: 0,
    };
    myTasks.forEach((t) => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: PRIORITY_LABEL[key],
        value,
        color: PRIORITY_COLOR[key],
      }));
  }, [myTasks]);

  // --- Dữ liệu biểu đồ theo dự án (trích từ taskKey, ví dụ "PROJ-1" → "PROJ") ---
  const projectData = useMemo(() => {
    const counts: Record<string, number> = {};
    myTasks.forEach((t) => {
      const key = t.taskKey?.split('-')[0] ?? 'OTHER';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [myTasks]);

  // --- Dữ liệu biểu đồ quá hạn vs đúng hạn ---
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

  // --- Dữ liệu biểu đồ cột: ưu tiên × dự án ---
  const priorityByProjectData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    myTasks.forEach((t) => {
      const proj = t.taskKey?.split('-')[0] ?? 'OTHER';
      if (!map[proj]) map[proj] = {};
      map[proj][t.priority] = (map[proj][t.priority] ?? 0) + 1;
    });
    return Object.entries(map).map(([proj, priorities]) => ({
      project: proj,
      [TaskPriority.LOW]: priorities[TaskPriority.LOW] ?? 0,
      [TaskPriority.MEDIUM]: priorities[TaskPriority.MEDIUM] ?? 0,
      [TaskPriority.HIGH]: priorities[TaskPriority.HIGH] ?? 0,
      [TaskPriority.URGENT]: priorities[TaskPriority.URGENT] ?? 0,
    }));
  }, [myTasks]);

  const renderCustomLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent,
  }: any) => {
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

  return (
    <div>
      <Title level={2}>Xin chào, {user?.fullName || user?.username}!</Title>

      {/* Thẻ thống kê */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Tổng công việc"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Quá hạn"
              value={stats.overdue}
              valueStyle={{ color: '#f5222d' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Đúng hạn"
              value={stats.onTime}
              valueStyle={{ color: '#52c41a' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Số dự án"
              value={projectData.length}
              valueStyle={{ color: '#722ed1' }}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Hàng 1: Biểu đồ tròn ưu tiên + trạng thái hạn */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Phân bổ theo mức ưu tiên" loading={isLoading && myTasks.length === 0}>
            {priorityData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={110}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value + ' task', name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Tình trạng hạn chót" loading={isLoading && myTasks.length === 0}>
            {overdueData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={overdueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    labelLine={false}
                    label={renderCustomLabel}
                    dataKey="value"
                  >
                    {overdueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value + ' task', name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Hàng 2: Biểu đồ cột theo dự án */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Công việc theo dự án" loading={isLoading && myTasks.length === 0}>
            {projectData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={projectData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [value + ' task', 'Số task']} />
                  <Bar dataKey="value" name="Số task" fill="#1890ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Ưu tiên theo dự án" loading={isLoading && myTasks.length === 0}>
            {priorityByProjectData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={priorityByProjectData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="project" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={TaskPriority.LOW} name="Thấp" stackId="a" fill={PRIORITY_COLOR[TaskPriority.LOW]} />
                  <Bar dataKey={TaskPriority.MEDIUM} name="Trung bình" stackId="a" fill={PRIORITY_COLOR[TaskPriority.MEDIUM]} />
                  <Bar dataKey={TaskPriority.HIGH} name="Cao" stackId="a" fill={PRIORITY_COLOR[TaskPriority.HIGH]} />
                  <Bar
                    dataKey={TaskPriority.URGENT}
                    name="Khẩn cấp"
                    stackId="a"
                    fill={PRIORITY_COLOR[TaskPriority.URGENT]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
