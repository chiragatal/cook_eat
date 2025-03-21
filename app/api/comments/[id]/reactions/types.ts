export const COMMENT_REACTION_TYPES = [
  'LIKE',     // 👍 Like
  'LOVE',     // ❤️ Love
  'LAUGH',    // 😂 Laugh
  'INSIGHTFUL', // 💡 Insightful
  'HELPFUL'   // 🙏 Helpful
] as const;

export type CommentReactionType = typeof COMMENT_REACTION_TYPES[number];
