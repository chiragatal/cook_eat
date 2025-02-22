'use client';

import FullCalendar from '../components/FullCalendar';
import Link from 'next/link';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Recipe Calendar</h1>
          <div className="flex gap-4">
            <Link
              href="/"
              className="text-indigo-600 hover:text-indigo-800"
            >
              ← Back to recipes
            </Link>
          </div>
        </div>
        <FullCalendar />
      </div>
    </div>
  );
}
