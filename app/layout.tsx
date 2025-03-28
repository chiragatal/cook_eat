'use client';

import { SessionProvider } from 'next-auth/react';
import { ViewProvider } from './contexts/ViewContext';
import './globals.css';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#4F46E5" />
        <title>Cook-Eat | Your Recipe Companion</title>
      </head>
      <body className="h-full bg-gray-50 dark:bg-gray-900 font-sans">
        <SessionProvider>
          <NotificationProvider>
            <ThemeProvider>
              <ViewProvider>
                {children}
              </ViewProvider>
            </ThemeProvider>
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
