export interface Recipe {
  id: string;
  recipeName: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  imagePrompt: string;
  imageUrl?: string;
  imageError?: boolean;
}
