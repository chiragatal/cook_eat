'use client';

import { useState, useEffect } from 'react';
import { Month } from '@mantine/dates';
import { MantineProvider } from '@mantine/core';
import dayjs from 'dayjs';
import Link from 'next/link';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

interface Recipe {
  id: number;
  title: string;
  cookedOn: string | null;
  category: string | null;
}

export default function FullCalendar() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecipesForDate = (date: Date) => {
    return recipes.filter(recipe => {
      if (!recipe.cookedOn) return false;
      const cookedDate = dayjs(recipe.cookedOn);
      return cookedDate.isSame(date, 'day');
    });
  };

  const renderDay = (date: Date) => {
    const dayRecipes = getRecipesForDate(date);
    const isSelected = selectedDate && dayjs(date).isSame(selectedDate, 'day');
    const isToday = dayjs(date).isSame(new Date(), 'day');

    return (
      <div
        className={`h-full min-h-[120px] relative transition-colors ${
          isSelected ? 'bg-indigo-50' : ''
        }`}
      >
        <div className={`
          sticky top-0 left-0 right-0
          px-2 py-1
          font-medium text-sm
          ${isToday ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700'}
          ${isSelected ? 'text-indigo-600' : ''}
          border-b border-gray-200
        `}>
          {date.getDate()}
        </div>
        <div className="p-1">
          <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {dayRecipes.map(recipe => (
              <Link
                key={recipe.id}
                href={`/recipe/${recipe.id}`}
                className={`
                  block text-xs p-1.5 rounded
                  transition-colors
                  hover:bg-gray-100
                  ${isSelected ? 'bg-indigo-100/50 hover:bg-indigo-100' : 'bg-gray-50'}
                `}
              >
                <div className="font-medium truncate">
                  {recipe.title}
                </div>
                {recipe.category && (
                  <div className="text-[10px] text-gray-500 truncate mt-0.5">
                    {recipe.category}
                  </div>
                )}
              </Link>
            ))}
          </div>
          {dayRecipes.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none bg-gradient-to-t from-white to-transparent" />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <MantineProvider>
      <div className="bg-white rounded-lg shadow-lg p-6 min-h-[800px]">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {dayjs(selectedDate).format('MMMM YYYY')}
          </h2>
          <p className="text-gray-500 mt-1">
            {recipes.filter(r => r.cookedOn && dayjs(r.cookedOn).isSame(selectedDate, 'month')).length} recipes this month
          </p>
        </div>
        <Month
          month={selectedDate || new Date()}
          size="xl"
          className={`
            [&_table]:w-full
            [&_thead_th]:py-2 [&_thead_th]:px-1 [&_thead_th]:font-semibold [&_thead_th]:text-gray-700
            [&_td]:!h-[150px] [&_td]:!p-0 [&_td]:!m-0 [&_td]:w-[14.28%]
            [&_td]:border [&_td]:border-gray-200
            [&_td:first-child]:border-l-0
            [&_td:last-child]:border-r-0
            [&_tr:last-child_td]:border-b-0
            mx-auto max-w-none w-full
          `}
          renderDay={renderDay}
        />
      </div>
    </MantineProvider>
  );
}
