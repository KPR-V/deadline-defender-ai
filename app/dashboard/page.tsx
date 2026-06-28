"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Shield,
  LogOut,
  Plus,
  Sparkles,
  Database,
  CheckSquare,
  Layers,
  Clock,
  AlertTriangle,
  Play,
} from "lucide-react";
import { useAuth } from "../../lib/firebase/AuthContext";
import {
  getTasks,
  updateTask,
  createTask,
  saveTaskStepsBatch,
  saveFocusBlocksBatch,
} from "../../lib/firebase/firestore";
import { createTaskAndNotify } from "../../lib/reminders/taskUpdater";
import { auth } from "../../lib/firebase/client";
import { isDemoMode } from "../../lib/env";
import {
  calculateRisk,
  calculateDeadlineSafetyScore,
} from "../../lib/risk/riskEngine";
import { checkApproachingDeadlines } from "../../lib/reminders/deadlineChecker";
import { getBusyBlocks } from "../../lib/calendar/calendarProvider";
import { findAvailableFocusBlocks } from "../../lib/calendar/schedulingEngine";
import { Task } from "../../types/task";
import { AIParsedTask } from "../../types/ai";

// Core components (always visible on dashboard)
import TaskCard from "../../components/TaskCard";
import DeadlineSafetyCard from "../../components/DeadlineSafetyCard";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import { useUserTasks } from "../../hooks/useUserTasks";

