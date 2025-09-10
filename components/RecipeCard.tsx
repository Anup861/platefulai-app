import React, { useState, useRef, useEffect } from 'react';
import type { Recipe } from '../types';
import { HeartIcon, AlertTriangleIcon, ShareArrowIcon, TwitterIcon, FacebookIcon, CopyIcon, TimerIcon } from './icons';

interface RecipeCardProps {
  recipe: Recipe;
  isSaved: boolean;
  onSaveToggle: (recipe: Recipe) => void;
  onShare: (platform: 'copy' | 'twitter' | 'facebook') => void;
  onStartTimer: (durationInSeconds: number, description: string) => void;
}

// Helper to find time mentions in instruction steps
const parseInstructionForTime = (instruction: string): { text: string, timeInSeconds: number | null } => {
    const timeRegex = /(?:(\d+)\s*to\s*)?(\d+)\s*(minute|minutes|hour|hours)/i;
    const match = instruction.match(timeRegex);

    if (match) {
        const value = parseInt(match[2], 10);
        const unit = match[3].toLowerCase();
        let seconds = 0;
        if (unit.startsWith('hour')) {
            seconds = value * 3600;
        } else {
            seconds = value * 60;
        }
        return { text: instruction, timeInSeconds: seconds };
    }
    return { text: instruction, timeInSeconds: null };
};


const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isSaved, onSaveToggle, onShare, onStartTimer }) => {
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleShareClick = (platform: 'copy' | 'twitter' | 'facebook') => {
    onShare(platform);
    setIsShareMenuOpen(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col transition-transform duration-300 hover:scale-105">
      <div className="relative">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-56 object-cover" />
        ) : recipe.imageError ? (
            <div className="w-full h-56 bg-red-100 dark:bg-red-900/20 flex flex-col items-center justify-center text-center p-4">
                <AlertTriangleIcon className="w-10 h-10 text-red-500 mb-2" />
                <span className="text-red-700 dark:text-red-300 font-semibold">Image Generation Failed</span>
                <span className="text-red-600 dark:text-red-400 text-sm">Could not create a valid image.</span>
            </div>
        ) : (
          <div className="w-full h-56 bg-gray-200 dark:bg-gray-700 flex items-center justify-center animate-pulse">
              <span className="text-gray-500">Generating Image...</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="relative" ref={shareMenuRef}>
              <button
                  onClick={() => setIsShareMenuOpen(prev => !prev)}
                  className="bg-white/70 dark:bg-gray-900/50 p-2 rounded-full backdrop-blur-sm transition-transform hover:scale-110"
                  aria-label="Open share menu"
                  title="Share recipe"
              >
                  <ShareArrowIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
              </button>
              {isShareMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10 transition-opacity duration-200">
                    <div className="py-1">
                      <button onClick={() => handleShareClick('copy')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CopyIcon className="w-5 h-5 mr-3" />
                        Copy Link
                      </button>
                      <button onClick={() => handleShareClick('twitter')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <TwitterIcon className="w-5 h-5 mr-3" />
                        Twitter
                      </button>
                      <button onClick={() => handleShareClick('facebook')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <FacebookIcon className="w-5 h-5 mr-3" />
                        Facebook
                      </button>
                    </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => onSaveToggle(recipe)} 
              className="bg-white/70 dark:bg-gray-900/50 p-2 rounded-full backdrop-blur-sm transition-transform hover:scale-110"
              aria-label={isSaved ? 'Unsave recipe' : 'Save recipe'}
            >
              <HeartIcon isSaved={isSaved} className="w-6 h-6" />
            </button>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{recipe.recipeName}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 flex-grow">{recipe.description}</p>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-lg mb-2 border-b border-gray-200 dark:border-gray-600 pb-1">Ingredients</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {recipe.ingredients.map((ingredient, i) => (
                <li key={i}>{ingredient}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-2 border-b border-gray-200 dark:border-gray-600 pb-1">Instructions</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {recipe.instructions.map((step, i) => {
                const { text, timeInSeconds } = parseInstructionForTime(step);
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-1">{text}</span>
                    {timeInSeconds && (
                      <button 
                        onClick={() => onStartTimer(timeInSeconds, text)} 
                        className="p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-colors"
                        title={`Start a ${timeInSeconds / 60} minute timer`}
                      >
                        <TimerIcon className="w-5 h-5"/>
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;