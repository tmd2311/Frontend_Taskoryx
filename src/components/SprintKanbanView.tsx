import React, { useEffect, useState, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  Typography, Tag, Space, Badge, Spin, message, Avatar, Tooltip,
} from 'antd';
import {
  UserOutlined, CommentOutlined, PaperClipOutlined,
  ExclamationCircleOutlined, HolderOutlined,
} from '@ant-design/icons';
import { sprintService } from '../services/sprintService';
import { taskService } from '../services/taskService';
import type { TaskSummary } from '../types';
import { TaskStatus } from '../types';
import dayjs from 'dayjs';

const { Text } = Typography;

// ─── Cột trạng thái cố định theo hệ thống ────────────────────
const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: TaskStatus.TODO,        label: 'Cần làm',        color: '#8c8c8c' },
  { status: TaskStatus.IN_PROGRESS, label: 'Đang làm',       color: '#1890ff' },
  { status: TaskStatus.IN_REVIEW,   label: 'Đang review',    color: '#fa8c16' },
  { status: TaskStatus.RESOLVED,    label: 'Đã giải quyết',  color: '#722ed1' },
  { status: TaskStatus.DONE,        label: 'Hoàn thành',     color: '#52c41a' },
  { status: TaskStatus.CANCELLED,   label: 'Đã hủy',         color: '#f5222d' },
];

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'green', MEDIUM: 'blue', HIGH: 'orange', URGENT: 'red',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Thấp', MEDIUM: 'TB', HIGH: 'Cao', URGENT: 'Khẩn',
};

// ─── Props ───────────────────────────────────────────────────
export interface SprintKanbanViewProps {
  sprintId: string;
  onOpenTask: (taskKey: string) => void;
  onRefreshStats?: () => void;
}

