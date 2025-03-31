import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FullCalendar from '../../app/components/FullCalendar';

// Mock the fetch API
global.fetch = jest.fn();

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="mock-link">
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock date to ensure consistent testing
const mockDate = new Date('2025-03-15');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

// Mock the MantineProvider
jest.mock('@mantine/core', () => ({
  MantineProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mantine-provider">{children}</div>
  ),
}));

// Mock recipes data
const mockRecipes = [
  {
    id: '1',
    title: 'Pasta Carbonara',
    cookedOn: '2025-03-15',
    category: 'Italian',
  },
  {
    id: '2',
    title: 'Chicken Curry',
    cookedOn: '2025-03-20',
    category: 'Indian',
  },
  {
    id: '3',
    title: 'Apple Pie',
    cookedOn: '2025-02-10', // Previous month
    category: 'Dessert',
  },
  {
    id: '4',
    title: 'No Category Recipe',
    cookedOn: '2025-03-25',
    category: null,
  },
  {
    id: '5',
    title: 'Recipe without date',
    cookedOn: null,
    category: 'Misc',
  },
];

// Mock the Month component from @mantine/dates
jest.mock('@mantine/dates', () => ({
  Month: ({ month, renderDay }: any) => {
    return (
      <div data-testid="mantine-month">
        <div className="month-controls">
          <button data-testid="prev-month-btn">Previous Month</button>
          <button data-testid="next-month-btn">Next Month</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sun</th>
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Sat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-testid="day-15">
                {renderDay && renderDay(new Date('2025-03-15'))}
              </td>
              <td data-testid="day-20">
                {renderDay && renderDay(new Date('2025-03-20'))}
              </td>
              <td data-testid="day-25">
                {renderDay && renderDay(new Date('2025-03-25'))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  },
}));

describe('FullCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRecipes,
    });
  });

  it('displays loading state initially', async () => {
    render(<FullCalendar />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('fetches and displays recipes', async () => {
    let rendered;

    await act(async () => {
      rendered = render(<FullCalendar />);
      // Wait for loading to finish and component to update
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    // Check if the month title is displayed
    expect(screen.getByText('March 2025')).toBeInTheDocument();

    // Check if recipe count is displayed (using regex to match any number)
    expect(screen.getByText(/recipes this month/i)).toBeInTheDocument();
  });

  it('handles fetch errors gracefully', async () => {
    // Mock fetch to reject
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(<FullCalendar />);
      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    // Check if console.error was called with the error
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching recipes:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('provides links to recipe detail pages for each recipe', async () => {
    await act(async () => {
      render(<FullCalendar />);
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    // Find all links to recipes
    const recipeLinks = screen.getAllByTestId('mock-link');
    expect(recipeLinks.length).toBeGreaterThan(0);
  });
});
