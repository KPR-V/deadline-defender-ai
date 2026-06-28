"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  FileText,
} from "lucide-react";
import { useAuth } from "../../../lib/firebase/AuthContext";
import {
  getTask,
  getTaskSteps,
  getRescuePlan,
  saveRescuePlan,
  updateTask,
  updateTaskStep,
  addBehaviorSignal,
  addProgressEvidence,
} from "../../../lib/firebase/firestore";
import { calculateRisk } from "../../../lib/risk/riskEngine";
import { auth } from "../../../lib/firebase/client";
import { Task, TaskStep, RescuePlan } from "../../../types/task";
import { formatDeadline } from "../../../lib/utils/date";
import { formatDuration } from "../../../lib/utils/format";

// Components
import CountdownTimer from "../../../components/CountdownTimer";
import LoadingState from "../../../components/LoadingState";

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default function RescueMode({ params }: PageProps) {
  const router = useRouter();
  const { taskId } = use(params);
  const { user, loading: authLoading } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [rescuePlan, setRescuePlan] = useState<RescuePlan | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Micro-focus timer state (5 minutes = 300 seconds)
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load Task and Rescue details
  const loadRescueData = async () => {
    if (!user || !taskId) return;
    try {
      setLoading(true);
      const fetchedTask = await getTask(user.uid, taskId);
      if (!fetchedTask) {
        setError("Task commitment not found.");
        return;
      }
      setTask(fetchedTask);

      const fetchedSteps = await getTaskSteps(user.uid, taskId);
      setSteps(fetchedSteps);

      // Check if rescue plan already exists
      let plan = await getRescuePlan(user.uid, taskId);

      if (!plan) {
        // Trigger emergency rescue plan generation via server API
        setGenerating(true);
        const remainingHours = Math.max(
          0.1,
          (new Date(fetchedTask.deadline).getTime() - Date.now()) /
            (1000 * 60 * 60),
        );
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        const res = await fetch("/api/ai/generate-rescue-plan", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({
            taskTitle: fetchedTask.title,
            taskDescription: fetchedTask.description || "",
            deadlineISO: fetchedTask.deadline,
            timeRemainingMinutes: Math.round(remainingHours * 60),
            estimatedMinutes: fetchedTask.estimatedMinutes || 60,
          }),
        });

        if (res.ok) {
          const aiPlan = await res.json();
          // Save in database
          const planId = await saveRescuePlan(user.uid, taskId, {
            summary: aiPlan.summary,
            nextFiveMinuteAction: aiPlan.nextFiveMinuteAction,
            emergencySteps: aiPlan.emergencySteps,
            scopeReduction: aiPlan.scopeReduction,
            fallbackPlan: aiPlan.fallbackPlan,
            extensionMessageDraft: aiPlan.extensionMessageDraft,
          });

          plan = {
            id: planId,
            taskId,
            summary: aiPlan.summary,
            nextFiveMinuteAction: aiPlan.nextFiveMinuteAction,
            emergencySteps: aiPlan.emergencySteps,
            scopeReduction: aiPlan.scopeReduction,
            fallbackPlan: aiPlan.fallbackPlan,
            extensionMessageDraft: aiPlan.extensionMessageDraft,
            createdAt: new Date(),
          };
        } else {
          throw new Error("AI system offline.");
        }
      }
      setRescuePlan(plan);

      // Track behavior signal: Rescue Mode Engaged
      await addBehaviorSignal(user.uid, {
        type: "rescue_started",
        taskId,
        value: { timestamp: Date.now(), riskScore: fetchedTask.riskScore },
      });
    } catch (err: any) {
      console.warn("Rescue plan loading failed, running fallbacks:", err);
      // Fallback rescue plan
      setRescuePlan({
        id: "fallback_rescue",
        taskId,
        summary:
          "EMERGENCY PROTOCOLS ACTIVATED: Your deadline is at immediate risk. Cut scope, lock out distraction, and execute immediately.",
        nextFiveMinuteAction:
          "Close social media tabs, write down your 3 core objectives on paper, and put your phone in another room.",
        emergencySteps: [
          {
            title: "Triage requirements and outline objectives",
            durationMinutes: 10,
            whyThisMatters: "Cut out all non-essential elements immediately.",
          },
          {
            title: "90-Minute Uninterrupted Deep Work Block",
            durationMinutes: 90,
            whyThisMatters:
              "Eliminate all notifications and write the core draft.",
          },
          {
            title: "Rapid Review and Formatting Check",
            durationMinutes: 15,
            whyThisMatters: "Ensure submission mechanics are completely solid.",
          },
        ],
        scopeReduction:
          "Omit all nice-to-have design details. Deliver a working core draft.",
        fallbackPlan:
          "Submit current file states 10 minutes before the absolute due date.",
        extensionMessageDraft:
          "Dear professor/manager,\n\nI am working diligently to submit the project but am experiencing unforeseen issues. I am submitting the current state and will provide the full polish by tomorrow morning.",
        createdAt: new Date(),
      });
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && taskId) {
      const timer = setTimeout(() => {
        loadRescueData();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, taskId]);

  // Micro focus block ticking
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      const timer = setTimeout(async () => {
        setTimerActive(false);
        // Log progress evidence when a micro focus session completes
        if (user && taskId) {
          try {
            await addProgressEvidence(
              user.uid,
              taskId,
              "rescue_session",
              "Completed 5-minute micro focus session",
            );
          } catch (e) {
            console.error("Failed to log rescue session evidence:", e);
          }
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, user, taskId]);

  const toggleTimer = () => setTimerActive(!timerActive);
  const resetTimer = () => {
    setTimerActive(false);
    setTimerSeconds(300);
  };

  // Format focus timer
  const formatTimerTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Copy extension template draft
  const handleCopyDraft = async () => {
    if (!rescuePlan || !user || !taskId) return;
    navigator.clipboard.writeText(rescuePlan.extensionMessageDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Log progress evidence
    try {
      await addProgressEvidence(
        user.uid,
        taskId,
        "draft_generated",
        "Generated extension request draft",
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Subtask Steps
  const handleToggleStep = async (
    stepId: string,
    currentStatus: TaskStep["status"],
  ) => {
    if (!user || !task) return;
    const newStatus: TaskStep["status"] =
      currentStatus === "completed" ? "pending" : "completed";

    try {
      await updateTaskStep(user.uid, task.id, stepId, { status: newStatus });

      const updatedSteps = steps.map((s) =>
        s.id === stepId ? { ...s, status: newStatus } : s,
      );
      setSteps(updatedSteps);

      const completedCount = updatedSteps.filter(
        (s) => s.status === "completed",
      ).length;
      const totalCount = updatedSteps.length;
      const newProgress =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const now = new Date();
      const riskResult = calculateRisk(
        {
          ...task,
          progressPercentage: newProgress,
          status: newProgress >= 100 ? "completed" : "pending",
        },
        now,
      );

      await updateTask(user.uid, task.id, {
        progressPercentage: newProgress,
        status: newProgress >= 100 ? "completed" : "pending",
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        riskExplanation: riskResult.explanation,
      });

      setTask((prev) =>
        prev
          ? {
              ...prev,
              progressPercentage: newProgress,
              status: newProgress >= 100 ? "completed" : "pending",
              riskScore: riskResult.riskScore,
              riskLevel: riskResult.riskLevel,
              riskExplanation: riskResult.explanation,
            }
          : null,
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || loading) {
    return (
      <LoadingState
        message="Scrambling Rescue Operations Crews..."
        className="min-h-screen bg-slate-950"
      />
    );
  }

  if (error || !task || !rescuePlan) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-black font-mono tracking-wider uppercase mb-2">
          Rescue Matrix Offline
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          {error || "Requested rescue plan failed to construct."}
        </p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono font-bold rounded-lg text-slate-300"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div
      id="rescue-view"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between"
    >
      {/* HEADER: Alarm Alert Red */}
      <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-b border-red-500/30 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href={`/tasks/${task.id}`}
            className="flex items-center gap-1 text-xs font-mono font-bold text-red-300 hover:text-white bg-red-950/40 px-2.5 py-1.5 rounded-lg border border-red-500/20 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Plan Center
          </Link>
          <div>
            <h2 className="text-sm md:text-base font-black text-white tracking-widest font-mono uppercase flex items-center gap-1.5 leading-none">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-1" />
              Rescue Mode Active
            </h2>
            <span className="text-[10px] text-red-300 font-mono block mt-1 uppercase">
              GRID EMERGENCY PROTOCOLS ENGAGED
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <span className="text-[9px] uppercase font-bold text-red-300 font-mono block">
              Countdown to Due Date
            </span>
            <span className="text-xs text-white font-mono font-bold">
              {formatDeadline(task.deadline)}
            </span>
          </div>
          <CountdownTimer
            deadline={task.deadline}
            className="bg-red-500/10 text-red-400 border-red-500/30 font-bold"
          />
        </div>
      </div>

      {/* Main Body */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-grow space-y-6">
        {/* TOP METRICS SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold mb-1">
              Defense Index
            </span>
            <span className="text-3xl font-black text-red-500 animate-pulse">
              {task.riskScore}
            </span>
            <span className="text-[9px] uppercase font-mono font-semibold text-red-400 mt-1">
              Critical Hazard
            </span>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold mb-1">
              Estimated Effort
            </span>
            <span className="text-lg font-black text-slate-200">
              {formatDuration(task.estimatedMinutes)}
            </span>
            <span className="text-[9px] uppercase font-mono text-slate-400 mt-1">
              Remaining work
            </span>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold mb-1">
              Available Focus Time
            </span>
            <span className="text-lg font-black text-amber-400">
              {((task.estimatedMinutes * 0.7) / 60).toFixed(1)} hrs
            </span>
            <span className="text-[9px] uppercase font-mono text-slate-400 mt-1">
              Triage schedule
            </span>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold mb-1">
              Completion Progress
            </span>
            <span className="text-lg font-black text-slate-200">
              {task.progressPercentage}%
            </span>
            <span className="text-[9px] uppercase font-mono text-slate-400 mt-1">
              Active status
            </span>
          </div>
        </div>

        {/* ACTIVE MISSION: 5-Minute Micro Focus Block */}
        <div className="bg-gradient-to-br from-red-950/20 to-slate-900/40 border border-red-500/20 rounded-xl p-6 shadow-xl relative overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-3">
            <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[9px] font-mono font-bold text-red-400 uppercase tracking-widest w-fit block animate-pulse">
              🛡️ IMMEDIATE ACTIVE MISSION (5-MINUTE INTERVENTION)
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {rescuePlan.nextFiveMinuteAction}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
              Procrastination is driven by the perceived difficulty of
              initiating work. Do not worry about completing the whole task
              right now. Start this 5-minute intervention to build momentum and
              deactivate stress.
            </p>
          </div>

          {/* SPRINT FOCUS TIMER */}
          <div className="bg-slate-950/80 border border-slate-850/80 rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-lg">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold mb-1">
              Intervention Sprint
            </span>
            <div className="text-3xl font-black font-mono text-cyan-400 tracking-tight select-none mb-3">
              {formatTimerTime(timerSeconds)}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTimer}
                className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
                  timerActive
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white animate-bounce"
                }`}
              >
                {timerActive ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>
              <button
                onClick={resetTimer}
                className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            {timerSeconds === 0 && (
              <span className="text-[10px] font-mono text-emerald-400 mt-2 font-bold uppercase animate-pulse">
                Sprint completed! Choose another.
              </span>
            )}
          </div>
        </div>

        {/* CORE RESCUE PANELS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rescue Plan breakdown steps */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-1">
              <h4 className="text-xs uppercase font-black text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-red-400" />
                Emergency Operations Action Plan
              </h4>
            </div>

            <p className="text-xs text-slate-300 font-sans italic bg-slate-950/40 p-3.5 border border-slate-850 rounded-lg">
              &ldquo;{rescuePlan.summary}&rdquo;
            </p>

            <div className="space-y-3 pt-1">
              {rescuePlan.emergencySteps?.map((step: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-950/20 border border-slate-850 rounded-lg"
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider block">
                      Priority Stage {idx + 1}
                    </span>
                    <h5 className="text-xs font-bold text-slate-200">
                      {step.title}
                    </h5>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      {step.whyThisMatters}
                    </p>
                  </div>
                  <span className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded shrink-0">
                    {formatDuration(step.durationMinutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active checklists & messages */}
          <div className="space-y-6">
            {/* Scope triage options */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-3">
              <h4 className="text-xs uppercase font-black text-slate-400 font-mono tracking-wider">
                🛡️ Strategic Scope Reduction Protocol
              </h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed bg-amber-500/5 p-4 border border-amber-500/10 rounded-lg">
                <strong className="text-amber-400 font-bold block mb-1">
                  Triage Recommendations:
                </strong>
                {rescuePlan.scopeReduction}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-300 font-bold font-mono">
                  Secondary Fallback plan:
                </strong>{" "}
                {rescuePlan.fallbackPlan}
              </p>
            </div>

            {/* Email update drafter */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-black text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Escalation Communication Draft
                </h4>

                <button
                  onClick={handleCopyDraft}
                  className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-all bg-cyan-950/20 px-2.5 py-1 rounded border border-cyan-500/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Draft text
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={rescuePlan.extensionMessageDraft}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3.5 text-xs text-slate-400 focus:outline-none font-mono leading-relaxed resize-none"
                />
              </div>

              <span className="text-[10px] text-slate-500 block leading-relaxed italic">
                * Note: Deadline Defender AI does not auto-send communications.
                Customize and copy this to your email or slack client to warn
                stakeholders of potential slippage.
              </span>
            </div>
          </div>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-4 text-[10px] text-gray-500 border border-slate-800 rounded-xl p-4 bg-slate-950">
            <summary className="cursor-pointer hover:text-gray-400 font-mono font-bold uppercase tracking-widest">
              Show Raw AI Rescue Plan (Dev Mode)
            </summary>
            <div className="mt-4">
              <pre className="p-2 bg-black rounded border border-gray-800 overflow-auto max-h-48 text-xs font-mono">
                {JSON.stringify(rescuePlan, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-6 text-center text-[10px] text-slate-600 font-mono uppercase tracking-widest mt-12 animate-pulse">
        🛡️ DEADLINE DEFENDER AI • ACTIVE SYSTEM EMERGENCY RESCUE INTERFACE
      </footer>
    </div>
  );
}
