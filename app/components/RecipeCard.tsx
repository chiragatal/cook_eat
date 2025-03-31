import { RichTextContent } from './RichTextEditor';

interface Recipe {
  id: string;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  isPublic: boolean;
}

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onTogglePublic: (recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, onEdit, onDelete, onTogglePublic }: RecipeCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {recipe.title}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(recipe)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(recipe)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Delete
            </button>
            <button
              onClick={() => onTogglePublic(recipe)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {recipe.isPublic ? 'Make Private' : 'Make Public'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {recipe.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
              {recipe.category}
            </span>
          )}
          {recipe.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
            {recipe.description.replace(/<[^>]*>/g, '')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <span className="text-sm">1</span>
          </button>
          <button className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            +
          </button>
        </div>
      </div>
    </div>
  );
}
