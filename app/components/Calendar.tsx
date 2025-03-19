'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { useView } from '../contexts/ViewContext';
import 'react-day-picker/dist/style.css';
import styles from './Calendar.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { isMyRecipesView } = useView();

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });

  // Add padding days at the start
  const startPadding = Array(start.getDay()).fill(null);
  // Add padding days at the end
  const endPadding = Array((6 - end.getDay())).fill(null);
  const allDays = [...startPadding, ...days, ...endPadding];

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  // Mock function - replace with actual data
  const hasRecipes = (date: Date) => {
    return Math.random() > 0.7; // Just for demonstration
  };

  // Mock function - replace with actual data
  const getRecipesForDate = (date: Date) => {
    return [
      { id: '1', title: 'Sample Recipe 1' },
      { id: '2', title: 'Sample Recipe 2' },
    ];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          {isMyRecipesView ? 'Your Recipe Calendar' : 'All Recipe Calendar'}
        </h2>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day, idx) => (
          <div
            key={idx}
            className={`p-2 text-center ${
              !day
                ? 'text-gray-400 dark:text-gray-600'
                : isToday(day)
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg'
                : hasRecipes(day)
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => day && hasRecipes(day) && setSelectedDate(day)}
          >
            {day?.getDate()}
          </div>
        ))}
      </div>

      {selectedDate && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {isMyRecipesView ? 'Your recipes' : 'All recipes'} cooked on {format(selectedDate, 'MMMM d, yyyy')}:
          </h4>
          <div className="space-y-2">
            {getRecipesForDate(selectedDate).map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipe/${recipe.id}`}
                className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {recipe.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
