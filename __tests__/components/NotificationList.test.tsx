import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationList from '@/app/components/NotificationList';
import { useNotifications } from '@/app/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

// Mock the NotificationContext hook
jest.mock('@/app/contexts/NotificationContext', () => ({
  useNotifications: jest.fn(),
}));

// Mock the formatDistanceToNow function from date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, onClick }: { children: React.ReactNode, href: string, onClick?: () => void }) => {
    return (
      <a href={href} onClick={onClick}>
        {children}
      </a>
    );
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('NotificationList Component', () => {
  // Default mock notifications
  const mockNotifications = [
    {
      id: '1',
      type: 'REACTION',
      read: false,
      createdAt: new Date('2023-01-01T12:00:00Z').toISOString(),
      actor: { name: 'John Doe' },
      targetId: 'recipe-1',
      data: { reactionType: '❤️', postTitle: 'Spaghetti Carbonara' }
    },
    {
      id: '2',
      type: 'COMMENT',
      read: true,
      createdAt: new Date('2023-01-02T12:00:00Z').toISOString(),
      actor: { name: 'Jane Smith' },
      targetId: 'recipe-2',
      data: { postTitle: 'Chicken Tikka Masala' }
    },
    {
      id: '3',
      type: 'COMMENT_MENTION',
      read: false,
      createdAt: new Date('2023-01-03T12:00:00Z').toISOString(),
      actor: { name: 'Bob Johnson' },
      targetId: 'recipe-3',
      data: { commentContent: 'Hey @user, check out this modification to the recipe!' }
    }
  ];

  // Mock context values
  const mockContextValue = {
    notifications: mockNotifications,
    unreadCount: 2,
    preferences: [],
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    updatePreference: jest.fn(),
    fetchNotifications: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNotifications as jest.Mock).mockReturnValue(mockContextValue);
    (formatDistanceToNow as jest.Mock).mockReturnValue('2 days ago');
  });

  it('renders notification button with correct unread count', () => {
    render(<NotificationList />);

    // Verify the notification bell icon is rendered
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();

    // Verify unread count badge
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays notification dropdown when button is clicked', () => {
    render(<NotificationList />);

    // Click notification button
    fireEvent.click(screen.getByLabelText('Notifications'));

    // Verify dropdown appears
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Mark all as read')).toBeInTheDocument();
  });

  it('displays correct notification content for different notification types', () => {
    render(<NotificationList />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText('Notifications'));

    // Check for reaction notification
    expect(screen.getByText('John Doe reacted with ❤️ to your post "Spaghetti Carbonara"')).toBeInTheDocument();

    // Check for comment notification
    expect(screen.getByText('Jane Smith commented on your post "Chicken Tikka Masala"')).toBeInTheDocument();

    // Check for mention notification - Note the text is truncated in the UI
    expect(screen.getByText(/Bob Johnson mentioned you in a comment: "Hey @user, check out this modification to the reci.../)).toBeInTheDocument();
  });

  it('calls markAsRead when notification is clicked', async () => {
    render(<NotificationList />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText('Notifications'));

    // Click on the first notification (unread)
    const firstNotification = screen.getByText('John Doe reacted with ❤️ to your post "Spaghetti Carbonara"');
    fireEvent.click(firstNotification);

    // Verify markAsRead was called with correct ID
    await waitFor(() => {
      expect(mockContextValue.markAsRead).toHaveBeenCalledWith('1');
    });
  });

  it('calls markAllAsRead when "Mark all as read" is clicked', () => {
    render(<NotificationList />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText('Notifications'));

    // Click "Mark all as read"
    fireEvent.click(screen.getByText('Mark all as read'));

    // Verify markAllAsRead was called
    expect(mockContextValue.markAllAsRead).toHaveBeenCalled();
  });

  it('renders empty state when there are no notifications', () => {
    (useNotifications as jest.Mock).mockReturnValue({
      ...mockContextValue,
      notifications: [],
      unreadCount: 0
    });

    render(<NotificationList />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText('Notifications'));

    // Verify empty state is shown
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('displays notification settings when settings button is clicked', () => {
    render(<NotificationList />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText('Notifications'));

    // Click settings button
    fireEvent.click(screen.getByLabelText('Notification settings'));

    // Verify settings modal appears
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('closes settings modal when close button is clicked', () => {
    render(<NotificationList />);

    // Open dropdown
    fireEvent.click(screen.getByLabelText('Notifications'));

    // Open settings modal
    fireEvent.click(screen.getByLabelText('Notification settings'));

    // Close settings modal - cast the nextSibling to Element to satisfy TS
    const closeButton = screen.getByText('Notification Preferences').nextSibling as HTMLElement;
    fireEvent.click(closeButton);

    // Verify settings modal disappears
    expect(screen.queryByText('Notification Preferences')).not.toBeInTheDocument();
  });
});
