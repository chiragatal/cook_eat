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
