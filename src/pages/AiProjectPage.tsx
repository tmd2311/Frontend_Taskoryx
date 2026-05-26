import React, { useState, useRef, useEffect } from 'react';
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
  Tooltip,
  Progress,
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  SendOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
  CaretRightOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/aiService';
import { websocketService } from '../services/websocketService';
import type { AiSprint, AiTask, AiSubTask, AiSessionResponse, AiJobResponse } from '../types';
import { useThemeStore } from '../stores/themeStore';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// step: 'form' | 'waiting' | 'preview' | 'confirming' | 'error'
type Step = 'form' | 'waiting' | 'preview' | 'confirming' | 'error';

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

const addDays = (date: Date, n: number) => new Date(date.getTime() + n * 86400000);
const fmtDate = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => (
  <Tag
    style={{
      background: (PRIORITY_COLOR[priority] ?? '#888') + '20',
      color: PRIORITY_COLOR[priority] ?? '#888',
      border: `1px solid ${(PRIORITY_COLOR[priority] ?? '#888')}40`,
      fontWeight: 600,
      fontSize: 11,
      borderRadius: 4,
      padding: '0 6px',
      flexShrink: 0,
    }}
  >
    {PRIORITY_LABEL[priority] || priority}
  </Tag>
);

const TaskRow: React.FC<{ task: AiTask | AiSubTask; depth?: number; isDark: boolean }> = ({
  task, depth = 0, isDark,
}) => (
  <>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 8px',
        paddingLeft: 8 + depth * 20,
        borderRadius: 6,
        background: isDark ? (depth > 0 ? '#1a1d2e' : '#232638') : (depth > 0 ? '#f5f5f5' : '#fafafa'),
        border: `1px solid ${isDark ? '#2e3250' : '#f0f0f0'}`,
        marginBottom: 3,
      }}
    >
      {depth > 0 && (
        <span style={{ color: isDark ? '#3d4268' : '#ccc', fontSize: 11, flexShrink: 0 }}>└─</span>
      )}
      <PriorityBadge priority={task.priority} />
      <Text style={{ fontSize: 12, flex: 1 }}>{task.title}</Text>
      <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
        <ClockCircleOutlined style={{ marginRight: 3 }} />
        {task.duration_days} ngày
      </Text>
    </div>
    {task.sub_tasks?.map((sub, j) => (
      <TaskRow key={j} task={sub} depth={depth + 1} isDark={isDark} />
    ))}
  </>
);

