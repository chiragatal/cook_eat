import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Calendar from '@/app/components/Calendar';
import { ViewProvider } from '@/app/contexts/ViewContext';
import { format, addMonths, subMonths } from 'date-fns';

// Mock next/navigation for the ViewProvider
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock fetch API
global.fetch = jest.fn();

describe('Calendar Component', () => {
  const mockOnDateSelect = jest.fn();
  const today = new Date();
  const todayFormatted = today.getDate().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for recipes
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it('renders the current month and days correctly', async () => {
    render(
      <ViewProvider>
        <Calendar onDateSelect={mockOnDateSelect} />
      </ViewProvider>
    );

    // Check that the current month and year are displayed
    expect(screen.getByText(format(today, 'MMMM yyyy'))).toBeInTheDocument();

    // Check that today's date is highlighted
    const todayElement = screen.getByText(todayFormatted);
    expect(todayElement).toBeInTheDocument();

    // Today should have special styling (check parent has the class)
    const todayCell = todayElement.closest('div');
    expect(todayCell).toHaveClass('bg-indigo-100');

    // Check that weekdays are displayed
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('can navigate to previous month', async () => {
    render(
      <ViewProvider>
        <Calendar onDateSelect={mockOnDateSelect} />
      </ViewProvider>
    );

    // Find and click the previous month button
    const prevButton = screen.getByRole('button', { name: /previous month/i }) ||
                       screen.getByRole('button', { name: '' }).querySelector('svg[class*="ChevronLeftIcon"]')?.parentElement;

    fireEvent.click(prevButton as HTMLElement);

    // Check that the previous month is displayed
    const previousMonth = format(subMonths(today, 1), 'MMMM yyyy');
    expect(screen.getByText(previousMonth)).toBeInTheDocument();
  });

  it('can navigate to next month', async () => {
    render(
      <ViewProvider>
        <Calendar onDateSelect={mockOnDateSelect} />
      </ViewProvider>
    );

    // Find and click the next month button
    const nextButton = screen.getByRole('button', { name: /next month/i }) ||
                       screen.getByRole('button', { name: '' }).querySelector('svg[class*="ChevronRightIcon"]')?.parentElement;

    fireEvent.click(nextButton as HTMLElement);

    // Check that the next month is displayed
    const nextMonth = format(addMonths(today, 1), 'MMMM yyyy');
    expect(screen.getByText(nextMonth)).toBeInTheDocument();
  });

  it('displays recipes for a date when available', async () => {
    // Mock recipes with a cookedOn date for today
    const mockRecipes = [
      { id: 1, title: 'Spaghetti Carbonara', cookedOn: format(today, 'yyyy-MM-dd') },
      { id: 2, title: 'Chicken Parmesan', cookedOn: format(today, 'yyyy-MM-dd') }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRecipes,
    });

    render(
      <ViewProvider>
        <Calendar onDateSelect={mockOnDateSelect} />
      </ViewProvider>
    );

    // Wait for the recipes to be fetched
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Click on today's date to select it
    const todayElement = screen.getByText(todayFormatted);
    fireEvent.click(todayElement);

    // Check that the recipes are displayed
    await waitFor(() => {
      expect(screen.getByText('Spaghetti Carbonara')).toBeInTheDocument();
      expect(screen.getByText('Chicken Parmesan')).toBeInTheDocument();
    });

    // Check that onDateSelect was called with today's date
    expect(mockOnDateSelect).toHaveBeenCalledWith(expect.any(Date));
  });

  it('shows "No recipes found" when a date with no recipes is selected', async () => {
    // Mock empty recipes response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <ViewProvider>
        <Calendar onDateSelect={mockOnDateSelect} />
      </ViewProvider>
    );

    // Wait for the recipes to be fetched
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Click on today's date to select it
    const todayElement = screen.getByText(todayFormatted);
    fireEvent.click(todayElement);

    // Check that the "No recipes" message is displayed
    await waitFor(() => {
      expect(screen.getByText('No recipes found for this date.')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching recipes', async () => {
    // Create a delayed promise to simulate loading
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as jest.Mock).mockImplementation(() => delayedPromise);

    render(
      <ViewProvider>
        <Calendar onDateSelect={mockOnDateSelect} />
      </ViewProvider>
    );

    // Check that loading state is shown
    expect(screen.getByText('Loading recipes...')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => [],
    });

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading recipes...')).not.toBeInTheDocument();
    });
  });
});
