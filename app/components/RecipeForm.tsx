'use client';

import { useState } from 'react';
import RichTextEditor from './RichTextEditor';
import { Recipe, Ingredient, Step } from '../types';

interface RecipeFormProps {
  recipe?: Recipe;
  onSave: (recipe: Partial<Recipe>) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const emptyRecipe: Recipe = {
  title: '',
  description: '',
  ingredients: '[]',
  steps: '[]',
  notes: null,
  images: '[]',
  tags: '[]',
  category: null,
  cookingTime: null,
  difficulty: null,
  isPublic: false,
  userId: 0 // This will be set by the server
};

const CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Snack',
  'Beverage',
  'Other'
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function RecipeForm({ recipe = emptyRecipe, onSave, onCancel, mode }: RecipeFormProps) {
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description);
  const [ingredients, setIngredients] = useState<Ingredient[]>(JSON.parse(recipe.ingredients));
  const [steps, setSteps] = useState<Step[]>(JSON.parse(recipe.steps || '[]'));
  const [notes, setNotes] = useState(recipe.notes || '');
  const [images, setImages] = useState<string[]>(JSON.parse(recipe.images));
  const [tags, setTags] = useState<string[]>(JSON.parse(recipe.tags || '[]'));
  const [category, setCategory] = useState<string | null>(recipe.category);
  const [cookingTime, setCookingTime] = useState<number | null>(recipe.cookingTime);
  const [difficulty, setDifficulty] = useState<string | null>(recipe.difficulty);
  const [isPublic, setIsPublic] = useState(recipe.isPublic);
  const [isRawMode, setIsRawMode] = useState(false);
  const [rawText, setRawText] = useState('');
  const [newIngredient, setNewIngredient] = useState<Ingredient>({
    name: '',
    amount: '',
    id: '',
  });
  const [newStep, setNewStep] = useState<Step>({
    instruction: '',
    id: '',
  });
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState(recipe.notes ? true : false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files);
    const formData = new FormData();

