import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const tips = [
    "Mise en place (everything in its place) is the secret to a stress-free cooking experience. Prep all your ingredients before you start.",
    "A sharp knife is a safe knife. Dull knives require more pressure, increasing the chance of slipping.",
    "Taste as you go! Seasoning at different stages of cooking builds layers of flavor that can't be achieved by seasoning only at the end.",
    "Don't overcrowd the pan. Give your ingredients space to brown properly for better texture and taste; cook in batches if necessary.",
    "Let your meat rest after cooking. This allows the juices to redistribute, resulting in a more tender and flavorful cut.",
    "Save your pasta water! The starchy, salty water is liquid gold for emulsifying and thickening your sauces.",
    "Use fresh herbs whenever possible. Add delicate herbs like basil, cilantro, and parsley at the end of cooking to preserve their vibrant flavor."
];

const shuffleArray = (array: string[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


const LoadingTips: React.FC = () => {
    const [currentTip, setCurrentTip] = useState('');
    const [remainingTips, setRemainingTips] = useState<string[]>([]);

    useEffect(() => {
        // Initialize with shuffled tips
        const shuffledTips = shuffleArray(tips);
        setCurrentTip(shuffledTips[0]);
        setRemainingTips(shuffledTips.slice(1));

        const intervalId = setInterval(() => {
            setRemainingTips(prevRemaining => {
              if (prevRemaining.length > 0) {
                // There are tips left, show the next one
                const nextTip = prevRemaining[0];
                setCurrentTip(nextTip);
                return prevRemaining.slice(1);
              } else {
                // No tips left, reshuffle and start over
                // We filter out the current tip before shuffling to ensure the next tip is always different
                const newShuffledTips = shuffleArray(tips.filter(t => t !== currentTip)); 
                setCurrentTip(newShuffledTips[0]);
                return newShuffledTips.slice(1);
              }
            });
        }, 8000);

        return () => clearInterval(intervalId);
    // We only want to run this effect once on mount to set up the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="text-center max-w-2xl mx-auto py-12">
            <LoadingSpinner />
            <h3 className="mt-6 text-xl font-semibold text-gray-800 dark:text-gray-200">Masterchef's Tips</h3>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400 italic transition-opacity duration-500">
                "{currentTip}"
            </p>
        </div>
    );
};

export default LoadingTips;