import React, { useEffect, useRef, useState } from 'react';
import {
  Button, Input, Select, Space, Tag, Tooltip, Avatar,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, FilterOutlined, UpOutlined, DownOutlined, UserOutlined,
} from '@ant-design/icons';
import type {
  IssueCategory, ProjectMember, Sprint, TaskFilterState, Version,
} from '../types';
import { useThemeStore } from '../stores/themeStore';

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'not_closed', label: 'Chưa đóng', color: '#4361ee' },
  { value: 'all',        label: 'Tất cả',    color: '#8c8c8c' },
  { value: 'TODO',       label: 'Chưa làm',  color: '#8c8c8c' },
  { value: 'IN_PROGRESS',label: 'Đang làm',  color: '#1890ff' },
  { value: 'IN_REVIEW',  label: 'Đang review', color: '#fa8c16' },
  { value: 'RESOLVED',   label: 'Đã giải quyết', color: '#722ed1' },
  { value: 'DONE',       label: 'Hoàn thành', color: '#52c41a' },
  { value: 'CANCELLED',  label: 'Đã hủy',    color: '#f5222d' },
];

const SUBTASKING_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',           label: 'Tất cả' },
  { value: 'parent_only',   label: 'Chỉ task gốc' },
  { value: 'exclude_child', label: 'Loại task con' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW',    label: 'Thấp',     color: 'green' },
  { value: 'MEDIUM', label: 'Trung bình', color: 'blue' },
  { value: 'HIGH',   label: 'Cao',      color: 'orange' },
  { value: 'URGENT', label: 'Khẩn cấp', color: 'red' },
];

export const DEFAULT_FILTER: TaskFilterState = {
  mode: 'search',
  status: 'not_closed',
  subtasking: 'all',
  keyword: '',
  assigneeId: null,
  categoryId: null,
  versionId: null,
  sprintId: null,
  priorities: [],
  page: 1,
  pageSize: 15,
};

interface TaskFilterPanelProps {
  value: TaskFilterState;
  onChange: (patch: Partial<TaskFilterState>) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  members?: ProjectMember[];
  categories?: IssueCategory[];
  versions?: Version[];
  sprints?: Sprint[];
}

