'use client';

import { Shield, RefreshCw } from 'lucide-react';

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg text-white shadow-md shadow-cyan-950/40">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight block">DEADLINE DEFENDER</span>
            <span className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase block -mt-1 font-mono">
              Settings
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Section skeletons */}
        {[1, 2, 3].map((section) => (
          <div key={section} className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-6 space-y-4">
            <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-slate-800 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-center mt-8">
          <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin mr-2" />
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
            Loading Configurations...
          </span>
        </div>
      </main>
    </div>
  );
}
