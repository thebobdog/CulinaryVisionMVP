
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LoadingState } from './types';
import type { Ingredient, Recipe } from './types';
import { identifyIngredientsFromImage, fetchRecipesFromIngredients } from './services/geminiService';
import Spinner from './components/Spinner';
import RecipeCard from './components/RecipeCard';
import TimerOverlay from './components/TimerOverlay';

const CUISINE_OPTIONS = [
    "Open",
    "Asian",
    "Comfort Food",
    "Gluten-Free",
    "Indian",
    "Italian",
    "Keto",
    "Mediterranean",
    "Mexican",
    "Paleo",
    "Quick (< 30m)",
    "Vegan",
    "Vegetarian"
];

const App: React.FC = () => {
    const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
    // Store array of data URLs (for display)
    const [images, setImages] = useState<string[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [servings, setServings] = useState<number>(1);
    const [cuisine, setCuisine] = useState<string>("Open");
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    
    // New Ingredient Input State
    const [newIngredientInput, setNewIngredientInput] = useState("");

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ingredientInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        }
    };

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const handleStartCamera = async () => {
        setError(null);
        setLoadingState(LoadingState.CAPTURING);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access the camera. Please check permissions and try again.");
            setLoadingState(LoadingState.ERROR);
        }
    };

    // Step 1: Analyze Images to get Ingredients
    const handleAnalyze = useCallback(async () => {
        if (images.length === 0) return;

        setLoadingState(LoadingState.ANALYZING);
        try {
            // Extract base64 strings from data URLs
            const base64Images = images.map(img => img.split(',')[1]);

            const identifiedIngredients = await identifyIngredientsFromImage(base64Images);
            if (identifiedIngredients.length === 0) {
                setError("No ingredients could be identified. Please try clearer pictures with well-lit ingredients.");
                setLoadingState(LoadingState.ERROR);
                return;
            }
            setIngredients(identifiedIngredients);
            setLoadingState(LoadingState.REVIEW_INGREDIENTS);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            setLoadingState(LoadingState.ERROR);
        }
    }, [images]);

    // Step 2: Generate Recipes from Reviewed Ingredients
    const handleGenerateRecipes = useCallback(async () => {
        setLoadingState(LoadingState.FETCHING_RECIPES);
        try {
            const suggestedRecipes = await fetchRecipesFromIngredients(ingredients, servings, cuisine);
            setRecipes(suggestedRecipes);
            setLoadingState(LoadingState.SHOWING_RESULTS);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            setLoadingState(LoadingState.ERROR);
        }
    }, [ingredients, servings, cuisine]);

    const handleCaptureImage = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                
                // Add to images array and return to IDLE state to allow more
                setImages(prev => [...prev, dataUrl]);
                stopCamera();
                setLoadingState(LoadingState.IDLE);
            }
        }
    }, [stopCamera]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                setImages(prev => [...prev, dataUrl]);
            };
            reader.readAsDataURL(file);
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // Ingredient Management
    const removeIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const addIngredient = () => {
        if (newIngredientInput.trim()) {
            setIngredients(prev => [...prev, { name: newIngredientInput.trim(), quantity: "" }]);
            setNewIngredientInput("");
            // Keep focus on input for rapid entry
            setTimeout(() => ingredientInputRef.current?.focus(), 50);
        }
    };

    const handleReset = () => {
        stopCamera();
        setLoadingState(LoadingState.IDLE);
        setImages([]);
        setIngredients([]);
        setRecipes([]);
        setError(null);
        setServings(1);
        setCuisine("Open");
        setNewIngredientInput("");
    };

    const renderContent = () => {
        switch (loadingState) {
            case LoadingState.IDLE:
            case LoadingState.ERROR:
                return (
                    <div className="flex flex-col items-center w-full max-w-md mx-auto">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4 relative">
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500 text-center leading-tight">
                                Culinary Vision
                            </h1>
                            {deferredPrompt && (
                                <button 
                                    onClick={handleInstallClick}
                                    className="absolute -right-10 sm:-right-12 top-1/2 -translate-y-1/2 p-2 bg-teal-900/50 hover:bg-teal-800 text-teal-300 rounded-full transition-all animate-pulse-subtle"
                                    title="Install App"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        
                        <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 text-center px-4">
                            Snap a photo of the ingredients you have on hand, tell me your preferences (if any), and I'll provide delicious recipes you can make with full instructions.
                        </p>
                        
                        {loadingState === LoadingState.ERROR && error && (
                            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-xl text-red-200 text-center text-sm w-full">
                                {error}
                            </div>
                        )}

                        {/* Input Buttons (Moved to Top) */}
                        <div className="grid grid-cols-2 gap-3 w-full px-4 mb-8">
                            <button 
                                onClick={handleStartCamera} 
                                className={`w-full ${images.length > 0 ? 'bg-gray-700' : 'bg-teal-600'} hover:bg-opacity-80 active:scale-[0.98] text-white font-bold py-4 px-4 rounded-2xl text-base transition-all duration-300 shadow-lg flex items-center justify-center gap-2`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {images.length > 0 ? 'Add Photo' : 'Scan'}
                            </button>
                            <button 
                                onClick={handleUploadClick} 
                                className="w-full bg-gray-700 hover:bg-gray-600 active:scale-[0.98] text-white font-bold py-4 px-4 rounded-2xl text-base transition-all duration-300 shadow-lg flex items-center justify-center gap-2 border border-gray-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload
                            </button>
                        </div>

                        {/* Controls Section */}
                        <div className="mb-8 w-full px-2 grid grid-cols-2 gap-4 sm:gap-6">
                            {/* Serving Size */}
                            <div className="flex flex-col items-center gap-3">
                                <label htmlFor="servings" className="text-sm sm:text-base text-gray-400 font-medium uppercase tracking-wider">
                                    Serving Size
                                </label>
                                <div className="flex items-center justify-between bg-gray-800 rounded-2xl p-1.5 shadow-inner border border-gray-700/50 w-full max-w-[160px]">
                                    <button 
                                        onClick={() => setServings(s => Math.max(1, s - 1))}
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-xl flex items-center justify-center transition-all duration-200 active:scale-95 border border-gray-600"
                                        aria-label="Decrease servings"
                                    >
                                        -
                                    </button>
                                    <span className="flex-grow text-center text-xl sm:text-2xl font-bold text-teal-300">
                                        {servings}
                                    </span>
                                    <button 
                                        onClick={() => setServings(s => s + 1)}
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-xl flex items-center justify-center transition-all duration-200 active:scale-95 border border-gray-600"
                                        aria-label="Increase servings"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Cuisine Preference */}
                            <div className="flex flex-col items-center gap-3">
                                <label htmlFor="cuisine" className="text-sm sm:text-base text-gray-400 font-medium uppercase tracking-wider">
                                    Preference
                                </label>
                                <div className="relative w-full max-w-[160px] h-full">
                                    <select 
                                        id="cuisine"
                                        value={cuisine}
                                        onChange={(e) => setCuisine(e.target.value)}
                                        className="w-full h-[54px] sm:h-[62px] bg-gray-800 text-white border border-gray-700/50 rounded-2xl pl-3 pr-8 py-2 appearance-none focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-center text-base sm:text-lg font-medium shadow-inner cursor-pointer truncate"
                                    >
                                        {CUISINE_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-2 sm:right-3 flex items-center pointer-events-none text-teal-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Image Gallery / Staging Area */}
                        {images.length > 0 && (
                            <div className="w-full mb-8">
                                <div className="flex gap-3 overflow-x-auto pb-2 snap-x px-1 scrollbar-hide">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-gray-600 group snap-center">
                                            <img src={img} alt={`Ingredient source ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    {/* Placeholder to show scrolling is possible if many images */}
                                    <div className="w-2 flex-shrink-0"></div>
                                </div>
                            </div>
                        )}

                        {/* Scan Action Button */}
                         {images.length > 0 && (
                            <div className="w-full px-4 mb-2">
                                <button 
                                    onClick={handleAnalyze} 
                                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all duration-300 shadow-lg shadow-teal-900/50 flex items-center justify-center gap-3 animate-pulse-subtle"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    Scan Ingredients ({images.length})
                                </button>
                            </div>
                        )}

                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
                    </div>
                );

            case LoadingState.CAPTURING:
                return (
                    <div className="w-full h-[80vh] flex flex-col">
                        <div className="flex-grow relative rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-800">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute top-6 left-0 right-0 text-center pointer-events-none">
                                <span className="bg-black/60 text-white px-6 py-2 rounded-full text-sm backdrop-blur-md border border-white/10 shadow-lg">
                                    Position ingredients in frame
                                </span>
                            </div>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="mt-6 grid grid-cols-2 gap-4 w-full px-4">
                            <button onClick={() => { stopCamera(); setLoadingState(LoadingState.IDLE); }} className="bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all duration-200 border border-gray-700">
                                Cancel
                            </button>
                            <button onClick={handleCaptureImage} className="bg-white hover:bg-gray-200 active:scale-95 text-teal-900 font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-white/10">
                                Capture
                            </button>
                        </div>
                    </div>
                );

            case LoadingState.ANALYZING:
            case LoadingState.FETCHING_RECIPES:
                return (
                    <div className="text-center flex flex-col items-center justify-center flex-grow w-full max-w-md mx-auto">
                        {/* Analyzing Stack */}
                        <div className="relative w-40 h-40 sm:w-56 sm:h-56 mb-10">
                             {images.length > 0 && (
                                <>
                                    {images.slice(0, 3).map((img, idx) => (
                                        <div 
                                            key={idx}
                                            className="absolute inset-0 rounded-2xl overflow-hidden border-2 border-teal-500/30 shadow-lg bg-gray-900"
                                            style={{ 
                                                transform: `rotate(${(idx - (images.length > 3 ? 1 : (images.length-1)/2)) * 5}deg) translateY(${idx * 2}px)`,
                                                zIndex: 10 - idx,
                                                opacity: 1 - (idx * 0.1)
                                            }}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover opacity-80" />
                                        </div>
                                    ))}
                                </>
                             )}
                             <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className="bg-black/40 backdrop-blur-sm rounded-full p-4 animate-pulse">
                                    <Spinner className="w-10 h-10 text-teal-400" />
                                </div>
                             </div>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-bold text-white animate-pulse mb-4">
                            {loadingState === LoadingState.ANALYZING ? "Checking the Pantry..." : "Chefing it up..."}
                        </h2>
                        <p className="text-gray-400 text-sm sm:text-base px-8">
                            {loadingState === LoadingState.ANALYZING 
                                ? `Scanning ${images.length} photo${images.length > 1 ? 's' : ''} for ingredients.` 
                                : "Designing recipes based on your selection."}
                        </p>
                    </div>
                );

            case LoadingState.REVIEW_INGREDIENTS:
                return (
                    <div className="w-full max-w-md mx-auto flex flex-col h-full pb-24">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500 mb-2 mt-4">
                            Pantry Check
                        </h2>
                        <p className="text-gray-400 text-center text-sm mb-6">
                            We found these items. Add or remove anything.
                        </p>

                        <div className="flex-grow overflow-y-auto px-2 mb-6 space-y-3 scrollbar-hide">
                             {/* Add Ingredient Input */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    ref={ingredientInputRef}
                                    type="text"
                                    value={newIngredientInput}
                                    onChange={(e) => setNewIngredientInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                                    placeholder="Add item (e.g. '2 eggs')"
                                    className="flex-grow bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                                />
                                <button 
                                    onClick={addIngredient}
                                    disabled={!newIngredientInput.trim()}
                                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-teal-400 rounded-xl px-4 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>

                            {ingredients.map((ing, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-800/80 border border-gray-700/50 rounded-xl p-3 shadow-sm animate-fade-in-up">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                        <div>
                                            <span className="text-white font-medium block">{ing.name}</span>
                                            {ing.quantity && <span className="text-xs text-gray-400">{ing.quantity}</span>}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeIngredient(idx)}
                                        className="text-gray-500 hover:text-red-400 p-2 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {ingredients.length === 0 && (
                                <div className="text-center py-8 text-gray-500 italic border-2 border-dashed border-gray-700 rounded-xl">
                                    No ingredients listed.<br/>Add some manually or rescan.
                                </div>
                            )}
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent z-50 pointer-events-none flex flex-col gap-3 max-w-md mx-auto w-full">
                            <button 
                                onClick={handleGenerateRecipes}
                                disabled={ingredients.length === 0}
                                className="pointer-events-auto w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all duration-300 shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                Generate Recipes
                            </button>
                             <button 
                                onClick={handleReset} 
                                className="pointer-events-auto text-gray-400 hover:text-white text-sm font-medium py-2"
                            >
                                Cancel & Start Over
                            </button>
                        </div>
                    </div>
                );

            case LoadingState.SHOWING_RESULTS:
                return (
                    <div className="w-full pb-28">
                        <div className="text-center mb-8 pt-4">
                            <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500 mb-2">
                                Your Menu
                            </h2>
                            <div className="flex flex-col gap-1 text-gray-400 text-sm sm:text-base">
                                <p>
                                    {recipes.length} recipes found for {servings} serving{servings > 1 ? 's' : ''}
                                </p>
                                {cuisine !== "Open" && (
                                    <p className="text-teal-400 font-medium">
                                        Style: {cuisine}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-6 px-2 sm:px-0">
                            {recipes.map((recipe, index) => (
                                <RecipeCard key={index} recipe={recipe} />
                            ))}
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent z-50 pointer-events-none flex justify-center">
                            <button 
                                onClick={handleReset}
                                className="pointer-events-auto bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-teal-900/50 transition-all duration-300 flex items-center gap-2 backdrop-blur-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Start Over
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-[100dvh] bg-gray-900 text-white font-sans p-4 sm:p-6 flex flex-col items-center">
             <div className="w-full max-w-3xl flex-grow flex flex-col">
                {renderContent()}
             </div>
        </div>
    );
};

export default App;
