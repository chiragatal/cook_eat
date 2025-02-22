'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';
import styles from './Calendar.module.css';
import Link from 'next/link';

interface Recipe {
  id: number;
  title: string;
  cookedOn: string | null;
}

interface CalendarProps {
  onDateSelect?: (date: Date) => void;
}

export default function Calendar({ onDateSelect }: CalendarProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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

  const handleDaySelect = (day: Date | undefined) => {
    setSelectedDate(day);
    if (day && onDateSelect) {
      onDateSelect(day);
    }
  };

  // Get recipes for the selected date
  const getRecipesForDate = (date: Date) => {
    return recipes.filter(recipe => {
      if (!recipe.cookedOn) return false;
      const cookedDate = new Date(recipe.cookedOn);
      return (
        cookedDate.getDate() === date.getDate() &&
        cookedDate.getMonth() === date.getMonth() &&
        cookedDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Create a modifier to highlight days with recipes
  const daysWithRecipes = recipes
    .filter(recipe => recipe.cookedOn)
    .map(recipe => new Date(recipe.cookedOn!));

  const footer = selectedDate ? (
    <div className="mt-4">
      <h3 className="font-medium text-gray-900">
        Recipes cooked on {format(selectedDate, 'MMMM d, yyyy')}:
      </h3>
      <ul className="mt-2 space-y-1">
        {getRecipesForDate(selectedDate).map(recipe => (
          <li key={recipe.id} className="text-sm">
            <Link
              href={`/recipe/${recipe.id}`}
              className="text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {recipe.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow w-full">
      <div className="flex items-center mb-4">
        <CalendarIcon className="mr-2 h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Recipe Calendar</h2>
      </div>
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={handleDaySelect}
        modifiers={{ hasRecipe: daysWithRecipes }}
        modifiersStyles={{
          hasRecipe: {
            backgroundColor: '#e0e7ff',
            color: '#4f46e5',
          }
        }}
        className={`${styles.calendar} w-full`}
        footer={footer}
      />
    </div>
  );
}
