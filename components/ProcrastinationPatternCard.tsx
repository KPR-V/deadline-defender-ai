"use client";

import React, { useEffect, useState } from "react";
import { Brain, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/firebase/AuthContext";
import { getBehaviorSignals } from "../lib/firebase/firestore";
import {
  computeProcrastinationStats,
  ProcrastinationStats,
} from "../lib/behavior/statsEngine";

export default function ProcrastinationPatternCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProcrastinationStats | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        const signals = await getBehaviorSignals(user!.uid);
        const computedStats = computeProcrastinationStats(signals);
        setStats(computedStats);

        // Fetch AI insights
        const res = await fetch("/api/behavior/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(computedStats),
        });
        const data = await res.json();
        if (data.insights) {
          setInsights(data.insights);
        }
      } catch (err) {
        console.error("Failed to load procrastination pattern:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="border border-white/10 bg-[#0A0A0A] rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-white/10 w-1/3 rounded mb-4"></div>
        <div className="h-4 bg-white/5 w-full rounded mb-2"></div>
        <div className="h-4 bg-white/5 w-2/3 rounded"></div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-[#0A0A0A] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-400" />
        <h2 className="text-sm font-bold font-mono tracking-wide text-white uppercase">
          Your Procrastination Pattern
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#111] border border-white/5 p-3 rounded-lg flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-500 font-mono uppercase mb-1 text-center">
            Reminder Response
          </span>
          <span className="text-lg font-bold text-slate-200">
            {stats ? Math.round(stats.reminderResponseRate) : 0}%
          </span>
        </div>
        <div className="bg-[#111] border border-white/5 p-3 rounded-lg flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-500 font-mono uppercase mb-1 text-center">
            Focus Block Completion
          </span>
          <span className="text-lg font-bold text-slate-200">
            {stats ? Math.round(stats.focusBlockCompletionRate) : 0}%
          </span>
        </div>
        <div className="bg-[#111] border border-white/5 p-3 rounded-lg flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-500 font-mono uppercase mb-1 text-center">
            Rescue Success
          </span>
          <span className="text-lg font-bold text-slate-200">
            {stats ? Math.round(stats.rescueSuccessRate) : 0}%
          </span>
        </div>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-lg p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> AI Insights
        </h3>

        {insights.length > 0 ? (
          <ul className="space-y-2">
            {insights.map((insight, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-slate-300"
              >
                <span className="text-purple-400 mt-0.5">•</span>
                <span className="leading-snug">{insight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Not enough data yet. Complete some tasks and ignore some reminders!
          </div>
        )}
      </div>
    </div>
  );
}
