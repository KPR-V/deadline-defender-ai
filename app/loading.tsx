'use client';

import { Shield } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505]">
      <div className="p-3 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-cyan-950/40 animate-pulse">
        <Shield className="w-8 h-8" />
      </div>
      <p className="mt-4 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest animate-pulse">
        Initializing Deadline Defender...
      </p>
    </div>
  );
}
