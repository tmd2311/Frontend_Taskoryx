import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Input, Button, Tooltip, Spin, Empty, Space } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import type { GanttTask } from '../types';
import { TaskPriority, TaskStatus } from '../types';
import { useThemeStore } from '../stores/themeStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 38;
const HEADER_HEIGHT = 56;
const BASE_COL_WIDTH_DAY = 28;
const BASE_COL_WIDTH_WEEK = 80;
const BASE_COL_WIDTH_MONTH = 120;
const ZOOM_STEP = 1.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const LEFT_PANEL_RATIO = 0.35;
const PADDING_DAYS = 7;

type ViewMode = 'day' | 'week' | 'month';

const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: '#52c41a',
  [TaskPriority.MEDIUM]: '#1890ff',
  [TaskPriority.HIGH]: '#fa8c16',
  [TaskPriority.URGENT]: '#ff4d4f',
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────

interface ThemeTokens {
  bg: string;
  bgAlt: string;
  bgHeader: string;
  bgHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textSub: string;
  textMuted: string;
  progressTrack: string;
  weekendBg: string;
  rowStripeBg: string;
}

function getTokens(isDark: boolean): ThemeTokens {
  if (isDark) {
    return {
      bg: '#141414',
      bgAlt: '#1d1d1d',
      bgHeader: '#1f1f1f',
      bgHover: '#1a2a4a',
      border: '#303030',
      borderStrong: '#424242',
      text: '#e0e0e0',
      textSub: '#a0a0a0',
      textMuted: '#606060',
      progressTrack: '#2a2a2a',
      weekendBg: 'rgba(255,255,255,0.03)',
      rowStripeBg: 'rgba(255,255,255,0.025)',
    };
  }
  return {
    bg: '#ffffff',
    bgAlt: '#fafafa',
    bgHeader: '#f7f8fa',
    bgHover: '#f0f5ff',
    border: '#f0f0f0',
    borderStrong: '#e8e8e8',
    text: '#262626',
    textSub: '#595959',
    textMuted: '#8c8c8c',
    progressTrack: '#f0f0f0',
    weekendBg: '#f5f5f5',
    rowStripeBg: 'rgba(0,0,0,0.012)',
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GanttChartViewProps {
  tasks: GanttTask[];
  loading?: boolean;
  error?: string | null;
  onTaskClick?: (taskKey: string) => void;
}

// ─── Helper: build timeline columns ──────────────────────────────────────────

interface TimeCol {
  key: string;
  date: dayjs.Dayjs;
  label: string;
  monthLabel?: string;
  isToday: boolean;
  isWeekend: boolean;
  isMonthStart: boolean;
  spanCols?: number;
}

function buildCols(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  mode: ViewMode,
): TimeCol[] {
  const cols: TimeCol[] = [];
  const today = dayjs().startOf('day');
  let cur = start.startOf('day');
  const finish = end.startOf('day');

  if (mode === 'day') {
    while (!cur.isAfter(finish)) {
      cols.push({
        key: cur.format('YYYY-MM-DD'),
        date: cur,
        label: cur.format('D'),
        monthLabel: cur.format('MMM YYYY'),
        isToday: cur.isSame(today, 'day'),
        isWeekend: cur.day() === 0 || cur.day() === 6,
        isMonthStart: cur.date() === 1,
      });
      cur = cur.add(1, 'day');
    }
  } else if (mode === 'week') {
    cur = cur.startOf('isoWeek');
    while (!cur.isAfter(finish)) {
      cols.push({
        key: cur.format('YYYY-[W]WW'),
        date: cur,
        label: `W${cur.format('WW')}`,
        monthLabel: cur.format('MMM YYYY'),
        isToday: today.isSame(cur, 'isoWeek'),
        isWeekend: false,
        isMonthStart: cur.date() <= 7,
      });
      cur = cur.add(1, 'week');
    }
  } else {
    cur = cur.startOf('month');
    while (!cur.isAfter(finish)) {
      cols.push({
        key: cur.format('YYYY-MM'),
        date: cur,
        label: cur.format('MMM'),
        monthLabel: cur.format('YYYY'),
        isToday: today.isSame(cur, 'month'),
        isWeekend: false,
        isMonthStart: true,
      });
      cur = cur.add(1, 'month');
    }
  }

  return cols;
}

// ─── Helper: group cols into month header spans ───────────────────────────────

interface MonthSpan {
  label: string;
  span: number;
  startIdx: number;
}

function buildMonthSpans(cols: TimeCol[]): MonthSpan[] {
  const spans: MonthSpan[] = [];
  let cur: MonthSpan | null = null;
  cols.forEach((col, i) => {
    const label = col.monthLabel ?? '';
    if (!cur || cur.label !== label) {
      if (cur) spans.push(cur);
      cur = { label, span: 1, startIdx: i };
    } else {
      cur.span++;
    }
  });
  if (cur) spans.push(cur);
  return spans;
}

// ─── TaskBar ─────────────────────────────────────────────────────────────────

interface TaskBarProps {
  task: GanttTask;
  colWidth: number;
  cols: TimeCol[];
  rowIdx: number;
  onClick: () => void;
  mode: ViewMode;
}

const TaskBar: React.FC<TaskBarProps> = ({ task, colWidth, cols, onClick, mode }) => {
  const startDate = task.startDate ? dayjs(task.startDate).startOf('day') : null;
  const endDate = task.dueDate ? dayjs(task.dueDate).startOf('day') : null;

  if (!startDate && !endDate) return null;

  const rangeStart = cols[0]?.date;
  if (!rangeStart) return null;

  // Only render as diamond milestone in day-view where colWidth is narrow enough
  const isMilestone = mode === 'day' &&
    (!startDate || (startDate && endDate && startDate.isSame(endDate, 'day')));

  const baseColor = task.completedAt
    ? '#52c41a'
    : (PRIORITY_COLOR[task.priority] ?? '#1890ff');

  const getOffset = (d: dayjs.Dayjs) => {
    if (mode === 'day') {
      return d.diff(rangeStart.startOf('day'), 'day') * colWidth;
    } else if (mode === 'week') {
      const startOfRange = rangeStart.startOf('isoWeek');
      const weekIdx = d.startOf('isoWeek').diff(startOfRange, 'week');
      // isoWeekday(): Mon=1 … Sun=7  →  fraction 0..1
      const dayFraction = (d.isoWeekday() - 1) / 7;
      return weekIdx * colWidth + dayFraction * colWidth;
    } else {
      const startOfRange = rangeStart.startOf('month');
      const months = d.startOf('month').diff(startOfRange, 'month');
      const dayFraction = (d.date() - 1) / d.daysInMonth();
      return months * colWidth + dayFraction * colWidth;
    }
  };

  if (isMilestone) {
    const anchor = endDate ?? startDate!;
    const left = getOffset(anchor) + colWidth / 2 - 8;
    return (
      <Tooltip
        title={
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>{task.title}</div>
            <div style={{ color: '#ccc', fontSize: 11 }}>{task.taskKey}</div>
            {task.assigneeName && <div>👤 {task.assigneeName}</div>}
            <div>📅 {anchor.format('DD/MM/YYYY')}</div>
          </div>
        }
        placement="top"
      >
        <div
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          style={{
            position: 'absolute',
            left,
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            width: 14,
            height: 14,
            background: '#722ed1',
            border: '2px solid #9254de',
            borderRadius: 2,
            cursor: 'pointer',
            boxShadow: '0 0 6px rgba(114,46,209,0.4)',
            zIndex: 3,
          }}
        />
      </Tooltip>
    );
  }

  // For week/month, use dueDate as both start and end if startDate is missing
  const effectiveStart = startDate ?? endDate!;
  const effectiveEnd = endDate ?? startDate!;

  const left = getOffset(effectiveStart);
  const rawRight = getOffset(effectiveEnd.add(1, 'day'));
  const width = Math.max(rawRight - left, colWidth);

  const today = dayjs().startOf('day');
  const totalDays = effectiveEnd.diff(effectiveStart, 'day') || 1;
  const elapsed = Math.min(Math.max(today.diff(effectiveStart, 'day'), 0), totalDays);
  const pct = task.completedAt ? 100 : Math.round((elapsed / totalDays) * 100);

  const tooltipContent = (
    <div style={{ fontSize: 12, minWidth: 180 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#fff' }}>{task.title}</div>
      <div style={{ color: '#ccc', fontSize: 11, marginBottom: 6 }}>{task.taskKey}</div>
      {task.assigneeName && (
        <div style={{ marginBottom: 2 }}>👤 {task.assigneeName}</div>
      )}
      {task.startDate && (
        <div style={{ marginBottom: 2 }}>▶ {dayjs(task.startDate).format('DD/MM/YYYY')}</div>
      )}
      {task.dueDate && (
        <div style={{ marginBottom: 4 }}>⏹ {dayjs(task.dueDate).format('DD/MM/YYYY')}</div>
      )}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        height: 4,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: baseColor,
          borderRadius: 4,
        }} />
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: '#aaa' }}>{pct}% hoàn thành</div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="top">
      <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{
          position: 'absolute',
          left,
          width,
          top: 5,
          height: ROW_HEIGHT - 10,
          borderRadius: 4,
          background: `${baseColor}22`,
          border: `1.5px solid ${baseColor}88`,
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          zIndex: 2,
          transition: 'filter 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
      >
        {/* Progress fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${pct}%`,
          background: task.completedAt
            ? 'rgba(82,196,26,0.35)'
            : `${baseColor}44`,
          borderRadius: '4px 0 0 4px',
          pointerEvents: 'none',
        }} />

        {/* Task label */}
        <span style={{
          position: 'relative',
          zIndex: 1,
          paddingLeft: 8,
          paddingRight: 8,
          fontSize: 11,
          fontWeight: 600,
          color: baseColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          letterSpacing: '0.01em',
        }}>
          {task.completedAt && '✓ '}
          {task.title}
        </span>
      </div>
    </Tooltip>
  );
};

// ─── GanttChartView ──────────────────────────────────────────────────────────

const GanttChartView: React.FC<GanttChartViewProps> = ({
  tasks,
  loading = false,
  error = null,
  onTaskClick,
}) => {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const tk = getTokens(isDark);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [zoom, setZoom] = useState(1.0);
  const [searchText, setSearchText] = useState('');

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const onLeftScroll = useCallback(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (rightScrollRef.current && leftScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
    syncingRef.current = false;
  }, []);

  const onRightScroll = useCallback(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    }
    syncingRef.current = false;
  }, []);

  const filteredTasks = useMemo(() => {
    const q = searchText.toLowerCase();
    return tasks.filter(t =>
      !q || t.title.toLowerCase().includes(q) || t.taskKey.toLowerCase().includes(q)
    );
  }, [tasks, searchText]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const dates: dayjs.Dayjs[] = [];
    filteredTasks.forEach(t => {
      if (t.startDate) dates.push(dayjs(t.startDate));
      if (t.dueDate) dates.push(dayjs(t.dueDate));
    });
    if (dates.length === 0) {
      const today = dayjs();
      return { rangeStart: today.subtract(14, 'day'), rangeEnd: today.add(30, 'day') };
    }
    const min = dates.reduce((a, b) => a.isBefore(b) ? a : b);
    const max = dates.reduce((a, b) => a.isAfter(b) ? a : b);
    return {
      rangeStart: min.subtract(PADDING_DAYS, 'day'),
      rangeEnd: max.add(PADDING_DAYS, 'day'),
    };
  }, [filteredTasks]);

  const cols = useMemo(() => buildCols(rangeStart, rangeEnd, viewMode), [rangeStart, rangeEnd, viewMode]);

  const baseColWidth = viewMode === 'day'
    ? BASE_COL_WIDTH_DAY
    : viewMode === 'week'
      ? BASE_COL_WIDTH_WEEK
      : BASE_COL_WIDTH_MONTH;

  const colWidth = baseColWidth * zoom;
  const totalTimelineWidth = cols.length * colWidth;

  const monthSpans = useMemo(() => buildMonthSpans(cols), [cols]);

  const todayIdx = useMemo(() => {
    return cols.findIndex(c => c.isToday);
  }, [cols]);

  const todayLeft = todayIdx >= 0 ? todayIdx * colWidth + colWidth / 2 : -1;

  useEffect(() => {
    if (rightScrollRef.current && todayLeft > 0) {
      const scrollLeft = Math.max(0, todayLeft - rightScrollRef.current.clientWidth / 2);
      rightScrollRef.current.scrollLeft = scrollLeft;
    }
  }, [viewMode, zoom]);

  const handleTaskClick = useCallback((taskKey: string) => {
    if (onTaskClick) onTaskClick(taskKey);
    else navigate(`/tasks/${taskKey}`);
  }, [navigate, onTaskClick]);

  const zoomIn = () => setZoom(z => Math.min(ZOOM_MAX, +(z * ZOOM_STEP).toFixed(4)));
  const zoomOut = () => setZoom(z => Math.max(ZOOM_MIN, +(z / ZOOM_STEP).toFixed(4)));
  const zoomReset = () => setZoom(1.0);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
        <Spin size="large" tip="Đang tải Gantt Chart…" />
      </div>
    );
  }

  if (error) {
    return (
      <Empty
        description={<span style={{ color: '#ff4d4f' }}>{error}</span>}
        style={{ padding: '48px 0' }}
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <Empty
        image={<CalendarOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
        description="Không có task nào có ngày bắt đầu hoặc deadline"
        style={{ padding: '48px 0' }}
      />
    );
  }

  const today = dayjs();
  const totalHeight = filteredTasks.length * ROW_HEIGHT;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: tk.bgHeader,
        border: `1px solid ${tk.borderStrong}`,
        borderRadius: '8px 8px 0 0',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: tk.textMuted }} />}
          placeholder="Tìm task..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
          style={{ width: 220, borderRadius: 6, fontSize: 13 }}
          size="small"
        />

        <Space size={0}>
          {(['day', 'week', 'month'] as ViewMode[]).map(m => (
            <Button
              key={m}
              size="small"
              type={viewMode === m ? 'primary' : 'default'}
              onClick={() => setViewMode(m)}
              style={{
                borderRadius: m === 'day' ? '6px 0 0 6px' : m === 'month' ? '0 6px 6px 0' : 0,
                borderRight: m !== 'month' ? 0 : undefined,
                fontSize: 12,
                fontWeight: 500,
                minWidth: 52,
              }}
            >
              {m === 'day' ? 'Ngày' : m === 'week' ? 'Tuần' : 'Tháng'}
            </Button>
          ))}
        </Space>

        <Space size={4}>
          <Button size="small" icon={<MinusOutlined />} onClick={zoomOut}
            style={{ borderRadius: '6px 0 0 6px', borderRight: 0 }}
            disabled={zoom <= ZOOM_MIN} />
          <Button size="small" onClick={zoomReset}
            style={{ borderRadius: 0, minWidth: 52, fontFamily: 'monospace', fontSize: 12, fontWeight: 600, borderLeft: 0, borderRight: 0 }}>
            {Math.round(zoom * 100)}%
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={zoomIn}
            style={{ borderRadius: '0 6px 6px 0', borderLeft: 0 }}
            disabled={zoom >= ZOOM_MAX} />
        </Space>
      </div>

      {/* ── Main layout ── */}
      <div style={{
        display: 'flex',
        flex: 1,
        border: `1px solid ${tk.borderStrong}`,
        borderTop: 0,
        borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
        background: tk.bg,
        minHeight: 360,
      }}>

        {/* ── Left Panel (Task List) ── */}
        <div style={{
          width: `${LEFT_PANEL_RATIO * 100}%`,
          minWidth: 280,
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          borderRight: `2px solid ${tk.borderStrong}`,
          flexShrink: 0,
        }}>
          {/* Header */}
          <div style={{
            height: HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            background: tk.bgHeader,
            borderBottom: `1px solid ${tk.borderStrong}`,
            padding: '0 12px',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 0, width: '100%' }}>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: tk.textSub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Task
              </span>
              <span style={{ width: 64, fontSize: 11, fontWeight: 700, color: tk.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                Bắt đầu
              </span>
              <span style={{ width: 64, fontSize: 11, fontWeight: 700, color: tk.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                Kết thúc
              </span>
              <span style={{ width: 60, fontSize: 11, fontWeight: 700, color: tk.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                %
              </span>
            </div>
          </div>

          {/* Rows */}
          <div
            ref={leftScrollRef}
            onScroll={onLeftScroll}
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {filteredTasks.length === 0 ? (
              <div style={{ textAlign: 'center', color: tk.textMuted, padding: '32px 16px', fontSize: 13 }}>
                Không tìm thấy task
              </div>
            ) : filteredTasks.map((task, i) => {
              const isOverdue = task.dueDate && !task.completedAt && dayjs(task.dueDate).isBefore(today, 'day');
              const isDone = task.completedAt || task.status === TaskStatus.DONE;
              const barColor = isDone ? '#52c41a' : (PRIORITY_COLOR[task.priority] ?? '#1890ff');

              const totalDays = (task.startDate && task.dueDate)
                ? dayjs(task.dueDate).diff(dayjs(task.startDate), 'day') || 1
                : 1;
              const elapsed = task.startDate
                ? Math.min(Math.max(today.diff(dayjs(task.startDate), 'day'), 0), totalDays)
                : 0;
              const pct = task.completedAt ? 100 : (task.startDate ? Math.round((elapsed / totalDays) * 100) : 0);

              const rowBg = i % 2 === 0 ? tk.bg : tk.bgAlt;

              return (
                <div
                  key={task.id}
                  style={{
                    height: ROW_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: rowBg,
                    borderBottom: `1px solid ${tk.border}`,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onClick={() => handleTaskClick(task.taskKey)}
                  onMouseEnter={e => (e.currentTarget.style.background = tk.bgHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                >
                  {/* Name + assignee */}
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: barColor,
                        flexShrink: 0,
                      }} />
                      <Tooltip title={task.title} placement="topLeft">
                        <span style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: isDone ? tk.textMuted : tk.text,
                          textDecoration: isDone ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                        }}>
                          {task.title}
                        </span>
                      </Tooltip>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <span style={{ fontSize: 10, color: tk.textMuted, fontFamily: 'monospace' }}>
                        {task.taskKey}
                      </span>
                      {task.assigneeName && (
                        <span style={{ fontSize: 10, color: tk.textMuted }}>
                          · {task.assigneeName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Start date */}
                  <div style={{ width: 64, textAlign: 'center', fontSize: 11, color: tk.textSub, flexShrink: 0 }}>
                    {task.startDate ? dayjs(task.startDate).format('DD/MM') : '—'}
                  </div>

                  {/* Due date */}
                  <div style={{
                    width: 64, textAlign: 'center', fontSize: 11, flexShrink: 0,
                    color: isOverdue ? '#ff4d4f' : isDone ? '#52c41a' : tk.textSub,
                    fontWeight: isOverdue ? 600 : 400,
                  }}>
                    {task.dueDate ? dayjs(task.dueDate).format('DD/MM') : '—'}
                  </div>

                  {/* Progress mini */}
                  <div style={{ width: 60, paddingRight: 4, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{
                        flex: 1,
                        height: 4,
                        background: tk.progressTrack,
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: barColor,
                          borderRadius: 2,
                          transition: 'width 0.3s',
                        }} />
                      </div>
                      <span style={{ fontSize: 10, color: tk.textMuted, minWidth: 24, textAlign: 'right' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Panel (Timeline) ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Sticky Header */}
          <div style={{
            height: HEADER_HEIGHT,
            background: tk.bgHeader,
            borderBottom: `1px solid ${tk.borderStrong}`,
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
          }}>
            <div
              style={{ width: totalTimelineWidth, height: HEADER_HEIGHT, position: 'relative' }}
              id="gantt-header-inner"
            >
              {/* Row 1: Month spans */}
              <div style={{ height: 22, display: 'flex', borderBottom: `1px solid ${tk.borderStrong}` }}>
                {monthSpans.map((ms) => (
                  <div
                    key={ms.startIdx}
                    style={{
                      width: ms.span * colWidth,
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: tk.text,
                      borderRight: `1px solid ${tk.borderStrong}`,
                      letterSpacing: '0.03em',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {ms.label}
                  </div>
                ))}
              </div>

              {/* Row 2: Day/Week/Month columns */}
              <div style={{ height: 34, display: 'flex' }}>
                {cols.map((col, i) => (
                  <div
                    key={col.key}
                    style={{
                      width: colWidth,
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: col.isToday ? 800 : col.isMonthStart ? 600 : 400,
                      color: col.isToday ? '#4361ee' : col.isWeekend ? tk.textMuted : tk.textSub,
                      background: col.isToday
                        ? 'rgba(67,97,238,0.08)'
                        : col.isWeekend
                          ? tk.weekendBg
                          : 'transparent',
                      borderRight: `1px solid ${tk.border}`,
                      borderLeft: col.isMonthStart && i > 0 ? `1px solid ${tk.borderStrong}` : undefined,
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    {col.label}
                    {col.isToday && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: '#4361ee',
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div
            ref={rightScrollRef}
            onScroll={(e) => {
              onRightScroll();
              const headerEl = document.getElementById('gantt-header-inner');
              const parent = headerEl?.parentElement;
              if (parent) parent.scrollLeft = (e.currentTarget as HTMLDivElement).scrollLeft;
            }}
            style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}
          >
            <div style={{
              width: totalTimelineWidth,
              height: Math.max(totalHeight, 200),
              position: 'relative',
            }}>
              {/* Grid columns */}
              {cols.map((col, i) => (
                <div
                  key={col.key}
                  style={{
                    position: 'absolute',
                    left: i * colWidth,
                    top: 0,
                    width: colWidth,
                    height: '100%',
                    background: col.isToday
                      ? 'rgba(67,97,238,0.04)'
                      : col.isWeekend
                        ? tk.weekendBg
                        : 'transparent',
                    borderRight: `1px solid ${tk.border}`,
                    borderLeft: col.isMonthStart && i > 0 ? `1px solid ${tk.borderStrong}` : undefined,
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* Today marker line */}
              {todayLeft > 0 && (
                <div style={{
                  position: 'absolute',
                  left: todayLeft - 1,
                  top: 0,
                  width: 2,
                  height: '100%',
                  background: 'linear-gradient(180deg, #4361ee 0%, rgba(67,97,238,0.2) 100%)',
                  zIndex: 4,
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4361ee',
                    boxShadow: '0 0 6px rgba(67,97,238,0.6)',
                  }} />
                </div>
              )}

              {/* Row backgrounds */}
              {filteredTasks.map((task, i) => (
                <div
                  key={`row-bg-${task.id}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: i * ROW_HEIGHT,
                    width: '100%',
                    height: ROW_HEIGHT,
                    background: i % 2 === 0 ? 'transparent' : tk.rowStripeBg,
                    borderBottom: `1px solid ${tk.border}`,
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* Task bars */}
              {filteredTasks.map((task, i) => (
                <div
                  key={`bar-${task.id}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: i * ROW_HEIGHT,
                    width: '100%',
                    height: ROW_HEIGHT,
                  }}
                >
                  <TaskBar
                    task={task}
                    colWidth={colWidth}
                    cols={cols}
                    rowIdx={i}
                    onClick={() => handleTaskClick(task.taskKey)}
                    mode={viewMode}
                  />
                </div>
              ))}

              {filteredTasks.length === 0 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tk.textMuted,
                  fontSize: 13,
                }}>
                  Không tìm thấy task
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer info ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 12px',
        fontSize: 11,
        color: tk.textMuted,
        borderTop: `1px solid ${tk.border}`,
      }}>
        <span>
          {filteredTasks.length} task
          {searchText && ` (lọc từ ${tasks.length})`}
        </span>
        <span>
          {rangeStart.format('DD/MM/YYYY')} – {rangeEnd.format('DD/MM/YYYY')}
          &nbsp;·&nbsp;{cols.length} {viewMode === 'day' ? 'ngày' : viewMode === 'week' ? 'tuần' : 'tháng'}
        </span>
      </div>
    </div>
  );
};

export default GanttChartView;