    files.forEach((file, index) => {
      formData.append('images', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const data = await response.json();
      setImages([...images, ...data.imagePaths]);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleImageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const updatedImages = [...images];
    const [draggedImage] = updatedImages.splice(dragIndex, 1);
    updatedImages.splice(dropIndex, 0, draggedImage);
    setImages(updatedImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // For create mode, ensure we don't send an ID
      const baseRecipe = mode === 'create' ? {} : recipe;

      const updatedRecipe = {
        ...baseRecipe,
        title,
        description,
        ingredients: JSON.stringify(ingredients),
        steps: JSON.stringify(steps),
        notes: notes || null,
        images: JSON.stringify(images),
        tags: JSON.stringify(tags),
        category,
        cookingTime,
        difficulty,
        isPublic,
      };

      console.log('Submitting recipe:', updatedRecipe);

      await onSave(updatedRecipe);
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert(error instanceof Error ? error.message : 'Failed to save recipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIngredientDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleIngredientDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleIngredientDrop = (e: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const updatedIngredients = [...ingredients];
    const [draggedIngredient] = updatedIngredients.splice(dragIndex, 1);
    updatedIngredients.splice(dropIndex, 0, draggedIngredient);
    setIngredients(updatedIngredients);
  };

  const addIngredient = () => {
    if (newIngredient.name.trim()) {
      setIngredients([...ingredients, {
        ...newIngredient,
        name: newIngredient.name.trim(),
        amount: newIngredient.amount.trim(),
        id: Date.now().toString(),
      }]);
      setNewIngredient({ name: '', amount: '', id: '' });
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const updatedSteps = [...steps];
    const [draggedStep] = updatedSteps.splice(dragIndex, 1);
    updatedSteps.splice(dropIndex, 0, draggedStep);
    setSteps(updatedSteps);
  };

  const addStep = () => {
    if (newStep.instruction.trim()) {
      setSteps([...steps, {
        instruction: newStep.instruction.trim(),
        id: Date.now().toString(),
      }]);
      setNewStep({ instruction: '', id: '' });
    }
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const processIngredientLine = (line: string, ingredients: Ingredient[]) => {
    // Common cooking measurements and descriptive terms
    const measurements = [
      // Standard measurements
      'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
      'gram', 'grams', 'g', 'kg', 'ml', 'oz', 'ounce', 'ounces', 'pound', 'pounds', 'lb',
      'piece', 'pieces', 'slice', 'slices', 'pinch', 'pinches',
      // Descriptive amounts
      'little', 'few', 'handful', 'dash', 'splash', 'sprinkle', 'some', 'bit',
      // Package measurements
      'can', 'cans', 'packet', 'packets', 'pack', 'package', 'jar', 'bottle',
      // Loose measurements
      'to taste', 'as needed', 'as required'
    ].join('|');

    // Common ingredient preparations
    const preparations = [
      'diced', 'chopped', 'minced', 'sliced', 'grated', 'crushed', 'ground',
      'peeled', 'seeded', 'cored', 'julienned', 'cubed', 'quartered',
      'roughly chopped', 'finely chopped', 'thinly sliced', 'coarsely ground'
    ].join('|');

    // Try different patterns for ingredient parsing
    const patterns = [
      // Pattern 1: Amount + measurement + ingredient (e.g., "2 cups flour")
      new RegExp(`^(\\d+(?:\\.\\d+)?\\s*(?:${measurements})?\\s*)(.+)$`, 'i'),

      // Pattern 2: Descriptive amount + ingredient (e.g., "a little salt")
      new RegExp(`^(?:a |an |some )?(${measurements})\\s+(?:of\\s+)?(.+)$`, 'i'),

      // Pattern 3: Ingredient + amount (e.g., "water 2 cups")
      new RegExp(`^(.+?)\\s+(\\d+(?:\\.\\d+)?\\s*(?:${measurements})?)$`, 'i'),

      // Pattern 4: Ingredient with preparation (e.g., "onion, finely chopped")
      new RegExp(`^(.+?)(?:,\\s*(${preparations}))?$`, 'i')
    ];

    let matched = false;
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        matched = true;
        let name, amount;

        if (pattern === patterns[3]) {
          // Handle preparation pattern
          name = match[1].trim();
          const prep = match[2];
          if (prep) {
            name = `${name} (${prep})`;
          }
          amount = '';
        } else {
          // Handle amount patterns
          amount = match[1].trim();
          name = match[2].trim();

          // Clean up amount text
          amount = amount.replace(/^(a |an |some )/, '');
          if (!amount.match(/\d/)) {
            // If amount doesn't contain numbers, it's probably a descriptive term
            amount = `a ${amount}`;
          }
        }

        ingredients.push({
          name,
          amount,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        });
        break;
      }
    }

    if (!matched) {
      // If no pattern matched, use the whole line as the name
      ingredients.push({
        name: line.trim(),
        amount: '',
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      });
    }
  };

  const convertRawText = () => {
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);

    // Try to detect title (usually first line or line containing "recipe" or "dish")
    const titlePattern = /recipe|dish/i;
    let titleFound = false;
    if (lines.length > 0) {
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        if (titlePattern.test(lines[i]) || i === 0) {
          if (!title) {
            setTitle(lines[i]);
            titleFound = true;
          }
          lines.splice(i, 1);
          break;
        }
      }
    }

    const remainingLines: string[] = [];
    const detectedIngredients: Ingredient[] = [];
    const detectedSteps: Step[] = [];

    // First pass: Categorize lines
    let isInIngredientsSection = false;
    let isInStepsSection = false;
    let servingsMatch: RegExpMatchArray | null = null;

    lines.forEach(line => {
      // Check for section headers and metadata
      const lowerLine = line.toLowerCase();

      // Try to detect servings/yield
      const servingsPattern = /(?:serves|servings|yield):\s*(\d+)|(?:for|serves)\s+(\d+)\s+(?:people|servings)/i;
      if (!servingsMatch) {
        servingsMatch = line.match(servingsPattern);
        if (servingsMatch) {
          // You might want to add a servings field to your Recipe type and form
          console.log('Servings detected:', servingsMatch[1] || servingsMatch[2]);
          return;
        }
      }

      // Try to detect cooking time if not already set
      if (!cookingTime) {
        const timePattern = /(?:prep|cooking|total) time:?\s*(\d+)\s*(min|minute|hour|hr)/i;
        const timeMatch = line.match(timePattern);
        if (timeMatch) {
          const time = parseInt(timeMatch[1]);
          const unit = timeMatch[2].toLowerCase();
          setCookingTime(unit.includes('hour') || unit.includes('hr') ? time * 60 : time);
          return;
        }
      }

      // Check for section headers
      if (lowerLine.includes('ingredient')) {
        isInIngredientsSection = true;
        isInStepsSection = false;
        return;
      } else if (lowerLine.match(/steps|instruction|method|direction|preparation/)) {
        isInIngredientsSection = false;
        isInStepsSection = true;
        return;
      }

      // Check if line starts with bullet point or number
      const bulletMatch = line.match(/^[-•*]\s*(.+)$/);
      const numberMatch = line.match(/^(\d+)[).]\s*(.+)$/);

      if (!bulletMatch && !numberMatch) {
        remainingLines.push(line);
        return;
      }

      const content = (bulletMatch ? bulletMatch[1] : numberMatch![2]).trim();

      // If we're in a specific section, respect that
      if (isInStepsSection) {
        detectedSteps.push({
          instruction: content,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        });
        return;
      }

      if (isInIngredientsSection) {
        processIngredientLine(content, detectedIngredients);
        return;
      }

      // If no section is specified, try to guess based on content
      const hasAmount = /\d+\s*(?:cup|tbsp|tsp|tablespoon|teaspoon|gram|g|kg|ml|oz|ounce|pound|lb|piece|slice|pinch|to taste)/i.test(content);
      const looksLikeStep = /^(?:heat|mix|stir|add|place|cook|bake|pour|combine|prepare|cut|chop|serve|let|wait|remove)/i.test(content);

      if (hasAmount || (!looksLikeStep && !isInStepsSection)) {
        processIngredientLine(content, detectedIngredients);
      } else {
        detectedSteps.push({
          instruction: content,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        });
      }
    });

    if (detectedIngredients.length > 0) {
      setIngredients(detectedIngredients);
    }

    if (detectedSteps.length > 0) {
      setSteps(detectedSteps);
    }

    // Use remaining lines as description
    if (remainingLines.length > 0 && !description) {
      setDescription(remainingLines.join('\n\n'));
    }

    // Try to detect cooking time (look for time-related words)
    const timePattern = /(\d+)\s*(min|minute|hour|hr)/i;
    for (const line of remainingLines) {
      const match = line.match(timePattern);
      if (match) {
        const time = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit.includes('hour') || unit.includes('hr')) {
          setCookingTime(time * 60);
        } else {
          setCookingTime(time);
        }
        break;
      }
    }

    // Try to detect difficulty (look for difficulty-related words)
    const difficultyPattern = /(easy|medium|hard|simple|intermediate|advanced|beginner)/i;
    for (const line of remainingLines) {
      const match = line.match(difficultyPattern);
      if (match) {
        let difficulty = match[1].toLowerCase();
        // Map similar terms to our difficulty levels
        switch (difficulty) {
          case 'simple':
          case 'beginner':
            difficulty = 'easy';
            break;
          case 'intermediate':
            difficulty = 'medium';
            break;
          case 'advanced':
            difficulty = 'hard';
            break;
        }
        setDifficulty(difficulty.charAt(0).toUpperCase() + difficulty.slice(1));
        break;
      }
    }

    // Try to detect category
    const categoryPattern = new RegExp(`(${CATEGORIES.join('|')})`, 'i');
    for (const line of remainingLines) {
      const match = line.match(categoryPattern);
      if (match) {
        setCategory(match[1].charAt(0).toUpperCase() + match[1].slice(1));
        break;
      }
    }

    // Try to detect tags (look for hashtags or keywords)
    const tagPattern = /#(\w+)/g;
    const commonTags = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'quick', 'easy', 'healthy'];
    const detectedTags: string[] = [];

