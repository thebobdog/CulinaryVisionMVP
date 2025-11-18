
export enum LoadingState {
  IDLE,
  CAPTURING,
  ANALYZING,
  REVIEW_INGREDIENTS,
  FETCHING_RECIPES,
  SHOWING_RESULTS,
  ERROR,
}

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface NutritionalInfo {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export interface Recipe {
  recipeName: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: NutritionalInfo;
  prepTime: string;
}
