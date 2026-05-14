import React, { useState } from 'react';
import { Dropdown, Badge, Spin, Empty, Typography, Tooltip, Tag } from 'antd';
import { EyeOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { watcherService } from '../services/watcherService';
import { useThemeStore } from '../stores/themeStore';
import type { TaskSummary } from '../types';

const { Text } = Typography;

const priorityColor: Record<string, string> = {
  CRITICAL: '#ff4d4f',
  HIGH: '#fa8c16',
  MEDIUM: '#fadb14',
  LOW: '#52c41a',
};

const statusColor: Record<string, string> = {
  TODO: '#8c8c8c',
  IN_PROGRESS: '#4361ee',
  IN_REVIEW: '#7c3aed',
  DONE: '#52c41a',
  CANCELLED: '#ff4d4f',
};

const statusLabel: Record<string, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Review',
  DONE: 'Xong',
  CANCELLED: 'Huỷ',
};

// Lọc bỏ task con khỏi root list (API trả về cả flat lẫn lồng)
function buildRootTasks(tasks: TaskSummary[]): TaskSummary[] {
  const ids = new Set(tasks.map(t => t.id));
  return tasks.filter(t => !t.parentTaskId || !ids.has(t.parentTaskId));
}

const WatchedTasksDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const [rootTasks, setRootTasks] = useState<TaskSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = async (open: boolean) => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await watcherService.getWatchedTasks();
      setTotalCount(data.length);
      setRootTasks(buildRootTasks(data));
    } catch {
      setRootTasks([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const panelBg = isDark ? '#1c1f2e' : '#ffffff';
  const borderColor = isDark ? '#2e3250' : '#f0f0f0';
  const hoverBg = isDark ? 'rgba(99,120,255,0.12)' : '#f5f7ff';
  const textColor = isDark ? '#e8eaf6' : '#1a1a2e';
  const subColor = isDark ? '#9397b0' : '#8c8c8c';
  const subTaskBg = isDark ? 'rgba(255,255,255,0.03)' : '#fafbff';

  const renderTask = (task: TaskSummary, depth = 0) => (
    <React.Fragment key={task.id}>
      <div
        onClick={() => navigate(`/tasks/${task.taskKey}`)}
        style={{
          padding: depth === 0 ? '10px 16px' : '7px 16px 7px' + ` ${16 + depth * 20}px`,
          borderBottom: `1px solid ${borderColor}`,
          cursor: 'pointer',
          transition: 'background 0.15s',
          background: depth > 0 ? subTaskBg : undefined,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={e => (e.currentTarget.style.background = depth > 0 ? subTaskBg : 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {depth > 0 && (
            <RightOutlined style={{ fontSize: 9, color: subColor, marginTop: 4, flexShrink: 0 }} />
          )}
          <div style={{
            width: 3,
            height: depth === 0 ? 36 : 28,
            borderRadius: 2,
            background: priorityColor[task.priority] ?? '#d9d9d9',
            flexShrink: 0,
            marginTop: 2,
          }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: depth === 0 ? 13 : 12,
              fontWeight: depth === 0 ? 500 : 400,
              color: textColor,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {task.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 11, color: subColor }}>{task.taskKey}</Text>
              <Tag style={{
                fontSize: 10,
                padding: '0 5px',
                lineHeight: '16px',
                height: 16,
                border: 'none',
                borderRadius: 3,
                background: (statusColor[task.status] ?? '#d9d9d9') + '22',
                color: statusColor[task.status] ?? '#8c8c8c',
                margin: 0,
              }}>
                {statusLabel[task.status] ?? task.status}
              </Tag>
              {task.dueDate && (
                <Text style={{ fontSize: 11, color: task.overdue ? '#ff4d4f' : subColor }}>
                  {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>

      {task.subTasks && task.subTasks.length > 0 &&
        task.subTasks.map(sub => renderTask(sub as TaskSummary, depth + 1))
      }
    </React.Fragment>
  );

  const panel = (
    <div style={{
      width: 340,
      maxHeight: 460,
      display: 'flex',
      flexDirection: 'column',
      background: panelBg,
      borderRadius: 8,
      boxShadow: '0 6px 16px rgba(0,0,0,.15)',
      overflow: 'hidden',
      border: `1px solid ${borderColor}`,
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${borderColor}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <EyeOutlined style={{ color: '#4361ee', fontSize: 15 }} />
        <Text strong style={{ fontSize: 14, color: textColor }}>Task đang theo dõi</Text>
        {totalCount > 0 && (
          <Badge count={totalCount} style={{ fontSize: 10, background: '#4361ee' }} />
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
            <Spin indicator={<LoadingOutlined spin />} />
          </div>
        ) : rootTasks.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: subColor, fontSize: 13 }}>Chưa theo dõi task nào</span>}
            style={{ margin: '32px 0' }}
          />
        ) : (
          rootTasks.map(task => renderTask(task))
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => panel}
      trigger={['click']}
      placement="bottomRight"
      onOpenChange={handleOpenChange}
    >
      <Tooltip title="Task đang theo dõi">
        <div style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 16,
          color: isDark ? '#9397b0' : '#5a6378',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(67,97,238,0.15)' : '#f0f2ff')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <EyeOutlined />
        </div>
      </Tooltip>
    </Dropdown>
  );
};

export default WatchedTasksDropdown;
