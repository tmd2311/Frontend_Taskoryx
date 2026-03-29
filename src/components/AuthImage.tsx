import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import { fetchAuthImage } from '../utils/attachment';

interface AuthImageState {
  src: string | null;
  error: boolean;
  loading: boolean;
}

interface AuthImageProps {
  attachmentId: string;
  fileName?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

/**
 * Hiển thị ảnh đính kèm cần Bearer token.
 * Fetch blob qua API rồi tạo object URL tạm.
 */
const AuthImage: React.FC<AuthImageProps> = ({ attachmentId, fileName, style, className, onClick }) => {
  const [state, setState] = useState<AuthImageState>({ src: null, error: false, loading: true });

  useEffect(() => {
    let cancelled = false;
    setState({ src: null, error: false, loading: true });
    fetchAuthImage(attachmentId)
      .then((url) => { if (!cancelled) setState({ src: url, error: false, loading: false }); })
      .catch(() => { if (!cancelled) setState({ src: null, error: true, loading: false }); });
    return () => { cancelled = true; };
  }, [attachmentId]);

  if (state.loading) {
    return (
      <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
        <Spin size="small" />
      </div>
    );
  }
  if (state.error) {
    return (
      <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 4, ...style }}>
        <FileImageOutlined style={{ color: '#bfbfbf', fontSize: 20 }} />
      </div>
    );
  }

  return (
    <img
      src={state.src!}
      alt={fileName || 'Ảnh đính kèm'}
      className={className}
      style={{ objectFit: 'cover', ...style }}
      loading="lazy"
      onClick={onClick}
    />
  );
};

export default AuthImage;
