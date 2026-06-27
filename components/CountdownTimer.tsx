'use client';

import React, { useState, useEffect } from 'react';
import { formatTimeRemaining } from '../lib/utils/date';

interface CountdownTimerProps {
  deadline: Date | string;
  className?: string;
  onTick?: (isOverdue: boolean) => void;
}

export default function CountdownTimer({ deadline, className = '', onTick }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const d = new Date(deadline);
    
    const update = () => {
      const remainingText = formatTimeRemaining(d);
      setTimeLeft(remainingText);
      if (onTick) {
        onTick(remainingText === 'OVERDUE');
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline, onTick]);

  const isOverdue = timeLeft === 'OVERDUE';

  return (
    <div
      id="countdown-timer"
      className={`font-mono font-bold px-3 py-1.5 rounded text-sm select-none tracking-tight border ${
        isOverdue 
          ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' 
          : 'bg-slate-900/40 text-slate-300 border-slate-800'
      } ${className}`}
    >
      {timeLeft}
    </div>
  );
}
