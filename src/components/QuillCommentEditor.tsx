import React, { useRef, useMemo, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import { Mention } from 'quill-mention';
import 'react-quill-new/dist/quill.snow.css';
import 'quill-mention/dist/quill.mention.css';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { message } from 'antd';

Quill.register('modules/mention', Mention);

interface QuillCommentEditorProps {
  value: string;
  onChange: (html: string) => void;
  taskId: string;
  projectId?: string;
  placeholder?: string;
  minHeight?: number;
}

const QuillCommentEditor: React.FC<QuillCommentEditorProps> = ({
  value,
  onChange,
  taskId,
  projectId,
  placeholder = 'Viết bình luận... (gõ @ để mention, paste/kéo file để đính kèm)',
  minHeight = 180,
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const uploadingRef = useRef(false);

  // ── Upload file inline rồi insert vào editor ──────────────
  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      message.error('File không được vượt quá 10MB');
      return;
    }
    if (uploadingRef.current) return;
    uploadingRef.current = true;

    const hide = message.loading('Đang upload...', 0);
    try {
      const { url } = await taskService.uploadInlineAttachment(taskId, file);
      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const range = quill.getSelection(true);
      if (file.type.startsWith('image/')) {
        quill.insertEmbed(range.index, 'image', url, 'user');
        quill.setSelection(range.index + 1, 0);
      } else {
        quill.insertText(range.index, file.name, 'link', url, 'user');
        quill.setSelection(range.index + file.name.length, 0);
      }
    } catch {
      message.error('Upload thất bại, vui lòng thử lại');
    } finally {
      hide();
      uploadingRef.current = false;
    }
  };

  // ── Gắn handler paste & drag-drop sau khi Quill mount ────
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const root = quill.root;

    const onPaste = (e: ClipboardEvent) => {
      const file = e.clipboardData?.files?.[0];
      if (!file) return;
      e.preventDefault();
      e.stopPropagation();
      handleFileUpload(file);
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileUpload(file);
    };

    const onDragOver = (e: DragEvent) => e.preventDefault();

    root.addEventListener('paste', onPaste);
    root.addEventListener('drop', onDrop);
    root.addEventListener('dragover', onDragOver);

    return () => {
      root.removeEventListener('paste', onPaste);
      root.removeEventListener('drop', onDrop);
      root.removeEventListener('dragover', onDragOver);
    };
  }, [taskId]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link'],
        ['clean'],
      ],
    },
    clipboard: {
      matchVisual: false,
      matchers: [
        // Chặn paste ảnh base64 — loại bỏ thẻ img có src dạng data:
        ['IMG', (_node: HTMLElement, delta: any) => {
          const src: string = (_node as HTMLImageElement).getAttribute('src') ?? '';
          if (src.startsWith('data:')) return { ops: [] };
          return delta;
        }],
      ],
    },
    mention: {
      mentionDenotationChars: ['@'],
      minChars: 0,
      allowedChars: /^[a-zA-Z0-9_.]*$/,
      positioningStrategy: 'fixed' as const,
      defaultMenuOrientation: 'top' as const,
      source: async (
        searchTerm: string,
        renderList: (matches: { id: string; value: string }[], term: string) => void,
      ) => {
        if (!projectId) { renderList([], searchTerm); return; }
        try {
          const members = searchTerm
            ? await projectService.searchMembers(projectId, searchTerm)
            : await projectService.getMembers(projectId).then((ms) =>
                ms.map((m) => ({
                  userId: m.userId,
                  username: m.username,
                  fullName: m.fullName,
                  avatarUrl: m.avatarUrl,
                }))
              );
          renderList(
            members.map((m) => ({ id: m.userId, value: m.username, fullName: m.fullName || m.username })),
            searchTerm,
          );
        } catch {
          renderList([], searchTerm);
        }
      },
      renderItem: (item: { id: string; value: string; fullName?: string }) => {
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;align-items:center;gap:7px';
        const initials = (item.fullName || item.value).charAt(0).toUpperCase();
        el.innerHTML = `
          <span style="
            width:20px;height:20px;border-radius:50%;
            background:linear-gradient(135deg,#4361ee,#7c3aed);
            color:#fff;display:inline-flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:700;flex-shrink:0;letter-spacing:0;
          ">${initials}</span>
          <span style="font-size:12px;font-weight:500;color:#111827;line-height:1">${item.fullName || item.value}</span>
          <span style="font-size:11px;color:#6b7280;line-height:1">@${item.value}</span>
        `;
        return el;
      },
    },
  }), [projectId]);

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list',
    'blockquote', 'code-block',
    'link', 'image',
    'mention',
  ];

  return (
    <div style={{ minHeight }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight }}
      />
      <style>{`
        .ql-container { min-height: ${minHeight - 42}px; font-size: 13px; }
        .ql-editor { min-height: ${minHeight - 42}px; }
        .ql-editor img { max-width: 100%; border-radius: 4px; margin: 4px 0; }
        .ql-snow .ql-tooltip { display: none !important; }
        .ql-mention-list-container {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06);
          overflow: hidden;
          z-index: 9999;
          min-width: 220px;
          max-width: 280px;
          padding: 4px;
        }
        .ql-mention-list { padding: 0; margin: 0; list-style: none; }
        .ql-mention-list-item {
          padding: 5px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .ql-mention-list-item.selected,
        .ql-mention-list-item:hover { background: #f3f4f6; }
        .mention {
          color: #4361ee;
          font-weight: 600;
          background: #eff6ff;
          border-radius: 3px;
          padding: 0 2px;
        }
      `}</style>
    </div>
  );
};

export default QuillCommentEditor;
