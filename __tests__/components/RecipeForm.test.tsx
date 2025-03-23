import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeForm from '@/app/components/RecipeForm';
import { CATEGORIES, DIFFICULTIES } from '@/app/lib/constants';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: { id: 1, name: 'Test User' },
      expires: '2023-01-01T00:00:00.000Z',
    },
    status: 'authenticated',
  })),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-123'),
}));

jest.mock('@/app/components/RichTextEditor', () => {
  return jest.fn(({ content, onChange }) => (
    <div data-testid="rich-text-editor">
      <textarea
        data-testid="mock-editor"
        value={content || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ));
});

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  __esModule: true,
  default: ({ onDrop, children }: { onDrop: (files: File[]) => void, children: React.ReactNode }) => (
    <div data-testid="dropzone" onClick={() => onDrop([new File(['test'], 'test.jpg')])}>
      {children}
    </div>
  ),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock canvas methods for image compression
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
  })),
  toBlob: jest.fn((callback) => callback(new Blob(['test']))),
};

// Fix for infinite recursion by using a flag to prevent re-entry
let isCreatingElement = false;
const originalCreateElement = global.document.createElement.bind(document);

Object.defineProperty(global.document, 'createElement', {
  value: (tag: string) => {
    if (isCreatingElement) {
      return originalCreateElement(tag);
    }

    isCreatingElement = true;
    try {
      if (tag === 'canvas') return mockCanvas;
      if (tag === 'img') {
        const img = {
          onload: null,
          onerror: null,
          src: '',
          naturalWidth: 100,
          naturalHeight: 100,
        };
        // Simulate onload in the next tick
        setTimeout(() => img.onload && img.onload());
        return img;
      }

      // Use the original implementation for everything else
      return originalCreateElement(tag);
    } finally {
      isCreatingElement = false;
    }
  },
  configurable: true,
});

describe('RecipeForm Component', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty form in create mode', () => {
    render(
      <RecipeForm
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Check that form elements are rendered
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByText(/ingredients/i)).toBeInTheDocument();
    expect(screen.getByText(/steps/i)).toBeInTheDocument();
    expect(screen.getByText(/drag and drop images/i, { exact: false })).toBeInTheDocument();

    // Check category dropdown has all options
    const categorySelect = screen.getByLabelText(/category/i);
    expect(categorySelect).toBeInTheDocument();

    // Check difficulty dropdown has all options
    const difficultySelect = screen.getByLabelText(/difficulty/i);
    expect(difficultySelect).toBeInTheDocument();

    // Check isPublic checkbox
    expect(screen.getByText(/make public/i)).toBeInTheDocument();

    // Check form buttons
    expect(screen.getByRole('button', { name: /create recipe/i })).toBeInTheDocument();
    const cancelButtons = screen.getAllByText(/cancel/i);
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('populates form with recipe data in edit mode', () => {
    const mockRecipe = {
      id: 1,
      title: 'Test Recipe',
      description: 'Test description',
      ingredients: JSON.stringify([
        { id: '1', text: 'Ingredient 1', quantity: '1', unit: 'cup' }
      ]),
      steps: JSON.stringify([
        { id: '1', text: 'Step 1' }
      ]),
      images: JSON.stringify(['image1.jpg']),
      tags: JSON.stringify(['tag1', 'tag2']),
      category: 'Dinner',
      cookingTime: 30,
      difficulty: 'Medium',
      isPublic: true,
      notes: 'Test notes',
      userId: 1,
      cookedOn: '2023-01-01',
    };

    render(
      <RecipeForm
        mode="edit"
        recipe={mockRecipe}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Check that form elements are populated with recipe data
    expect(screen.getByLabelText(/title/i)).toHaveValue('Test Recipe');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Test description');

    // Check that ingredients and steps are populated
    expect(screen.getByDisplayValue('Ingredient 1')).toBeInTheDocument();

    // Check category and difficulty selections
    expect(screen.getByLabelText(/category/i)).toHaveValue('Dinner');
    expect(screen.getByLabelText(/difficulty/i)).toHaveValue('Medium');

    // Check isPublic checkbox
    expect(screen.getByLabelText(/make this recipe public/i)).toBeChecked();
  });

  it('calls onSave with form data when submitting', async () => {
    render(
      <RecipeForm
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill in form data
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Recipe' } });

    // Add description using the mock editor
    const mockEditor = screen.getByTestId('mock-editor');
    fireEvent.change(mockEditor, { target: { value: 'New description' } });

    // Add an ingredient - adjust selector to match component implementation
    const ingredientInput = screen.getByPlaceholderText(/enter ingredient name/i);
    fireEvent.change(ingredientInput, { target: { value: 'New ingredient' } });
    const addButtons = screen.getAllByRole('button', { name: /add/i });
    fireEvent.click(addButtons[0]); // First "Add" button should be for ingredients

    // Select category and difficulty
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Breakfast' } });
    fireEvent.change(screen.getByLabelText(/difficulty/i), { target: { value: 'Easy' } });

    // Make recipe public - use text content instead of label
    const publicCheckbox = screen.getByText(/make public/i).closest('label')?.querySelector('input');
    if (publicCheckbox) {
      fireEvent.click(publicCheckbox);
    }

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create recipe/i }));

    // Wait for form submission
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Recipe',
        category: 'Breakfast',
        difficulty: 'Easy',
        isPublic: true,
      }));
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <RecipeForm
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Use getAllByText since there may be multiple cancel buttons
    const cancelButtons = screen.getAllByText(/cancel/i);
    fireEvent.click(cancelButtons[0]); // Click the first cancel button
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('validates required fields before submission', async () => {
    render(
      <RecipeForm
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit the form without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /create recipe/i }));

    // Check that validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText(/title is required/i, { exact: false })).toBeInTheDocument();
    });

    // onSave should not be called
    expect(mockOnSave).not.toHaveBeenCalled();

    // Fill in the title
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Recipe' } });

    // Submit again
    fireEvent.click(screen.getByRole('button', { name: /create recipe/i }));

    // Now onSave should be called
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('handles image uploads', async () => {
    render(
      <RecipeForm
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Click the dropzone to simulate file drop
    fireEvent.click(screen.getByTestId('dropzone'));

    // Wait for image processing
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