    remainingLines.forEach(line => {
      // Check for hashtags
      const matches = line.match(tagPattern);
      if (matches) {
        detectedTags.push(...matches.map(tag => tag.slice(1)));
      }

      // Check for common dietary and cooking terms
      commonTags.forEach(tag => {
        if (line.toLowerCase().includes(tag)) {
          detectedTags.push(tag);
        }
      });
    });

    if (detectedTags.length > 0) {
      setTags([...new Set(detectedTags)]); // Remove duplicates
    }

    setIsRawMode(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{mode === 'create' ? 'Create New Recipe' : 'Edit Recipe'}</h2>
          <button
            type="button"
            onClick={() => setIsRawMode(!isRawMode)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              isRawMode
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {isRawMode ? 'Switch to Form' : 'Switch to Raw Mode'}
          </button>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </div>

      {isRawMode ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="rawText" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paste Your Recipe Text
            </label>
            <div className="mt-1">
              <textarea
                id="rawText"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 min-h-[400px] font-mono"
                placeholder="Paste your recipe text here. The converter will try to intelligently parse:
- Title (first line)
- Ingredients (lines with measurements)
- Steps (numbered or bulleted lines)
- Description (remaining text)
- Cooking time (if mentioned)
- Difficulty (if mentioned)
- Tags (if using hashtags)"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={convertRawText}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Convert to Form
            </button>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center mt-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="sr-only peer"
                    disabled={isSubmitting}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Make Public</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <select
                  id="category"
                  value={category || ''}
                  onChange={(e) => setCategory(e.target.value || null)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isSubmitting}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cookingTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cooking Time (minutes)
                </label>
                <input
                  type="number"
                  id="cookingTime"
                  value={cookingTime || ''}
                  onChange={(e) => setCookingTime(e.target.value ? parseInt(e.target.value) : null)}
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  value={difficulty || ''}
                  onChange={(e) => setDifficulty(e.target.value || null)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isSubmitting}
                >
                  <option value="">Select difficulty</option>
                  {DIFFICULTIES.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <div className="mt-1">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe your recipe, including any history or special tips..."
                  className="min-h-[200px]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notes</h3>
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
              >
                {showNotes ? 'Hide Notes' : 'Show Notes'}
              </button>
            </div>

            {showNotes && (
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  placeholder="Add any notes about the recipe, such as variations, substitutions, or serving suggestions..."
                  className="min-h-[200px]"
                />
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recipe Images
                </label>
                <div className="mt-1 flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      dark:file:bg-indigo-900 dark:file:text-indigo-200
                      hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800"
                    disabled={isSubmitting}
                  />
                </div>

                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group"
                        draggable
                        onDragStart={(e) => handleImageDragStart(e, index)}
                        onDragOver={handleImageDragOver}
                        onDrop={(e) => handleImageDrop(e, index)}
                      >
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 cursor-move">
                          <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt={`Recipe image ${index + 1}`}
                          className="w-full h-32 object-contain rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105 bg-gray-100 dark:bg-gray-800"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/200?text=Failed+to+Load';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300 rounded-full p-1.5
                                   hover:bg-red-200 dark:hover:bg-red-800 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ingredients
              </label>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Ingredient name"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  className="col-span-5 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isSubmitting}
                  id="ingredient-name-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('ingredient-amount-input')?.focus();
                    }
                  }}
                />
                <input
                  type="text"
                  placeholder="Amount (e.g., 2 cups, 1 packet)"
                  value={newIngredient.amount}
                  onChange={(e) => setNewIngredient({ ...newIngredient, amount: e.target.value })}
                  className="col-span-5 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isSubmitting}
                  id="ingredient-amount-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIngredient();
                      // Focus back to the name input after adding
                      setTimeout(() => {
                        document.getElementById('ingredient-name-input')?.focus();
                      }, 0);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    addIngredient();
                    // Focus back to the name input after adding
                    setTimeout(() => {
                      document.getElementById('ingredient-name-input')?.focus();
                    }, 0);
                  }}
                  className="col-span-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                  disabled={isSubmitting || !newIngredient.name.trim()}
                >
                  Add
                </button>
              </div>

