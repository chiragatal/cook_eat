export const REACTION_TYPES = [
  'LOVE',        // ❤️ General love/like
  'YUM',         // 😋 Delicious
  'WANT_TO_TRY', // 🔖 Want to try
  'MADE_IT',     // 👩‍🍳 Made this recipe
  'FAVORITE'     // ⭐ Add to favorites
] as const;

export type ReactionType = typeof REACTION_TYPES[number];
