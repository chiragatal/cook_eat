'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { useView } from '../contexts/ViewContext';
import 'react-day-picker/dist/style.css';
import styles from './Calendar.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Recipe {
  id: number;
  title: string;
  cookedOn: string;
}

export default function Calendar({ onDateSelect }: { onDateSelect?: (date: Date | null) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Fetch recipes with cookedOn dates
  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const startDate = format(start, 'yyyy-MM-dd');
        const endDate = format(end, 'yyyy-MM-dd');

        // Query parameters to filter by date range and user if in MyRecipes view
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);

        if (isMyRecipesView) {
          params.append('myRecipes', 'true');
        }

        const response = await fetch(`/api/posts?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }

        const data = await response.json();
        setRecipes(data);
      } catch (error) {
        console.error('Error fetching recipes for calendar:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [currentDate, isMyRecipesView]);

  // Check if a date has recipes
  const hasRecipes = (date: Date) => {
    if (!date || !recipes.length) return false;

    return recipes.some(recipe => {
      if (!recipe.cookedOn) return false;
      const cookedDate = parseISO(recipe.cookedOn);
      return isSameDay(cookedDate, date);
    });
  };

  // Get recipes for a specific date
  const getRecipesForDate = (date: Date) => {
    if (!date || !recipes.length) return [];

    return recipes.filter(recipe => {
      if (!recipe.cookedOn) return false;
      const cookedDate = parseISO(recipe.cookedOn);
      return isSameDay(cookedDate, date);
    });
  };

  // Handle selecting a date
  const handleDateSelect = (date: Date) => {
    if (hasRecipes(date)) {
      setSelectedDate(date);
      if (onDateSelect) {
        onDateSelect(date);
      }
    }
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
            onClick={() => day && handleDateSelect(day)}
          >
            {day?.getDate()}
          </div>
        ))}
      </div>

      {loading && (
        <div className="mt-4 p-2 text-center text-gray-500 dark:text-gray-400">
          Loading recipes...
        </div>
      )}

      {selectedDate && !loading && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {isMyRecipesView ? 'Your recipes' : 'All recipes'} cooked on {format(selectedDate, 'MMMM d, yyyy')}:
          </h4>
          <div className="space-y-2">
            {getRecipesForDate(selectedDate).length > 0 ? (
              getRecipesForDate(selectedDate).map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipe/${recipe.id}`}
                  className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {recipe.title}
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recipes found for this date.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
