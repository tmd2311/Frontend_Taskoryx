import { useState, useRef, useCallback } from 'react';
import { projectService } from '../services/projectService';
import type { MentionedUser } from '../types';

/**
 * Hook quản lý textarea có hỗ trợ @mention autocomplete.
 * Tương thích với antd TextArea (dùng ref.nativeElement để truy cập DOM).
 * @param projectId - UUID của project hiện tại (dùng để tìm member)
 */
export function useMentionInput(projectId: string | undefined) {
  const [content, setContent] = useState('');
  const [suggestions, setSuggestions] = useState<MentionedUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const [cursorPos, setCursorPos] = useState(0);
  // antd TextArea ref type – thực tế là TextAreaRef { nativeElement, focus, blur, ... }
  const textareaRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Lấy DOM textarea từ antd ref (có thể là TextAreaRef hoặc HTMLTextAreaElement) */
  const getNativeTextarea = (): HTMLTextAreaElement | null => {
    const ref = textareaRef.current;
    if (!ref) return null;
    // antd v5 TextAreaRef có nativeElement
    if (ref.nativeElement instanceof HTMLTextAreaElement) return ref.nativeElement;
    // antd v5 cũ hơn có resizableTextArea.textArea
    if (ref.resizableTextArea?.textArea instanceof HTMLTextAreaElement) {
      return ref.resizableTextArea.textArea;
    }
    // Fallback: bản thân là DOM element
    if (ref instanceof HTMLTextAreaElement) return ref;
    return null;
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);

      const cursor = e.target.selectionStart ?? 0;
      setCursorPos(cursor);
      const textBeforeCursor = value.slice(0, cursor);
      const match = textBeforeCursor.match(/@(\w*)$/);

      if (match) {
        const keyword = match[1];
        setMentionStart(cursor - match[0].length);
        setShowDropdown(true);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          if (!projectId) return;
          try {
            const results = await projectService.searchMembers(projectId, keyword);
            setSuggestions(results ?? []);
          } catch {
            setSuggestions([]);
          }
        }, 250);
      } else {
        setShowDropdown(false);
        setSuggestions([]);
      }
    },
    [projectId],
  );

  /** Chèn @username vào vị trí đang gõ */
  const selectMention = useCallback(
    (user: MentionedUser) => {
      const before = content.slice(0, mentionStart);
      const after = content.slice(cursorPos);
      const inserted = `@${user.username} `;
      const newContent = before + inserted + after;
      const newCursor = mentionStart + inserted.length;

      setContent(newContent);
      setShowDropdown(false);
      setSuggestions([]);

      // Đặt lại vị trí con trỏ sau khi chèn
      setTimeout(() => {
        const el = getNativeTextarea();
        if (el) {
          el.focus();
          el.setSelectionRange(newCursor, newCursor);
        } else if (textareaRef.current?.focus) {
          textareaRef.current.focus();
        }
      }, 0);
    },
    [content, mentionStart, cursorPos],
  );

  const reset = useCallback(() => {
    setContent('');
    setShowDropdown(false);
    setSuggestions([]);
    setMentionStart(-1);
    setCursorPos(0);
  }, []);

  return {
    content,
    setContent,
    suggestions,
    showDropdown,
    setShowDropdown,
    textareaRef,
    handleChange,
    selectMention,
    reset,
  };
}
