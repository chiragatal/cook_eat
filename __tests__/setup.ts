import '@testing-library/jest-dom';
import { patchNextNavigation } from './test-utils/appRouterMock';

// Apply Next.js navigation mocks globally
patchNextNavigation();

// Mock ResizeObserver globally
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver globally
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [0],
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Extend the Element.prototype with missing properties for testing
Object.defineProperty(Element.prototype, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// This is required to fix "Error: Not implemented: navigation" errors
// in JSDOM environment
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    ...window.location,
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    href: 'https://cook-eat-preview.vercel.app/',
  },
});

// Setting up fake localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Add a basic test to ensure setup works
describe('Jest setup', () => {
  it('configures the testing environment correctly', () => {
    expect(true).toBe(true);
  });
});
