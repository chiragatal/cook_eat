'use client';

import { useState, useRef, useEffect } from 'react';
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
  userId: 0, // This will be set by the server
  cookedOn: null,
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

// Modify the compression utility function to fix the "image source is detached" error
const compressImageBeforeUpload = async (file: File, maxSizeMB = 4): Promise<File> => {
  // If file is already smaller than maxSizeMB, return it as is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  try {
    // Create an image element instead of ImageBitmap
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    // Create a promise to wait for the image to load
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = objectUrl;
    });

    // Wait for the image to load
    const loadedImg = await loadPromise;

    // Create a canvas for compression
    const canvas = document.createElement('canvas');

    // Determine scaling factor based on file size
    let scale = 1;
    if (file.size > 10 * 1024 * 1024) {
      scale = 0.5; // 50% for very large files
    } else if (file.size > 5 * 1024 * 1024) {
      scale = 0.7; // 70% for large files
    }

    // Set canvas dimensions
    canvas.width = loadedImg.naturalWidth * scale;
    canvas.height = loadedImg.naturalHeight * scale;

    // Draw and compress the image
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return file; // Fallback if canvas context is not available
    }

    ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl); // Clean up the object URL

    // Determine quality based on file size
    let quality = 0.7; // default
    if (file.size > 10 * 1024 * 1024) {
      quality = 0.5;
    } else if (file.size > 5 * 1024 * 1024) {
      quality = 0.6;
    }

    // Get the compressed image as blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Canvas to Blob conversion failed');
            resolve(file); // Fallback to original file
            return;
          }

          const newFile = new File([blob], file.name, {
            type: 'image/jpeg', // Convert to JPEG for better compression
            lastModified: Date.now(),
          });

          // If still too large, compress again with more aggressive settings
          if (newFile.size > maxSizeMB * 1024 * 1024) {
            compressImageBeforeUpload(newFile, maxSizeMB)
              .then(resolve)
              .catch(() => resolve(newFile));
          } else {
            resolve(newFile);
          }
        },
        'image/jpeg', // Use JPEG format for better compression
        quality
      );
    });
  } catch (error) {
    console.error('Compression error:', error);
    return file; // Return original file on any error
  }
};

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
  const [cookedOn, setCookedOn] = useState<string | null>(recipe.cookedOn || null);
  const [isRawMode, setIsRawMode] = useState(false);
  const [rawText, setRawText] = useState('');
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientAmount, setNewIngredientAmount] = useState('');
  const ingredientNameInputRef = useRef<HTMLInputElement>(null);
  const [newStep, setNewStep] = useState<Step>({
    instruction: '',
    id: '',
  });
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [compressionMessage, setCompressionMessage] = useState<string | null>(null);

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>, dropIndex?: number) => {
    e.preventDefault();
    setIsDragging(false);

    // If dropIndex is provided, this is a reordering operation
    if (typeof dropIndex === 'number') {
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (dragIndex === dropIndex) return;

      const updatedImages = [...images];
      const [draggedImage] = updatedImages.splice(dragIndex, 1);
      updatedImages.splice(dropIndex, 0, draggedImage);
      setImages(updatedImages);
      return;
    }

    // Otherwise, this is a new file upload operation
    const files = e.dataTransfer.files;
    if (!files.length) return;

    setIsUploading(true);
    try {
      // Check if any files are large and show a message
      const largeFiles = Array.from(files).filter(file => file.size > 4 * 1024 * 1024);
      if (largeFiles.length > 0) {
        const message = `${largeFiles.length} large image(s) will be automatically compressed`;
        console.log(message);
        setCompressionMessage(message);
        setTimeout(() => setCompressionMessage(null), 5000); // Clear after 5 seconds
      }

      const uploadedImages = await Promise.all(
        Array.from(files).map(async (file) => {
          // Compress image on client-side before uploading
          let fileToUpload = file;

          if (file.type.startsWith('image/')) {
            try {
              console.log(`Client-side compression for: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
              fileToUpload = await compressImageBeforeUpload(file, 4);
              console.log(`Compressed size: ${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`);
            } catch (err) {
              console.error('Error compressing image on client:', err);
              // Continue with original file if compression fails
            }
          }

          const formData = new FormData();
          formData.append('images', fileToUpload);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();
          return data.imagePaths[0];
        })
      );
      setImages([...images, ...uploadedImages]);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleImageDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleImageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    try {
      // Check if any files are large and show a message
      const largeFiles = Array.from(files).filter(file => file.size > 4 * 1024 * 1024);
      if (largeFiles.length > 0) {
        const message = `${largeFiles.length} large image(s) will be automatically compressed`;
        console.log(message);
        setCompressionMessage(message);
        setTimeout(() => setCompressionMessage(null), 5000); // Clear after 5 seconds
      }

      const uploadedImages = await Promise.all(
        Array.from(files).map(async (file) => {
          // Compress image on client-side before uploading
          let fileToUpload = file;

          if (file.type.startsWith('image/')) {
            try {
              console.log(`Client-side compression for: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
              fileToUpload = await compressImageBeforeUpload(file, 4);
              console.log(`Compressed size: ${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`);
            } catch (err) {
              console.error('Error compressing image on client:', err);
              // Continue with original file if compression fails
            }
          }

          const formData = new FormData();
          formData.append('images', fileToUpload);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();
          return data.imagePaths[0];
        })
      );
      setImages([...images, ...uploadedImages]);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // For create mode, ensure we don't send an ID
      const baseRecipe = mode === 'create' ? {} : { id: recipe.id };

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
        cookedOn,
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

  const handleAddIngredient = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newIngredientName.trim()) {
      setIngredients([
        ...ingredients,
        {
          name: capitalizeFirstLetter(newIngredientName.trim()),
          amount: newIngredientAmount.trim(),
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        },
      ]);
      setNewIngredientName('');
      setNewIngredientAmount('');
      // Focus back on the ingredient name input
      setTimeout(() => {
        ingredientNameInputRef.current?.focus();
      }, 0);
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleStepDragOver = (e: React.DragEvent<HTMLLIElement>) => {
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
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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

  const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const processIngredientLine = (line: string, ingredients: Ingredient[]) => {
    // Common cooking measurements and descriptive terms with their variations
    const measurementPairs = [
      ['cup', 'cups'],
      ['tbsp', 'tablespoon', 'tablespoons'],
      ['tsp', 'teaspoon', 'teaspoons'],
      ['gram', 'grams', 'g'],
      ['kilogram', 'kilograms', 'kg'],
      ['milliliter', 'milliliters', 'ml'],
      ['ounce', 'ounces', 'oz'],
      ['pound', 'pounds', 'lb', 'lbs'],
      ['piece', 'pieces', 'pc', 'pcs'],
      ['slice', 'slices'],
      ['pinch', 'pinches'],
      ['can', 'cans'],
      ['packet', 'packets', 'pack', 'packs'],
      ['package', 'packages'],
      ['jar', 'jars'],
      ['bottle', 'bottles'],
      ['bunch', 'bunches'],
      ['handful', 'handfuls'],
      ['dash', 'dashes'],
      ['splash', 'splashes'],
      ['sprinkle', 'sprinkles'],
      ['little', 'few', 'bit'],
      ['to taste', 'as needed', 'as required'],
      ['spoon', 'spoons']
    ];

    // Create a regex-safe measurement pattern
    const measurements = measurementPairs
      .flat()
      .map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    // Common ingredient preparations
    const preparations = [
      'diced', 'chopped', 'minced', 'sliced', 'grated', 'crushed', 'ground',
      'peeled', 'seeded', 'cored', 'julienned', 'cubed', 'quartered',
      'roughly chopped', 'finely chopped', 'thinly sliced', 'coarsely ground'
    ].join('|');

    // Try different patterns for ingredient parsing
    const patterns = [
      // Pattern for "ingredient - amount" format (e.g., "milk - 1 cup")
      new RegExp(`^(.+?)\\s*[-:]\\s*(\\d+(?:\\.\\d+)?\\s*(?:${measurements})?)$`, 'i'),

      // Pattern for "ingredient-amount" format without spaces (e.g., "water-2 spoons")
      new RegExp(`^(.+?)-(\\d+(?:\\.\\d+)?\\s*(?:${measurements})?)$`, 'i'),

      // Pattern for "ingredient: amount" format (e.g., "sugar: 100g")
      new RegExp(`^(.+?):\\s*(\\d+(?:\\.\\d+)?\\s*(?:${measurements})?)$`, 'i'),

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

        if (pattern === patterns[0] || pattern === patterns[1] || pattern === patterns[2]) {
          // Handle "ingredient - amount", "ingredient-amount", or "ingredient: amount" formats
          name = capitalizeFirstLetter(match[1].trim());
          amount = match[2].trim();
        } else if (pattern === patterns[6]) {
          // Handle preparation pattern
          name = capitalizeFirstLetter(match[1].trim());
          const prep = match[2];
          if (prep) {
            name = `${name} (${prep})`;
          }
          amount = '';
        } else if (pattern === patterns[3] || pattern === patterns[4] || pattern === patterns[5]) {
          // Handle amount patterns
          if (pattern === patterns[5]) {
            // For "ingredient amount" format, swap to get correct order
            name = capitalizeFirstLetter(match[1].trim());
            amount = match[2].trim();
          } else {
            // For "amount ingredient" format
            amount = match[1].trim();
            name = capitalizeFirstLetter(match[2].trim());
          }

          // Clean up amount text
          amount = amount.replace(/^(a |an |some )/, '');
          if (!amount.match(/\d/)) {
            // If amount doesn't contain numbers, it's probably a descriptive term
            amount = `a ${amount}`;
          }
        }

        // Ensure name and amount are always strings (TypeScript safety)
        const ingredientName = name || '';
        const ingredientAmount = amount || '';

        ingredients.push({
          name: ingredientName,
          amount: ingredientAmount,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        });
        break;
      }
    }

    if (!matched) {
      // If no pattern matched, use the whole line as the name
      ingredients.push({
        name: capitalizeFirstLetter(line.trim()),
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
            setTitle(capitalizeFirstLetter(lines[i]));
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
          instruction: capitalizeFirstLetter(content),
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
          instruction: capitalizeFirstLetter(content),
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

  // Render the toast notification
  const renderCompressionToast = () => {
    if (!compressionMessage) return null;

    return (
      <div className="fixed bottom-5 right-5 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{compressionMessage}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Compression toast notification */}
      {renderCompressionToast()}

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
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="rawText" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paste Your Recipe Text
                </label>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  onClick={() => setShowExampleModal(true)}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">See Example</span>
                  </div>
                </button>
              </div>
              <div className="mt-1">
                <textarea
                  id="rawText"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 min-h-[400px] font-mono"
                  placeholder={`Paste your recipe text here. The converter will detect:

• Title (first line)
• Servings & Time (e.g., "Serves 4", "Prep time: 10 min")
• Ingredients (with measurements or bullet points)
• Steps (numbered or bullet points)
• Tags (using #hashtags)

💡 Use bullet points (-) or numbers (1.) for ingredients and steps`}
                />
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                The converter will organize your recipe, and you can adjust any fields afterward.
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

            {/* Example Modal */}
            {showExampleModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 relative">
                  <button
                    onClick={() => setShowExampleModal(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Example Recipe Format</h3>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-sm font-mono text-gray-800 dark:text-gray-200">
{`Easy Pasta Recipe
Serves 4
Prep time: 10 minutes
Cooking time: 20 minutes

Ingredients:
- 2 cups pasta
- a little olive oil
- salt to taste
- 3 cloves garlic, finely chopped
- 1 can tomatoes
- a handful of basil leaves

Steps:
- Boil water in a large pot
- Add pasta and cook until al dente
- Heat oil in a pan
- Add garlic and cook until fragrant
- Add tomatoes and simmer
- Season with salt
- Add basil

A quick and easy dinner recipe perfect for weeknights.
#quick #easy #vegetarian`}
                  </pre>
                </div>
              </div>
            )}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cookedOn" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cooked On
                  </label>
                  <input
                    type="date"
                    id="cookedOn"
                    value={cookedOn || ''}
                    onChange={(e) => setCookedOn(e.target.value || null)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    disabled={isSubmitting}
                  />
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

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Images
                  </label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    } transition-colors duration-200 ease-in-out`}
                    onDrop={handleImageDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={isSubmitting || isUploading}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                        isSubmitting || isUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {isUploading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">
                              Click to upload
                            </span>{' '}
                            or drag and drop
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </label>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                      {images.map((image, index) => (
                        <div
                          key={index}
                          className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
                          draggable
                          onDragStart={(e) => handleImageDragStart(e, index)}
                          onDragOver={handleImageDragOver}
                          onDrop={(e) => handleImageDrop(e, index)}
                        >
                          <img
                            src={image}
                            alt={`Recipe image ${index + 1}`}
                            className="object-cover w-full h-full group-hover:opacity-75 transition-opacity duration-200"
                            style={{ pointerEvents: 'none' }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="bg-red-600/90 text-white p-2 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              title="Remove image"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <div className="absolute top-0 right-0 p-2">
                              <svg className="h-6 w-6 text-white drop-shadow-lg cursor-move" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                              </svg>
                            </div>
                          </div>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tip: You can paste multiple ingredients at once (one per line)
                  </span>
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    name="ingredientName"
                    id="ingredientName"
                    ref={ingredientNameInputRef}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Enter ingredient name"
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIngredient();
                      }
                    }}
                    onPaste={(e) => {
                      const pastedText = e.clipboardData.getData('text');
                      const lines = pastedText.split('\n').map(line => line.trim()).filter(line => line);

                      if (lines.length > 1) {
                        e.preventDefault(); // Prevent default paste behavior

                        // Process each line and add as an ingredient
                        const newIngredients = [...ingredients];
                        lines.forEach(line => {
                          processIngredientLine(line, newIngredients);
                        });

                        setIngredients(newIngredients);
                        setNewIngredientName(''); // Clear the input
                      }
                    }}
                  />
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <input
                      type="text"
                      placeholder="Amount (e.g., 2 cups)"
                      value={newIngredientAmount}
                      onChange={(e) => setNewIngredientAmount(e.target.value)}
                      className="flex-1 rounded-l-md sm:rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      disabled={isSubmitting}
                      id="ingredient-amount-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIngredient();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                      disabled={isSubmitting || !newIngredientName.trim()}
                    >
                      Add
                    </button>
                  </div>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tip: You can paste multiple steps at once (one per line)
                  </span>
                </p>
                <div className="space-y-4">
                  <div className="mb-2 space-y-2">
                    <ul className="space-y-2">
                      {steps.map((step, index) => (
                        <li
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleStepDragOver}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addStep();
                        }
                      }}
                      onPaste={(e) => {
                        const pastedText = e.clipboardData.getData('text');
                        const lines = pastedText.split('\n').map(line => line.trim()).filter(line => line);

                        if (lines.length > 1) {
                          e.preventDefault(); // Prevent default paste behavior

                          // Add each line as a new step
                          const newSteps = [...steps];
                          lines.forEach(line => {
                            if (line.trim()) {
                              newSteps.push({
                                instruction: line.trim(),
                                id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                              });
                            }
                          });

                          setSteps(newSteps);
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
    </div>
  );
}
