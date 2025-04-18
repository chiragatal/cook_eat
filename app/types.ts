export interface Ingredient {
  name: string;
  amount: string;
  id: string;
}

export interface Step {
  instruction: string;
  id: string;
}

export interface Recipe {
  id?: string;
  title: string;
  description: string;
  ingredients: string; // JSON string of Ingredient[]
  steps: string; // JSON string of Step[]
  notes: string | null;
  images: string; // JSON string of array of image paths
  tags: string; // JSON string of string[]
  category: string | null;
  cookingTime: number | null;
  difficulty: string | null;
  createdAt?: string;
  updatedAt?: string;
  userId: string;
  user?: {
    name?: string;
    email?: string;
  };
  isPublic: boolean;
  cookedOn?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  postId: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
}

export interface Reaction {
  id: string;
  type: string;
  postId: string;
  userId: string;
  createdAt: string;
  user?: {
    name?: string;
    email?: string;
  };
}
