import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FullCalendar from '@/app/components/FullCalendar';
import dayjs from 'dayjs';
import { SessionProvider } from 'next-auth/react';

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      {
        id: '1',
        title: 'Pasta Carbonara',
        cookedOn: dayjs().format(),
        category: 'Italian'
      },
      {
        id: '2',
        title: 'Chicken Curry',
        cookedOn: dayjs().add(1, 'day').format(),
        category: 'Indian'
      },
      {
        id: '3',
        title: 'Apple Pie',
        cookedOn: null,
        category: 'Dessert'
      }
    ])
  })
) as jest.Mock;

// Mock MantineProvider and Month from @mantine/dates
jest.mock('@mantine/core', () => ({
  MantineProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="mantine-provider">{children}</div>
}));

jest.mock('@mantine/dates', () => {
  const MockMonth = ({ month, renderDay }: { month: Date; renderDay: (date: Date) => React.ReactNode }) => {
    const today = new Date(month);
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const days: Date[] = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(today.getFullYear(), today.getMonth(), i));
    }

    return (
      <div data-testid="mantine-month">
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
            {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
              <tr key={weekIndex}>
                {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => (
                  <td key={dayIndex} data-testid={`day-${day.getDate()}`}>
                    {renderDay(day)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  MockMonth.displayName = 'MockMonth';

  return {
    Month: MockMonth
  };
});

// Create mock link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href} data-testid="mock-link">{children}</a>;
  };

  MockLink.displayName = 'MockLink';

  return MockLink;
});

describe('FullCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <SessionProvider>
        <FullCalendar />
      </SessionProvider>
    );

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('fetches and displays recipes on mount', async () => {
    render(
      <SessionProvider>
        <FullCalendar />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/posts');
    });

    await waitFor(() => {
      expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument();
      expect(screen.getByTestId('mantine-provider')).toBeInTheDocument();
      expect(screen.getByTestId('mantine-month')).toBeInTheDocument();
    });

    expect(screen.getByText(dayjs().format('MMMM YYYY'))).toBeInTheDocument();
    expect(screen.getByText(/recipes this month/)).toBeInTheDocument();
  });

  it('displays recipes for today', async () => {
    render(
      <SessionProvider>
        <FullCalendar />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      expect(screen.getByText('Italian')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SessionProvider>
        <FullCalendar />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching recipes:', expect.any(Error));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('filters out recipes without cookedOn dates', async () => {
    render(
      <SessionProvider>
        <FullCalendar />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      expect(screen.queryByText('Apple Pie')).not.toBeInTheDocument();
    });
  });
});
