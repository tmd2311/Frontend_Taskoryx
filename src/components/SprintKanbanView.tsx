import React, { useEffect, useState, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  Typography, Tag, Space, Badge, Spin, message, Avatar, Tooltip,
  Popconfirm, Button,
} from 'antd';
import {
  UserOutlined, CommentOutlined, PaperClipOutlined,
  ExclamationCircleOutlined, HolderOutlined, DeleteOutlined, SwapOutlined,
} from '@ant-design/icons';
import { taskService } from '../services/taskService';
import type { TaskSummary, Sprint } from '../types';
import { TaskStatus } from '../types';
import dayjs from 'dayjs';

const { Text } = Typography;

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

export interface SprintKanbanViewProps {
  projectId: string;
  sprintId: string;
  allSprints?: Sprint[];
  onOpenTask: (taskKey: string) => void;
  onRefreshStats?: () => void;
}

const SprintKanbanView: React.FC<SprintKanbanViewProps> = ({
  projectId, sprintId, allSprints = [], onOpenTask, onRefreshStats,
}) => {
  const [loading, setLoading] = useState(false);
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, TaskSummary[]>>({});
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const page = await taskService.getTasksBySprint(projectId, sprintId);
      // Flatten cây task cấp 1 + subTasks đệ quy
      const flatten = (tasks: TaskSummary[]): TaskSummary[] =>
        tasks.flatMap(t => [t, ...flatten(t.subTasks ?? [])]);
      const all = flatten(page.content ?? []);

      const grouped: Record<string, TaskSummary[]> = {};
      STATUS_COLUMNS.forEach(c => { grouped[c.status] = []; });
      all.forEach(t => {
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
  }, [projectId, sprintId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const srcStatus = source.droppableId as TaskStatus;
    const dstStatus = destination.droppableId as TaskStatus;
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
      dstTasks.splice(destination.index, 0, { ...moved, status: dstStatus });
      setTasksByStatus({ ...tasksByStatus, [srcStatus]: srcTasks, [dstStatus]: dstTasks });
    }

    if (srcStatus !== dstStatus) {
      try {
        await taskService.updateStatus(draggableId, { status: dstStatus });
        onRefreshStats?.();
      } catch {
        message.error('Không thể cập nhật trạng thái task');
        setTasksByStatus(prev);
      }
    }
  };

  const handleMoveToSprint = async (task: TaskSummary, targetSprintId: string) => {
    setMovingTaskId(task.id);
    try {
      await taskService.updateTask(task.id, { sprintId: targetSprintId });
      message.success('Đã chuyển task sang sprint');
      loadTasks();
      onRefreshStats?.();
    } catch (e: any) {
      message.error(e.message || 'Chuyển sprint thất bại');
    } finally {
      setMovingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      message.success('Đã xóa task');
      loadTasks();
      onRefreshStats?.();
    } catch (e: any) {
      message.error(e.message || 'Xóa task thất bại');
    }
  };

  const otherSprints = allSprints.filter(s => s.id !== sprintId && s.status !== 'COMPLETED');

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin size="small" /></div>;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, marginTop: 12 }}>
        {STATUS_COLUMNS.map(col => {
          const tasks = tasksByStatus[col.status] ?? [];
          return (
            <div key={col.status} style={{
              width: 220,
              minWidth: 220,
              background: '#f7f8fa',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 420px)',
              minHeight: 100,
              border: `1px solid ${col.color}30`,
            }}>
              {/* Header */}
              <div style={{
                padding: '8px 10px',
                borderBottom: `3px solid ${col.color}`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                borderRadius: '8px 8px 0 0',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <Text strong style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {col.label}
                </Text>
                <Badge count={tasks.length} showZero color="#595959" style={{ fontSize: 10 }} />
              </div>

              {/* Droppable */}
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
                      borderRadius: '0 0 8px 8px',
                      transition: 'background .15s',
                    }}
                  >
                    {tasks.length === 0 && !snapshot.isDraggingOver && (
                      <div style={{
                        textAlign: 'center', color: '#bfbfbf', padding: '12px 0',
                        fontSize: 11, border: '2px dashed #e8e8e8', borderRadius: 6,
                      }}>
                        Kéo task vào đây
                      </div>
                    )}

                    {tasks.map((task, idx) => (
                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                        {(drag, dragSnap) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            style={{
                              background: dragSnap.isDragging ? '#e6f4ff' : '#fff',
                              border: `1px solid ${dragSnap.isDragging ? '#1890ff' : '#f0f0f0'}`,
                              borderRadius: 6,
                              padding: '8px 10px',
                              marginBottom: 6,
                              boxShadow: dragSnap.isDragging
                                ? '0 4px 12px rgba(24,144,255,.2)'
                                : '0 1px 2px rgba(0,0,0,.06)',
                              userSelect: 'none',
                              ...drag.draggableProps.style,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                              {/* Drag handle */}
                              <span
                                {...drag.dragHandleProps}
                                style={{ color: '#bfbfbf', fontSize: 12, paddingTop: 2, cursor: 'grab', flexShrink: 0 }}
                              >
                                <HolderOutlined />
                              </span>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Key + Priority */}
                                <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <Tag style={{ margin: 0, fontSize: 10 }}>{task.taskKey}</Tag>
                                  <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0, fontSize: 10 }}>
                                    {PRIORITY_LABEL[task.priority]}
                                  </Tag>
                                </div>

                                {/* Title */}
                                <div
                                  onClick={() => onOpenTask(task.taskKey)}
                                  style={{ fontSize: 12, fontWeight: 500, cursor: 'pointer', lineHeight: 1.4, marginBottom: 4 }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#1890ff')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '')}
                                >
                                  {task.title}
                                </div>

                                {/* Due date */}
                                {task.dueDate && (
                                  <div style={{ fontSize: 11, color: task.overdue ? '#f5222d' : '#8c8c8c', marginBottom: 4 }}>
                                    {task.overdue && <ExclamationCircleOutlined style={{ marginRight: 2 }} />}
                                    {dayjs(task.dueDate).format('DD/MM/YYYY')}
                                  </div>
                                )}

                                {/* Footer */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  {task.assigneeName ? (
                                    <Tooltip title={task.assigneeName}>
                                      <Avatar size={16} icon={<UserOutlined />} />
                                    </Tooltip>
                                  ) : <span />}

                                  <Space size={4}>
                                    {(task.commentCount ?? 0) > 0 && (
                                      <span style={{ fontSize: 10, color: '#8c8c8c' }}>
                                        <CommentOutlined /> {task.commentCount}
                                      </span>
                                    )}
                                    {(task.attachmentCount ?? 0) > 0 && (
                                      <span style={{ fontSize: 10, color: '#8c8c8c' }}>
                                        <PaperClipOutlined /> {task.attachmentCount}
                                      </span>
                                    )}
                                  </Space>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}
                                  onClick={e => e.stopPropagation()}>
                                  {otherSprints.length > 0 && (
                                    <Tooltip title="Chuyển sprint">
                                      <select
                                        style={{
                                          fontSize: 10, border: '1px solid #d9d9d9', borderRadius: 4,
                                          padding: '1px 4px', cursor: 'pointer', flex: 1,
                                          background: '#fff', color: '#595959',
                                        }}
                                        value=""
                                        disabled={movingTaskId === task.id}
                                        onChange={e => e.target.value && handleMoveToSprint(task, e.target.value)}
                                      >
                                        <option value="" disabled><SwapOutlined /> Sprint...</option>
                                        {otherSprints.map(s => (
                                          <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                      </select>
                                    </Tooltip>
                                  )}
                                  <Popconfirm
                                    title="Xóa task này?"
                                    onConfirm={() => handleDeleteTask(task.id)}
                                    okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                                  >
                                    <Button type="text" size="small" danger icon={<DeleteOutlined />}
                                      style={{ padding: '0 2px', height: 20, fontSize: 11 }} />
                                  </Popconfirm>
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
