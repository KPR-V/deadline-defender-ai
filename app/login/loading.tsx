'use client';

import { Shield, RefreshCw } from 'lucide-react';

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505]">
      <div className="p-3 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-cyan-950/40 animate-pulse">
        <Shield className="w-8 h-8" />
      </div>
      <div className="mt-6 flex items-center">
        <RefreshCw className="w-4 h-4 text-cyan-500 animate-spin mr-2" />
        <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
          Preparing Secure Login...
        </p>
      </div>
    </div>
  );
}
