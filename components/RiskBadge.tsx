'use client';

import React from 'react';
import { RiskLevel } from '../types/task';
import { RISK_LEVELS } from '../lib/utils/constants';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export default function RiskBadge({ level, className = '' }: RiskBadgeProps) {
  const config = RISK_LEVELS[level] || RISK_LEVELS.safe;

  return (
    <span
      id={`risk-badge-${level}`}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border shadow-[0_0_10px_rgba(0,0,0,0.1)] ${config.color} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {config.label}
    </span>
  );
}
