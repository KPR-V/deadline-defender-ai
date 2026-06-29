'use client';

import React from 'react';
import { Shield, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface DeadlineSafetyCardProps {
  score: number;
  totalTasks: number;
  criticalCount: number;
  dangerCount: number;
  warningCount: number;
  safeCount: number;
}

export default function DeadlineSafetyCard({
  score,
  totalTasks,
  criticalCount,
  dangerCount,
  warningCount,
  safeCount
}: DeadlineSafetyCardProps) {
  
  const getSafetyDetails = (sc: number) => {
    if (sc >= 80) {
      return {
        title: 'DEFENDER GREEN',
        description: 'All defense grids stable. No immediate threats detected.',
        bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        icon: Shield
      };
    } else if (sc >= 60) {
      return {
        title: 'WARNING YELLOW',
        description: `${criticalCount + dangerCount} upcoming tasks need focus soon. Watch effort gaps closely.`,
        bgColor: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        icon: Activity
      };
    } else {
      return {
        title: 'CRITICAL RED',
        description: 'Grids heavily overloaded. Multiple deadlines in high risk. Engage Rescue Mode immediately.',
        bgColor: 'bg-red-500/10 border-red-500/20 text-red-400',
        icon: ShieldAlert
      };
    }
  };

  const details = getSafetyDetails(score);
  const Icon = details.icon;

  return (
    <div
      id="deadline-safety-card"
      className="glass-card rounded-2xl p-6 shadow-2xl relative overflow-hidden group border border-cyan-500/20 hover:border-cyan-400/50"
    >
      {/* Decorative ambient background glow */}
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500" />
      {/* Decorative pulse line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-pulse-subtle" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left Side: Large Gauge */}
        <div className="flex flex-col items-center justify-center p-2 border-r border-slate-800/50 md:mr-4">
          <div className="relative flex items-center justify-center">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="8"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="transparent"
                stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 - (score / 100) * 2 * Math.PI * 48}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-white tracking-tight">{score}%</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Safety Score</span>
            </div>
          </div>
        </div>

        {/* Middle Column: Status Text */}
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${details.bgColor}`}>
              {details.title}
            </span>
            <span className="text-slate-500 text-xs">• Total tracked tasks: {totalTasks}</span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            Commitment Health Assessment
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {details.description}
          </p>

          {/* Quick status dots */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <div className="bg-[#050505] border border-white/5 rounded-lg p-2 flex flex-col items-center">
              <span className="text-xs font-bold text-gray-500">Safe</span>
              <span className="text-base font-black text-emerald-400 mt-0.5">{safeCount}</span>
            </div>
            <div className="bg-[#050505] border border-white/5 rounded-lg p-2 flex flex-col items-center">
              <span className="text-xs font-bold text-gray-500">Warning</span>
              <span className="text-base font-black text-amber-400 mt-0.5">{warningCount}</span>
            </div>
            <div className="bg-[#050505] border border-white/5 rounded-lg p-2 flex flex-col items-center">
              <span className="text-xs font-bold text-gray-500">Danger</span>
              <span className="text-base font-black text-orange-400 mt-0.5">{dangerCount}</span>
            </div>
            <div className="bg-[#050505] border border-white/5 rounded-lg p-2 flex flex-col items-center">
              <span className="text-xs font-bold text-gray-500">Critical</span>
              <span className="text-base font-black text-red-500 mt-0.5 animate-pulse">{criticalCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