const TaskFilterPanel: React.FC<TaskFilterPanelProps> = ({
  value,
  onChange,
  onSearch,
  onReset,
  loading,
  members = [],
  categories = [],
  versions = [],
  sprints = [],
}) => {
  const { isDark } = useThemeStore();
  const [keywordDraft, setKeywordDraft] = useState(value.keyword);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panelBg      = isDark ? '#1c1f2e' : '#fff';
  const borderColor  = isDark ? '#2e3250' : '#f0f0f0';
  const titleColor   = isDark ? '#e8eaf6' : '#1f1f1f';
  const subColor     = isDark ? '#9397b0' : '#8c8c8c';
  const toggleColor  = isDark ? '#9397b0' : '#595959';
  const chipInactive = isDark ? '#252842' : '#fafafa';
  const chipText     = isDark ? '#c0c4d8' : '#595959';
  const chipBorder   = isDark ? '#2e3250' : '#d9d9d9';

  useEffect(() => {
    setKeywordDraft(value.keyword);
  }, [value.keyword]);

  const handleKeywordChange = (v: string) => {
    setKeywordDraft(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ keyword: v, page: 1 });
    }, 400);
  };

  const handleKeywordEnter = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange({ keyword: keywordDraft, page: 1 });
    onSearch();
  };

  const isAdvanced = value.mode === 'advanced';

  const hasActiveFilter =
    value.status !== 'not_closed' ||
    value.subtasking !== 'all' ||
    !!value.keyword ||
    !!value.assigneeId ||
    !!value.categoryId ||
    !!value.versionId ||
    !!value.sprintId ||
    value.priorities.length > 0;

  return (
    <div style={{
      background: panelBg,
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      padding: '14px 16px',
      marginBottom: 16,
    }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space size={4}>
          <FilterOutlined style={{ color: '#4361ee' }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: titleColor }}>Bộ lọc</span>
          {hasActiveFilter && (
            <Tag color="blue" style={{ marginLeft: 4, fontSize: 11 }}>Đang lọc</Tag>
          )}
        </Space>
        <Button
          type="link"
          size="small"
          icon={isAdvanced ? <UpOutlined /> : <DownOutlined />}
          onClick={() => onChange({ mode: isAdvanced ? 'search' : 'advanced' })}
          style={{ padding: 0, fontSize: 12, color: toggleColor }}
        >
          {isAdvanced ? 'Thu gọn' : 'Nâng cao'}
        </Button>
      </div>

      {/* Status chips */}
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: subColor, marginRight: 8 }}>Trạng thái:</span>
        <Space size={4} wrap>
          {STATUS_OPTIONS.map((opt) => {
            const active = value.status === opt.value;
            return (
              <Tag
                key={opt.value}
                onClick={() => onChange({ status: opt.value as TaskFilterState['status'], page: 1 })}
                style={{
                  cursor: 'pointer',
                  borderRadius: 20,
                  padding: '1px 10px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  background: active ? opt.color : chipInactive,
                  color: active ? '#fff' : chipText,
                  borderColor: active ? opt.color : chipBorder,
                  transition: 'all .15s',
                  userSelect: 'none',
                }}
              >
                {opt.label}
              </Tag>
            );
          })}
        </Space>
      </div>

      {/* Subtasking chips */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: subColor, marginRight: 8 }}>Phân cấp:</span>
        <Space size={4}>
          {SUBTASKING_OPTIONS.map((opt) => {
            const active = value.subtasking === opt.value;
            return (
              <Tag
                key={opt.value}
                onClick={() => onChange({ subtasking: opt.value as TaskFilterState['subtasking'], page: 1 })}
                style={{
                  cursor: 'pointer',
                  borderRadius: 20,
                  padding: '1px 10px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  background: active ? '#4361ee' : chipInactive,
                  color: active ? '#fff' : chipText,
                  borderColor: active ? '#4361ee' : chipBorder,
                  transition: 'all .15s',
                  userSelect: 'none',
                }}
              >
                {opt.label}
              </Tag>
            );
          })}
        </Space>
      </div>

      {/* Keyword + Search button (always visible) */}
      <Space.Compact style={{ width: '100%', marginBottom: isAdvanced ? 12 : 0 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="Tìm theo tiêu đề, mô tả..."
          value={keywordDraft}
          onChange={(e) => handleKeywordChange(e.target.value)}
          onPressEnter={handleKeywordEnter}
          allowClear
          onClear={() => { setKeywordDraft(''); onChange({ keyword: '', page: 1 }); }}
          style={{ fontSize: 13 }}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          loading={loading}
          onClick={() => { onChange({ keyword: keywordDraft, page: 1 }); onSearch(); }}
        >
          Tìm
        </Button>
        {hasActiveFilter && (
          <Tooltip title="Đặt lại bộ lọc">
            <Button icon={<ReloadOutlined />} onClick={onReset} />
          </Tooltip>
        )}
      </Space.Compact>

      {/* Advanced filters */}
      {isAdvanced && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '8px 12px',
        }}>
          {/* Assignee */}
          <div>
            <div style={{ fontSize: 11, color: subColor, marginBottom: 4 }}>Người thực hiện</div>
            <Select
              allowClear
              placeholder="Tất cả"
              style={{ width: '100%' }}
              value={value.assigneeId ?? undefined}
              onChange={(v) => onChange({ assigneeId: v ?? null, page: 1 })}
              optionLabelProp="label"
              options={members.map((m) => ({
                value: m.userId,
                label: m.fullName || m.username,
                'data-avatar': m.avatarUrl,
                'data-name': m.fullName || m.username,
              }))}
              optionRender={(opt) => (
                <Space size={6}>
                  <Avatar src={(opt.data as any)['data-avatar']} size={18} icon={<UserOutlined />} />
                  <span style={{ fontSize: 12 }}>{(opt.data as any)['data-name']}</span>
                </Space>
              )}
            />
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: subColor, marginBottom: 4 }}>Danh mục</div>
              <Select
                allowClear
                placeholder="Tất cả"
                style={{ width: '100%' }}
                value={value.categoryId ?? undefined}
                onChange={(v) => onChange({ categoryId: v ?? null, page: 1 })}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          )}

          {/* Milestone (Version) */}
          {versions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: subColor, marginBottom: 4 }}>Milestone</div>
              <Select
                allowClear
                placeholder="Tất cả"
                style={{ width: '100%' }}
                value={value.versionId ?? undefined}
                onChange={(v) => onChange({ versionId: v ?? null, page: 1 })}
                options={versions.map((v) => ({ value: v.id, label: v.name }))}
              />
            </div>
          )}

          {/* Sprint */}
          {sprints.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: subColor, marginBottom: 4 }}>Sprint</div>
              <Select
                allowClear
                placeholder="Tất cả"
                style={{ width: '100%' }}
                value={value.sprintId ?? undefined}
                onChange={(v) => onChange({ sprintId: v ?? null, page: 1 })}
                options={sprints.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
          )}

          {/* Priority */}
          <div>
            <div style={{ fontSize: 11, color: subColor, marginBottom: 4 }}>Mức ưu tiên</div>
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả"
              style={{ width: '100%' }}
              value={value.priorities}
              onChange={(v) => onChange({ priorities: v, page: 1 })}
              options={PRIORITY_OPTIONS.map((p) => ({
                value: p.value,
                label: <Tag color={p.color} style={{ margin: 0 }}>{p.label}</Tag>,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilterPanel;