// ─── Component ──────────────────────────────────────────────
const SprintKanbanView: React.FC<SprintKanbanViewProps> = ({
  sprintId, onOpenTask, onRefreshStats,
}) => {
  const [loading, setLoading] = useState(false);
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, TaskSummary[]>>({});

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const tasks = await sprintService.getBacklog(sprintId);
      const grouped: Record<string, TaskSummary[]> = {};
      STATUS_COLUMNS.forEach(c => { grouped[c.status] = []; });
      tasks.forEach(t => {
        if (grouped[t.status] !== undefined) {
          grouped[t.status].push(t);
        } else {
          grouped[TaskStatus.TODO].push(t);
        }
      });
      setTasksByStatus(grouped);
    } catch {
      message.error('Không thể tải danh sách task');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const srcStatus = source.droppableId;
    const dstStatus = destination.droppableId;
    if (srcStatus === dstStatus && destination.index === source.index) return;

    // Optimistic update
    const prev = JSON.parse(JSON.stringify(tasksByStatus)) as Record<string, TaskSummary[]>;
    const srcTasks = [...(tasksByStatus[srcStatus] ?? [])];
    const [moved] = srcTasks.splice(source.index, 1);

    if (srcStatus === dstStatus) {
      srcTasks.splice(destination.index, 0, moved);
      setTasksByStatus({ ...tasksByStatus, [srcStatus]: srcTasks });
    } else {
      const dstTasks = [...(tasksByStatus[dstStatus] ?? [])];
      dstTasks.splice(destination.index, 0, { ...moved, status: dstStatus as TaskStatus });
      setTasksByStatus({ ...tasksByStatus, [srcStatus]: srcTasks, [dstStatus]: dstTasks });
    }

    // Gọi API cập nhật trạng thái nếu chuyển cột
    if (srcStatus !== dstStatus) {
      try {
        await taskService.updateStatus(draggableId, { status: dstStatus as TaskStatus });
        onRefreshStats?.();
      } catch {
        message.error('Không thể cập nhật trạng thái task');
        setTasksByStatus(prev);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <Spin size="small" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 8,
          marginTop: 12,
        }}
      >
        {STATUS_COLUMNS.map(col => {
          const tasks = tasksByStatus[col.status] ?? [];
          return (
            <div
              key={col.status}
              style={{
                width: 220,
                minWidth: 220,
                background: '#f5f5f5',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 440px)',
                minHeight: 120,
                border: '1px solid #f0f0f0',
              }}
            >
              {/* Column header */}
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: `3px solid ${col.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: col.color,
                    flexShrink: 0,
                  }}
                />
                <Text strong style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {col.label}
                </Text>
                <Badge
                  count={tasks.length}
                  showZero
                  color="#595959"
                  style={{ fontSize: 10 }}
                />
              </div>

              {/* Droppable task list */}
              <Droppable droppableId={col.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      padding: 6,
                      overflowY: 'auto',
                      flex: 1,
                      minHeight: 60,
                      background: snapshot.isDraggingOver ? '#e6f7ff' : 'transparent',
                      borderRadius: '0 0 6px 6px',
                      transition: 'background .15s',
                    }}
                  >
                    {tasks.length === 0 && !snapshot.isDraggingOver && (
                      <div
                        style={{
                          textAlign: 'center',
                          color: '#bfbfbf',
                          padding: '10px 0',
                          fontSize: 11,
                          border: '2px dashed #e8e8e8',
                          borderRadius: 6,
                        }}
                      >
                        Kéo task vào đây
                      </div>
                    )}

                    {tasks.map((task, idx) => (
                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            style={{
                              background: dragSnapshot.isDragging ? '#e6f4ff' : '#fff',
                              border: `1px solid ${dragSnapshot.isDragging ? '#1890ff' : '#f0f0f0'}`,
                              borderRadius: 6,
                              padding: '8px 10px',
                              marginBottom: 6,
                              boxShadow: dragSnapshot.isDragging
                                ? '0 4px 12px rgba(24,144,255,.2)'
                                : '0 1px 2px rgba(0,0,0,.06)',
                              cursor: 'grab',
                              userSelect: 'none',
                              ...dragProvided.draggableProps.style,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                              <span
                                {...dragProvided.dragHandleProps}
                                style={{ color: '#bfbfbf', fontSize: 11, paddingTop: 2, cursor: 'grab', flexShrink: 0 }}
                              >
                                <HolderOutlined />
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <Tag style={{ margin: 0, fontSize: 10 }}>{task.taskKey}</Tag>
                                  <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0, fontSize: 10 }}>
                                    {PRIORITY_LABEL[task.priority]}
                                  </Tag>
                                </div>
                                <div
                                  onClick={() => onOpenTask(task.taskKey)}
                                  style={{ fontSize: 12, fontWeight: 500, cursor: 'pointer', lineHeight: 1.4, marginBottom: 4 }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#1890ff')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '')}
                                >
                                  {task.title}
                                </div>
                                {task.dueDate && (
                                  <div style={{ fontSize: 11, color: task.overdue ? '#f5222d' : '#8c8c8c', marginBottom: 3 }}>
                                    {task.overdue && <ExclamationCircleOutlined style={{ marginRight: 2 }} />}
                                    {dayjs(task.dueDate).format('DD/MM/YYYY')}
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  {task.assigneeName ? (
                                    <Tooltip title={task.assigneeName}>
                                      <Avatar size={16} icon={<UserOutlined />} />
                                    </Tooltip>
                                  ) : <span />}
                                  <Space size={6}>
                                    {task.commentCount > 0 && (
                                      <span style={{ fontSize: 10, color: '#8c8c8c' }}>
                                        <CommentOutlined /> {task.commentCount}
                                      </span>
                                    )}
                                    {task.attachmentCount > 0 && (
                                      <span style={{ fontSize: 10, color: '#8c8c8c' }}>
                                        <PaperClipOutlined /> {task.attachmentCount}
                                      </span>
                                    )}
                                  </Space>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default SprintKanbanView;
