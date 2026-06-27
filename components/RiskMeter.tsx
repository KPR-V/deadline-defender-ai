'use client';

import React from 'react';
import { RiskLevel } from '../types/task';

interface RiskMeterProps {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskMeter({ score, level, size = 'md' }: RiskMeterProps) {
  const getColors = (lvl: RiskLevel) => {
    switch (lvl) {
      case 'critical':
        return { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', stroke: '#ef4444' };
      case 'danger':
        return { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', stroke: '#f97316' };
      case 'warning':
        return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', stroke: '#f59e0b' };
      case 'safe':
      default:
        return { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', stroke: '#10b981' };
    }
  };

  const colors = getColors(level);
  
  const sizeMap = {
    sm: { diameter: 48, strokeWidth: 4, font: 'text-xs' },
    md: { diameter: 80, strokeWidth: 6, font: 'text-base font-bold' },
    lg: { diameter: 120, strokeWidth: 8, font: 'text-2xl font-black' }
  };

  const { diameter, strokeWidth, font } = sizeMap[size];
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div id={`risk-meter-${size}`} className="relative flex items-center justify-center">
      <svg width={diameter} height={diameter} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Animated dynamic circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="transparent"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Percentage Center Text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`${font} ${colors.text}`}>{score}</span>
        {size === 'lg' && (
          <span className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold mt-0.5">Risk</span>
        )}
      </div>
    </div>
  );
}
