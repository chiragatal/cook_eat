import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RichTextEditor } from '@/app/components/RichTextEditor';

// Mock the tiptap dependencies
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: jest.fn() }),
        toggleItalic: () => ({ run: jest.fn() }),
        toggleStrike: () => ({ run: jest.fn() }),
        toggleHeading: () => ({ run: jest.fn() }),
        toggleBulletList: () => ({ run: jest.fn() }),
        toggleOrderedList: () => ({ run: jest.fn() }),
        toggleCodeBlock: () => ({ run: jest.fn() }),
        toggleBlockquote: () => ({ run: jest.fn() }),
        setLink: () => ({ run: jest.fn() }),
        unsetLink: () => ({ run: jest.fn() }),
      }),
    }),
    isActive: jest.fn((type) => false),
    getHTML: jest.fn(() => '<p>Test content</p>'),
    setEditable: jest.fn(),
    commands: {
      setImage: jest.fn(),
    },
  })),
  EditorContent: jest.fn(({ editor }) => (
    <div data-testid="editor-content">
      <textarea
        data-testid="mock-editor-content"
        onChange={(e) => editor && editor.getHTML && editor.getHTML()}
      />
    </div>
  )),
}));

jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(() => ({})),
  },
}));

jest.mock('@tiptap/extension-link', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(() => ({})),
  },
}));

jest.mock('@tiptap/extension-image', () => ({
  __esModule: true,
  default: {},
}));

// Mock window.prompt for link testing
window.prompt = jest.fn(() => 'https://example.com');

describe('RichTextEditor Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the rich text editor', () => {
    render(
      <RichTextEditor
        value="<p>Initial content</p>"
        onChange={mockOnChange}
      />
    );

    // Editor content should be rendered
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();

    // Toolbar should be rendered with all buttons
    expect(screen.getByLabelText(/bold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/italic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/strike/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/heading/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bullet list/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ordered list/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/code block/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quote/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/link/i)).toBeInTheDocument();
  });

  it('applies disabled state correctly', () => {
    const { useEditor } = require('@tiptap/react');

    render(
      <RichTextEditor
        value="<p>Disabled content</p>"
        onChange={mockOnChange}
        disabled={true}
      />
    );

    // useEditor should be called with editable: false
    expect(useEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        editable: false,
      })
    );
  });

  it('handles bold button click', () => {
    const { useEditor } = require('@tiptap/react');
    const mockChain = {
      focus: jest.fn().mockReturnThis(),
      toggleBold: jest.fn().mockReturnThis(),
      run: jest.fn(),
    };

    const mockEditor = {
      chain: jest.fn(() => mockChain),
      isActive: jest.fn(() => false),
      getHTML: jest.fn(() => '<p>Test content</p>'),
    };

    useEditor.mockReturnValue(mockEditor);

    render(
      <RichTextEditor
        value="<p>Test content</p>"
        onChange={mockOnChange}
      />
    );

    // Click bold button
    fireEvent.click(screen.getByLabelText(/bold/i));

    // Check that chain commands were called
    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockChain.focus).toHaveBeenCalled();
    expect(mockChain.toggleBold).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('handles link button click', () => {
    const { useEditor } = require('@tiptap/react');
    const mockChain = {
      focus: jest.fn().mockReturnThis(),
      setLink: jest.fn().mockReturnThis(),
      run: jest.fn(),
    };

    const mockEditor = {
      chain: jest.fn(() => mockChain),
      isActive: jest.fn((type) => type === 'link'),
      getHTML: jest.fn(() => '<p>Test content</p>'),
    };

    useEditor.mockReturnValue(mockEditor);

    render(
      <RichTextEditor
        value="<p>Test content</p>"
        onChange={mockOnChange}
      />
    );

    // Click link button
    fireEvent.click(screen.getByLabelText(/link/i));

    // Check that prompt was called
    expect(window.prompt).toHaveBeenCalled();

    // Check that chain commands were called
    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockChain.focus).toHaveBeenCalled();
    expect(mockChain.setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('unsets link when already active', () => {
    const { useEditor } = require('@tiptap/react');
    const mockChain = {
      focus: jest.fn().mockReturnThis(),
      unsetLink: jest.fn().mockReturnThis(),
      run: jest.fn(),
    };

    const mockEditor = {
      chain: jest.fn(() => mockChain),
      isActive: jest.fn(() => true), // Link is active
      getHTML: jest.fn(() => '<p><a href="https://example.com">Test content</a></p>'),
    };

    useEditor.mockReturnValue(mockEditor);

    render(
      <RichTextEditor
        value="<p><a href='https://example.com'>Test content</a></p>"
        onChange={mockOnChange}
      />
    );

    // Click link button
    fireEvent.click(screen.getByLabelText(/link/i));

    // Check that chain commands were called
    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockChain.focus).toHaveBeenCalled();
    expect(mockChain.unsetLink).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('handles image upload', () => {
    const { useEditor } = require('@tiptap/react');

    const mockEditor = {
      chain: jest.fn(() => ({
        focus: jest.fn().mockReturnThis(),
        run: jest.fn(),
      })),
      isActive: jest.fn(() => false),
      getHTML: jest.fn(() => '<p>Test content</p>'),
      commands: {
        setImage: jest.fn(),
      },
    };

    useEditor.mockReturnValue(mockEditor);

    // Mock createObjectURL and file inputs
    global.URL.createObjectURL = jest.fn(() => 'blob:test-url');

    render(
      <RichTextEditor
        value="<p>Test content</p>"
        onChange={mockOnChange}
      />
    );

    // Find image button
    const imageButton = screen.getByLabelText(/image/i);
    expect(imageButton).toBeInTheDocument();

    // Click image button to trigger file input
    fireEvent.click(imageButton);

    // Find the file input (it's hidden, so we need to find it by its type)
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    // Mock file input change
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput!, { target: { files: [file] } });

    // Check that setImage was called
    expect(mockEditor.commands.setImage).toHaveBeenCalled();
  });

  it('applies placeholder text correctly', () => {
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
        placeholder="Custom placeholder"
      />
    );

    // useEditor should be called with the custom placeholder
    const { useEditor } = require('@tiptap/react');
    expect(useEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        editorProps: expect.objectContaining({
          attributes: expect.objectContaining({
            placeholder: 'Custom placeholder',
          }),
        }),
      })
    );
  });
});
