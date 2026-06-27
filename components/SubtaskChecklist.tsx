'use client';

import React from 'react';
import { CheckSquare, Square, Play, CheckCircle2, Clock } from 'lucide-react';
import { TaskStep } from '../types/task';
import { formatDuration } from '../lib/utils/format';

interface SubtaskChecklistProps {
  steps: TaskStep[];
  onToggleStep: (stepId: string, currentStatus: TaskStep['status']) => Promise<void>;
  isLoading?: boolean;
}

export default function SubtaskChecklist({ steps, onToggleStep, isLoading = false }: SubtaskChecklistProps) {
  
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div id="subtask-checklist" className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-1">
        <h4 className="text-xs uppercase font-black tracking-wider text-slate-400 font-mono">
          AI Action Plan Steps
        </h4>
        <span className="text-[10px] font-mono text-slate-500">
          {steps.filter(s => s.status === 'completed').length}/{steps.length} completed
        </span>
      </div>

      {sortedSteps.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-500 font-mono">No steps generated for this plan yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedSteps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isInProgress = step.status === 'in_progress';

            return (
              <div
                key={step.id}
                className={`flex items-start justify-between gap-3 p-3.5 border rounded-lg transition-all ${
                  isCompleted
                    ? 'border-emerald-500/10 bg-emerald-500/5 opacity-70'
                    : isInProgress
                      ? 'border-cyan-500/20 bg-cyan-500/5'
                      : 'border-slate-800/80 bg-slate-950/20 hover:border-slate-700/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Interactive toggle button */}
                  <button
                    onClick={() => !isLoading && onToggleStep(step.id, step.status)}
                    disabled={isLoading}
                    className={`mt-0.5 p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isInProgress ? (
                      <Play className="w-5 h-5 text-cyan-400 animate-pulse" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                  </button>

                  <div className="space-y-0.5">
                    <p className={`text-xs font-bold leading-tight ${isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p className={`text-[11px] leading-relaxed ${isCompleted ? 'text-slate-500' : 'text-slate-400'}`}>
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Duration indicator */}
                <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-slate-500 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span>{formatDuration(step.estimatedMinutes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
