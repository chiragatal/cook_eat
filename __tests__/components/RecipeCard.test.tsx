import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import RecipeCard from '@/app/components/RecipeCard';

describe('RecipeCard Component', () => {
  const mockRecipe = {
    id: 1,
    title: 'Test Recipe',
    description: 'This is a test recipe description',
    category: 'Dinner',
    tags: ['easy', 'quick'],
    isPublic: true,
  };

  const mockProps = {
    recipe: mockRecipe,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onTogglePublic: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recipe information correctly', () => {
    render(<RecipeCard {...mockProps} />);

    // Check that the title is displayed
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();

    // Check that the description is displayed
    expect(screen.getByText('This is a test recipe description')).toBeInTheDocument();

    // Check that the category is displayed
    expect(screen.getByText('Dinner')).toBeInTheDocument();

    // Check that tags are displayed
    expect(screen.getByText('#easy')).toBeInTheDocument();
    expect(screen.getByText('#quick')).toBeInTheDocument();

    // Check that the visibility toggle shows the correct text for a public recipe
    expect(screen.getByText('Make Private')).toBeInTheDocument();
  });

  it('shows "Make Public" when recipe is private', () => {
    const privateRecipe = { ...mockRecipe, isPublic: false };
    render(
      <RecipeCard
        {...mockProps}
        recipe={privateRecipe}
      />
    );

    expect(screen.getByText('Make Public')).toBeInTheDocument();
  });

  it('calls onEdit when Edit button is clicked', () => {
    render(<RecipeCard {...mockProps} />);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(mockProps.onEdit).toHaveBeenCalledWith(mockRecipe);
  });

  it('calls onDelete when Delete button is clicked', () => {
    render(<RecipeCard {...mockProps} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockProps.onDelete).toHaveBeenCalledWith(mockRecipe);
  });

  it('calls onTogglePublic when visibility toggle is clicked', () => {
    render(<RecipeCard {...mockProps} />);

    const toggleButton = screen.getByText('Make Private');
    fireEvent.click(toggleButton);

    expect(mockProps.onTogglePublic).toHaveBeenCalledWith(mockRecipe);
  });
});
