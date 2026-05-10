import React, { useState } from 'react';
import {
  Typography,
  Card,
  Button,
  Input,
  Tag,
  Space,
  Spin,
  Alert,
  Collapse,
  Divider,
  Statistic,
  Row,
  Col,
  Badge,
  Tooltip,
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  SendOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/aiService';
import type { AiGenerateResponse, AiTask, AiSubTask } from '../types';
import { useThemeStore } from '../stores/themeStore';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  URGENT: '#ef4444',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => (
  <Tag
    style={{
      background: PRIORITY_COLOR[priority] + '20',
      color: PRIORITY_COLOR[priority],
      border: `1px solid ${PRIORITY_COLOR[priority]}40`,
      fontWeight: 600,
      fontSize: 11,
      borderRadius: 4,
      padding: '0 6px',
    }}
  >
    {PRIORITY_LABEL[priority] || priority}
  </Tag>
);

interface TaskNodeProps {
  task: AiTask | AiSubTask;
  isSubtask?: boolean;
  isDark: boolean;
}

const TaskNode: React.FC<TaskNodeProps> = ({ task, isSubtask = false, isDark }) => {
  const hasChildren = task.sub_tasks && task.sub_tasks.length > 0;

  if (hasChildren && !isSubtask) {
    return (
      <Collapse
        ghost
        expandIcon={({ isActive }) => (
          <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: '#4361ee' }} />
        )}
        style={{ marginBottom: 6 }}
      >
        <Collapse.Panel
          key="1"
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <PriorityBadge priority={task.priority} />
              <Text strong style={{ fontSize: 13 }}>{task.title}</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {task.duration_days} ngày
              </Text>
            </div>
          }
          style={{
            background: isDark ? '#1f1f1f' : '#f8f9ff',
            border: `1px solid ${isDark ? '#303030' : '#e8ecff'}`,
            borderRadius: 8,
          }}
        >
          {task.description && (
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              {task.description}
            </Paragraph>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
            {task.sub_tasks.map((sub, idx) => (
              <TaskNode key={idx} task={sub} isSubtask isDark={isDark} />
            ))}
          </div>
        </Collapse.Panel>
      </Collapse>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 6,
        background: isDark ? '#262626' : '#fafafa',
        border: `1px solid ${isDark ? '#303030' : '#f0f0f0'}`,
        marginBottom: 4,
      }}
    >
      <span style={{ color: isDark ? '#555' : '#ccc', fontSize: 11 }}>├─</span>
      <PriorityBadge priority={task.priority} />
      <Text style={{ fontSize: 12, flex: 1 }}>{task.title}</Text>
      <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
        {task.duration_days} ngày
      </Text>
    </div>
  );
};

const EXAMPLE_PROMPTS = [
  'Xây dựng app thương mại điện tử bán đồ gia dụng có giỏ hàng, thanh toán và quản lý đơn hàng',
  'Tạo hệ thống quản lý nhân sự với chấm công, tính lương và đánh giá hiệu suất',
  'Phát triển ứng dụng đặt lịch khám bệnh online cho phòng khám đa khoa',
];

const AiProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [requirement, setRequirement] = useState('');
  const [preview, setPreview] = useState<AiGenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const borderColor = isDark ? '#303030' : '#eef0f6';

  const handleGenerate = async () => {
    if (!requirement.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.generatePlan(requirement.trim());
      setPreview(data);
      setStep(2);
    } catch (e: any) {
      setError(e?.message || 'Không thể kết nối AI. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setError(null);
    try {
      const result = await aiService.confirmPlan(preview.plan);
      navigate(`/projects/${result.projectId}`);
    } catch (e: any) {
      setError(e?.message || 'Tạo dự án thất bại. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  const handleRegenerate = () => {
    setStep(1);
    setPreview(null);
    setError(null);
  };

  // ── Step 1: Form nhập yêu cầu ──
  if (step === 1) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #4361ee, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RobotOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={2} style={{ marginBottom: 8 }}>Tạo dự án bằng AI</Title>
          <Text type="secondary" style={{ fontSize: 15 }}>
            Mô tả dự án của bạn bằng tiếng Việt hoặc tiếng Anh — AI sẽ sinh kế hoạch hoàn chỉnh
          </Text>
        </div>

        <Card
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16 }}
          bodyStyle={{ padding: 28 }}
        >
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
            Mô tả dự án của bạn
          </Text>
          <TextArea
            value={requirement}
            onChange={e => setRequirement(e.target.value)}
            maxLength={2000}
            placeholder="Ví dụ: Tôi muốn xây dựng app thương mại điện tử bán đồ gia dụng, có giỏ hàng, thanh toán online, quản lý kho..."
            autoSize={{ minRows: 5, maxRows: 10 }}
            style={{ fontSize: 14, borderRadius: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Càng chi tiết, kế hoạch càng chính xác
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {requirement.length} / 2000
            </Text>
          </div>

          {error && (
            <Alert type="error" message={error} style={{ marginTop: 12, borderRadius: 8 }} showIcon />
          )}

          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <Button
              type="primary"
              size="large"
              icon={loading ? <Spin size="small" /> : <ThunderboltOutlined />}
              onClick={handleGenerate}
              disabled={loading || !requirement.trim()}
              style={{
                background: 'linear-gradient(135deg, #4361ee, #7c3aed)',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                paddingInline: 28,
              }}
            >
              {loading ? 'AI đang phân tích...' : 'Sinh kế hoạch'}
            </Button>
          </div>
        </Card>

        {/* Ví dụ gợi ý */}
        <div style={{ marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
            Gợi ý nhanh:
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EXAMPLE_PROMPTS.map((p, i) => (
              <div
                key={i}
                onClick={() => setRequirement(p)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: isDark ? '#a0a8b8' : '#5a6378',
                  background: isDark ? '#141414' : '#fafafa',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#4361ee';
                  e.currentTarget.style.color = '#4361ee';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.color = isDark ? '#a0a8b8' : '#5a6378';
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Preview kế hoạch ──
  if (!preview) return null;
  const { plan, totalTaskCount, modelUsed } = preview;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Kế hoạch dự án</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Xem trước và xác nhận để tạo dự án
          </Text>
        </div>
        <Tooltip title={modelUsed}>
          <Tag color="purple" style={{ borderRadius: 6, fontSize: 11 }}>
            <RobotOutlined style={{ marginRight: 4 }} />
            {modelUsed?.split('/').pop() || 'AI'}
          </Tag>
        </Tooltip>
      </div>

      {/* Stats */}
      <Card
        style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 16 }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tên dự án</Text>
            </div>
            <Text strong style={{ fontSize: 15 }}>{plan.project_name}</Text>
          </Col>
          <Col span={6}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Mã dự án</Text>}
              value={plan.project_key}
              valueStyle={{ fontSize: 16, fontWeight: 700, color: '#4361ee' }}
            />
          </Col>
          <Col span={3}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Thời gian</Text>}
              value={plan.total_duration_days}
              suffix="ngày"
              valueStyle={{ fontSize: 16 }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={3}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Tổng tasks</Text>}
              value={totalTaskCount}
              valueStyle={{ fontSize: 16 }}
              prefix={<UnorderedListOutlined />}
            />
          </Col>
        </Row>
        {plan.project_description && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary" style={{ fontSize: 13 }}>{plan.project_description}</Text>
          </>
        )}
      </Card>

      {/* Task tree */}
      <Card
        title={
          <Space>
            <UnorderedListOutlined style={{ color: '#4361ee' }} />
            <Text strong>Danh sách công việc ({plan.tasks.length} nhóm task)</Text>
          </Space>
        }
        style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 16 }}
        bodyStyle={{ padding: '8px 16px 16px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {plan.tasks.map((task, idx) => (
            <TaskNode key={idx} task={task} isDark={isDark} />
          ))}
        </div>
      </Card>

      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 16, borderRadius: 8 }} showIcon />
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRegenerate}
          size="large"
          style={{ borderRadius: 8 }}
        >
          Sinh lại
        </Button>
        <Button
          type="primary"
          size="large"
          icon={confirming ? <Spin size="small" /> : <SendOutlined />}
          onClick={handleConfirm}
          disabled={confirming}
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            paddingInline: 32,
          }}
        >
          {confirming ? 'Đang tạo dự án...' : 'Tạo dự án'}
        </Button>
      </div>
    </div>
  );
};

export default AiProjectPage;
