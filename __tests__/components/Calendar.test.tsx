import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Mock lucide-react before importing Calendar
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon">Calendar Icon</div>,
  ChevronLeftIcon: () => <div data-testid="chevron-left-icon">Chevron Left Icon</div>,
  ChevronRightIcon: () => <div data-testid="chevron-right-icon">Chevron Right Icon</div>,
}));

import Calendar from '@/app/components/Calendar';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ViewProvider } from '@/app/contexts/ViewContext';

// Mock the ViewContext
jest.mock('@/app/contexts/ViewContext', () => ({
  useView: () => ({ isMyRecipesView: false }),
  ViewProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="view-provider">{children}</div>
}));

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      {
        id: '1',
        title: 'Pasta Carbonara',
        cookedOn: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Chicken Curry',
        cookedOn: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
      },
      {
        id: '3',
        title: 'Apple Pie',
        cookedOn: null,
      }
    ])
  })
) as jest.Mock;

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="link-mock">
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('Calendar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the calendar with current month', async () => {
    render(<Calendar />);

    // Check current month display
    const currentMonth = format(new Date(), 'MMMM yyyy');
    await waitFor(() => {
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });

    // Check weekdays are rendered
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();

    // Check fetch was called with correct params
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    await waitFor(() => {
      const calledUrl = new URL((global.fetch as jest.Mock).mock.calls[0][0], 'http://test');
      expect(calledUrl.searchParams.get('startDate')).toBe(startDate);
      expect(calledUrl.searchParams.get('endDate')).toBe(endDate);
    });
  });

  it('navigates to previous month when prev button is clicked', async () => {
    render(<Calendar />);

    // Get current month date
    const currentDate = new Date();
    const currentMonth = format(currentDate, 'MMMM yyyy');

    // Wait for current month to be displayed
    await waitFor(() => {
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });

    // Find and click previous month button
    const prevButton = screen.getByTestId('chevron-left-icon').closest('button');
    if (!prevButton) throw new Error('Previous button not found');

    fireEvent.click(prevButton);

    // Check if previous month is displayed
    const prevMonth = format(subMonths(currentDate, 1), 'MMMM yyyy');
    expect(screen.getByText(prevMonth)).toBeInTheDocument();

    // Check fetch was called with updated dates
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(subMonths(currentDate, 1));
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    await waitFor(() => {
      const calledUrl = new URL((global.fetch as jest.Mock).mock.calls[1][0], 'http://test');
      expect(calledUrl.searchParams.get('startDate')).toBe(startDate);
      expect(calledUrl.searchParams.get('endDate')).toBe(endDate);
    });
  });

  it('navigates to next month when next button is clicked', async () => {
    render(<Calendar />);

    // Get current month date
    const currentDate = new Date();
    const currentMonth = format(currentDate, 'MMMM yyyy');

    // Wait for current month to be displayed
    await waitFor(() => {
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });

    // Find and click next month button
    const nextButton = screen.getByTestId('chevron-right-icon').closest('button');
    if (!nextButton) throw new Error('Next button not found');

    fireEvent.click(nextButton);

    // Check if next month is displayed
    const nextMonth = format(addMonths(currentDate, 1), 'MMMM yyyy');
    expect(screen.getByText(nextMonth)).toBeInTheDocument();

    // Check fetch was called with updated dates
    const start = startOfMonth(addMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 1));
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    await waitFor(() => {
      const calledUrl = new URL((global.fetch as jest.Mock).mock.calls[1][0], 'http://test');
      expect(calledUrl.searchParams.get('startDate')).toBe(startDate);
      expect(calledUrl.searchParams.get('endDate')).toBe(endDate);
    });
  });

  it('calls onDateSelect when a date with recipes is clicked', async () => {
    const onDateSelect = jest.fn();
    render(<Calendar onDateSelect={onDateSelect} />);

    // Wait for recipes to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Find and click a date with recipes (today)
    const today = new Date().getDate().toString();

    // Wait for the calendar to render with days
    await waitFor(() => {
      // Find all elements containing today's date
      const elements = screen.getAllByText(today);
      // Find the one that's within a clickable div (not a placeholder)
      const todayElement = elements.find(element =>
        element.closest('.bg-indigo-100, .bg-gray-100, .cursor-pointer')
      );
      if (!todayElement) throw new Error('Today element not found');

      fireEvent.click(todayElement);

      // Check if onDateSelect was called with a Date object
      expect(onDateSelect).toHaveBeenCalledWith(expect.any(Date));
    });

    // Check if recipes for the date are displayed
    await waitFor(() => {
      expect(screen.getByText(/recipes cooked on/i)).toBeInTheDocument();
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching recipes', async () => {
    // Mock a delayed response
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }, 100);
      })
    );

    render(<Calendar />);

    // Check for loading state
    expect(screen.getByText('Loading recipes...')).toBeInTheDocument();

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading recipes...')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('handles fetch errors gracefully', async () => {
    // Mock a failed fetch
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Calendar />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching recipes for calendar:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('adds myRecipes parameter when in MyRecipes view', async () => {
    // Override the mock to return isMyRecipesView as true
    jest.spyOn(require('@/app/contexts/ViewContext'), 'useView').mockReturnValue({ isMyRecipesView: true });

    render(<Calendar />);

    await waitFor(() => {
      const calledUrl = new URL((global.fetch as jest.Mock).mock.calls[0][0], 'http://test');
      expect(calledUrl.searchParams.get('myRecipes')).toBe('true');
    });

    // Check if the header shows "Your Recipe Calendar"
    expect(screen.getByText('Your Recipe Calendar')).toBeInTheDocument();
  });
});
