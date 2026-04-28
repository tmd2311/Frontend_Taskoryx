import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyEditor } from 'tinymce';

const TINYMCE_KEY = import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

interface TinyCommentEditorProps {
  value: string;
  onChange: (html: string) => void;
  taskId: string;
  placeholder?: string;
  minHeight?: number;
}

const TinyCommentEditor: React.FC<TinyCommentEditorProps> = ({
  value,
  onChange,
  taskId,
  placeholder = 'Viết bình luận...',
  minHeight = 180,
}) => {
  const editorRef = useRef<TinyEditor | null>(null);

  return (
    <Editor
      apiKey={TINYMCE_KEY}
      onInit={(_evt, editor) => { editorRef.current = editor; }}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        min_height: minHeight,
        menubar: false,
        statusbar: false,
        placeholder,
        plugins: [
          'autolink', 'lists', 'link', 'image', 'media',
          'table', 'codesample', 'emoticons',
        ],
        toolbar:
          'bold italic underline strikethrough | ' +
          'bullist numlist | blockquote codesample | ' +
          'link image media | emoticons | removeformat',
        content_style: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: #374151;
            margin: 8px 12px;
          }
          img { max-width: 100%; border-radius: 4px; }
          pre { background: #f3f4f6; border-radius: 4px; padding: 10px; }
          blockquote {
            border-left: 3px solid #d1d5db;
            margin: 0;
            padding-left: 12px;
            color: #6b7280;
          }
          a { color: #4361ee; }
        `,
        // Upload ảnh inline – gửi lên API attachments của task
        images_upload_handler: (blobInfo) =>
          new Promise((resolve, reject) => {
            const token = localStorage.getItem('accessToken');
            const formData = new FormData();
            formData.append('file', blobInfo.blob(), blobInfo.filename());
            fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            })
              .then((res) => res.json())
              .then((json) => {
                const url = json?.data?.fileUrl ?? json?.fileUrl;
                if (url) resolve(url);
                else reject('Upload thất bại');
              })
              .catch(() => reject('Upload thất bại'));
          }),
        file_picker_types: 'image',
        automatic_uploads: true,
        paste_data_images: true,
        link_default_target: '_blank',
        codesample_languages: [
          { text: 'JavaScript', value: 'javascript' },
          { text: 'TypeScript', value: 'typescript' },
          { text: 'Python', value: 'python' },
          { text: 'Java', value: 'java' },
          { text: 'Bash', value: 'bash' },
          { text: 'SQL', value: 'sql' },
        ],
        skin: 'oxide',
        icons: 'default',
      }}
    />
  );
};

export default TinyCommentEditor;
