'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export default function LoadingState({ message = 'Synchronizing Tactical Grids...', className = '' }: LoadingStateProps) {
  return (
    <div
      id="loading-state"
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
    >
      <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
      <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest animate-pulse">
        {message}
      </p>
    </div>
  );
}
