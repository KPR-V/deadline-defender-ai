"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Clock,
  Target,
  CheckSquare,
  Layers,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../../lib/firebase/AuthContext";
import {
  getTask,
  getTaskSteps,
  getFocusBlocks,
  updateTask,
  updateTaskStep,
  updateFocusBlock,
  addBehaviorSignal,
  createReminder,
  getUserProfile,
  addProgressEvidence,
  getProgressEvidenceList,
} from "../../../lib/firebase/firestore";
import { calculateRisk } from "../../../lib/risk/riskEngine";
import { updateTaskRiskAndNotify } from "../../../lib/reminders/taskUpdater";
import { generateMissedBlockReminder } from "../../../lib/reminders/reminderEngine";
import {
  getBusyBlocks,
  createGoogleCalendarEvent,
} from "../../../lib/calendar/calendarProvider";
import { Task, TaskStep, FocusBlock } from "../../../types/task";
import { formatDeadline } from "../../../lib/utils/date";
import { formatDuration } from "../../../lib/utils/format";

// Components
import RiskBadge from "../../../components/RiskBadge";
import RiskMeter from "../../../components/RiskMeter";
import CountdownTimer from "../../../components/CountdownTimer";
import SubtaskChecklist from "../../../components/SubtaskChecklist";
import FocusBlockTimeline from "../../../components/FocusBlockTimeline";
import LoadingState from "../../../components/LoadingState";
import NotificationCenter from "../../../components/NotificationCenter";
import RecoveryAssistant from "../../../components/RecoveryAssistant";

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default function TaskDetail({ params }: PageProps) {
  const router = useRouter();
  const { taskId } = use(params);
  const { user, loading: authLoading, googleAccessToken } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState("");

  const loadAllDetails = async () => {
    if (!user || !taskId) return;
    try {
      setLoading(true);
      const fetchedTask = await getTask(user.uid, taskId);
      if (!fetchedTask) {
        setError("Requested commitment task not found in grid.");
        return;
      }
      setTask(fetchedTask);

      const fetchedSteps = await getTaskSteps(user.uid, taskId);
      setSteps(fetchedSteps);

      const fetchedBlocks = await getFocusBlocks(user.uid, taskId);
      setFocusBlocks(fetchedBlocks);

      const fetchedEvidence = await getProgressEvidenceList(user.uid, taskId);
      setEvidence(fetchedEvidence);
    } catch (err) {
      console.error("Error fetching details:", err);
      setError("System grid failed to retrieve details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && taskId) {
      const timer = setTimeout(() => {
        loadAllDetails();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, taskId]);

  // Handle toggling subtask steps
  const handleToggleStep = async (
    stepId: string,
    currentStatus: TaskStep["status"],
  ) => {
    if (!user || !task) return;
    const newStatus: TaskStep["status"] =
      currentStatus === "completed" ? "pending" : "completed";

    try {
      // Update Step Status
      await updateTaskStep(user.uid, task.id, stepId, { status: newStatus });

      if (newStatus === "completed") {
        const step = steps.find((s) => s.id === stepId);
        if (step) {
          await addProgressEvidence(
            user.uid,
            task.id,
            "subtask_completed",
            `Completed subtask: ${step.title}`,
          );
          const newEvidence = await getProgressEvidenceList(user.uid, task.id);
          setEvidence(newEvidence);
        }
      }

      // Compute new completion progress
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

      await updateTaskRiskAndNotify(user.uid, task.id, newProgress);

      // Reload task to get updated risk
      const updatedTask = await getTask(user.uid, task.id);
      if (updatedTask) setTask(updatedTask);
    } catch (e) {
      console.error("Failed to update step status:", e);
    }
  };

  // Recalculate Risk manually
  const handleRecalculateRisk = async () => {
    if (!user || !task) return;
    setRecalculating(true);
    try {
      await updateTaskRiskAndNotify(user.uid, task.id);
      const updatedTask = await getTask(user.uid, task.id);
      if (updatedTask) setTask(updatedTask);
    } catch (e) {
      console.error("Recalculate risk failed:", e);
    } finally {
      setRecalculating(false);
    }
  };

  const [suggestingBlocks, setSuggestingBlocks] = useState(false);

  // Generate Suggested Blocks
  const handleSuggestBlocks = async () => {
    if (!user || !task) return;
    setSuggestingBlocks(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/calendar/suggest-focus-blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ taskId: task.id })
      });
      const data = await res.json();
      if (data.error === 'connectRequired') {
        setError('Please connect your Google Calendar in Settings to suggest focus blocks.');
      } else if (data.error) {
        setError(data.error);
      } else {
        const fetchedBlocks = await getFocusBlocks(user.uid, task.id);
        setFocusBlocks(fetchedBlocks);
        if (data.shortageInfo) {
          alert(`Warning: ${data.shortageInfo.message} (Need ${data.shortageInfo.requiredMinutes}m, have ${data.shortageInfo.availableMinutes}m)`);
        }
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to suggest focus blocks');
    } finally {
      setSuggestingBlocks(false);
    }
  };

  // Update Focus Block Status
  const handleUpdateBlockStatus = async (
    blockId: string,
    status: FocusBlock["status"],
  ) => {
    if (!user || !task) return;
    try {
      // Phase 3: create Google Calendar event if accepted
      if (status === "accepted") {
        const token = await user.getIdToken();
        const res = await fetch('/api/calendar/create-focus-block', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ taskId: task.id, focusBlockId: blockId })
        });
        const data = await res.json();
        if (data.error === 'connectRequired') {
          alert('Please connect Google Calendar in settings.');
          return;
        } else if (data.error) {
          alert(`Failed: ${data.error}`);
          return;
        } else {
          alert("Focus block added to your Google Calendar!");
        }
      } else {
        await updateFocusBlock(user.uid, task.id, blockId, { status });
      }

      if (status === "missed" || status === "completed") {
        // Log behavior signal
        await addBehaviorSignal(user.uid, {
          type:
            status === "missed"
              ? "focus_block_missed"
              : "focus_block_completed",
          taskId: task.id,
          value: { blockId },
        });

        if (status === "completed") {
          const block = focusBlocks.find((b) => b.id === blockId);
          await addProgressEvidence(
            user.uid,
            task.id,
            "focus_block_completed",
            `Completed ${block?.durationMinutes} min focus block`,
          );
          const newEvidence = await getProgressEvidenceList(user.uid, task.id);
          setEvidence(newEvidence);
        }

        if (status === "missed") {
          // Generate Reminder
          const profile = await getUserProfile(user.uid);
          if (profile) {
            const reminder = generateMissedBlockReminder(
              user.uid,
              task,
              profile,
            );
            await createReminder(user.uid, reminder);
          }
        }
      }

      // reload blocks
      const fetchedBlocks = await getFocusBlocks(user.uid, task.id);
      setFocusBlocks(fetchedBlocks);
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || loading) {
    return (
      <LoadingState
        message="Connecting to Strategic Plan Grid..."
        className="min-h-screen bg-slate-950"
      />
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-black font-mono tracking-wider uppercase mb-2">
          Defense Grid Fault
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          {error || "Requested task data is missing."}
        </p>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono font-bold rounded-lg text-slate-300"
        >
          Return to Command Center
        </Link>
      </div>
    );
  }

  const isCompleted = task.status === "completed";
  const isCritical = task.riskScore >= 81 || task.importance === "critical";

  return (
    <div
      id="task-detail-view"
      className="min-h-screen bg-transparent text-gray-200 flex flex-col justify-between"
    >
      {/* Header Panel */}
      <header className="border-b border-white/10 bg-[#050505]/70 backdrop-blur-xl sticky top-0 z-40 relative">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Strategic Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <button
              onClick={handleRecalculateRisk}
              disabled={recalculating || isCompleted}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 rounded-lg transition-all disabled:opacity-40"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`}
              />
              Recalculate Risk
            </button>

            {isCritical && !isCompleted && (
              <Link
                href={`/rescue/${task.id}`}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono uppercase tracking-widest rounded-lg shadow-lg shadow-red-950/30 transition-all animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Engage Rescue Mode
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-grow space-y-6">
        {/* HERO HEADER: Title & Countdown */}
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-slate-950 border border-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                {task.category}
              </span>
              <span className="text-slate-500 text-xs font-mono">
                • Source: {task.source}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-none">
              {task.title}
            </h2>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              {task.description || "No detailed description provided."}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">
              Countdown Clock
            </span>
            <CountdownTimer
              deadline={task.deadline}
              className="text-base py-2.5 px-4"
            />
          </div>
        </div>

        {/* RISK DIAGNOSTICS & METADATA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Circular Risk assessment */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl flex flex-col items-center justify-center text-center">
            <h4 className="text-xs uppercase font-black text-slate-400 font-mono mb-4 tracking-wider">
              Deadline Defense Index
            </h4>
            <div className="space-y-4">
              <RiskMeter
                score={task.riskScore}
                level={task.riskLevel}
                size="lg"
              />
              <div className="space-y-1">
                <RiskBadge level={task.riskLevel} />
                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                  Risk score calculated in real-time
                </span>
              </div>
            </div>
          </div>

          {/* Core factors metrics */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl flex flex-col justify-between lg:col-span-2">
            <div>
              <h4 className="text-xs uppercase font-black text-slate-400 font-mono mb-3.5 tracking-wider">
                Slippage Risk Report
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/40 p-4 border border-slate-850 rounded-lg">
                {task.riskExplanation ||
                  "System is compiling risk indices. Ensure parameters are verified."}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/40 mt-4">
              <div className="p-2 bg-slate-950/40 border border-slate-900 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">
                  Priority
                </span>
                <span className="block text-xs font-black text-slate-200 mt-0.5 uppercase font-mono">
                  {task.importance}
                </span>
              </div>
              <div className="p-2 bg-slate-950/40 border border-slate-900 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">
                  Effort Needed
                </span>
                <span className="block text-xs font-black text-slate-200 mt-0.5 uppercase font-mono">
                  {formatDuration(task.estimatedMinutes)}
                </span>
              </div>
              <div className="p-2 bg-slate-950/40 border border-slate-900 rounded-lg col-span-2 sm:col-span-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">
                  Completion
                </span>
                <span className="block text-xs font-black text-slate-200 mt-0.5 uppercase font-mono">
                  {task.progressPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TACTICAL PLAN OVERVIEWS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Subtask checklist */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4">
            <SubtaskChecklist steps={steps} onToggleStep={handleToggleStep} />
          </div>

          {/* Timeline schedule */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm text-slate-300">Focus Blocks</h3>
              <button 
                onClick={handleSuggestBlocks}
                disabled={suggestingBlocks}
                className="px-3 py-1.5 bg-slate-800 text-xs font-mono rounded hover:bg-slate-700 text-slate-300 disabled:opacity-50"
              >
                {suggestingBlocks ? "Analyzing Calendar..." : "Auto-Suggest Blocks"}
              </button>
            </div>
            {suggestingBlocks ? (
              <div className="space-y-3 mt-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded-lg border border-slate-700/50 flex flex-col justify-center px-4">
                    <div className="h-3 w-1/3 bg-slate-700 rounded mb-2"></div>
                    <div className="h-2 w-1/4 bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <FocusBlockTimeline
                blocks={focusBlocks}
                onUpdateBlockStatus={handleUpdateBlockStatus}
              />
            )}
          </div>
        </div>

        {/* AI INSIGHT PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="bg-cyan-500/5 border border-cyan-500/10 p-5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1 bg-cyan-500/20 text-cyan-400 rounded">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs uppercase font-black font-mono tracking-wider text-cyan-400">
                First Useful Action (5m)
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {task.firstUsefulAction ||
                "Open a blank notepad page or workspace, copy the prompt title, and write down three main questions to overcome initial mental inertia."}
            </p>
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1 bg-indigo-500/20 text-indigo-400 rounded">
                <Target className="w-4 h-4" />
              </div>
              <h4 className="text-xs uppercase font-black font-mono tracking-wider text-indigo-400">
                Completion Strategy
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {task.completionStrategy ||
                "Triage requirements and build a rough, minimally viable draft first before spending focus polishing formatting or minor bells and whistles."}
            </p>
          </div>
        </div>

        {/* PROGRESS EVIDENCE */}
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4 pt-2">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h4 className="text-xs uppercase font-black font-mono tracking-wider text-emerald-400">
              Progress Evidence
            </h4>
          </div>
          {evidence.length === 0 ? (
            <div className="text-xs text-slate-500 font-mono italic">
              No concrete progress evidence logged yet. Complete subtasks,
              accept focus blocks, or generate drafts in Rescue Mode.
            </div>
          ) : (
            <ul className="space-y-3">
              {evidence.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-1 border-l-2 border-emerald-500/30 pl-3"
                >
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                    {e.createdAt?.toLocaleString() || ""} •{" "}
                    {e.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-slate-200">
                    {e.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* RECOVERY ASSISTANT (Phase 9) */}
        {user && task.riskLevel !== "safe" && task.status !== "completed" && (
          <RecoveryAssistant task={task} userId={user.uid} />
        )}

        {process.env.NODE_ENV === "development" && (
          <details className="mt-4 text-[10px] text-gray-500 border border-slate-800 rounded-xl p-4 bg-slate-950">
            <summary className="cursor-pointer hover:text-gray-400 font-mono font-bold uppercase tracking-widest">
              Show Raw Task & Plan Data (Dev Mode)
            </summary>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <span className="font-mono mb-2 block">Task Data</span>
                <pre className="p-2 bg-black rounded border border-gray-800 overflow-auto max-h-48 text-xs font-mono">
                  {JSON.stringify(task, null, 2)}
                </pre>
              </div>
              <div>
                <span className="font-mono mb-2 block">Steps Data</span>
                <pre className="p-2 bg-black rounded border border-gray-800 overflow-auto max-h-48 text-xs font-mono">
                  {JSON.stringify(steps, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-6 text-center text-[10px] text-slate-600 font-mono uppercase tracking-widest mt-12">
        🛡️ DEADLINE DEFENDER AI • SECURE MVP BUILD
      </footer>
    </div>
  );
}
