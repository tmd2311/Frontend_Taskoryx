import React from 'react';
import { Input } from 'antd';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  modules?: any;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, style }) => (
  <Input.TextArea
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    placeholder={placeholder}
    autoSize={{ minRows: 3, maxRows: 8 }}
    style={style}
  />
);

export default RichTextEditor;
