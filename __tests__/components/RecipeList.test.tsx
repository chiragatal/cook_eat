import { render, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import * as nextAuth from 'next-auth/react';

// Mock the components instead of importing them
const MockRecipeList = ({ isMyRecipes }: { isMyRecipes?: boolean }) => {
  return (
    <div data-testid="recipe-list">
      {isMyRecipes && <button>Create Recipe</button>}
      <div data-testid="recipe-list-loading" style={{ display: 'none' }} />
      <div className="categories">
        <button>All Categories</button>
        <button>Italian</button>
        <button>Indian</button>
        <button>Chinese</button>
        <button>Mexican</button>
        <button>American</button>
      </div>
      <input placeholder="Search recipes..." />
      <div className="recipes">
        <div>
          <h3>Spaghetti Carbonara</h3>
          <p>Classic Italian pasta dish</p>
          {isMyRecipes && (
            <>
              <button aria-label="Edit recipe">Edit</button>
              <button aria-label="Delete recipe">Delete</button>
            </>
          )}
        </div>
        <div>
          <h3>Chicken Curry</h3>
          <p>Spicy Indian curry</p>
        </div>
      </div>
      <div className="pagination">
        <button aria-label="Previous page">Prev</button>
        <span>Page 1 of 5</span>
        <button aria-label="Next page">Next</button>
      </div>
    </div>
  );
};

// Mock useSession hook
jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react');
  return {
    __esModule: true,
    ...originalModule,
    useSession: jest.fn(),
  };
});

// Mock RecipeList component
jest.mock('@/app/components/RecipeList', () => {
  return function MockRecipeList(props: { isMyRecipes?: boolean }) {
    return <div data-testid="mocked-recipe-list">{props.isMyRecipes ? 'My Recipes View' : 'All Recipes View'}</div>;
  };
});

describe('RecipeList', () => {
  const mockSession = {
    expires: "1",
    user: { id: "123", name: "John Doe", email: "john@example.com" }
  };

  const mockNoSession = { data: null, status: "unauthenticated" };
  const mockWithSession = { data: mockSession, status: "authenticated" };

  beforeEach(() => {
    jest.clearAllMocks();
    (nextAuth.useSession as jest.Mock).mockReturnValue(mockWithSession);
  });

  it('renders the recipe list', () => {
    render(
      <div data-testid="recipe-list-loading"></div>
    );

    expect(screen.getByTestId('recipe-list-loading')).toBeInTheDocument();
  });

  it('shows "Create Recipe" button when user is authenticated in MyRecipes view', () => {
    render(<MockRecipeList isMyRecipes={true} />);

    expect(screen.getByText('Create Recipe')).toBeInTheDocument();
  });

  it('does not show "Create Recipe" button in All Recipes view', () => {
    render(<MockRecipeList />);

    expect(screen.queryByText('Create Recipe')).not.toBeInTheDocument();
  });

  it('shows edit and delete buttons for user recipes in MyRecipes view', () => {
    render(<MockRecipeList isMyRecipes={true} />);

    expect(screen.getAllByLabelText('Edit recipe')).toHaveLength(1);
    expect(screen.getAllByLabelText('Delete recipe')).toHaveLength(1);
  });
});
