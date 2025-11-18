import { GoogleGenAI, Type } from "@google/genai";
import type { Ingredient, Recipe } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const identifyIngredientsFromImage = async (base64Images: string[]): Promise<Ingredient[]> => {
    const imageParts = base64Images.map(base64 => ({
        inlineData: {
            data: base64,
            mimeType: 'image/jpeg',
        },
    }));

    const textPart = {
        text: "Analyze the ingredients in these images. Identify each distinct food item and estimate its quantity (e.g., '1 apple', '200g flour', 'a handful of spinach'). Combine findings from all images into a single list. If an item is unidentifiable, ignore it. Provide the response as a JSON array of objects, where each object has 'name' and 'quantity' keys.",
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...imageParts, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: {
                                type: Type.STRING,
                                description: 'The name of the ingredient.',
                            },
                            quantity: {
                                type: Type.STRING,
                                description: 'The estimated quantity of the ingredient.',
                            },
                        },
                        required: ['name', 'quantity'],
                    },
                },
            },
        });

        const jsonText = response.text?.trim() || "[]";
        const ingredients: Ingredient[] = JSON.parse(jsonText);
        return ingredients;

    } catch (error) {
        console.error("Error identifying ingredients:", error);
        throw new Error("Failed to identify ingredients from the images. Please try clearer pictures.");
    }
};

export const fetchRecipesFromIngredients = async (ingredients: Ingredient[], servings: number, cuisine: string): Promise<Recipe[]> => {
    // Format ingredients list, handling cases where quantity might be empty (user added)
    const ingredientList = ingredients.map(i => i.quantity ? `${i.quantity} ${i.name}` : i.name).join(', ');

    let promptText = `Based on the following ingredients: ${ingredientList}, please provide 3 diverse recipe suggestions for ${servings} serving(s).`;
    
    if (cuisine && cuisine !== "Open") {
        promptText += ` The recipes must strictly align with the '${cuisine}' cuisine or dietary style.`;
    }

    promptText += ` For each recipe, include a brief, enticing description, an estimated prep time (e.g. "30 mins"), a list of all required ingredients with quantities adjusted for the specified serving size, step-by-step instructions, and an estimated nutritional overview per serving (calories, protein, carbs, fat). Provide the response as a JSON array.`;

    const textPart = {
        text: promptText,
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            recipeName: {
                                type: Type.STRING,
                                description: "The name of the recipe."
                            },
                            description: {
                                type: Type.STRING,
                                description: "A brief, enticing description of the dish."
                            },
                            prepTime: {
                                type: Type.STRING,
                                description: "Estimated preparation time (e.g., '20 mins')."
                            },
                            ingredients: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.STRING,
                                },
                                description: "A list of all ingredients required for the recipe, with quantities adjusted for the specified serving size."
                            },
                            instructions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.STRING,
                                },
                                description: "Step-by-step instructions to prepare the dish."
                            },
                            nutritionalInfo: {
                                type: Type.OBJECT,
                                description: "An estimated nutritional overview per serving.",
                                properties: {
                                    calories: { type: Type.STRING, description: "Estimated calories per serving." },
                                    protein: { type: Type.STRING, description: "Estimated protein (in grams) per serving." },
                                    carbs: { type: Type.STRING, description: "Estimated carbohydrates (in grams) per serving." },
                                    fat: { type: Type.STRING, description: "Estimated fat (in grams) per serving." }
                                },
                                required: ["calories", "protein", "carbs", "fat"],
                            }
                        },
                        required: ["recipeName", "description", "prepTime", "ingredients", "instructions", "nutritionalInfo"],
                    },
                },
            },
        });
        
        const jsonText = response.text?.trim() || "[]";
        const recipes: Recipe[] = JSON.parse(jsonText);
        return recipes;

    } catch (error) {
        console.error("Error fetching recipes:", error);
        throw new Error("Failed to generate recipes. The ingredients might not be suitable for common dishes.");
    }
};