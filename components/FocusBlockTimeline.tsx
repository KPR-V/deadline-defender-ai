'use client';

import React from 'react';
import { Clock, Calendar, CheckSquare, AlertTriangle, CheckCircle, Flame } from 'lucide-react';
import { FocusBlock } from '../types/task';
import { formatDeadline } from '../lib/utils/date';
import { formatDuration } from '../lib/utils/format';

interface FocusBlockTimelineProps {
  blocks: FocusBlock[];
  onUpdateBlockStatus?: (blockId: string, status: FocusBlock['status']) => Promise<void>;
  busyBlocks?: Array<{ title: string; start: Date; end: Date }>;
}

export default function FocusBlockTimeline({ 
  blocks, 
  onUpdateBlockStatus,
  busyBlocks = []
}: FocusBlockTimelineProps) {
  
  const getStatusStyle = (status: FocusBlock['status']) => {
    switch (status) {
      case 'completed':
        return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', label: 'Completed' };
      case 'missed':
        return { text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', label: 'Missed' };
      case 'accepted':
        return { text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', label: 'Confirmed' };
      case 'suggested':
      default:
        return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5', label: 'Suggested' };
    }
  };

  const sortedBlocks = [...blocks].sort((a, b) => {
    const aTime = a.start instanceof Date ? a.start.getTime() : new Date(a.start).getTime();
    const bTime = b.start instanceof Date ? b.start.getTime() : new Date(b.start).getTime();
    return aTime - bTime;
  });

  return (
    <div id="focus-block-timeline" className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs uppercase font-black tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-cyan-400" />
          Tactical Focus Blocks Schedule
        </h4>
        <span className="text-[10px] font-mono text-slate-500">
          {blocks.length} sessions scheduled
        </span>
      </div>

      {sortedBlocks.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-500 font-mono">No focus blocks generated for this task yet.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-5 py-2">
          {sortedBlocks.map((block, idx) => {
            const style = getStatusStyle(block.status);
            const isEmergency = block.reason.includes('EMERGENCY') || block.reason.includes('🔥');
            
            const startTime = block.start instanceof Date ? block.start : new Date(block.start);
            const endTime = block.end instanceof Date ? block.end : new Date(block.end);

            return (
              <div key={block.id || idx} className="relative group">
                {/* Bullet Node */}
                <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-slate-950 flex items-center justify-center transition-all ${
                  isEmergency ? 'border-red-500 animate-pulse scale-110' : 'border-slate-700'
                }`}>
                  {block.status === 'completed' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {block.status === 'accepted' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </span>

                {/* Block card */}
                <div className={`border rounded-xl p-4 shadow-md bg-slate-950/50 backdrop-blur-sm transition-all group-hover:border-slate-700 ${
                  isEmergency 
                    ? 'border-red-500/20 bg-gradient-to-r from-red-950/10 to-transparent' 
                    : 'border-slate-800/80'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      {/* Reason */}
                      <h5 className={`text-xs font-bold font-mono tracking-tight flex items-center gap-1.5 ${
                        isEmergency ? 'text-red-400' : 'text-slate-200'
                      }`}>
                        {isEmergency && <Flame className="w-3.5 h-3.5 text-red-500" />}
                        {block.reason}
                      </h5>

                      {/* Timestamps */}
                      <p className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} @ </span>
                        <strong className="text-slate-300">
                          {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          {' - '}
                          {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </strong>
                        <span className="text-slate-500">• ({formatDuration(block.durationMinutes)})</span>
                      </p>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                        {style.label}
                      </span>

                      {onUpdateBlockStatus && block.status !== 'completed' && block.status !== 'missed' && (
                        <div className="flex gap-1.5">
                          {block.status === 'suggested' && (
                            <button
                              onClick={() => onUpdateBlockStatus(block.id, 'accepted')}
                              className="text-[10px] font-mono font-bold px-2.5 py-1 border border-slate-800 rounded bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-400 transition-all"
                            >
                              Confirm
                            </button>
                          )}
                          {block.status === 'accepted' && (
                            <button
                              onClick={() => onUpdateBlockStatus(block.id, 'completed')}
                              className="text-[10px] font-mono font-bold px-2.5 py-1 border border-emerald-500/20 rounded bg-emerald-950/20 hover:bg-emerald-500/20 text-emerald-400 transition-all"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
