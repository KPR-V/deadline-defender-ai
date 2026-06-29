"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  Sparkles,
  AlertTriangle,
  Target,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../lib/firebase/AuthContext";
import { isDemoMode } from "../lib/env";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div
      id="landing-page"
      className="relative min-h-screen flex flex-col justify-between overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

      {/* Navigation Header */}
      <header className="border-b border-white/10 bg-[#050505]/70 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 via-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-cyan-500/20 animate-float">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight block flex items-center gap-2">
                <span className="text-gradient-cyan font-extrabold">DEADLINE DEFENDER</span>
                <span className="text-[9px] bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-widest">
                  AI CORE
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase block mt-0.5 font-mono">
                Proactive Rescue & Risk Prediction Grid
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-bold text-slate-200 py-2 px-4 rounded-lg transition-all"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-bold text-slate-400 hover:text-white transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?signup=true"
                  className="bg-cyan-600 hover:bg-cyan-500 text-sm font-bold text-white py-2 px-4 rounded-lg shadow-lg shadow-cyan-900/20 transition-all"
                >
                  Secure Grids
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24 flex-grow flex flex-col justify-center text-center space-y-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full font-mono uppercase tracking-wider mx-auto">
          <Sparkles className="w-3.5 h-3.5" />
          Preemptive Procrastination Interceptor
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none max-w-4xl mx-auto">
          Defend Your Deadlines. <br />
          <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-red-400 bg-clip-text text-transparent">
            Act Before You Fail.
          </span>
        </h1>

        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed font-sans">
          Most apps remind you of what you are failing to complete. Deadline
          Defender AI uses intelligent risk analysis, focus block scheduling,
          and automated rescue modes to help you finish before deadlines slip.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-3.5 px-8 rounded-lg text-sm shadow-lg shadow-cyan-950/50 transition-all group"
          >
            Access Command Center
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          {isDemoMode() && (
            <Link
              href="/login?demo=true"
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold py-3.5 px-8 rounded-lg text-sm transition-all"
            >
              Launch Demo Mode
            </Link>
          )}
        </div>
      </main>

      {/* PROBLEM & SOLUTION SECTION */}
      <section className="border-t border-slate-900/60 bg-slate-950/40">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-4">
              The Problem with Traditional Todo Lists
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm">
              Standard task managers act as passive graveyards. They wait for
              you to fail, then paint your tasks red. They don&apos;t help you start,
              and they don&apos;t help you recover when things go wrong.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#150a0a] border border-red-900/30 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="mb-4 inline-block p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-red-400 mb-3 font-mono tracking-tight uppercase">
                The Problem
              </h3>
              <ul className="space-y-4 text-sm text-red-200/80">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  Tasks pile up with no concrete execution plan.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  No warning until the deadline is literally tomorrow.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  When overwhelmed, users freeze instead of doing partial work.
                </li>
              </ul>
            </div>

            <div className="bg-[#051111] border border-emerald-900/30 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="mb-4 inline-block p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-emerald-400 mb-3 font-mono tracking-tight uppercase">
                The Solution
              </h3>
              <ul className="space-y-4 text-sm text-emerald-200/80">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  Predictive Risk Scores detect failure probability days in
                  advance.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  AI breaks vague tasks into micro-actions (Next 5-Minute
                  Action).
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  Rescue Mode initiates crisis management to secure partial
                  credit.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / AI FEATURES */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Powered by Gemini AI
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm">
            Deadline Defender transforms static text into dynamic operational
            intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl hover:bg-slate-900/60 transition-colors">
            <div className="text-cyan-400 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-200 font-mono uppercase text-sm mb-2">
              Natural Language Capture
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste a syllabus paragraph or speak your deadline. Gemini
              instantly extracts dates, urgency, and estimates effort.
            </p>
          </div>
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl hover:bg-slate-900/60 transition-colors">
            <div className="text-cyan-400 mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-200 font-mono uppercase text-sm mb-2">
              Task Decomposition
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              &quot;Build a pitch deck&quot; becomes 5 concrete subtasks with estimated
              minutes for each, removing the friction to start.
            </p>
          </div>
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl hover:bg-slate-900/60 transition-colors">
            <div className="text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-200 font-mono uppercase text-sm mb-2">
              Crisis Recovery AI
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates scope-reduction plans, partial submission strategies,
              and drafts professional extension requests when failure is
              imminent.
            </p>
          </div>
        </div>
      </section>

      {/* TECH STACK & METRICS */}
      <section className="border-t border-slate-900/60 bg-slate-950/80 pb-20">
        <div className="max-w-5xl mx-auto px-6 py-20 border-b border-slate-900/60 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-4">
                Tech Stack & Architecture
              </h2>
              <ul className="space-y-4">
                <li className="flex flex-col">
                  <span className="font-mono text-cyan-400 text-xs font-bold uppercase">
                    Frontend Framework
                  </span>
                  <span className="text-slate-300 text-sm">
                    Next.js App Router, React, Tailwind CSS
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="font-mono text-indigo-400 text-xs font-bold uppercase">
                    Backend & Database
                  </span>
                  <span className="text-slate-300 text-sm">
                    Firebase Authentication, Cloud Firestore
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="font-mono text-emerald-400 text-xs font-bold uppercase">
                    AI Intelligence
                  </span>
                  <span className="text-slate-300 text-sm">
                    Google Gemini API (gemini-2.5-flash) with structured JSON
                    output
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="font-mono text-orange-400 text-xs font-bold uppercase">
                    Upcoming Integrations
                  </span>
                  <span className="text-slate-300 text-sm">
                    Google Calendar API, Gmail, Live API
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl">
              <h3 className="font-mono text-sm text-slate-400 uppercase tracking-widest mb-6">
                Demo Impact Metrics
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-black text-white">4x</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">
                    Faster Starts
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-emerald-400">
                    85%
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">
                    Completion Rate
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-cyan-400">
                    &lt;2m
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">
                    To First Action
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-indigo-400">0%</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">
                    Vague Tasks
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900/60 py-8 bg-slate-950/40 text-center text-[11px] text-slate-500 font-mono uppercase tracking-wider">
        © 2026 DEADLINE DEFENDER AI • SECURE MVP PILOT BUILD
      </footer>
    </div>
  );
}
