"use client";

import React, { useState } from "react";
import { ShieldAlert, Copy, RefreshCw, Check, Info } from "lucide-react";
import { Task, RecoveryPlan } from "../types/task";
import { addProgressEvidence } from "../lib/firebase/firestore";
import { auth } from "../lib/firebase/client";

interface RecoveryAssistantProps {
  task: Task;
  userId: string;
}

export default function RecoveryAssistant({
  task,
  userId,
}: RecoveryAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    setError("");
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch("/api/ai/generate-recovery-message", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description || "",
          category: task.category || "other",
          importance: task.importance || "medium",
          progressPercentage: task.progressPercentage || 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate recovery plan");
      const data = await res.json();
      setPlan(data);
    } catch (err: any) {
      setError(err.message || "Error generating recovery plan");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDraft = async () => {
    if (!plan) return;
    navigator.clipboard.writeText(plan.messageDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    try {
      await addProgressEvidence(
        userId,
        task.id,
        "draft_generated",
        "Generated recovery update draft",
      );
    } catch (e) {
      console.error("Failed to log evidence:", e);
    }
  };

  return (
    <div className="bg-[#150a0a] border border-red-900/30 rounded-xl p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-red-400 font-mono tracking-wide uppercase">
            Recovery Assistant
          </h3>
        </div>
        {!plan && !loading && (
          <button
            onClick={generatePlan}
            className="text-xs font-bold bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition-colors uppercase tracking-wider"
          >
            Generate Recovery Plan
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Analyzing crisis and formulating damage control...</span>
        </div>
      )}

      {error && <div className="text-red-400 text-sm">{error}</div>}

      {!loading && !plan && !error && (
        <p className="text-sm text-red-300/70">
          When full completion is unrealistic, use the Recovery Assistant to
          reduce damage, trim scope, and communicate effectively with
          stakeholders.
        </p>
      )}

      {plan && !loading && (
        <div className="space-y-5">
          <div>
            <h4 className="text-[10px] text-red-500 font-mono uppercase tracking-widest mb-1">
              Situation Summary
            </h4>
            <p className="text-sm text-red-200">{plan.situationSummary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1a0c0c] border border-red-900/40 p-3 rounded-lg">
              <h4 className="text-[10px] text-red-500 font-mono uppercase tracking-widest mb-1">
                Best Realistic Outcome
              </h4>
              <p className="text-sm text-red-200">
                {plan.bestRealisticOutcome}
              </p>
            </div>
            <div className="bg-[#1a0c0c] border border-red-900/40 p-3 rounded-lg">
              <h4 className="text-[10px] text-red-500 font-mono uppercase tracking-widest mb-1">
                Scope Reduction
              </h4>
              <p className="text-sm text-red-200">{plan.scopeReductionPlan}</p>
            </div>
          </div>

          <div className="bg-[#1a0c0c] border border-red-900/40 p-3 rounded-lg">
            <h4 className="text-[10px] text-red-500 font-mono uppercase tracking-widest mb-1">
              Partial Submission Plan
            </h4>
            <p className="text-sm text-red-200">{plan.partialSubmissionPlan}</p>
          </div>

          <div className="bg-[#1a0c0c] border border-red-900/40 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] text-red-500 font-mono uppercase tracking-widest">
                Update / Extension Draft
              </h4>
              <button
                onClick={handleCopyDraft}
                className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-2 py-1 rounded transition-colors"
              >
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
            <p className="text-sm text-red-200 whitespace-pre-wrap font-sans italic border-l-2 border-red-500/30 pl-3">
              {plan.messageDraft}
            </p>
            <div className="mt-3 flex items-start gap-1.5 text-red-400/60 text-xs">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Review before sending. We do not automatically send messages on
                your behalf.
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] text-red-500 font-mono uppercase tracking-widest mb-2">
              Immediate Next Steps
            </h4>
            <ul className="space-y-2">
              {plan.nextSteps.map((step, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-red-200">
                  <span className="text-red-500 font-bold">{idx + 1}.</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
