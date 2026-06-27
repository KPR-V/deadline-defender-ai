'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function EmptyState({ 
  title = 'No commitments loaded', 
  description = 'Your system defense grid is clear. Capture a relative deadline or click seed demo data to populate.',
  className = ''
}: EmptyStateProps) {
  return (
    <div
      id="empty-state"
      className={`border border-dashed border-white/10 rounded-xl p-8 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="p-3 bg-[#111] rounded-full border border-white/5 mb-3.5 shadow-lg">
        <ShieldAlert className="w-6 h-6 text-gray-500" />
      </div>
      <h3 className="text-sm font-bold text-gray-300 font-mono uppercase tracking-wider mb-1">
        {title}
      </h3>
      <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
        {description}
      </p>
    </div>
  );
}
