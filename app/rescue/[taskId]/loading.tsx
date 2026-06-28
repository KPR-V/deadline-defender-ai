'use client';

import { Shield, RefreshCw } from 'lucide-react';

export default function RescueLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      <header className="border-b border-red-900/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg text-white shadow-md shadow-red-950/40 animate-pulse">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight block">RESCUE MODE</span>
            <span className="text-[9px] text-red-400 font-bold tracking-widest uppercase block -mt-1 font-mono">
              Emergency Protocol
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="h-10 w-1/2 bg-slate-900/50 border border-red-900/30 rounded-lg animate-pulse" />
        <div className="h-32 bg-slate-900/50 border border-red-900/30 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>

        <div className="flex items-center justify-center mt-8">
          <RefreshCw className="w-5 h-5 text-red-500 animate-spin mr-2" />
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
            Activating Rescue Protocol...
          </span>
        </div>
      </main>
    </div>
  );
}
