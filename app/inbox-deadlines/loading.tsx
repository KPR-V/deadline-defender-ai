'use client';

import { Shield, RefreshCw } from 'lucide-react';

export default function InboxDeadlinesLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg text-white shadow-md shadow-cyan-950/40">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight block">DEADLINE DEFENDER</span>
            <span className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase block -mt-1 font-mono">
              Inbox Scanner
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <div className="h-8 w-64 bg-slate-900/50 border border-slate-800/60 rounded-lg animate-pulse mb-6" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-20 bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}

        <div className="flex items-center justify-center mt-8">
          <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin mr-2" />
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
            Scanning Inbox for Deadlines...
          </span>
        </div>
      </main>
    </div>
  );
}
