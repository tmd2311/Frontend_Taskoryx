import api from '../services/api';

// Cache để không fetch lại ảnh đã tải
const imageCache = new Map<string, string>();

/**
 * Tải ảnh inline cần Bearer token.
 * Trình duyệt không tự gắn Authorization khi dùng <img src="...">.
 */
export const fetchAuthImage = async (attachmentId: string): Promise<string> => {
  if (imageCache.has(attachmentId)) return imageCache.get(attachmentId)!;

  const token = localStorage.getItem('accessToken');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  const res = await fetch(`${baseUrl}/attachments/${attachmentId}/inline`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Không thể tải ảnh');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  imageCache.set(attachmentId, url);
  return url;
};

/** Giải phóng bộ nhớ khi không cần nữa */
export const revokeAuthImage = (attachmentId: string) => {
  const url = imageCache.get(attachmentId);
  if (url) {
    URL.revokeObjectURL(url);
    imageCache.delete(attachmentId);
  }
};

/** Tải file xuống với auth */
export const downloadAttachment = async (attachmentId: string, fileName: string) => {
  const token = localStorage.getItem('accessToken');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  const res = await fetch(`${baseUrl}/attachments/${attachmentId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Không thể tải file');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const FILE_CATEGORY_ICONS: Record<string, string> = {
  IMAGE:        '🖼️',
  DOCUMENT:     '📄',
  SPREADSHEET:  '📊',
  PRESENTATION: '📑',
  VIDEO:        '🎬',
  AUDIO:        '🎵',
  ARCHIVE:      '📦',
  CODE:         '💻',
  OTHER:        '📎',
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getAttachments = (taskId: string, category?: string) =>
  api.get(`/tasks/${taskId}/attachments`, { params: category ? { category } : {} })
    .then((r: any) => r.data ?? r);

export const getCommentAttachments = (commentId: string) =>
  api.get(`/comments/${commentId}/attachments`).then((r: any) => r.data ?? r);
