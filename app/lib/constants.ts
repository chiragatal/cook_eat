export const CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Snack',
  'Beverage',
  'Other'
] as const;

export type Category = typeof CATEGORIES[number];

export const DIFFICULTIES = [
  'Easy',
  'Medium',
  'Hard'
] as const;

export type Difficulty = typeof DIFFICULTIES[number];

export interface ReactionFilter {
  value: string;
  emoji: string;
  label: string;
}

export const REACTION_FILTERS: ReactionFilter[] = [
  { value: 'FAVORITE', emoji: '⭐', label: 'My Favorites' },
  { value: 'WANT_TO_TRY', emoji: '🔖', label: 'Want to Try' },
  { value: 'MADE_IT', emoji: '👩‍🍳', label: 'Made These' },
];
