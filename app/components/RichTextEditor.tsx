'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useState, useEffect, useRef, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  className = '',
}) => {
  const [isMounted, setIsMounted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'my-3',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-indigo dark:prose-invert focus:outline-none max-w-none min-h-[150px] p-4',
        placeholder: placeholder,
      },
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!isMounted) {
    return null;
  }

  const isActive = (type: string, options?: any) => {
    if (!editor) return false;

    if (options) {
      return editor.isActive(type, options);
    }

    return editor.isActive(type);
  };

  const buttonClass = (active: boolean) => `
    p-2 rounded-md text-gray-700 dark:text-gray-300
    ${active
      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
      : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
    transition-colors duration-200 flex items-center justify-center
  `;

  return (
    <div className={`border rounded-md overflow-hidden bg-white dark:bg-gray-800 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 p-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={buttonClass(isActive('bold'))}
          title="Bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
          </svg>
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={buttonClass(isActive('italic'))}
          title="Italic"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4"></line>
            <line x1="14" y1="20" x2="5" y2="20"></line>
            <line x1="15" y1="4" x2="9" y2="20"></line>
          </svg>
        </button>

        {/* Heading 3 */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={buttonClass(isActive('heading', { level: 3 }))}
          title="Heading"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 12h12"></path>
            <path d="M6 4V20"></path>
            <path d="M18 4V20"></path>
          </svg>
        </button>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={buttonClass(isActive('bulletList'))}
          title="Bullet List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={buttonClass(isActive('orderedList'))}
          title="Numbered List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

        {/* Blockquote */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={buttonClass(isActive('blockquote'))}
          title="Quote"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
          </svg>
        </button>

        {/* Code */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          className={buttonClass(isActive('code'))}
          title="Code"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL');
            if (url) {
              editor?.chain().focus().setLink({ href: url }).run();
            } else {
              editor?.chain().focus().unsetLink().run();
            }
          }}
          className={buttonClass(isActive('link'))}
          title="Link"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>
      </div>
      <EditorContent editor={editor} className="min-h-[150px]" />
    </div>
  );
};

export default RichTextEditor;

export const RichTextContent = forwardRef<
  HTMLDivElement,
  { content: string; className?: string }
>(({ content, className }, ref) => {
  if (!content) return null;

  return (
    <div
      ref={ref}
      className={cn("prose dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});

RichTextContent.displayName = 'RichTextContent';

// Create a component for truncated rich text content with gradient fade
export function TruncatedRichText({
  content,
  maxHeight = '6rem',
  className = "prose dark:prose-invert max-w-none",
  onReadMore
}: {
  content: string;
  maxHeight?: string;
  className?: string;
  onReadMore?: (e?: React.MouseEvent) => void;
}) {
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if content overflows the container
    if (contentRef.current) {
      const element = contentRef.current;
      setHasOverflow(element.scrollHeight > element.clientHeight);
    }
  }, [content]);

  if (!content) return null;

  return (
    <div className="relative" style={{ maxHeight }}>
      <div
        ref={contentRef}
        className={`${className} overflow-hidden`}
        style={{ maxHeight }}
        dangerouslySetInnerHTML={{ __html: content }}
        onClick={(e) => {
          if (onReadMore) {
            e.stopPropagation();
            onReadMore(e);
          }
        }}
      />
      {hasOverflow && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent" />
      )}
    </div>
  );
}
