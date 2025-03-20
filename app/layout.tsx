'use client';

import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { ViewProvider } from './contexts/ViewContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#4F46E5" />
        <title>Cook-Eat | Your Recipe Companion</title>
      </head>
      <body className={`${inter.className} h-full bg-gray-50 dark:bg-gray-900`}>
        <SessionProvider>
          <ViewProvider>
            {children}
          </ViewProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
