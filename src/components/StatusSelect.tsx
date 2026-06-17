import React from 'react';
import { Select, Tag } from 'antd';
import { TaskStatus } from '../types';
import { useThemeStore } from '../stores/themeStore';

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; bgDark: string }> = {
  [TaskStatus.TODO]:        { label: 'Sẽ làm',      color: '#6b7280', bg: '#f3f4f6', bgDark: '#252830' },
  [TaskStatus.IN_PROGRESS]: { label: 'Đang làm',    color: '#3b82f6', bg: '#eff6ff', bgDark: '#1a2540' },
  [TaskStatus.IN_REVIEW]:   { label: 'Đang review', color: '#f59e0b', bg: '#fffbeb', bgDark: '#2d2210' },
  [TaskStatus.RESOLVED]:    { label: 'Đã xử lý',    color: '#8b5cf6', bg: '#f5f3ff', bgDark: '#231e38' },
  [TaskStatus.DONE]:        { label: 'Hoàn thành',  color: '#22c55e', bg: '#f0fdf4', bgDark: '#162a1e' },
  [TaskStatus.CANCELLED]:   { label: 'Đã hủy',      color: '#ef4444', bg: '#fef2f2', bgDark: '#2d1515' },
};

/** Tag hiển thị trạng thái (readonly) */
export const StatusTag: React.FC<{ status: string; small?: boolean }> = ({ status, small }) => {
  const { isDark } = useThemeStore();
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Tag>{status}</Tag>;
  return (
    <Tag
      style={{
        background: isDark ? cfg.bgDark : cfg.bg,
        color: isDark ? cfg.color : cfg.color,
        border: `1px solid ${cfg.color}${isDark ? '60' : '40'}`,
        fontSize: small ? 11 : 12,
        margin: 0,
      }}
    >
      {cfg.label}
    </Tag>
  );
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: (
    <span style={{ color: cfg.color, fontWeight: 500 }}>
      ● {cfg.label}
    </span>
  ),
}));

interface StatusSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  loading?: boolean;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
  disabledValues?: string[];
  disabledTooltip?: string;
}

/** Dropdown chọn trạng thái */
const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, loading, size, style, disabledValues, disabledTooltip }) => {
  const options = STATUS_OPTIONS.map(opt => ({
    ...opt,
    disabled: disabledValues?.includes(opt.value as string),
    label: disabledValues?.includes(opt.value as string) ? (
      <span title={disabledTooltip} style={{ opacity: 0.5 }}>{opt.label}</span>
    ) : opt.label,
  }));
  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      size={size}
      style={{ minWidth: 150, ...style }}
      options={options}
      labelRender={({ value: v }) => {
        const c = STATUS_CONFIG[v as string];
        if (!c) return <span>{v}</span>;
        return <span style={{ color: c.color, fontWeight: 500 }}>● {c.label}</span>;
      }}
    />
  );
};

export default StatusSelect;
