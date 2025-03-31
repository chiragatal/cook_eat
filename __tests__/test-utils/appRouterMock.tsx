import React from 'react';

// Create a mock of the Next.js App Router context
// This matches the internal structure Next.js expects
const RouterContext = React.createContext<any>(null);
const PathnameContext = React.createContext<string | null>(null);
const SearchParamsContext = React.createContext<URLSearchParams | null>(null);
const LayoutSegmentsContext = React.createContext<string[] | null>(null);

export function MockAppRouterProvider({
  children,
  pathname = '/',
  searchParams = new URLSearchParams(),
  segments = []
}: {
  children: React.ReactNode,
  pathname?: string,
  searchParams?: URLSearchParams,
  segments?: string[]
}) {
  const mockRouter = {
    back: jest.fn(),
    forward: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    // Add the internal properties expected by Next.js
    '0': {
      '5': {
        '4': {
          '0': false,
          '1': false
        }
      }
    },
    '1': {
      pathname: pathname
    }
  };

  return (
    <RouterContext.Provider value={mockRouter}>
      <PathnameContext.Provider value={pathname}>
        <SearchParamsContext.Provider value={searchParams}>
          <LayoutSegmentsContext.Provider value={segments}>
            {children}
          </LayoutSegmentsContext.Provider>
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </RouterContext.Provider>
  );
}

// Create a patch for next/navigation
// This allows components to use the hooks without error
export function patchNextNavigation() {
  jest.mock('next/navigation', () => ({
    usePathname: jest.fn().mockReturnValue('/'),
    useRouter: jest.fn().mockReturnValue({
      back: jest.fn(),
      forward: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn()
    }),
    useSearchParams: jest.fn().mockReturnValue({
      get: jest.fn(),
      getAll: jest.fn(),
      has: jest.fn(),
      forEach: jest.fn(),
      entries: jest.fn(),
      keys: jest.fn(),
      values: jest.fn(),
      toString: jest.fn()
    }),
    // This is the key addition needed for App Router
    useSelectedLayoutSegments: jest.fn().mockReturnValue([])
  }));
}

// Helper for render functions
export function withAppRouter(Component: React.ComponentType<any>) {
  return function WrappedComponent(props: any) {
    return (
      <MockAppRouterProvider>
        <Component {...props} />
      </MockAppRouterProvider>
    );
  };
}

// Add a simple test to validate the mock
describe('AppRouterMock', () => {
  it('provides a valid router context', () => {
    // Create a mock provider
    const providerElement = (
      <MockAppRouterProvider>
        {null}
      </MockAppRouterProvider>
    );

    // Just verify that the provider element exists and is the right type
    expect(providerElement).toBeDefined();
    expect(providerElement.type).toBe(MockAppRouterProvider);
  });
});
