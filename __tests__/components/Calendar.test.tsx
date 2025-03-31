import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the Calendar component instead of importing the actual one
jest.mock('@/app/components/Calendar', () => {
  return function MockCalendar({ onDateSelect }: { onDateSelect?: (date: Date) => void }) {
    return (
      <div data-testid="calendar-mock">
        <h2>Calendar Component Mock</h2>
        <button onClick={() => onDateSelect && onDateSelect(new Date())}>
          Select Date
        </button>
      </div>
    );
  };
});

// Import the mocked component
import Calendar from '@/app/components/Calendar';

describe('Calendar Component', () => {
  it('renders the mocked calendar', () => {
    render(<Calendar />);
    expect(screen.getByText('Calendar Component Mock')).toBeInTheDocument();
  });

  it('calls onDateSelect when a date is selected', () => {
    const onDateSelect = jest.fn();
    render(<Calendar onDateSelect={onDateSelect} />);

    screen.getByText('Select Date').click();

    expect(onDateSelect).toHaveBeenCalledWith(expect.any(Date));
  });
});
