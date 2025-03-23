import React from 'react';

// Mock Next.js App Router context
const AppRouterContext = React.createContext<any>(null);

// Provider component to wrap tested components
export function MockAppRouterProvider({ children }: { children: React.ReactNode }) {
  const mockRouter = {
    back: jest.fn(),
    forward: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  return (
    <AppRouterContext.Provider value={mockRouter}>
      {children}
    </AppRouterContext.Provider>
  );
}

// Mock wrapper function for testing
export function withAppRouter(Component: React.ComponentType<any>) {
  return function WrappedComponent(props: any) {
    return (
      <MockAppRouterProvider>
        <Component {...props} />
      </MockAppRouterProvider>
    );
  };
}
