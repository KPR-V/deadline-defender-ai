'use client';

import { Shield, RefreshCw } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      {/* Header skeleton */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg text-white shadow-md shadow-cyan-950/40">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight block">DEADLINE DEFENDER</span>
              <span className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase block -mt-1 font-mono">
                Command Center
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-8 w-8 bg-slate-800 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Safety Score Skeleton */}
        <div className="mb-8 h-28 bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse" />

        {/* Action buttons skeleton */}
        <div className="flex gap-3 mb-8">
          <div className="h-10 w-36 bg-slate-900/50 border border-slate-800/60 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-slate-900/50 border border-slate-800/60 rounded-lg animate-pulse" />
        </div>

        {/* Task cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center mt-12">
          <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin mr-2" />
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
            Loading Tactical Overview...
          </span>
        </div>
      </main>
    </div>
  );
}
