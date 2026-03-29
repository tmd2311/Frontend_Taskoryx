import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Card, Row, Col, Statistic, DatePicker, Select, Space, Spin,
  Table, Progress, Tabs, Button, Tag, Avatar, Segmented,
} from 'antd';
import {
  ClockCircleOutlined, CalendarOutlined, ReloadOutlined, UserOutlined,
  BarChartOutlined, LineChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { timeTrackingService } from '../services/timeTrackingService';
import { projectService } from '../services/projectService';
import type {
  DailyTimeStats, WeeklyTimeStats, MonthlyTimeStats,
  TimeStatsSummary, ProjectTimeStats, TimeStatsByProject,
} from '../types';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
dayjs.locale('vi');

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = ['#4361ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ─── Biểu đồ cột theo ngày ──────────────────────────────────
const DailyBarChart: React.FC<{ data: DailyTimeStats[] }> = ({ data }) => {
  const chartData = data.map((d) => ({
    name: d.date.slice(5),
    hours: Number(d.totalHours),
    label: d.dayOfWeek,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis unit="h" tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: number) => [`${v}h`, 'Giờ làm']}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.label || label}
        />
        <Bar dataKey="hours" fill="#4361ee" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── Biểu đồ theo tuần ──────────────────────────────────────
const WeeklyBarChart: React.FC<{ data: WeeklyTimeStats[] }> = ({ data }) => {
  const chartData = data.map((w) => ({
    name: w.weekLabel.split(' (')[0],
    hours: Number(w.totalHours),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis unit="h" tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [`${v}h`, 'Giờ làm']} />
        <Bar dataKey="hours" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── Biểu đồ theo tháng trong năm ───────────────────────────
const MonthlyLineChart: React.FC<{ data: MonthlyTimeStats[] }> = ({ data }) => {
  const chartData = data.map((m) => ({
    name: `T${m.month}`,
    hours: Number(m.totalHours),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis unit="h" tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [`${v}h`, 'Giờ làm']} />
        <Line type="monotone" dataKey="hours" stroke="#4361ee" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ─── Pie chart theo project ──────────────────────────────────
const ProjectPieChart: React.FC<{ data: TimeStatsByProject[] }> = ({ data }) => {
  const chartData = data.map((p) => ({ name: p.projectName, value: Number(p.totalHours) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v}h`, 'Giờ làm']} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ─── Main page ───────────────────────────────────────────────
const TimeReportPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [year, setYear] = useState<number>(dayjs().year());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const [summary, setSummary] = useState<TimeStatsSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyTimeStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyTimeStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyTimeStats[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectTimeStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Load projects list
  useEffect(() => {
    projectService.getProjects().then((list) => {
      setProjects(list.map((p: any) => ({ id: p.id, name: p.name })));
    }).catch(() => {});
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const start = dateRange[0].format('YYYY-MM-DD');
    const end = dateRange[1].format('YYYY-MM-DD');
    try {
      const [sumData, dailyData, weeklyData, monthlyData] = await Promise.all([
        timeTrackingService.getSummary(start, end),
        timeTrackingService.getDailyStats(start, end),
        timeTrackingService.getWeeklyStats(start, end),
        timeTrackingService.getMonthlyStats(year),
      ]);
      setSummary(sumData);
      setDailyStats(dailyData);
      setWeeklyStats(weeklyData);
      setMonthlyStats(monthlyData);

      if (selectedProject) {
        const ps = await timeTrackingService.getProjectStats(selectedProject, start, end);
        setProjectStats(ps);
      } else {
        setProjectStats(null);
      }
    } catch {
      // lỗi thì giữ dữ liệu cũ
    } finally {
      setLoading(false);
    }
  }, [dateRange, year, selectedProject]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Columns for project stats by task
  const taskColumns: ColumnsType<any> = [
    { title: 'Mã', dataIndex: 'taskKey', width: 90, render: (v) => <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Tag> },
    { title: 'Tiêu đề', dataIndex: 'taskTitle', ellipsis: true },
    { title: 'Ước tính', dataIndex: 'estimatedHours', width: 90, render: (v) => v ? `${v}h` : '—' },
    {
      title: 'Đã log', dataIndex: 'formattedLoggedHours', width: 90,
      render: (v, row) => <Text type={row.progressPercent > 100 ? 'danger' : undefined}>{v}</Text>,
    },
    {
      title: 'Tiến độ', dataIndex: 'progressPercent', width: 120,
      render: (v) => v != null ? <Progress percent={Math.min(v, 100)} size="small" status={v > 100 ? 'exception' : undefined} /> : '—',
    },
  ];

  // Columns for project stats by member
  const memberColumns: ColumnsType<any> = [
    {
      title: 'Thành viên', dataIndex: 'userName', render: (v, row) => (
        <Space>
          <Avatar size={24} src={row.userAvatar} icon={<UserOutlined />} />
          <Text>{v}</Text>
        </Space>
      ),
    },
    { title: 'Tổng giờ', dataIndex: 'formattedHours', width: 100 },
    { title: 'Số entry', dataIndex: 'entryCount', width: 80 },
  ];

  const start = dateRange[0].format('YYYY-MM-DD');
  const end = dateRange[1].format('YYYY-MM-DD');

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          <ClockCircleOutlined style={{ marginRight: 8, color: '#4361ee' }} />
          Báo cáo thời gian
        </Title>
        <Button icon={<ReloadOutlined />} onClick={fetchStats} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Bộ lọc */}
      <Card style={{ marginBottom: 20 }}>
        <Space wrap size={16}>
          <Space>
            <Text type="secondary">Khoảng thời gian:</Text>
            <RangePicker
              value={dateRange}
              onChange={(vals) => { if (vals?.[0] && vals?.[1]) setDateRange([vals[0], vals[1]]); }}
              format="DD/MM/YYYY"
              allowClear={false}
            />
          </Space>
          <Space>
            <Text type="secondary">Năm (biểu đồ tháng):</Text>
            <DatePicker
              picker="year"
              value={dayjs().year(year)}
              onChange={(d) => { if (d) setYear(d.year()); }}
              allowClear={false}
            />
          </Space>
          <Space>
            <Text type="secondary">Dự án:</Text>
            <Select
              style={{ width: 200 }}
              placeholder="Tất cả dự án"
              allowClear
              value={selectedProject}
              onChange={setSelectedProject}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Space>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {/* Thống kê tổng quan */}
        {summary && (
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="Tổng giờ làm"
                  value={summary.formattedTotalHours}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#4361ee', fontSize: 22 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="Số lần ghi"
                  value={summary.totalEntries}
                  valueStyle={{ fontSize: 22 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="Ngày hoạt động"
                  value={summary.activeDays}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ fontSize: 22 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="TB giờ/ngày hoạt động"
                  value={summary.avgHoursPerActiveDay?.toFixed(1)}
                  suffix="h"
                  valueStyle={{ color: '#10b981', fontSize: 22 }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Biểu đồ */}
        <Card
          style={{ marginBottom: 20 }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Biểu đồ thời gian làm việc</Text>
              <Segmented
                value={viewMode}
                onChange={(v) => setViewMode(v as any)}
                options={[
                  { label: 'Theo ngày', value: 'daily' },
                  { label: 'Theo tuần', value: 'weekly' },
                  { label: 'Theo tháng', value: 'monthly' },
                ]}
              />
            </div>
          }
        >
          {viewMode === 'daily' && dailyStats.length > 0 && <DailyBarChart data={dailyStats} />}
          {viewMode === 'weekly' && weeklyStats.length > 0 && <WeeklyBarChart data={weeklyStats} />}
          {viewMode === 'monthly' && monthlyStats.length > 0 && <MonthlyLineChart data={monthlyStats} />}
          {((viewMode === 'daily' && dailyStats.length === 0) ||
            (viewMode === 'weekly' && weeklyStats.length === 0) ||
            (viewMode === 'monthly' && monthlyStats.length === 0)) && (
            <div style={{ textAlign: 'center', padding: 40, color: '#bfbfbf' }}>Không có dữ liệu</div>
          )}
        </Card>

        {/* Theo project & project stats */}
        <Row gutter={[16, 16]}>
          {/* Phân bổ theo project */}
          {summary && summary.byProject.length > 0 && (
            <Col xs={24} md={10}>
              <Card title="Phân bổ theo dự án" style={{ height: '100%' }}>
                <ProjectPieChart data={summary.byProject} />
                <div style={{ marginTop: 12 }}>
                  {summary.byProject.map((p, i) => (
                    <div key={p.projectId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <Space>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                        <Text style={{ fontSize: 13 }}>{p.projectName}</Text>
                      </Space>
                      <Space>
                        <Text strong style={{ fontSize: 13 }}>{p.formattedHours}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>({p.entryCount} entry)</Text>
                      </Space>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          )}

          {/* Project stats chi tiết */}
          {projectStats && (
            <Col xs={24} md={summary?.byProject.length ? 14 : 24}>
              <Card
                title={
                  <Space>
                    <BarChartOutlined />
                    <span>Chi tiết dự án: {projectStats.projectName}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({projectStats.formattedTotalHours} · {projectStats.totalEntries} entry)
                    </Text>
                  </Space>
                }
              >
                <Tabs
                  size="small"
                  items={[
                    {
                      key: 'member',
                      label: 'Theo thành viên',
                      children: (
                        <Table
                          dataSource={projectStats.byMember}
                          columns={memberColumns}
                          rowKey="userId"
                          size="small"
                          pagination={false}
                        />
                      ),
                    },
                    {
                      key: 'task',
                      label: 'Theo task',
                      children: (
                        <Table
                          dataSource={projectStats.byTask}
                          columns={taskColumns}
                          rowKey="taskKey"
                          size="small"
                          pagination={{ pageSize: 10, size: 'small' }}
                        />
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          )}
        </Row>

        {/* Bảng daily stats chi tiết */}
        {dailyStats.length > 0 && viewMode === 'daily' && (
          <Card title="Chi tiết theo ngày" style={{ marginTop: 16 }}>
            <Table
              dataSource={dailyStats.filter((d) => d.entryCount > 0)}
              rowKey="date"
              size="small"
              pagination={{ pageSize: 10, size: 'small' }}
              columns={[
                { title: 'Ngày', dataIndex: 'date', width: 110, render: (v) => dayjs(v).format('DD/MM/YYYY') },
                { title: 'Thứ', dataIndex: 'dayOfWeek', width: 90 },
                { title: 'Tổng giờ', dataIndex: 'formattedHours', width: 100 },
                { title: 'Số lần ghi', dataIndex: 'entryCount', width: 90 },
                {
                  title: 'Task đã log',
                  render: (_, row: DailyTimeStats) => (
                    <Space wrap size={4}>
                      {row.entries.slice(0, 3).map((e) => (
                        <Tag key={e.id} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                          {e.taskKey} {e.formattedHours}
                        </Tag>
                      ))}
                      {row.entries.length > 3 && (
                        <Text type="secondary" style={{ fontSize: 11 }}>+{row.entries.length - 3} nữa</Text>
                      )}
                    </Space>
                  ),
                },
              ] as ColumnsType<DailyTimeStats>}
            />
          </Card>
        )}
      </Spin>
    </div>
  );
};

export default TimeReportPage;
