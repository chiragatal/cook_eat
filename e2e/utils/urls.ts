/**
 * Central configuration for all URLs and API endpoints used in tests
 */

// Base URLs for different environments
export const PREVIEW_URL = 'https://cook-eat-preview.vercel.app';

// Get the base URL based on environment
export function getBaseUrl(): string {
  // For now, default to local URL if no environment variable is set
  return PREVIEW_URL;
}

// Database URLs
export function getDatabaseUrl(): string {
  return process.env.PREVIEW_DATABASE_URL || '';
}

// API endpoints relative to base URL
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    logout: '/api/auth/logout',
  },
  recipes: {
    list: '/api/recipes',
    create: '/api/recipes/create',
    details: (id: string) => `/api/recipes/${id}`,
    update: (id: string) => `/api/recipes/${id}`,
    delete: (id: string) => `/api/recipes/${id}`,
  },
  comments: {
    list: (recipeId: string) => `/api/recipes/${recipeId}/comments`,
    create: (recipeId: string) => `/api/recipes/${recipeId}/comments`,
    update: (recipeId: string, commentId: string) => `/api/recipes/${recipeId}/comments/${commentId}`,
    delete: (recipeId: string, commentId: string) => `/api/recipes/${recipeId}/comments/${commentId}`,
  },
  reactions: {
    toggle: (recipeId: string) => `/api/recipes/${recipeId}/reactions`,
  },
} as const;

// Page URLs relative to base URL
export const PAGE_URLS = {
  home: '/',
  login: '/login',
  signup: '/signup',
  calendar: {
    default: '/calendar',
    full: '/full-calendar',
  },
  recipes: {
    list: '/recipes',
    create: '/recipes/create',
    details: (id: string) => `/recipes/${id}`,
    edit: (id: string) => `/recipes/${id}/edit`,
  },
} as const;

// Helper to get full URL (base + path)
export function getFullUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}
