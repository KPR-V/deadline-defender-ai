'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, AlertTriangle, Play, CheckCircle2, ChevronRight, Eye } from 'lucide-react';
import { Task } from '../types/task';
import RiskBadge from './RiskBadge';
import RiskMeter from './RiskMeter';
import CountdownTimer from './CountdownTimer';
import { formatDeadline } from '../lib/utils/date';
import { formatDuration } from '../lib/utils/format';
import { TASK_CATEGORIES } from '../lib/utils/constants';

interface TaskCardProps {
  task: Task;
  onQuickComplete?: (taskId: string) => void;
}

export default function TaskCard({ task, onQuickComplete }: TaskCardProps) {
  const isCritical = task.riskScore >= 81 || task.importance === 'critical';
  const categoryConfig = TASK_CATEGORIES.find(c => c.value === task.category) || TASK_CATEGORIES[TASK_CATEGORIES.length - 1];

  return (
    <div
      id={`task-card-${task.id}`}
      className={`bg-[#0E0E0E] border rounded-xl p-5 shadow-lg relative hover:border-white/20 transition-all duration-300 flex flex-col justify-between ${
        isCritical 
          ? 'border-red-500/20 bg-gradient-to-br from-red-950/10 to-[#111]' 
          : 'border-white/10'
      }`}
    >
      {/* Risk background pulse for Critical tasks */}
      {isCritical && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -z-10 animate-pulse" />
      )}

      {/* TOP: Category and Status */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${categoryConfig.color}`}>
            {categoryConfig.label}
          </span>
          <span className="text-gray-500 text-[10px] uppercase tracking-wider font-mono">
            {task.source}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CountdownTimer deadline={task.deadline} />
        </div>
      </div>

      {/* MID: Title, Description & Metadata */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-white tracking-tight hover:text-cyan-400 transition-colors line-clamp-1 mb-1">
          {task.title}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
          {task.description || 'No description provided.'}
        </p>

        {/* Technical Data Blocks */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400 border-y border-white/5 py-2.5 my-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>Effort: <strong className="text-gray-300">{formatDuration(task.estimatedMinutes)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span className="truncate">Due: <strong className="text-gray-300">{formatDeadline(task.deadline).split(',')[1]}</strong></span>
          </div>
        </div>
      </div>

      {/* BOTTOM: Progress, Risk Meter, Actions */}
      <div className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5 font-mono">
            <span>Progress</span>
            <span className="font-bold text-gray-200">{task.progressPercentage}%</span>
          </div>
          <div className="w-full bg-[#050505] rounded-full h-1.5 border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                task.progressPercentage >= 100 
                  ? 'bg-emerald-500' 
                  : isCritical 
                    ? 'bg-red-500' 
                    : 'bg-cyan-500'
              }`}
              style={{ width: `${task.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="flex items-center justify-between bg-[#050505] p-2.5 rounded-lg border border-white/5">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500">Defense Index</span>
            <span className="text-xs font-bold text-gray-300 mt-0.5">{task.riskExplanation ? 'Indexed' : 'Calculating...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge level={task.riskLevel} />
            <RiskMeter score={task.riskScore} level={task.riskLevel} size="sm" />
          </div>
        </div>

        {/* First Useful Action snippet (if available) */}
        {task.firstUsefulAction && (
          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-2.5 text-[11px] leading-relaxed">
            <div className="font-bold text-cyan-400 uppercase tracking-wider text-[9px] mb-0.5">💡 First Useful Action (5m)</div>
            <p className="text-gray-300 line-clamp-1">{task.firstUsefulAction}</p>
          </div>
        )}

        {/* Actions row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            href={`/tasks/${task.id}`}
            className="flex items-center justify-center gap-1.5 py-2 px-3 border border-white/10 rounded-lg text-xs font-bold text-gray-300 bg-[#111] hover:bg-white/5 hover:text-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Plan Center
          </Link>

          {isCritical ? (
            <Link
              href={`/rescue/${task.id}`}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition-colors animate-pulse hover:animate-none"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Rescue Mode
            </Link>
          ) : (
            <button
              onClick={() => onQuickComplete && onQuickComplete(task.id)}
              disabled={task.status === 'completed'}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-[#111] hover:bg-white/10 text-white disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
