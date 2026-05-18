import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Card, Row, Col, Statistic, DatePicker, Select, Space, Spin,
  Table, Progress, Tabs, Button, Tag, Avatar, Segmented, Modal, Form,
  Input, InputNumber, Popconfirm, message, Empty, Tooltip, Divider, Badge,
} from 'antd';
import {
  ClockCircleOutlined, CalendarOutlined, ReloadOutlined, UserOutlined,
  BarChartOutlined, HistoryOutlined, EditOutlined, DeleteOutlined,
  LinkOutlined, PlusOutlined, CheckCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
type ColumnsType<T> = TableColumnsType<T>;
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { timeTrackingService } from '../services/timeTrackingService';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { useNavigate } from 'react-router-dom';
import type {
  DailyTimeStats, WeeklyTimeStats, MonthlyTimeStats,
  TimeStatsSummary, ProjectTimeStats, TimeStatsByProject, TimeEntry, TaskSummary,
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
        <ReTooltip
          formatter={(v: any) => [`${v}h`, 'Giờ làm']}
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
        <ReTooltip formatter={(v: any) => [`${v}h`, 'Giờ làm']} />
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
        <ReTooltip formatter={(v: any) => [`${v}h`, 'Giờ làm']} />
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
        <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <ReTooltip formatter={(v: any) => [`${v}h`, 'Giờ làm']} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ─── Tab ghi giờ làm việc ────────────────────────────────────
const LogTimeTab: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [myTasks, setMyTasks] = useState<TaskSummary[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Các entry đã ghi hôm nay (refresh sau mỗi lần ghi)
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  // Quick-log hours buttons
  const QUICK_HOURS = [0.5, 1, 1.5, 2, 3, 4, 8];

  const fetchMyTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const tasks = await taskService.getMyTasks();
      // Lọc bỏ task đã hoàn thành
      setMyTasks(tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CLOSED'));
    } catch {
      message.error('Không thể tải danh sách task');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchTodayEntries = useCallback(async () => {
    setLoadingToday(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      // getDailyStats trả đủ entries trong ngày, đáng tin hơn getByRange
      const dailyData = await timeTrackingService.getDailyStats(today, today);
      const todayData = Array.isArray(dailyData) ? dailyData[0] : null;
      setTodayEntries(todayData?.entries ?? []);
    } catch {
      // fallback: thử getByRange
      try {
        const today = dayjs().format('YYYY-MM-DD');
        const res = await timeTrackingService.getByRange(today, today);
        setTodayEntries(res);
      } catch {
        setTodayEntries([]);
      }
    } finally {
      setLoadingToday(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTasks();
    fetchTodayEntries();
  }, [fetchMyTasks, fetchTodayEntries]);

  const handleSubmit = async () => {
    try {
      const vals = await form.validateFields();
      setSubmitting(true);
      await timeTrackingService.logTime({
        taskId: vals.taskId,
        hours: vals.hours,
        description: vals.description,
        workDate: vals.workDate.format('YYYY-MM-DD'),
      });
      message.success('Đã ghi nhận giờ làm việc!');
      form.setFieldsValue({ taskId: undefined, hours: undefined, description: '' });
      fetchTodayEntries();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error, không toast
      message.error('Ghi giờ thất bại, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteToday = async (id: string) => {
    try {
      await timeTrackingService.delete(id);
      message.success('Đã xóa');
      fetchTodayEntries();
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.hours ?? 0), 0);

  // Render option cho task select
  const taskOptions = myTasks.map((t) => ({
    value: t.id,
    label: (
      <Space size={6}>
        <Tag style={{ fontFamily: 'monospace', fontSize: 11, margin: 0 }}>{t.taskKey}</Tag>
        <span style={{ fontSize: 13 }}>{t.title}</span>
        {t.sprintName && <Tag color="blue" style={{ fontSize: 10 }}>{t.sprintName}</Tag>}
      </Space>
    ),
    // dùng cho filter
    search: `${t.taskKey} ${t.title}`.toLowerCase(),
  }));

  return (
    <Row gutter={[20, 20]}>
      {/* ── Form ghi giờ ── */}
      <Col xs={24} lg={14}>
        <Card
          title={
            <Space>
              <ThunderboltOutlined style={{ color: '#4361ee' }} />
              <span>Ghi nhận giờ làm việc</span>
            </Space>
          }
          style={{ borderRadius: 12 }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ workDate: dayjs(), hours: 1 }}
          >
            {/* Chọn task */}
            <Form.Item
              name="taskId"
              label="Task đang thực hiện"
              rules={[{ required: true, message: 'Vui lòng chọn task!' }]}
            >
              <Select
                showSearch
                loading={loadingTasks}
                placeholder="Tìm và chọn task được giao cho bạn..."
                optionFilterProp="search"
                filterOption={(input, opt: any) =>
                  (opt?.search ?? '').includes(input.toLowerCase())
                }
                options={taskOptions}
                optionLabelProp="label"
                notFoundContent={
                  loadingTasks
                    ? <Spin size="small" />
                    : <Empty description="Không có task nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                }
                style={{ width: '100%' }}
                dropdownStyle={{ maxHeight: 320 }}
              />
            </Form.Item>

            {/* Ngày làm việc + Số giờ */}
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="workDate"
                  label="Ngày làm việc"
                  rules={[{ required: true, message: 'Chọn ngày!' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    disabledDate={(d) => d.isAfter(dayjs(), 'day')}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="hours"
                  label="Số giờ"
                  rules={[
                    { required: true, message: 'Nhập số giờ!' },
                    { type: 'number', min: 0.25, max: 24, message: 'Từ 0.25 đến 24h' },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    step={0.25} min={0.25} max={24}
                    placeholder="VD: 1.5"
                    addonAfter="giờ"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Quick-log buttons */}
            <div style={{ marginBottom: 16, marginTop: -8 }}>
              <Space size={6} wrap>
                <span style={{ fontSize: 12, color: '#888' }}>Nhanh:</span>
                {QUICK_HOURS.map((h) => (
                  <Button
                    key={h}
                    size="small"
                    onClick={() => form.setFieldValue('hours', h)}
                    style={{ fontSize: 12 }}
                  >
                    {h}h
                  </Button>
                ))}
              </Space>
            </div>

            {/* Mô tả */}
            <Form.Item name="description" label="Mô tả công việc">
              <Input.TextArea
                rows={3}
                placeholder="Hôm nay bạn đã làm gì? (không bắt buộc)"
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                size="large"
                block
              >
                Ghi nhận giờ làm
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      {/* ── Đã ghi hôm nay ── */}
      <Col xs={24} lg={10}>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#10b981' }} />
                <span>Đã ghi hôm nay</span>
                <Badge
                  count={todayEntries.length}
                  style={{ backgroundColor: todayEntries.length > 0 ? '#4361ee' : '#d9d9d9' }}
                />
              </Space>
              {todayTotal > 0 && (
                <Space>
                  <ClockCircleOutlined style={{ color: '#4361ee', fontSize: 12 }} />
                  <Text strong style={{ color: '#4361ee', fontSize: 14 }}>
                    {todayTotal % 1 === 0 ? `${todayTotal}h` : `${todayTotal.toFixed(1)}h`}
                  </Text>
                </Space>
              )}
            </div>
          }
          style={{ borderRadius: 12 }}
        >
          <Spin spinning={loadingToday}>
            {todayEntries.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Chưa có ghi nhận nào hôm nay
                  </Text>
                }
                style={{ padding: '20px 0' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      background: '#fafafa',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    {/* Giờ */}
                    <div style={{
                      minWidth: 48, textAlign: 'center', padding: '4px 8px',
                      background: '#eef2ff', borderRadius: 6,
                    }}>
                      <Text strong style={{ color: '#4361ee', fontSize: 14, display: 'block' }}>
                        {entry.formattedHours ?? `${entry.hours}h`}
                      </Text>
                    </div>

                    {/* Nội dung */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {entry.taskKey ? (
                        <Tag
                          icon={<LinkOutlined />}
                          style={{ fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', marginBottom: 4 }}
                          onClick={() => navigate(`/tasks/${entry.taskKey}`)}
                        >
                          {entry.taskKey}
                        </Tag>
                      ) : null}
                      {entry.description ? (
                        <Text style={{ fontSize: 12, display: 'block' }} ellipsis={{ tooltip: entry.description }}>
                          {entry.description}
                        </Text>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>Không có mô tả</Text>
                      )}
                    </div>

                    {/* Xóa */}
                    <Popconfirm
                      title="Xóa ghi nhận này?"
                      okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteToday(entry.id)}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                ))}

                {todayEntries.length >= 3 && (
                  <>
                    <Divider style={{ margin: '4px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                      Xem toàn bộ lịch sử tại tab <strong>Lịch sử ghi giờ</strong>
                    </Text>
                  </>
                )}
              </div>
            )}
          </Spin>
        </Card>

        {/* Tips */}
        <Card
          size="small"
          style={{ marginTop: 12, borderRadius: 10, background: '#f0f5ff', border: '1px solid #d6e4ff' }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>Mẹo:</strong> Ghi giờ mỗi ngày giúp báo cáo chính xác hơn.
            Hệ thống chỉ hiện task chưa hoàn thành được giao cho bạn.
          </Text>
        </Card>
      </Col>
    </Row>
  );
};

// ─── Tab lịch sử time entries ────────────────────────────────
const MyEntriesTab: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const [loading, setLoading] = useState(false);

  // Edit modal
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await timeTrackingService.getMyEntries({ page: pg - 1, size: PAGE_SIZE });
      const data = (res as any);
      if (data?.content) {
        setEntries(data.content);
        setTotal(data.totalElements ?? 0);
      } else if (Array.isArray(data)) {
        setEntries(data);
        setTotal(data.length);
      }
    } catch {
      message.error('Không thể tải lịch sử time entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(page); }, [page, fetchEntries]);

  const handleDelete = async (id: string) => {
    try {
      await timeTrackingService.delete(id);
      message.success('Đã xóa time entry');
      fetchEntries(page);
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const openEdit = (entry: TimeEntry) => {
    setEditEntry(entry);
    editForm.setFieldsValue({
      hours: entry.hours,
      description: entry.description,
      workDate: dayjs(entry.workDate),
    });
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    try {
      const vals = await editForm.validateFields();
      setSaving(true);
      await timeTrackingService.update(editEntry.id, {
        hours: vals.hours,
        description: vals.description,
        workDate: vals.workDate.format('YYYY-MM-DD'),
      });
      message.success('Đã cập nhật time entry');
      setEditEntry(null);
      editForm.resetFields();
      fetchEntries(page);
    } catch {
      message.error('Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Tổng giờ trong trang hiện tại
  const pageTotal = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const pageTotalFmt = pageTotal % 1 === 0 ? `${pageTotal}h` : `${pageTotal.toFixed(1)}h`;

  const columns: ColumnsType<TimeEntry> = [
    {
      title: 'Ngày làm',
      dataIndex: 'workDate',
      width: 115,
      render: (v: string) => (
        <Text style={{ fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Thứ',
      dataIndex: 'workDate',
      width: 80,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dayjs(v).day()]}
        </Text>
      ),
    },
    {
      title: 'Task',
      dataIndex: 'taskKey',
      width: 120,
      render: (key: string, row: TimeEntry) => key ? (
        <Tooltip title="Xem task">
          <Tag
            icon={<LinkOutlined />}
            style={{ fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}
            onClick={() => navigate(`/tasks/${key}`)}
          >
            {key}
          </Tag>
        </Tooltip>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>{row.taskId?.slice(0, 8)}…</Text>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'hours',
      width: 100,
      render: (h: number, row: TimeEntry) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#4361ee', fontSize: 12 }} />
          <Text strong style={{ color: '#4361ee', fontSize: 13 }}>
            {row.formattedHours ?? `${h}h`}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      ellipsis: true,
      render: (v?: string) => v
        ? <Text style={{ fontSize: 13 }}>{v}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Ghi vào lúc',
      dataIndex: 'createdAt',
      width: 145,
      render: (v?: string) => v
        ? <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>
        : null,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, row: TimeEntry) => (
        <Space size={2}>
          <Tooltip title="Sửa">
            <Button
              type="text" size="small" icon={<EditOutlined />}
              onClick={() => openEdit(row)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa time entry này?"
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row.id)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* Tổng kết trang hiện tại */}
      {entries.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 12, padding: '8px 12px',
          background: '#f0f5ff', borderRadius: 8,
        }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Hiển thị {entries.length} / {total} bản ghi
          </Text>
          <Space>
            <ClockCircleOutlined style={{ color: '#4361ee' }} />
            <Text strong style={{ color: '#4361ee' }}>
              Tổng trang này: {pageTotalFmt}
            </Text>
          </Space>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={entries}
        rowKey="id"
        loading={loading}
        scroll={{ x: 750 }}
        locale={{ emptyText: <Empty description="Chưa có lịch sử ghi giờ nào" /> }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (p) => setPage(p),
          showTotal: (t) => `Tổng ${t} bản ghi`,
          showSizeChanger: false,
        }}
        rowClassName={(r) => {
          const day = dayjs(r.workDate).day();
          return day === 0 || day === 6 ? 'row-weekend' : '';
        }}
      />

      {/* Modal sửa entry */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            Sửa time entry
            {editEntry?.taskKey && (
              <Tag style={{ fontFamily: 'monospace' }}>{editEntry.taskKey}</Tag>
            )}
          </Space>
        }
        open={!!editEntry}
        onCancel={() => { setEditEntry(null); editForm.resetFields(); }}
        onOk={handleSaveEdit}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{ loading: saving }}
        destroyOnHidden
        width={420}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="workDate"
            label="Ngày làm việc"
            rules={[{ required: true, message: 'Chọn ngày!' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowClear={false} />
          </Form.Item>
          <Form.Item
            name="hours"
            label="Số giờ"
            rules={[
              { required: true, message: 'Nhập số giờ!' },
              { type: 'number', min: 0.25, max: 24, message: 'Từ 0.25 đến 24h' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.25} min={0.25} max={24}
              placeholder="VD: 1.5"
              addonAfter="giờ"
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả công việc">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về công việc đã làm..." maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-weekend td { background: #fffbe6 !important; }
        .row-weekend:hover td { background: #fff7cc !important; }
      `}</style>
    </>
  );
};

// ─── Main page ───────────────────────────────────────────────
const TimeReportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('log');
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

  const startStr = dateRange[0].format('YYYY-MM-DD');
  const endStr = dateRange[1].format('YYYY-MM-DD');

  useEffect(() => {
    projectService.getProjects().then((list) => {
      setProjects(list.map((p: any) => ({ id: p.id, name: p.name })));
    }).catch(() => {});
  }, []);

  const fetchStats = useCallback(async (start: string, end: string, yr: number, projectId: string | null) => {
    setLoading(true);
    try {
      const [sumData, dailyData, weeklyData, monthlyData] = await Promise.all([
        timeTrackingService.getSummary(start, end),
        timeTrackingService.getDailyStats(start, end),
        timeTrackingService.getWeeklyStats(start, end),
        timeTrackingService.getMonthlyStats(yr),
      ]);
      setSummary(sumData);
      setDailyStats(dailyData);
      setWeeklyStats(weeklyData);
      setMonthlyStats(monthlyData);

      if (projectId) {
        const ps = await timeTrackingService.getProjectStats(projectId, start, end);
        setProjectStats(ps);
      } else {
        setProjectStats(null);
      }
    } catch {
      // giữ dữ liệu cũ
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(startStr, endStr, year, selectedProject);
  }, [startStr, endStr, year, selectedProject, fetchStats]);

  // Columns for project stats by task
  const taskColumns: ColumnsType<any> = [
    { title: 'Mã', dataIndex: 'taskKey', width: 90, render: (v: any) => <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Tag> },
    { title: 'Tiêu đề', dataIndex: 'taskTitle', ellipsis: true },
    { title: 'Ước tính', dataIndex: 'estimatedHours', width: 90, render: (v: any) => v ? `${v}h` : '—' },
    {
      title: 'Đã log', dataIndex: 'formattedLoggedHours', width: 90,
      render: (v: any, row: any) => <Text type={row.progressPercent > 100 ? 'danger' : undefined}>{v}</Text>,
    },
    {
      title: 'Tiến độ', dataIndex: 'progressPercent', width: 120,
      render: (v: any) => v != null ? <Progress percent={Math.min(v, 100)} size="small" status={v > 100 ? 'exception' : undefined} /> : '—',
    },
  ];

  const memberColumns: ColumnsType<any> = [
    {
      title: 'Thành viên', dataIndex: 'userName', render: (v: any, row: any) => (
        <Space>
          <Avatar size={24} src={row.userAvatar} icon={<UserOutlined />} />
          <Text>{v}</Text>
        </Space>
      ),
    },
    { title: 'Tổng giờ', dataIndex: 'formattedHours', width: 100 },
    { title: 'Số entry', dataIndex: 'entryCount', width: 80 },
  ];

  const statsContent = (
    <Spin spinning={loading}>
      {/* Bộ lọc */}
      <Card style={{ marginBottom: 20 }}>
        <Space wrap size={[12, 12]}>
          <Space size={4}>
            <Text type="secondary">Khoảng thời gian:</Text>
            <RangePicker
              value={dateRange}
              onChange={(vals) => { if (vals?.[0] && vals?.[1]) setDateRange([vals[0], vals[1]]); }}
              format="DD/MM/YYYY"
              allowClear={false}
            />
          </Space>
          <Space size={4}>
            <Text type="secondary">Năm:</Text>
            <DatePicker
              picker="year"
              value={dayjs().year(year)}
              onChange={(d) => { if (d) setYear(d.year()); }}
              allowClear={false}
            />
          </Space>
          <Space size={4}>
            <Text type="secondary">Dự án:</Text>
            <Select
              style={{ minWidth: 160, maxWidth: 240 }}
              placeholder="Tất cả dự án"
              allowClear
              value={selectedProject}
              onChange={setSelectedProject}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchStats(startStr, endStr, year, selectedProject)} loading={loading}>Làm mới</Button>
        </Space>
      </Card>

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
              <Statistic title="Số lần ghi" value={summary.totalEntries} valueStyle={{ fontSize: 22 }} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text strong>Biểu đồ thời gian làm việc</Text>
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as any)}
              options={[
                { label: 'Ngày', value: 'daily' },
                { label: 'Tuần', value: 'weekly' },
                { label: 'Tháng', value: 'monthly' },
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

      {/* Phân bổ + project chi tiết */}
      <Row gutter={[16, 16]}>
        {summary && summary.byProject.length > 0 && (
          <Col xs={24} md={10}>
            <Card title="Phân bổ theo dự án" style={{ height: '100%' }}>
              <ProjectPieChart data={summary.byProject} />
              <div style={{ marginTop: 12 }}>
                {summary.byProject.map((p, i) => (
                  <div key={p.projectId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid #f5f5f5',
                  }}>
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
                        scroll={{ x: 'max-content' }}
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
                        scroll={{ x: 'max-content' }}
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

      {/* Bảng daily chi tiết */}
      {dailyStats.length > 0 && viewMode === 'daily' && (
        <Card title="Chi tiết theo ngày" style={{ marginTop: 16 }}>
          <Table
            dataSource={dailyStats.filter((d) => d.entryCount > 0)}
            rowKey="date"
            size="small"
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 10, size: 'small' }}
            columns={[
              { title: 'Ngày', dataIndex: 'date', width: 110, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
              { title: 'Thứ', dataIndex: 'dayOfWeek', width: 90 },
              { title: 'Tổng giờ', dataIndex: 'formattedHours', width: 100 },
              { title: 'Số lần ghi', dataIndex: 'entryCount', width: 90 },
              {
                title: 'Task đã log',
                render: (_: unknown, row: DailyTimeStats) => (
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
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, flexWrap: 'wrap', gap: 8,
      }}>
        <Title level={3} style={{ margin: 0 }}>
          <ClockCircleOutlined style={{ marginRight: 8, color: '#4361ee' }} />
          Báo cáo thời gian
        </Title>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        style={{ marginBottom: 0 }}
        items={[
          {
            key: 'log',
            label: (
              <Space size={6}>
                <PlusOutlined />
                Ghi giờ
              </Space>
            ),
            children: activeTab === 'log' ? <LogTimeTab /> : null,
          },
          {
            key: 'stats',
            label: (
              <Space size={6}>
                <BarChartOutlined />
                Thống kê
              </Space>
            ),
            children: statsContent,
          },
          {
            key: 'history',
            label: (
              <Space size={6}>
                <HistoryOutlined />
                Lịch sử ghi giờ
              </Space>
            ),
            children: activeTab === 'history' ? <MyEntriesTab /> : null,
          },
        ]}
      />
    </div>
  );
};

export default TimeReportPage;
