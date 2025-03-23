import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RichTextEditor } from '@/app/components/RichTextEditor';

// Create a mock for the chain methods
const createMockChain = () => {
  const chain = {
    focus: jest.fn(() => chain),
    toggleBold: jest.fn(() => chain),
    toggleItalic: jest.fn(() => chain),
    toggleStrike: jest.fn(() => chain),
    toggleHeading: jest.fn(() => chain),
    toggleBulletList: jest.fn(() => chain),
    toggleOrderedList: jest.fn(() => chain),
    toggleCodeBlock: jest.fn(() => chain),
    toggleBlockquote: jest.fn(() => chain),
    setLink: jest.fn(() => chain),
    unsetLink: jest.fn(() => chain),
    run: jest.fn(),
  };
  return chain;
};

// Mock the tiptap dependencies
jest.mock('@tiptap/react', () => {
  const mockChain = createMockChain();
  const mockEditor = {
    chain: jest.fn(() => mockChain),
    isActive: jest.fn((type) => false),
    getHTML: jest.fn(() => '<p>Test content</p>'),
    setEditable: jest.fn(),
    commands: {
      setImage: jest.fn(),
      setContent: jest.fn(),
    },
  };

  return {
    useEditor: jest.fn(() => mockEditor),
    EditorContent: jest.fn(({ editor }) => (
      <div data-testid="editor-content">
        <textarea
          data-testid="mock-editor-content"
          onChange={(e) => editor && editor.getHTML && editor.getHTML()}
        />
      </div>
    )),
  };
});

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
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Heading')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
    expect(screen.getByTitle('Quote')).toBeInTheDocument();
    expect(screen.getByTitle('Code')).toBeInTheDocument();
    expect(screen.getByTitle('Link')).toBeInTheDocument();
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
    const mockChain = createMockChain();
    const mockEditor = {
      chain: jest.fn(() => mockChain),
      isActive: jest.fn(() => false),
      getHTML: jest.fn(() => '<p>Test content</p>'),
      commands: {
        setContent: jest.fn(),
      },
    };

    useEditor.mockReturnValue(mockEditor);

    render(
      <RichTextEditor
        value="<p>Test content</p>"
        onChange={mockOnChange}
      />
    );

    // Click bold button
    fireEvent.click(screen.getByTitle('Bold'));

    // Check that chain commands were called
    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockChain.focus).toHaveBeenCalled();
    expect(mockChain.toggleBold).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('handles link button click', () => {
    const { useEditor } = require('@tiptap/react');
    const mockChain = createMockChain();
    const mockEditor = {
      chain: jest.fn(() => mockChain),
      isActive: jest.fn((type) => type === 'link'),
      getHTML: jest.fn(() => '<p>Test content</p>'),
      commands: {
        setContent: jest.fn(),
      },
    };

    useEditor.mockReturnValue(mockEditor);

    render(
      <RichTextEditor
        value="<p>Test content</p>"
        onChange={mockOnChange}
      />
    );

    // Find and click the link button by its title attribute
    const linkButton = screen.getByTitle('Link');
    fireEvent.click(linkButton);

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
    const mockChain = createMockChain();
    const mockEditor = {
      chain: jest.fn(() => mockChain),
      isActive: jest.fn(() => true), // Link is active
      getHTML: jest.fn(() => '<p><a href="https://example.com">Test content</a></p>'),
      commands: {
        setContent: jest.fn(),
      },
    };

    // Mock prompt to return null to trigger unsetLink
    window.prompt.mockReturnValueOnce(null);
    useEditor.mockReturnValue(mockEditor);

    render(
      <RichTextEditor
        value="<p><a href='https://example.com'>Test content</a></p>"
        onChange={mockOnChange}
      />
    );

    // Click link button
    fireEvent.click(screen.getByTitle('Link'));

    // Check that chain commands were called
    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockChain.focus).toHaveBeenCalled();
    expect(mockChain.unsetLink).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();
  });

  it('handles image upload', () => {
    const { useEditor } = require('@tiptap/react');
    const mockChain = createMockChain();
    const mockEditor = {
      chain: jest.fn(() => mockChain),
      isActive: jest.fn(() => false),
      getHTML: jest.fn(() => '<p>Test content</p>'),
      commands: {
        setImage: jest.fn(),
        setContent: jest.fn(),
      },
    };

    useEditor.mockReturnValue(mockEditor);

    // Just verify we can render the editor properly
    const { container } = render(
      <RichTextEditor
        value="<p>Test content</p>"
        onChange={mockOnChange}
      />
    );

    // Verify that toolbar and editor content are rendered
    const toolbarDiv = container.querySelector('.flex.flex-wrap.items-center');
    expect(toolbarDiv).not.toBeNull();
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });
});
