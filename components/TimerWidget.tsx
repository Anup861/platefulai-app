import React, { useState, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon, ResetIcon, XIcon, TimerIcon } from './icons';

interface TimerWidgetProps {
  duration: number; // in seconds
  description: string;
  onClose: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TimerWidget: React.FC<TimerWidgetProps> = ({ duration, description, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Optional: Add a sound or notification here
      new Audio('https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3').play().catch(e => console.error("Error playing sound.", e));
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeLeft]);
  
  // Reset timer if the duration prop changes (i.e., a new timer is started)
  useEffect(() => {
    setTimeLeft(duration);
    setIsActive(true);
  }, [duration, description]);

  const handleReset = useCallback(() => {
    setTimeLeft(duration);
    setIsActive(true);
  }, [duration]);

  const isFinished = timeLeft === 0;

  return (
    <div className={`fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 w-80 z-50 border border-gray-200 dark:border-gray-700 transition-transform duration-300 ${isFinished ? 'animate-bounce' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
            <TimerIcon className={`w-6 h-6 ${isFinished ? 'text-red-500' : 'text-green-500'}`}/>
            <h4 className="font-bold text-lg">Cooking Timer</h4>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <XIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 truncate" title={description}>
        {description}
      </p>
      <div className="text-center my-4">
        <span className={`text-6xl font-mono font-bold ${isFinished ? 'text-red-500' : ''}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="flex justify-center items-center gap-4">
        <button
          onClick={handleReset}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Reset Timer"
        >
          <ResetIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => setIsActive(!isActive)}
          className={`p-4 rounded-full text-white transition-transform hover:scale-105 ${
            isActive && !isFinished ? 'bg-orange-500' : 'bg-green-500'
          }`}
          aria-label={isActive ? 'Pause Timer' : 'Start Timer'}
          disabled={isFinished}
        >
          {isActive && !isFinished ? (
            <PauseIcon className="w-8 h-8" />
          ) : (
            <PlayIcon className="w-8 h-8" />
          )}
        </button>
        <div className="w-10 h-10"></div>
      </div>
    </div>
  );
};

export default TimerWidget;