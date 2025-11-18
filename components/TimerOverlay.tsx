import React, { useState, useEffect, useRef } from 'react';

interface TimerOverlayProps {
  durationSeconds: number;
  isOpen: boolean;
  onClose: () => void;
}

const TimerOverlay: React.FC<TimerOverlayProps> = ({ durationSeconds, isOpen, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(true); // Auto-start when opened
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Reset timer when duration changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(durationSeconds);
      setIsActive(true);
      setIsFinished(false);
    }
  }, [isOpen, durationSeconds]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsFinished(true);
      setIsActive(false);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    if (isFinished) {
        // Restart
        setTimeLeft(durationSeconds);
        setIsFinished(false);
        setIsActive(true);
    } else {
        setIsActive(!isActive);
    }
  };

  const resetTimer = () => {
    setTimeLeft(durationSeconds);
    setIsActive(false);
    setIsFinished(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    // Non-blocking fixed positioning, compact size
    <div className="fixed top-4 right-4 z-[100] w-72 bg-gray-800/95 backdrop-blur-md border border-gray-600 rounded-2xl shadow-2xl p-4 flex flex-col items-center transition-all duration-300 animate-pulse-subtle pointer-events-auto">
        {/* Header with Close */}
        <div className="flex justify-between items-center w-full mb-2">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isFinished ? "Time's Up!" : "Kitchen Timer"}
            </h3>
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-full"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Clock Display - Compact */}
        <div className={`text-4xl font-mono font-bold mb-3 tracking-wider tabular-nums ${isFinished ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {formatTime(timeLeft)}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-gray-700 rounded-full mb-4 overflow-hidden">
            <div 
                className={`h-full transition-all duration-1000 ease-linear ${isFinished ? 'bg-red-500' : 'bg-teal-500'}`}
                style={{ width: `${(timeLeft / durationSeconds) * 100}%` }}
            ></div>
        </div>

        {/* Controls - Compact */}
        <div className="flex gap-2 w-full">
            <button 
                onClick={toggleTimer}
                className={`flex-grow py-2 px-4 rounded-lg font-bold text-sm text-white shadow-sm transition-colors flex items-center justify-center gap-2 ${
                    isFinished 
                    ? 'bg-teal-600 hover:bg-teal-500' 
                    : isActive 
                        ? 'bg-yellow-600 hover:bg-yellow-500' 
                        : 'bg-teal-600 hover:bg-teal-500'
                }`}
            >
                {isFinished ? (
                    <>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> 
                         Restart
                    </>
                ) : isActive ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> 
                        Pause
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg> 
                        Resume
                    </>
                )}
            </button>
            <button 
                onClick={resetTimer}
                className="py-2 px-3 rounded-lg bg-gray-700 text-gray-300 font-bold text-sm hover:bg-gray-600 transition-colors"
                title="Reset Timer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
        </div>
    </div>
  );
};

export default TimerOverlay;
