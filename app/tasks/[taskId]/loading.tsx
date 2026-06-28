'use client';

import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';

export default function TaskDetailLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg text-white shadow-md shadow-cyan-950/40">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight block">DEADLINE DEFENDER</span>
              <span className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase block -mt-1 font-mono">
                Task Intel
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Task title skeleton */}
        <div className="h-8 w-2/3 bg-slate-900/50 border border-slate-800/60 rounded-lg animate-pulse" />

        {/* Risk meter & countdown skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse" />
          <div className="h-40 bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse" style={{ animationDelay: '100ms' }} />
        </div>

        {/* Subtask checklist skeleton */}
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-6 space-y-3">
          <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 bg-slate-800 rounded animate-pulse" />
              <div className="h-4 flex-1 bg-slate-800 rounded animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            </div>
          ))}
        </div>

        {/* Focus blocks skeleton */}
        <div className="h-48 bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse" style={{ animationDelay: '200ms' }} />

        {/* Loading indicator */}
        <div className="flex items-center justify-center mt-8">
          <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin mr-2" />
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
            Loading Mission Briefing...
          </span>
        </div>
      </main>
    </div>
  );
}
