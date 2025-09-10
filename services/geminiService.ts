import { GoogleGenAI, Type } from "@google/genai";
import type { Recipe } from '../types';

// Use `import.meta.env.VITE_API_KEY` for Vite projects
const apiKey = import.meta.env.VITE_API_KEY;

if (!apiKey) {
  throw new Error("VITE_API_KEY environment variable not set. Please ensure it is configured in your Vercel project settings.");
}

const ai = new GoogleGenAI({ apiKey });

const recipeSchema = {
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
        description: "A short, appetizing description of the dish."
      },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "A list of ingredients with quantities."
      },
      instructions: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "Step-by-step cooking instructions."
      },
      imagePrompt: {
        type: Type.STRING,
        description: "A detailed, photorealistic prompt for an image generation model to create a picture of the final dish. Example: 'A beautifully plated dish of golden-brown roasted chicken, garnished with fresh rosemary and lemon slices, on a rustic wooden table, soft natural lighting.'"
      },
    },
    required: ["recipeName", "description", "ingredients", "instructions", "imagePrompt"]
  },
};


export async function isFoodImage(base64ImageData: string, mimeType: string): Promise<boolean> {
  try {
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64ImageData,
      },
    };
    const textPart = {
      text: "Is this an image of food, edible ingredients, or a dish? Answer with only 'yes' or 'no'."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [imagePart, textPart]
      },
      config: {
        temperature: 0,
      }
    });

    return response.text.trim().toLowerCase().includes('yes');
  } catch (error) {
    console.error("Error checking for food image:", error);
    return false; // Fail safely
  }
}

export async function generateRecipeImage(prompt: string): Promise<string> {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '4:3',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("Image generation failed to return an image.");
    }
}

export async function validateRecipeImage(recipeName: string, base64ImageData: string): Promise<boolean> {
  try {
    const mimeType = base64ImageData.substring(base64ImageData.indexOf(':') + 1, base64ImageData.indexOf(';'));
    const data = base64ImageData.split(',')[1];
    
    const imagePart = { inlineData: { mimeType, data } };
    const textPart = { text: `Does this image accurately depict "${recipeName}"? The image should look appealing and correctly represent the dish. Answer with only 'yes' or 'no'.` };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        temperature: 0,
      }
    });

    return response.text.trim().toLowerCase().includes('yes');
  } catch (error) {
    console.error("Error validating recipe image:", error);
    return false; // Fail safely
  }
}


const parseAndPrepareRecipes = (jsonString: string): Omit<Recipe, 'imageUrl'>[] => {
    let parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
        throw new Error("AI did not return a valid list of recipes.");
    }
    // Limit to 3 recipes for performance and UI reasons
    parsed = parsed.slice(0, 3);
    
    return parsed.map((recipe: any) => ({
      ...recipe,
      id: crypto.randomUUID(), // Add a unique ID for state management
    }));
}


export async function getRecipesFromImage(
  base64ImageData: string,
  mimeType: string,
  exclude: string[] = [],
  cuisines: string[] = []
): Promise<Omit<Recipe, 'imageUrl'>[]> {
  const imagePart = {
    inlineData: {
      mimeType,
      data: base64ImageData,
    },
  };
  
  let excludeText = '';
  if (exclude.length > 0) {
    excludeText = ` Please generate recipes that are different from the following: ${exclude.join(', ')}.`;
  }
  
  let cuisineText = '';
  if (cuisines.length > 0) {
    cuisineText = ` The recipes should fit the following cuisine style(s): ${cuisines.join(', ')}.`;
  }

  const textPart = {
    text: `Analyze the food items in this image. Based on the primary ingredients, generate three distinct and creative recipes.${cuisineText}${excludeText} For each recipe, provide a unique name, a short description, a list of ingredients with quantities, and step-by-step cooking instructions. Also, create a detailed, visually descriptive prompt for an image generation model to create a photorealistic image of the finished dish. Ensure the output is a JSON array matching the provided schema.`,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
    }
  });

  return parseAndPrepareRecipes(response.text.trim());
}

export async function getGenericRecipes(exclude: string[] = []): Promise<Omit<Recipe, 'imageUrl'>[]> {
    let excludeText = '';
    if (exclude.length > 0) {
      excludeText = ` Please generate recipes that are different from the following: ${exclude.join(', ')}.`;
    }
    
    const textPart = {
        text: `Generate three popular, distinct, and relatively simple recipes that many people would enjoy.${excludeText} For each recipe, provide a unique name, a short description, a list of ingredients with quantities, and step-by-step cooking instructions. Also, create a detailed, visually descriptive prompt for an image generation model to create a photorealistic image of the finished dish. Ensure the output is a JSON array matching the provided schema.`,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
        }
    });

    return parseAndPrepareRecipes(response.text.trim());
}

export async function getPopularRecipes(): Promise<Omit<Recipe, 'imageUrl'>[]> {
    const textPart = {
        text: "Generate three globally popular and well-loved recipes from different cuisines (e.g., Italian, Mexican, Japanese). For each recipe, provide a unique name, a short description, a list of ingredients with quantities, and step-by-step cooking instructions. Also, create a detailed, visually descriptive prompt for an image generation model to create a photorealistic image of the finished dish. Ensure the output is a JSON array matching the provided schema.",
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
        }
    });

    return parseAndPrepareRecipes(response.text.trim());
}
