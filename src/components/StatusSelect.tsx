import React from 'react';
import { Select, Tag } from 'antd';
import { TaskStatus } from '../types';

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  [TaskStatus.TODO]:        { label: 'Sẽ làm',       color: '#6b7280', bg: '#f3f4f6' },
  [TaskStatus.IN_PROGRESS]: { label: 'Đang làm',     color: '#3b82f6', bg: '#eff6ff' },
  [TaskStatus.IN_REVIEW]:   { label: 'Đang review',  color: '#f59e0b', bg: '#fffbeb' },
  [TaskStatus.RESOLVED]:    { label: 'Đã xử lý',     color: '#8b5cf6', bg: '#f5f3ff' },
  [TaskStatus.DONE]:        { label: 'Hoàn thành',   color: '#22c55e', bg: '#f0fdf4' },
  [TaskStatus.CANCELLED]:   { label: 'Đã hủy',       color: '#ef4444', bg: '#fef2f2' },
};

/** Tag hiển thị trạng thái (readonly) */
export const StatusTag: React.FC<{ status: string; small?: boolean }> = ({ status, small }) => {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Tag>{status}</Tag>;
  return (
    <Tag
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}40`,
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
}

/** Dropdown chọn trạng thái */
const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, loading, size, style }) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      size={size}
      style={{ minWidth: 150, ...style }}
      options={STATUS_OPTIONS}
      styles={{
        // Màu theo trạng thái hiện tại
      }}
      labelRender={({ value: v }) => {
        const c = STATUS_CONFIG[v as string];
        if (!c) return <span>{v}</span>;
        return <span style={{ color: c.color, fontWeight: 500 }}>● {c.label}</span>;
      }}
    />
  );
};

export default StatusSelect;