const SprintPanel: React.FC<{
  sprint: AiSprint;
  today: Date;
  isDark: boolean;
  defaultOpen: boolean;
}> = ({ sprint, today, isDark, defaultOpen }) => {
  const sStart = addDays(today, sprint.start_offset_days);
  const sEnd = addDays(sStart, sprint.duration_days);
  const cardBg = isDark ? '#1c1f2e' : '#ffffff';
  const borderColor = isDark ? '#2e3250' : '#eef0f6';

  return (
    <Collapse
      defaultActiveKey={defaultOpen ? ['1'] : []}
      expandIcon={({ isActive }) => (
        <CaretRightOutlined rotate={isActive ? 90 : 0} style={{ color: '#4361ee' }} />
      )}
      style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden' }}
    >
      <Collapse.Panel
        key="1"
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <Text strong style={{ fontSize: 14 }}>{sprint.name}</Text>
            <Tag style={{ borderRadius: 4, fontSize: 11, flexShrink: 0 }}>
              <ClockCircleOutlined style={{ marginRight: 3 }} />
              {sprint.duration_days} ngày
            </Tag>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
              {fmtDate(sStart)} → {fmtDate(sEnd)}
            </Text>
          </div>
        }
        style={{ background: cardBg, border: `1px solid ${borderColor}` }}
      >
        {sprint.goal && (
          <Paragraph
            type="secondary"
            italic
            style={{
              fontSize: 12,
              marginBottom: 10,
              paddingLeft: 8,
              borderLeft: '3px solid #4361ee',
              paddingTop: 2,
              paddingBottom: 2,
            }}
          >
            Goal: {sprint.goal}
          </Paragraph>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {sprint.tasks?.map((task, i) => (
            <TaskRow key={i} task={task} isDark={isDark} />
          ))}
        </div>
      </Collapse.Panel>
    </Collapse>
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

  const [step, setStep] = useState<Step>('form');
  const [requirement, setRequirement] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<AiSessionResponse | null>(null);
  const [jobData, setJobData] = useState<AiJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cardBg = isDark ? '#1c1f2e' : '#ffffff';
  const borderColor = isDark ? '#2e3250' : '#eef0f6';

  // Kiểm tra session/job đang chờ từ localStorage khi mount
  useEffect(() => {
    const savedSessionId = aiService.getSavedSessionId();
    const savedJobId = aiService.getSavedJobId();

    if (savedJobId) {
      // Có job đang chờ confirm → poll ngay
      setStep('confirming');
      startJobPolling(savedJobId);
      return;
    }

    if (savedSessionId) {
      // Có session đang generate → check trạng thái, luôn prefill requirement
      aiService.getSession(savedSessionId).then((data) => {
        if (data.requirement) setRequirement(data.requirement);
        if (data.status === 'READY') {
          setSessionId(savedSessionId);
          setSessionData(data);
          setStep('preview');
        } else if (data.status === 'GENERATING') {
          setSessionId(savedSessionId);
          setStep('waiting');
          startSessionPolling(savedSessionId);
        } else {
          // FAILED → prefill requirement rồi để user ở form
          aiService.clearSaved();
        }
      }).catch(() => {
        aiService.clearSaved();
      });
    }
  }, []);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      websocketService.removeAiPlanReadyListener('ai-project-page');
      websocketService.removeNotificationListener('ai-project-page');
    };
  }, []);

  // Đăng ký WebSocket listeners mỗi khi sessionId / jobData thay đổi
  useEffect(() => {
    // Listener AI_PLAN_READY
    websocketService.addAiPlanReadyListener('ai-project-page', async (event) => {
      if (event.type !== 'AI_PLAN_READY') return;
      const sid = event.payload?.sessionId;
      if (!sid) return;
      // Chỉ xử lý nếu đúng session này
      setSessionId((currentSid) => {
        if (currentSid && currentSid !== sid) return currentSid;
        // Dừng poll session rồi load
        if (pollRef.current) clearInterval(pollRef.current);
        loadSession(sid);
        return sid;
      });
    });

    // Listener notification confirm done/failed
    websocketService.addNotificationListener('ai-project-page', (noti) => {
      if (noti.title === 'Tạo dự án AI thành công') {
        if (pollRef.current) clearInterval(pollRef.current);
        websocketService.removeNotificationListener('ai-project-page');
        aiService.clearSaved();
        navigate(`/projects/${noti.relatedId}`);
      }
      if (noti.title === 'Tạo dự án AI thất bại') {
        if (pollRef.current) clearInterval(pollRef.current);
        websocketService.removeNotificationListener('ai-project-page');
        aiService.clearSaved();
        setError('Tạo dự án thất bại. Vui lòng thử lại.');
        setStep('error');
      }
      if (noti.title === 'Sinh kế hoạch AI thất bại') {
        if (pollRef.current) clearInterval(pollRef.current);
        websocketService.removeAiPlanReadyListener('ai-project-page');
        aiService.clearSaved();
        setError('AI không thể sinh kế hoạch. Vui lòng thử lại.');
        setStep('error');
      }
    });
  }, []);

  const loadSession = async (sid: string) => {
    try {
      const data = await aiService.getSession(sid);
      setSessionData(data);
      setStep('preview');
    } catch {
      setError('Không thể tải kế hoạch AI. Vui lòng thử lại.');
      setStep('error');
    }
  };

  const startSessionPolling = (sid: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const data = await aiService.getSession(sid);
        if (data.status === 'READY') {
          clearInterval(pollRef.current!);
          setSessionData(data);
          setStep('preview');
        } else if (data.status === 'FAILED') {
          clearInterval(pollRef.current!);
          aiService.clearSaved();
          setError(data.errorMessage || data.message || 'AI không thể sinh kế hoạch.');
          setStep('error');
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời
      }
    }, 3000);
  };

  const startJobPolling = (jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const data = await aiService.getJobStatus(jobId);
        setJobData(data);
        if (data.status === 'DONE') {
          clearInterval(pollRef.current!);
          websocketService.removeNotificationListener('ai-project-page');
          aiService.clearSaved();
          navigate(`/projects/${data.resultProjectId}`);
        } else if (data.status === 'FAILED') {
          clearInterval(pollRef.current!);
          websocketService.removeNotificationListener('ai-project-page');
          aiService.clearSaved();
          setError(data.errorMessage || data.message || 'Tạo dự án thất bại.');
          setStep('error');
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời
      }
    }, 2500);
  };

  // ① Gửi yêu cầu
  const handleGenerate = async () => {
    if (!requirement.trim()) return;
    setError(null);
    try {
      const data = await aiService.startGenerate(requirement.trim());
      setSessionId(data.sessionId);
      setStep('waiting');
      startSessionPolling(data.sessionId);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Không thể gửi yêu cầu.');
    }
  };

  const handleCancelWaiting = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    aiService.clearSaved();
    setSessionId(null);
    setStep('form');
    setError(null);
  };

  // ⑤ Xác nhận tạo dự án
  const handleConfirm = async () => {
    if (!sessionData?.plan) return;
    setError(null);
    try {
      const job = await aiService.confirmPlan(sessionData.plan, sessionId);
      setJobData(job);
      setStep('confirming');
      startJobPolling(job.jobId);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Tạo dự án thất bại. Vui lòng thử lại.');
    }
  };

  const handleRegenerate = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    aiService.clearSaved();

    // Prefill requirement từ sessionData nếu có, không thì gọi API lấy lại
    if (sessionData?.requirement) {
      setRequirement(sessionData.requirement);
    } else if (sessionId && !sessionData) {
      try {
        const data = await aiService.getSession(sessionId);
        if (data.requirement) setRequirement(data.requirement);
      } catch {
        // Bỏ qua — giữ requirement hiện tại trong state
      }
    }
    // requirement hiện tại trong state cũng được giữ nguyên nếu không có gì mới

    setSessionId(null);
    setSessionData(null);
    setJobData(null);
    setError(null);
    setStep('form');
  };

  // ── Step: form ──
  if (step === 'form') {
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
            Mô tả dự án bằng tiếng Việt hoặc tiếng Anh — AI sinh kế hoạch Scrum với sprints, tasks và subtasks
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
              AI phân tích ngầm — trang sẽ nhận kết quả tự động khi xong
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
              icon={<ThunderboltOutlined />}
              onClick={handleGenerate}
              disabled={!requirement.trim()}
              style={{
                background: 'linear-gradient(135deg, #4361ee, #7c3aed)',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                paddingInline: 28,
              }}
            >
              Sinh kế hoạch
            </Button>
          </div>
        </Card>

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
                  color: isDark ? '#9397b0' : '#5a6378',
                  background: isDark ? '#232638' : '#fafafa',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#4361ee';
                  e.currentTarget.style.color = '#4361ee';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.color = isDark ? '#9397b0' : '#5a6378';
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

  // ── Step: waiting (AI đang phân tích ngầm) ──
  if (step === 'waiting') {
    return (
      <div style={{ maxWidth: 520, margin: '80px auto', textAlign: 'center' }}>
        <Card
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 20 }}
          bodyStyle={{ padding: 48 }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #4361ee22, #7c3aed22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 40, color: '#4361ee' }} spin />} />
          </div>
          <Title level={4} style={{ marginBottom: 8 }}>AI đang phân tích yêu cầu...</Title>
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 24 }}>
            Thường mất 10–30 giây. Bạn có thể đóng trang này,
            <br />chúng tôi sẽ thông báo khi kế hoạch sẵn sàng.
          </Text>
          <Button
            icon={<CloseOutlined />}
            onClick={handleCancelWaiting}
            style={{ borderRadius: 8 }}
          >
            Hủy
          </Button>
        </Card>
      </div>
    );
  }

  // ── Step: preview ──
  if (step === 'preview') {
    if (!sessionData?.plan) return null;
    const { plan, totalTaskCount, modelUsed } = sessionData;
    const today = new Date();
    const sprintCount = plan.sprints?.length ?? 0;

    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>Kế hoạch dự án AI</Title>
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

        {/* Stats card */}
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
            <Col span={5}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 12 }}>Mã dự án</Text>}
                value={plan.project_key}
                valueStyle={{ fontSize: 15, fontWeight: 700, color: '#4361ee' }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 12 }}>Thời gian</Text>}
                value={plan.total_duration_days}
                suffix="ngày"
                valueStyle={{ fontSize: 15 }}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={3}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 12 }}>Tổng tasks</Text>}
                value={totalTaskCount ?? 0}
                valueStyle={{ fontSize: 15 }}
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

        {/* Sprint accordion list */}
        <Card
          title={
            <Space>
              <UnorderedListOutlined style={{ color: '#4361ee' }} />
              <Text strong>{sprintCount} Sprint · {totalTaskCount ?? 0} task</Text>
            </Space>
          }
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 16 }}
          bodyStyle={{ padding: '12px 16px 8px' }}
        >
          {plan.sprints?.map((sprint, idx) => (
            <SprintPanel
              key={sprint.sprint_number}
              sprint={sprint}
              today={today}
              isDark={isDark}
              defaultOpen={idx === 0}
            />
          ))}
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
            icon={<SendOutlined />}
            onClick={handleConfirm}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              paddingInline: 32,
            }}
          >
            Tạo dự án
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: confirming (job đang chạy ngầm) ──
  if (step === 'confirming') {
    const isPending = jobData?.status === 'PENDING';
    return (
      <div style={{ maxWidth: 520, margin: '80px auto', textAlign: 'center' }}>
        <Card
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 20 }}
          bodyStyle={{ padding: 48 }}
        >
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 56, color: '#10b981' }} spin />}
            style={{ display: 'block', marginBottom: 28 }}
          />
          <Title level={4} style={{ marginBottom: 8 }}>
            {isPending ? 'Đang xếp hàng chờ...' : 'Đang tạo dự án...'}
          </Title>
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
            {isPending
              ? 'Có job khác đang chạy, bạn sẽ được xử lý ngay khi có slot.'
              : 'Đang tạo project, sprint và tasks trong hệ thống...'}
          </Text>
          <Progress
            percent={isPending ? 20 : 65}
            status="active"
            strokeColor={{ from: '#10b981', to: '#059669' }}
            showInfo={false}
            style={{ marginBottom: 16 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Bạn có thể đóng trang này, chúng tôi sẽ thông báo khi hoàn thành.
          </Text>
        </Card>
      </div>
    );
  }

  // ── Step: error ──
  return (
    <div style={{ maxWidth: 520, margin: '80px auto', textAlign: 'center' }}>
      <Card
        style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 20 }}
        bodyStyle={{ padding: 48 }}
      >
        <ExclamationCircleOutlined
          style={{ fontSize: 56, color: '#ef4444', display: 'block', marginBottom: 20 }}
        />
        <Title level={4} style={{ marginBottom: 8 }}>Có lỗi xảy ra</Title>
        {error && (
          <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 8 }} showIcon />
        )}
        <Space>
          <Button
            size="large"
            onClick={handleRegenerate}
            style={{ borderRadius: 8 }}
          >
            Nhập lại yêu cầu
          </Button>
          {sessionData?.plan && (
            <Button
              type="primary"
              size="large"
              onClick={() => { setStep('preview'); setError(null); }}
              style={{ borderRadius: 8 }}
            >
              Xem lại kế hoạch
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default AiProjectPage;