              {ingredients.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {ingredients.map((ingredient, index) => (
                    <li
                      key={index}
                      draggable
                      onDragStart={(e) => handleIngredientDragStart(e, index)}
                      onDragOver={handleIngredientDragOver}
                      onDrop={(e) => handleIngredientDrop(e, index)}
                      className="flex items-center gap-2 py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded cursor-move group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div className="flex-grow grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={ingredient.name}
                          onChange={(e) => {
                            const updatedIngredients = [...ingredients];
                            updatedIngredients[index] = { ...ingredient, name: e.target.value };
                            setIngredients(updatedIngredients);
                          }}
                          placeholder="Ingredient name"
                          className="bg-transparent border-none dark:text-white focus:ring-0 p-0 w-full text-gray-900 dark:text-white"
                          disabled={isSubmitting}
                        />
                        <input
                          type="text"
                          value={ingredient.amount}
                          onChange={(e) => {
                            const updatedIngredients = [...ingredients];
                            updatedIngredients[index] = { ...ingredient, amount: e.target.value };
                            setIngredients(updatedIngredients);
                          }}
                          placeholder="Amount"
                          className="bg-transparent border-none dark:text-gray-400 focus:ring-0 p-0 w-full text-gray-600"
                          disabled={isSubmitting}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Steps
              </label>
              <div className="space-y-4">
                <div className="mb-2 space-y-2">
                  <ul className="space-y-2">
                    {steps.map((step, index) => (
                      <li
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700 p-2 rounded-lg cursor-move group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={step.instruction}
                          onChange={(e) => {
                            const updatedSteps = [...steps];
                            updatedSteps[index] = { ...step, instruction: e.target.value };
                            setSteps(updatedSteps);
                          }}
                          placeholder="Step instruction"
                          className="flex-1 bg-transparent border-none dark:text-white focus:ring-0 p-0"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStep.instruction}
                    onChange={(e) => setNewStep({ ...newStep, instruction: e.target.value })}
                    placeholder="Add a quick step"
                    className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    disabled={isSubmitting}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addStep();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addStep}
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    disabled={isSubmitting || !newStep.instruction.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="mt-1 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                  disabled={isSubmitting || !newTag.trim()}
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 focus:outline-none"
                        disabled={isSubmitting}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Recipe' : 'Save Changes'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