// Heavy components loaded dynamically (not visible on initial render)
const NaturalLanguageCapture = dynamic(() => import("../../components/NaturalLanguageCapture"), { ssr: false });
const TaskForm = dynamic(() => import("../../components/TaskForm"), { ssr: false });
const NotificationCenter = dynamic(() => import("../../components/NotificationCenter"), { ssr: false });
const ProcrastinationPatternCard = dynamic(() => import("../../components/ProcrastinationPatternCard"), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout, googleAccessToken } = useAuth();
  
  const { tasks, loading, refetch: loadTasks } = useUserTasks();

  const [seeding, setSeeding] = useState(false);

  // Modal visibility
  const [showManualForm, setShowManualForm] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Active view tab
  const [viewTab, setViewTab] = useState<"columns" | "upcoming">("columns");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      // Fire-and-forget deadline checks
      checkApproachingDeadlines(user.uid).catch(console.error);
    }
  }, [user, authLoading, router]);

  // Seeding trigger
  const handleSeed = async () => {
    if (!user || !isDemoMode()) return;
    setSeeding(true);
    try {
      const res = await fetch("/demo/api/seed", { method: "POST" });
      if (!res.ok) throw new Error("Seed API failed");
      await loadTasks();
    } catch (err) {
      console.error("Failed to seed demo data:", err);
    } finally {
      setSeeding(false);
    }
  };

  // Quick complete a task
  const handleQuickComplete = async (taskId: string) => {
    if (!user) return;
    try {
      await updateTask(user.uid, taskId, {
        status: "completed",
        progressPercentage: 100,
        riskScore: 0,
        riskLevel: "safe",
        riskExplanation: "Task completed successfully before deadline.",
      });
      // reload
      await loadTasks();
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  // AI parsed task save handler
  const handleAICaptureConfirm = async (parsed: AIParsedTask) => {
    if (!user) return;
    try {
      const now = new Date();

      // Calculate Risk
      const riskResult = calculateRisk(
        {
          deadline: new Date(parsed.deadline),
          importance: parsed.importance,
          estimatedMinutes: parsed.estimatedMinutes,
          dependencies: parsed.dependencies,
          progressPercentage: 0,
          status: "pending",
        },
        now,
      );

      // Save Task to Firestore
      const taskId = await createTaskAndNotify(user.uid, {
        title: parsed.title,
        description: parsed.description,
        deadline: new Date(parsed.deadline),
        importance: parsed.importance,
        estimatedMinutes: parsed.estimatedMinutes,
        category: parsed.category,
        dependencies: parsed.dependencies,
        source: "ai_parse",
        status: "pending",
        progressPercentage: 0,
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        riskExplanation: riskResult.explanation,
        firstUsefulAction: parsed.title,
        completionStrategy:
          "Tactical focus execution with strict scope management.",
      });

      // Fetch AI Subtasks Steps Server-Side via API route
      let generatedSteps = [];
      let completionStrategy = "";
      let firstUsefulAction = "";
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        const response = await fetch("/api/ai/generate-task-plan", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({
            taskTitle: parsed.title,
            taskDescription: parsed.description || "",
            deadlineISO: parsed.deadline,
            estimatedMinutes: parsed.estimatedMinutes || 60,
            nowISO: now.toISOString()
          }),
        });
        if (response.ok) {
          const planData = await response.json();
          generatedSteps = planData.steps || [];
          completionStrategy = planData.completionStrategy || "";
          firstUsefulAction = planData.firstUsefulAction || "";
        }
      } catch (e) {
        console.warn("Subtask API call bypassed, running fallbacks:", e);
      }

      // If API failed or yielded empty steps, let's use a deterministic fallback here
      if (generatedSteps.length === 0) {
        // Simple fallback
        generatedSteps = [
          {
            title: "Triage requirements and outline objectives",
            description: "Deconstruct parameters and structure file outlines.",
            estimatedMinutes: Math.round(parsed.estimatedMinutes * 0.2),
            order: 1,
            status: "pending",
          },
          {
            title: "Implement and compile core deliverables",
            description: "Complete the main functional components of the task.",
            estimatedMinutes: Math.round(parsed.estimatedMinutes * 0.6),
            order: 2,
            status: "pending",
          },
          {
            title: "Verify specifications and submit deliverables",
            description:
              "Double check critical requirements and run testing loops.",
            estimatedMinutes: Math.round(parsed.estimatedMinutes * 0.2),
            order: 3,
            status: "pending",
          },
        ];
        firstUsefulAction = `Write down your absolute bare minimum deliverable parameters on a note card.`;
        completionStrategy = `Focus solely on complete end-to-end functionality first before refining or formatting details.`;
      }

      // Update task with the strategies
      await updateTask(user.uid, taskId, {
        firstUsefulAction: firstUsefulAction || parsed.title,
        completionStrategy:
          completionStrategy ||
          "Execute sprint sessions under strict time constraints.",
      });

      // Save subtask steps batch
      const dbSteps = generatedSteps.map((step: any) => ({
        taskId,
        title: step.title,
        description: step.description,
        estimatedMinutes: step.estimatedMinutes,
        order: step.order,
        status: "pending" as const,
      }));
      await saveTaskStepsBatch(user.uid, taskId, dbSteps);

      // Real Google Calendar free/busy API via provider
      const timeMax = new Date(now);
      timeMax.setDate(timeMax.getDate() + 7); // Max 7 days lookahead
      const busyBlocks = await getBusyBlocks(
        googleAccessToken || null,
        now,
        timeMax,
      );
      const calculatedFocusBlocks = findAvailableFocusBlocks(
        new Date(parsed.deadline),
        parsed.estimatedMinutes,
        busyBlocks,
        now,
        45,
        riskResult.riskScore >= 81,
      );

      if (calculatedFocusBlocks.length > 0) {
        const dbBlocks = calculatedFocusBlocks.map((block) => ({
          taskId,
          start: block.start,
          end: block.end,
          durationMinutes: block.durationMinutes,
          status: "suggested" as const,
          reason: block.reason,
        }));
        await saveFocusBlocksBatch(user.uid, taskId, dbBlocks);
      }

      // Reload tasks list
      await loadTasks();
    } catch (err) {
      console.error("Error handling AI parsed save:", err);
    }
  };

  // Manual form submit handler
  const handleManualSubmit = async (formData: {
    title: string;
    description: string;
    deadline: Date;
    importance: Task["importance"];
    estimatedMinutes: number;
    category: Task["category"];
    dependencies: string[];
  }) => {
    if (!user) return;
    setSubmittingManual(true);
    try {
      const now = new Date();
      const riskResult = calculateRisk(
        {
          deadline: formData.deadline,
          importance: formData.importance,
          estimatedMinutes: formData.estimatedMinutes,
          dependencies: formData.dependencies,
          progressPercentage: 0,
          status: "pending",
        },
        now,
      );

      const taskId = await createTaskAndNotify(user.uid, {
        ...formData,
        source: "manual",
        status: "pending",
        progressPercentage: 0,
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        riskExplanation: riskResult.explanation,
        firstUsefulAction: formData.title,
        completionStrategy: "Tactical execution with robust safety buffers.",
      });

      // Generate Subtasks using same server-side API or fallbacks
      let generatedSteps = [];
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        const response = await fetch("/api/ai/generate-task-plan", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({
            taskTitle: formData.title,
            taskDescription: formData.description || "",
            deadlineISO: formData.deadline.toISOString(),
            estimatedMinutes: formData.estimatedMinutes || 60,
            nowISO: now.toISOString()
          }),
        });
        if (response.ok) {
          const planData = await response.json();
          generatedSteps = planData.steps || [];
        }
      } catch (e) {
        // fallback
      }

      if (generatedSteps.length === 0) {
        generatedSteps = [
          {
            title: "Triage parameters and prepare core structure",
            description: "Deconstruct assignment or task parameters.",
            estimatedMinutes: Math.round(formData.estimatedMinutes * 0.25),
            order: 1,
            status: "pending",
          },
          {
            title: "Execute full draft compilation",
            description:
              "Build and implement the main substance under sprint clocks.",
            estimatedMinutes: Math.round(formData.estimatedMinutes * 0.5),
            order: 2,
            status: "pending",
          },
          {
            title: "Complete final verification checklist",
            description:
              "Submit report or deliverable on portal and archive receipt.",
            estimatedMinutes: Math.round(formData.estimatedMinutes * 0.25),
            order: 3,
            status: "pending",
          },
        ];
      }

      const dbSteps = generatedSteps.map((step: any) => ({
        taskId,
        title: step.title,
        description: step.description,
        estimatedMinutes: step.estimatedMinutes,
        order: step.order,
        status: "pending" as const,
      }));
      await saveTaskStepsBatch(user.uid, taskId, dbSteps);

      // Real Google Calendar free/busy API via provider
      const timeMax = new Date(now);
      timeMax.setDate(timeMax.getDate() + 7); // Max 7 days lookahead
      const busyBlocks = await getBusyBlocks(
        googleAccessToken || null,
        now,
        timeMax,
      );
      const calculatedFocusBlocks = findAvailableFocusBlocks(
        formData.deadline,
        formData.estimatedMinutes,
        busyBlocks,
        now,
        45,
        riskResult.riskScore >= 81,
      );

      if (calculatedFocusBlocks.length > 0) {
        const dbBlocks = calculatedFocusBlocks.map((block) => ({
          taskId,
          start: block.start,
          end: block.end,
          durationMinutes: block.durationMinutes,
          status: "suggested" as const,
          reason: block.reason,
        }));
        await saveFocusBlocksBatch(user.uid, taskId, dbBlocks);
      }

      setShowManualForm(false);
      await loadTasks();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setSubmittingManual(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-mono text-xs text-slate-400">
        VERIFYING AUTHENTICATED ENCRYPTED KEY...
      </div>
    );
  }

  // Group active tasks by columns
  const activeTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled",
  );
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const safeTasks = activeTasks.filter((t) => t.riskLevel === "safe");
  const warningTasks = activeTasks.filter((t) => t.riskLevel === "warning");
  const dangerTasks = activeTasks.filter((t) => t.riskLevel === "danger");
  const criticalTasks = activeTasks.filter((t) => t.riskLevel === "critical");

  const safetyScore = calculateDeadlineSafetyScore(tasks);

  // Sorting for chronological list
  const sortedUpcomingTasks = [...activeTasks].sort((a, b) => {
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div
      id="dashboard-view"
      className="min-h-screen bg-[#050505] text-gray-200 flex flex-col justify-between"
    >
      {/* Header Panel */}
      <header className="border-b border-white/10 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg text-white shadow-md shadow-cyan-950/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight flex items-center gap-1.5 leading-none">
                DEADLINE DEFENDER
                <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded uppercase font-mono font-bold font-semibold tracking-wider">
                  MVP
                </span>
              </h1>
              <span className="text-[9px] text-slate-400 font-mono block mt-1 uppercase">
                Logged in as {user?.displayName || "Commander"} (
                {user?.isDemo ? "Demo Mode" : "Account"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            {isDemoMode() && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3.5 py-1.5 border border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-950/20 hover:bg-cyan-950/40 text-xs font-mono font-bold text-cyan-400 rounded-lg transition-all disabled:opacity-40"
              >
                {seeding ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5" />
                )}
                {seeding ? "Seeding..." : "Reset Demo Data"}
              </button>
            )}
            <button
              onClick={() => router.push("/settings")}
              className="px-3.5 py-1.5 border border-white/10 hover:border-white/20 bg-[#0E0E0E] hover:bg-[#111] text-xs font-mono font-bold text-gray-300 rounded-lg transition-all"
            >
              Preferences
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/30 hover:border-red-950/50 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-6 py-8 flex-grow space-y-8">
        {/* Banner if task list is empty and seeder exists */}
        {!loading && tasks.length === 0 && isDemoMode() && (
          <div className="bg-gradient-to-r from-cyan-950/20 via-indigo-950/10 to-transparent border border-cyan-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in duration-300">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-sm font-bold font-mono uppercase text-cyan-400 tracking-wider flex items-center justify-center md:justify-start gap-1.5">
                <Sparkles className="w-4 h-4 animate-spin" />
                Initialize System Grids
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                Ready to explore the emergency command layout? Seed 5 realistic
                preset deadlines (DBMS tonight, Google interview tomorrow,
                utility bill, pitch deck, team sync) instantly with real-time
                risk scores.
              </p>
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-6 rounded-lg text-xs font-mono tracking-wider uppercase shadow-lg shadow-cyan-950/50 transition-all disabled:opacity-40"
            >
              {seeding ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Generating presets...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Seed Demo Data (1-Click)
                </>
              )}
            </button>
          </div>
        )}

        {/* TOP PANEL: Safety Card & AI Capture */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <DeadlineSafetyCard
              score={safetyScore}
              totalTasks={activeTasks.length}
              criticalCount={criticalTasks.length}
              dangerCount={dangerTasks.length}
              warningCount={warningTasks.length}
              safeCount={safeTasks.length}
            />
          </div>

          <div className="lg:col-span-2">
            <NaturalLanguageCapture onConfirm={handleAICaptureConfirm} />
          </div>
        </div>

        {/* BEHAVIOR INSIGHTS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ProcrastinationPatternCard />
          </div>
          <div className="lg:col-span-2">
            {/* Space for future small cards or leave blank, or make the row a generic container */}
          </div>
        </div>

        {/* MIDDLE BAR: View Toggle & Manual Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5 bg-[#0A0A0A] border border-white/10 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewTab("columns")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold font-mono transition-all ${
                viewTab === "columns"
                  ? "bg-[#111] text-cyan-400 shadow-md"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              Columns Grid
            </button>
            <button
              onClick={() => setViewTab("upcoming")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold font-mono transition-all ${
                viewTab === "upcoming"
                  ? "bg-[#111] text-cyan-400 shadow-md"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              Timeline Chronological
            </button>
          </div>

          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs font-mono uppercase tracking-wider transition-all"
          >
            <Plus className="w-4 h-4" />
            Manual Capture
          </button>
        </div>

        {/* COLLAPSIBLE MANUAL FORM CONTROLLER */}
        {showManualForm && (
          <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-6 shadow-xl animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-cyan-400">
                Manual Commitment Registration
              </h3>
              <button
                onClick={() => setShowManualForm(false)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
            <TaskForm
              onSubmit={handleManualSubmit}
              isLoading={submittingManual}
            />
          </div>
        )}

        {/* LOADING INDICATOR */}
        {loading ? (
          <LoadingState />
        ) : tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {/* COLUMN VIEWS TAB */}
            {viewTab === "columns" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Column: SAFE */}
                <div id="col-safe" className="space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Safe Index ({safeTasks.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      0-30
                    </span>
                  </div>
                  {safeTasks.length === 0 ? (
                    <p className="text-[10px] text-slate-600 font-mono italic p-4 text-center border border-dashed border-slate-900 rounded-lg">
                      No safe tasks index.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {safeTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onQuickComplete={handleQuickComplete}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Column: WARNING */}
                <div id="col-warning" className="space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Warning Index ({warningTasks.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      31-60
                    </span>
                  </div>
                  {warningTasks.length === 0 ? (
                    <p className="text-[10px] text-slate-600 font-mono italic p-4 text-center border border-dashed border-slate-900 rounded-lg">
                      No warnings logged.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {warningTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onQuickComplete={handleQuickComplete}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Column: DANGER */}
                <div id="col-danger" className="space-y-4">
                  <div className="flex items-center justify-between border-b border-orange-500/30 pb-2">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                      Danger Alert ({dangerTasks.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      61-80
                    </span>
                  </div>
                  {dangerTasks.length === 0 ? (
                    <p className="text-[10px] text-slate-600 font-mono italic p-4 text-center border border-dashed border-slate-900 rounded-lg">
                      All systems clear of danger.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dangerTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onQuickComplete={handleQuickComplete}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Column: CRITICAL */}
                <div id="col-critical" className="space-y-4">
                  <div className="flex items-center justify-between border-b border-red-500/30 pb-2 animate-pulse">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      Critical Threats ({criticalTasks.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      81-100
                    </span>
                  </div>
                  {criticalTasks.length === 0 ? (
                    <div className="bg-slate-950/20 border border-dashed border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase">
                        Shields solid. <br /> No critical threats active.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {criticalTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onQuickComplete={handleQuickComplete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHRONOLOGICAL VIEW TAB */}
            {viewTab === "upcoming" && (
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
                    Chronological Timelines
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {activeTasks.length} active commitments
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sortedUpcomingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onQuickComplete={handleQuickComplete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-[10px] text-gray-600 font-mono uppercase tracking-widest mt-12">
        🛡️ DEADLINE DEFENDER AI COMMAND TERMINAL • SYSTEM SECURE
      </footer>
    </div>
  );
}
