'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useState, useEffect } from 'react';

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

  return (
    <div className={`border rounded-md overflow-hidden bg-white dark:bg-gray-800 ${className}`}>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b dark:border-gray-700">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Bold"
        >
          <span className="font-bold">B</span>
        </button>

        {/* Heading 3 */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Heading"
        >
          <span className="font-bold">H3</span>
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Italic"
        >
          <span className="italic">I</span>
        </button>

        {/* Blockquote */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Blockquote"
        >
          <span className="text-lg">❝</span>
        </button>

        {/* Code */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('code') ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Code"
        >
          <span className="font-mono">{'</>'}</span>
        </button>

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Bullet List"
        >
          <span>•</span>
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Ordered List"
        >
          <span>1.</span>
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
          className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('link') ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          title="Link"
        >
          <span className="underline">Link</span>
        </button>
      </div>
      <EditorContent editor={editor} className="min-h-[150px]" />
    </div>
  );
};

export default RichTextEditor;

// Create a component that just renders the rich text content for viewing
export function RichTextContent({
  content,
  className = "prose dark:prose-invert max-w-none"
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

// Create a component for truncated rich text content with a "read more" button
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
  if (!content) return null;

  return (
    <div className="relative" style={{ maxHeight }}>
      <div
        className={`${className} overflow-hidden`}
        style={{ maxHeight }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent">
        {onReadMore && (
          <button
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-t-md"
            onClick={(e) => {
              e.stopPropagation();
              onReadMore(e);
            }}
          >
            Read more
          </button>
        )}
      </div>
    </div>
  );
}
