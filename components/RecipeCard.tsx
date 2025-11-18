import React, { useState } from 'react';
import type { Recipe } from '../types';
import TimerOverlay from './TimerOverlay';

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number | null>(null);

  const openTimer = (seconds: number) => {
    setTimerDuration(seconds);
  };

  const closeTimer = () => {
    setTimerDuration(null);
  };

  // Helper to parse text and insert interactive timer buttons
  const renderInstructionText = (text: string) => {
    // Regex to match patterns like "5 minutes", "1-2 hours", "30 secs"
    // Captures: 1=number(range), 2=unit
    const timeRegex = /\b(\d+(?:-\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = timeRegex.exec(text)) !== null) {
      // Push text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const fullMatch = match[0];
      const numberPart = match[1]; // e.g., "5" or "5-10"
      const unitPart = match[2].toLowerCase();

      // Calculate duration in seconds
      let val = parseInt(numberPart.split('-')[0], 10); // Use lower bound of range
      if (isNaN(val)) val = 0;

      let multiplier = 60; // Default to minutes
      if (unitPart.startsWith('sec')) multiplier = 1;
      if (unitPart.startsWith('hour') || unitPart.startsWith('hr')) multiplier = 3600;

      const seconds = val * multiplier;

      if (seconds > 0) {
        parts.push(
            <button
                key={match.index}
                onClick={(e) => { e.stopPropagation(); openTimer(seconds); }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded-md bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 hover:text-teal-200 font-medium transition-colors cursor-pointer border border-teal-500/30 align-baseline"
                title={`Start timer for ${fullMatch}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {fullMatch}
            </button>
        );
      } else {
        parts.push(fullMatch);
      }

      lastIndex = timeRegex.lastIndex;
    }

    // Push remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  return (
    <>
        <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700 transition-all duration-300 hover:border-teal-500/30">
        <div className="p-4 sm:p-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-teal-300">{recipe.recipeName}</h3>
                    <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{recipe.prepTime}</span>
                    </div>
                </div>
            </div>

            <p className="text-sm sm:text-base text-gray-300 mb-6 leading-relaxed">{recipe.description}</p>
            
            {/* Nutritional Info */}
            <div className="mb-6 bg-gray-750 rounded-xl">
                <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
                    <div className="bg-gray-700/30 p-2 sm:p-3 rounded-lg border border-gray-700/50">
                        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Cals</p>
                        <p className="text-sm sm:text-base font-bold text-white truncate">{recipe.nutritionalInfo.calories}</p>
                    </div>
                    <div className="bg-gray-700/30 p-2 sm:p-3 rounded-lg border border-gray-700/50">
                        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Prot</p>
                        <p className="text-sm sm:text-base font-bold text-white truncate">{recipe.nutritionalInfo.protein}</p>
                    </div>
                    <div className="bg-gray-700/30 p-2 sm:p-3 rounded-lg border border-gray-700/50">
                        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Carbs</p>
                        <p className="text-sm sm:text-base font-bold text-white truncate">{recipe.nutritionalInfo.carbs}</p>
                    </div>
                    <div className="bg-gray-700/30 p-2 sm:p-3 rounded-lg border border-gray-700/50">
                        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Fat</p>
                        <p className="text-sm sm:text-base font-bold text-white truncate">{recipe.nutritionalInfo.fat}</p>
                    </div>
                </div>
                <p className="text-[10px] text-gray-500 text-center mt-2 italic">*Estimated values per serving</p>
            </div>
            
            {/* Ingredients (Always Visible) */}
            <div className="mb-6">
                <h4 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                    Ingredients
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300 text-sm sm:text-base">
                {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center gap-2 bg-gray-700/20 p-2 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0"></span>
                        <span>{ingredient}</span>
                    </li>
                ))}
                </ul>
            </div>

            {/* Instructions (Collapsible) */}
            {isExpanded && (
                <div className="mt-6 pt-6 border-t border-gray-700 animate-fade-in-down">
                    <h4 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                        Instructions
                    </h4>
                    <ol className="space-y-4 text-gray-300 text-sm sm:text-base list-none">
                    {recipe.instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-3 items-start">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 text-teal-400 flex items-center justify-center text-xs font-bold border border-gray-600 mt-0.5">{index + 1}</span>
                            <span className="pt-0.5 leading-relaxed">
                                {renderInstructionText(instruction)}
                            </span>
                        </li>
                    ))}
                    </ol>
                </div>
            )}

            {/* Toggle Button */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full mt-4 py-3 px-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 ${
                    isExpanded 
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                    : "bg-teal-600 text-white hover:bg-teal-500 shadow-lg shadow-teal-900/40"
                }`}
            >
                {isExpanded ? (
                    <>
                        Close Recipe
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </>
                ) : (
                    <>
                        View Instructions & Start Cooking
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </>
                )}
            </button>
        </div>
        </div>

        {/* Global Timer Overlay */}
        <TimerOverlay 
            durationSeconds={timerDuration || 0} 
            isOpen={timerDuration !== null} 
            onClose={closeTimer} 
        />
    </>
  );
};

export default RecipeCard;