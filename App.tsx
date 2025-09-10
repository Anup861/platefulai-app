import React, { useState, useCallback, useEffect } from 'react';
import type { Recipe } from './types';
import { getRecipesFromImage, isFoodImage, getGenericRecipes, generateRecipeImage, validateRecipeImage, getPopularRecipes } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import RecipeCard from './components/RecipeCard';
import LoadingTips from './components/LoadingTips';
import TimerWidget from './components/TimerWidget';
import { CameraIcon, ChefHatIcon, LeafIcon, TrashIcon } from './components/icons';

const homepageImage = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

type TimerConfig = {
  duration: number;
  description: string;
};

const availableCuisines = ['Healthy', 'Italian', 'Mexican', 'Indian', 'Asian', 'American'];

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [popularRecipes, setPopularRecipes] = useState<Recipe[]>([]);
  const [isSavedRecipesOpen, setIsSavedRecipesOpen] = useState(false);
  const [timerConfig, setTimerConfig] = useState<TimerConfig | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  
  // Load/save recipes from localStorage
  useEffect(() => {
    try {
      const storedRecipes = localStorage.getItem('savedRecipes');
      if (storedRecipes) {
        setSavedRecipes(JSON.parse(storedRecipes));
      }
    } catch (error) {
      console.error("Failed to load saved recipes:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
    } catch (error) {
      console.error("Failed to save recipes:", error);
    }
  }, [savedRecipes]);

  // Handle shared recipe from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeData = urlParams.get('recipe');
    if (recipeData) {
      try {
        const decodedRecipe = JSON.parse(atob(recipeData));
        if (decodedRecipe.id && decodedRecipe.recipeName) {
          setRecipes([decodedRecipe]);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error("Failed to parse recipe from URL", e);
        setError("The shared recipe link is invalid or corrupted.");
      }
    }
  }, []);


  // Generate and set an image for a single recipe, updating state
  const generateAndSetImageForRecipe = useCallback(async (recipe: Recipe) => {
    const MAX_ATTEMPTS = 2;
    let currentRecipe = { ...recipe };
    let imageUrl: string | undefined;
    let isValid = false;
    let attempts = 0;

    while (!isValid && attempts < MAX_ATTEMPTS) {
      attempts++;
      try {
        const generatedBase64 = await generateRecipeImage(currentRecipe.imagePrompt);
        isValid = await validateRecipeImage(currentRecipe.recipeName, generatedBase64);
        if (isValid) {
          imageUrl = generatedBase64;
        } else if (attempts < MAX_ATTEMPTS) {
          // Refine the prompt for the next attempt
          currentRecipe.imagePrompt = `A more accurate, photorealistic image of: ${currentRecipe.recipeName}. Focus on the dish itself, described as: ${currentRecipe.description}`;
        }
      } catch (imgErr) {
        console.error(`Image generation/validation failed for "${currentRecipe.recipeName}" on attempt ${attempts}`, imgErr);
        isValid = false;
      }
    }
    
    const finalRecipeState = { ...currentRecipe, imageUrl: isValid ? imageUrl : undefined, imageError: !isValid };

    // Update the specific recipe in the state
    setRecipes(prev => prev?.map(r => r.id === finalRecipeState.id ? finalRecipeState : r) || null);
    setPopularRecipes(prev => prev.map(r => r.id === finalRecipeState.id ? finalRecipeState : r));

    if (!isValid) {
        setError("We had trouble creating an image for one or more recipes. For best results, try starting over with a clearer photo of your ingredients.");
    }
  }, []);

  // Fetch popular recipes on initial load (text first)
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const popularTextOnly = await getPopularRecipes();
        const popularRecipesWithId = popularTextOnly.map(r => ({ ...r, id: crypto.randomUUID() }));
        setPopularRecipes(popularRecipesWithId);
        // Generate images in the background
        popularRecipesWithId.forEach(recipe => generateAndSetImageForRecipe(recipe));
      } catch(err) {
        console.error("Could not fetch popular recipes", err);
      }
    };
    if (popularRecipes.length === 0) {
      fetchPopular();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleImageSelect = (base64Image: string) => {
    setImage(base64Image);
    setRecipes(null);
    setError(null);
  };


  const handleGetRecipes = useCallback(async (exclude: string[] = [], cuisines: string[] = []) => {
    if (!image) {
      setError('Please select an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setRecipes(null); 
    
    try {
      const mimeType = image.substring(image.indexOf(':') + 1, image.indexOf(';'));
      const base64Data = image.split(',')[1];
      
      const isFood = exclude.length > 0 ? true : await isFoodImage(base64Data, mimeType);
      
      let recipesData: Omit<Recipe, 'imageUrl'>[];
      if (isFood) {
        recipesData = await getRecipesFromImage(base64Data, mimeType, exclude, cuisines);
      } else {
        setError("This doesn't appear to be food. Here are some popular recipe ideas instead!");
        recipesData = await getGenericRecipes(exclude);
      }
      
      const recipesWithPlaceholders: Recipe[] = recipesData.map(r => ({ ...r, id: crypto.randomUUID() }));
      
      setIsLoading(false); // Stop loading, show text results immediately
      setRecipes(recipesWithPlaceholders);

      // Now generate images in the background for each recipe card
      recipesWithPlaceholders.forEach(recipe => generateAndSetImageForRecipe(recipe));

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
    }
  }, [image, generateAndSetImageForRecipe]);
  
  const handleLoadMoreRecipes = useCallback(async () => {
    const isGenericFallback = error?.includes("This doesn't appear to be food");
    const existingRecipeNames = recipes ? recipes.map(r => r.recipeName) : [];

    setIsLoading(true);
    setError(null);
    setRecipes(null);

    try {
        let recipesData: Omit<Recipe, 'imageUrl'>[];
        if (isGenericFallback) {
            recipesData = await getGenericRecipes(existingRecipeNames);
        } else {
            if (!image) return;
            const mimeType = image.substring(image.indexOf(':') + 1, image.indexOf(';'));
            const base64Data = image.split(',')[1];
            // We don't pass cuisines here as "different recipes" should be open-ended
            recipesData = await getRecipesFromImage(base64Data, mimeType, existingRecipeNames);
        }
        
        const recipesWithPlaceholders: Recipe[] = recipesData.map(r => ({ ...r, id: crypto.randomUUID() }));

        setIsLoading(false); // Stop loading, show text results immediately
        setRecipes(recipesWithPlaceholders);
        
        if (isGenericFallback) {
             setError("This doesn't appear to be food. Here are some popular recipe ideas instead!");
        }

        // Generate images in the background
        recipesWithPlaceholders.forEach(recipe => generateAndSetImageForRecipe(recipe));

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setIsLoading(false);
    }
  }, [image, recipes, error, generateAndSetImageForRecipe]);


  const handleReset = () => {
    setImage(null);
    setRecipes(null);
    setError(null);
    setIsLoading(false);
    setSelectedCuisines([]);
  };
  
  const handleCuisineToggle = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleSaveToggle = (recipeToToggle: Recipe) => {
    setSavedRecipes(prev => {
      const isSaved = prev.some(r => r.id === recipeToToggle.id);
      if (isSaved) {
        return prev.filter(r => r.id !== recipeToToggle.id);
      } else {
        return [...prev, recipeToToggle];
      }
    });
  };

  const handleRemoveSavedRecipe = (recipeId: string) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
  };
  
  const handleViewSavedRecipe = (recipe: Recipe) => {
      setRecipes([recipe]);
      setIsSavedRecipesOpen(false);
      // Scroll to the recipe card after a short delay to allow rendering
      setTimeout(() => {
        const recipeSection = document.getElementById('recipe-display-section');
        recipeSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
  };

  const generateShareableLink = (recipe: Recipe): string => {
    const recipeString = JSON.stringify(recipe);
    const encodedRecipe = btoa(recipeString);
    return `${window.location.origin}${window.location.pathname}?recipe=${encodedRecipe}`;
  };

  const handleShare = async (recipe: Recipe, platform: 'copy' | 'twitter' | 'facebook') => {
    const url = generateShareableLink(recipe);
    const text = `Check out this recipe for ${recipe.recipeName}!`;

    switch (platform) {
      case 'twitter':
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        break;
      
      case 'facebook':
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank', 'noopener,noreferrer');
        break;

      case 'copy':
      default:
        if (navigator.share) {
            try {
                await navigator.share({ title: recipe.recipeName, text, url });
            } catch (error) { console.log('Error sharing:', error); }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                setCopyNotification('Link copied to clipboard!');
                setTimeout(() => setCopyNotification(null), 3000);
            } catch (err) {
                console.error('Failed to copy: ', err);
                setCopyNotification('Failed to copy link.');
                setTimeout(() => setCopyNotification(null), 3000);
            }
        }
        break;
    }
  };

  const handleStartTimer = (duration: number, description: string) => {
    setTimerConfig({ duration, description });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      {copyNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-white py-2 px-6 rounded-full shadow-lg z-50 transition-opacity duration-300">
          {copyNotification}
        </div>
      )}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Plateful
            </h1>
            <button 
                onClick={() => setIsSavedRecipesOpen(true)}
                className="font-semibold text-gray-700 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 transition-colors"
            >
                Saved Recipes
            </button>
        </div>
      </header>
      
      {isSavedRecipesOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsSavedRecipesOpen(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                    <h2 className="text-2xl font-bold">Your Saved Recipes</h2>
                    <button onClick={() => setIsSavedRecipesOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-3xl font-light">&times;</button>
                </div>
                {savedRecipes.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 p-2">
                        {savedRecipes.map(recipe => (
                            <li key={recipe.id} className="p-3 flex items-center justify-between group">
                                <span onClick={() => handleViewSavedRecipe(recipe)} className="font-medium cursor-pointer hover:text-green-500 flex-1 truncate pr-2">
                                    {recipe.recipeName}
                                </span>
                                <button onClick={() => handleRemoveSavedRecipe(recipe.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="p-8 text-center text-gray-500">You haven't saved any recipes yet.</p>
                )}
            </div>
        </div>
      )}

      <main>
        {!recipes && !isLoading && (
          <div className="relative pt-16 pb-32 flex content-center items-center justify-center min-h-[50vh]">
            <div 
              className="absolute top-0 w-full h-full bg-center bg-cover"
              style={{ backgroundImage: `url('${homepageImage}')` }}
            >
              <span id="blackOverlay" className="w-full h-full absolute opacity-50 bg-black"></span>
            </div>
            <div className="container relative mx-auto text-center">
              <h1 className="text-white text-4xl md:text-5xl font-bold">Plateful</h1>
              <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">Turn your ingredients into inspiration. Snap a photo, and let AI craft delicious recipes for you.</p>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-8 relative z-10">
          {isLoading && <LoadingTips />}
          {!isLoading && !recipes && (
            <div className="transform -translate-y-32">
                {!image && (
                    <div className="max-w-4xl mx-auto text-center mb-12 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                        <h2 className="text-3xl font-bold mb-6">How It Works</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="flex flex-col items-center p-4"><CameraIcon className="w-12 h-12 text-green-500 mb-3"/><h3 className="font-semibold text-lg">1. Snap or Upload</h3><p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Use your camera or upload a photo of your ingredients.</p></div>
                            <div className="flex flex-col items-center p-4"><ChefHatIcon className="w-12 h-12 text-green-500 mb-3"/><h3 className="font-semibold text-lg">2. Get AI Recipes</h3><p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Our AI analyzes the image and suggests creative recipes.</p></div>
                            <div className="flex flex-col items-center p-4"><LeafIcon className="w-12 h-12 text-green-500 mb-3"/><h3 className="font-semibold text-lg">3. Cook & Enjoy</h3><p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Follow the simple steps to create a delicious meal.</p></div>
                        </div>
                    </div>
                )}
                <div className="max-w-2xl mx-auto">
                    <ImageUploader onImageSelect={handleImageSelect} />
                    {image && (
                    <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-center">Your Ingredient</h3>
                        <img src={image} alt="Selected ingredient" className="rounded-lg w-full h-auto max-h-96 object-contain" />
                        
                        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 className="text-lg font-semibold mb-3 text-center">Refine with Cuisines (Optional)</h4>
                            <div className="flex flex-wrap justify-center gap-2">
                                {availableCuisines.map(cuisine => (
                                    <button 
                                        key={cuisine}
                                        onClick={() => handleCuisineToggle(cuisine)}
                                        className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-colors duration-200 ${
                                            selectedCuisines.includes(cuisine) 
                                            ? 'bg-green-500 border-green-500 text-white' 
                                            : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {cuisine}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => handleGetRecipes([], selectedCuisines)} className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800">Find Recipes</button>
                    </div>
                    )}
                </div>
                {!image && popularRecipes.length > 0 && (
                    <div className="max-w-6xl mx-auto mt-16">
                        <h2 className="text-3xl font-bold text-center mb-8">Popular Recipes to Inspire You</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {popularRecipes.map((recipe) => (
                                <RecipeCard key={recipe.id} recipe={recipe} onSaveToggle={() => handleSaveToggle(recipe)} isSaved={savedRecipes.some(r => r.id === recipe.id)} onShare={(platform) => handleShare(recipe, platform)} onStartTimer={handleStartTimer}/>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg relative max-w-2xl mx-auto mb-6" role="alert">
                <p className="font-bold">Notice</p>
                <p>{error}</p>
            </div>
          )}

          {!isLoading && recipes && (
            <div id="recipe-display-section">
              <div className="text-center mb-12 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button onClick={handleReset} className="py-2 px-6 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transform transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400">Start Over</button>
                <button onClick={handleLoadMoreRecipes} className="py-2 px-6 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transform transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-400">Show Me Different Recipes</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} onSaveToggle={() => handleSaveToggle(recipe)} isSaved={savedRecipes.some(r => r.id === recipe.id)} onShare={(platform) => handleShare(recipe, platform)} onStartTimer={handleStartTimer}/>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {timerConfig && (
        <TimerWidget 
          duration={timerConfig.duration} 
          description={timerConfig.description}
          onClose={() => setTimerConfig(null)} 
        />
      )}

      <footer className="text-center py-4 mt-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;