"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Mail,
  CheckSquare,
  Square,
  Plus,
  Check,
  Sparkles,
  AlertTriangle,
  Search,
  Edit2,
  X,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../lib/firebase/AuthContext";
import { AIEmailExtractedTask } from "../../types/ai";
import { createTaskAndNotify } from "../../lib/reminders/taskUpdater";
import { Task } from "../../types/task";
import LoadingState from "../../components/LoadingState";
import { auth } from "../../lib/firebase/client";

interface GmailMessageSummary {
  messageId: string;
  threadId: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  labels: string[];
}

const DEFAULT_QUERY =
  "newer_than:30d (deadline OR due OR submit OR interview OR meeting OR payment OR invoice OR assignment)";

export default function InboxDeadlinesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const [searchQuery, setSearchQuery] = useState(DEFAULT_QUERY);
  const [emails, setEmails] = useState<GmailMessageSummary[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [analyzing, setAnalyzing] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<AIEmailExtractedTask[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [savingTasks, setSavingTasks] = useState<Record<number, boolean>>({});
  const [savedTasks, setSavedTasks] = useState<Record<number, boolean>>({});

  const checkIntegrationStatus = useCallback(async () => {
    if (!user) return;
    try {
      setCheckingStatus(true);
      const idToken = await user.getIdToken();
      const res = await fetch("/api/integrations/status", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGmailConnected(!!data?.google?.gmailConnected);
      } else {
        setGmailConnected(false);
      }
    } catch (err) {
      console.error("Failed to check integration status:", err);
      setGmailConnected(false);
    } finally {
      setCheckingStatus(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      queueMicrotask(() => {
        checkIntegrationStatus();
      });
    }
  }, [user, authLoading, router, checkIntegrationStatus]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        if (event.data.success) {
          checkIntegrationStatus();
        } else {
          setError("Gmail connection failed. Please try again.");
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [checkIntegrationStatus]);

  const handleConnectGmail = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/auth/google/start?idToken=${idToken}`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "google_oauth_popup", "width=600,height=700");
      } else {
        setError("Failed to start Gmail authentication.");
      }
    } catch (err) {
      setError("Network error connecting to Gmail.");
    }
  };

  const loadEmails = useCallback(async () => {
    if (!user || !gmailConnected) return;
    setLoadingEmails(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/gmail/list-recent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ query: searchQuery, maxResults: 15 }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.notConnected) {
          setGmailConnected(false);
        }
        throw new Error(data.error || "Failed to fetch emails");
      }

      setEmails(data.messages || []);
      setSelectedIds({});
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error searching Gmail messages.");
    } finally {
      setLoadingEmails(false);
    }
  }, [user, gmailConnected, searchQuery]);

  useEffect(() => {
    if (gmailConnected) {
      queueMicrotask(() => {
        loadEmails();
      });
    }
  }, [gmailConnected, loadEmails]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    const allSelected = emails.length > 0 && emails.every((e) => selectedIds[e.messageId]);
    if (allSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      emails.forEach((e) => {
        next[e.messageId] = true;
      });
      setSelectedIds(next);
    }
  };

  const handleAnalyzeSelected = async () => {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) return;

    setAnalyzing(true);
    setError(null);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/gmail/extract-deadlines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ messageIds: ids }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze emails");
      }

      const data = await res.json();
      setExtractedTasks(data.tasks || []);
      setEditingIndex(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error extracting deadlines.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTaskChange = (index: number, field: keyof AIEmailExtractedTask, value: any) => {
    setExtractedTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveTask = async (taskData: AIEmailExtractedTask, index: number) => {
    if (!user) return;

    if (!taskData.deadline || isNaN(Date.parse(taskData.deadline))) {
      alert("Please specify a valid deadline date and time before saving.");
      setEditingIndex(index);
      return;
    }

    setSavingTasks((prev) => ({ ...prev, [index]: true }));
    try {
      const newTask: Omit<Task, "id" | "createdAt" | "updatedAt"> = {
        title: taskData.title,
        description: taskData.description,
        deadline: new Date(taskData.deadline).toISOString(),
        status: "pending",
        importance: taskData.importance,
        estimatedMinutes: taskData.estimatedMinutes,
        category: taskData.category,
        dependencies: taskData.dependencies || [],
        progressPercentage: 0,
        source: "gmail",
        riskScore: 0,
        riskLevel: "safe",
        riskExplanation: "Confirmed and imported from real Gmail inbox.",
        metadata: {
          messageId: taskData.sourceEmail.messageId,
          sourceEmailSubject: taskData.sourceEmail.subject,
          sourceEmailSender: taskData.sourceEmail.sender,
          sourceEmailDate: taskData.sourceEmail.date,
          evidenceText: taskData.evidenceText,
        },
      };

      await createTaskAndNotify(user.uid, newTask);
      setSavedTasks((prev) => ({ ...prev, [index]: true }));
      setEditingIndex(null);
    } catch (err) {
      console.error("Failed to save task:", err);
      alert("Failed to save task to database.");
    } finally {
      setSavingTasks((prev) => ({ ...prev, [index]: false }));
    }
  };

  if (authLoading || checkingStatus) {
    return <LoadingState message="Checking integrations..." className="min-h-screen bg-slate-950" />;
  }

  const selectedCount = Object.keys(selectedIds).filter((id) => selectedIds[id]).length;

  return (
    <div className="min-h-screen bg-transparent text-gray-200 flex flex-col">
      <header className="border-b border-white/10 bg-[#050505]/70 backdrop-blur-xl sticky top-0 z-40 relative">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO DASHBOARD
          </Link>
          <div className="flex items-center gap-2 text-gradient-cyan font-mono text-sm font-bold tracking-widest">
            <Mail className="w-5 h-5 text-cyan-400" />
            REAL GMAIL DEADLINE INTEGRATION
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Connection & Search & Emails List */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Connection Status Section */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between border border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  gmailConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              />
              <div>
                <h3 className="text-sm font-bold font-sans text-white">
                  {gmailConnected ? "Gmail Connected" : "Gmail Disconnected"}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {gmailConnected
                    ? "Readonly scope granted (`gmail.readonly`)"
                    : "Connect to scan inbox for upcoming deadlines"}
                </p>
              </div>
            </div>
            {!gmailConnected ? (
              <button
                onClick={handleConnectGmail}
                className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition-all"
              >
                Connect Gmail
              </button>
            ) : (
              <button
                onClick={loadEmails}
                disabled={loadingEmails || analyzing}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEmails ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-300 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Box Section */}
          {gmailConnected && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Gmail Search Query
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadEmails();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search query..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingEmails}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs px-4 py-2 rounded-lg font-bold"
                >
                  Search
                </button>
              </form>
            </div>
          )}

          {/* Emails List Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-slate-300">
                Inbox Results ({emails.length})
              </h3>
              {emails.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
                >
                  {emails.every((e) => selectedIds[e.messageId]) ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" /> Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" /> Select All
                    </>
                  )}
                </button>
              )}
            </div>

            {!gmailConnected ? (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-10 text-center">
                <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Please connect your Google account above to fetch recent emails. We strictly request readonly access.
                </p>
              </div>
            ) : loadingEmails ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center">
                <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mb-3" />
                <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Querying Google API...
                </p>
              </div>
            ) : emails.length > 0 ? (
              <div className="flex flex-col gap-2.5 max-h-[550px] overflow-y-auto pr-1">
                {emails.map((email) => {
                  const isSelected = !!selectedIds[email.messageId];
                  return (
                    <div
                      key={email.messageId}
                      onClick={() => toggleSelect(email.messageId)}
                      className={`cursor-pointer border p-3.5 rounded-xl transition-all flex gap-3 items-start ${
                        isSelected
                          ? "bg-slate-900/90 border-cyan-500/60 shadow-md"
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="pt-0.5 text-cyan-500">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <p className="text-xs font-bold text-white truncate max-w-[65%]">
                            {email.sender.replace(/<.*>/, "").trim()}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {new Date(email.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-cyan-300 truncate mb-1">
                          {email.subject}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {email.snippet}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <p className="text-xs text-slate-500 font-mono">
                  No emails matching your search query.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Extraction & Preview */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-sans text-white">
                Extracted Task Preview
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {selectedCount} email{selectedCount === 1 ? "" : "s"} selected for AI extraction
              </p>
            </div>
            <button
              onClick={handleAnalyzeSelected}
              disabled={!gmailConnected || selectedCount === 0 || analyzing}
              className="text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 px-5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transition-all"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Analyze Selected
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-5 min-h-[550px] flex flex-col">
            {analyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-bounce mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">
                  Gemini AI Analyzing Emails
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Extracting implied deliverables, reading body text safely, and calculating deadlines...
                </p>
              </div>
            ) : extractedTasks.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                    {extractedTasks.length} Potential Task{extractedTasks.length === 1 ? "" : "s"} Found
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Review and confirm before saving
                  </span>
                </div>

                {extractedTasks.map((task, idx) => {
                  const isEditing = editingIndex === idx;
                  const isSaved = savedTasks[idx];
                  const missingDeadline = !task.deadline || isNaN(Date.parse(task.deadline));

                  return (
                    <div
                      key={idx}
                      className={`bg-slate-950 border rounded-xl p-4 transition-all relative overflow-hidden ${
                        missingDeadline ? "border-amber-500/60" : "border-slate-800"
                      }`}
                    >
                      <div
                        className={`absolute top-0 left-0 w-1.5 h-full ${
                          missingDeadline ? "bg-amber-500" : "bg-cyan-500"
                        }`}
                      />

                      {/* Header */}
                      <div className="flex justify-between items-start mb-3 gap-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => handleTaskChange(idx, "title", e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-white font-bold text-sm rounded px-2 py-1 w-full focus:outline-none focus:border-cyan-500"
                          />
                        ) : (
                          <h4 className="text-sm font-bold text-white flex-1">{task.title}</h4>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isSaved && (
                            <button
                              onClick={() => setEditingIndex(isEditing ? null : idx)}
                              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-800 flex items-center gap-1 transition-colors"
                            >
                              {isEditing ? <X className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                              {isEditing ? "Close" : "Edit"}
                            </button>
                          )}
                          {isSaved ? (
                            <span className="text-xs bg-green-950/80 border border-green-800/80 text-green-400 font-mono px-3 py-1 rounded flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Confirmed & Saved
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSaveTask(task, idx)}
                              disabled={savingTasks[idx]}
                              className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1 rounded flex items-center gap-1 transition-colors shadow"
                            >
                              {savingTasks[idx] ? (
                                "Saving..."
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" /> Confirm Task
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Warning if null deadline */}
                      {missingDeadline && (
                        <div className="bg-amber-950/40 border border-amber-800/60 text-amber-300 p-2.5 rounded-lg mb-3 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>No deadline detected. Please select a deadline date before saving.</span>
                        </div>
                      )}

                      {/* Description */}
                      <div className="mb-3">
                        <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                          Description
                        </label>
                        {isEditing ? (
                          <textarea
                            rows={3}
                            value={task.description}
                            onChange={(e) => handleTaskChange(idx, "description", e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded p-2 w-full focus:outline-none focus:border-cyan-500 font-sans"
                          />
                        ) : (
                          <p className="text-xs text-slate-300 whitespace-pre-wrap">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/60">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-cyan-400" /> Deadline
                          </span>
                          {isEditing || missingDeadline ? (
                            <input
                              type="datetime-local"
                              value={
                                task.deadline && !isNaN(Date.parse(task.deadline))
                                  ? new Date(task.deadline).toISOString().slice(0, 16)
                                  : ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                handleTaskChange(idx, "deadline", val ? new Date(val).toISOString() : null);
                              }}
                              className="bg-slate-950 border border-slate-700 text-white text-xs rounded px-2 py-1 w-full focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          ) : (
                            <span className="text-xs text-slate-200 font-mono font-bold">
                              {new Date(task.deadline!).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/60">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                            Source Metadata
                          </span>
                          <span className="text-xs text-slate-200 block truncate font-semibold" title={task.sourceEmail.subject}>
                            {task.sourceEmail.subject}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">
                            From: {task.sourceEmail.sender.replace(/<.*>/, "").trim()}
                          </span>
                        </div>
                      </div>

                      {/* Evidence Text */}
                      {task.evidenceText && (
                        <div className="bg-slate-900/40 border border-slate-800/60 p-2 rounded mb-3 text-[11px] text-slate-400 italic">
                          &quot;{task.evidenceText}&quot;
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5 text-[11px] font-mono">
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-400 font-bold">
                            Confidence: {Math.round(task.confidence * 100)}%
                          </span>
                          {isEditing ? (
                            <select
                              value={task.importance}
                              onChange={(e) => handleTaskChange(idx, "importance", e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[10px]"
                            >
                              <option value="low">Low Priority</option>
                              <option value="medium">Medium Priority</option>
                              <option value="high">High Priority</option>
                              <option value="critical">Critical</option>
                            </select>
                          ) : (
                            <span className="uppercase text-slate-400 font-semibold">
                              {task.importance} priority
                            </span>
                          )}
                        </div>

                        {isEditing ? (
                          <select
                            value={task.category}
                            onChange={(e) => handleTaskChange(idx, "category", e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[10px] capitalize"
                          >
                            <option value="assignment">Assignment</option>
                            <option value="interview">Interview</option>
                            <option value="bill">Bill</option>
                            <option value="meeting">Meeting</option>
                            <option value="project">Project</option>
                            <option value="personal">Personal</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <span className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800 capitalize">
                            {task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <CheckSquare className="w-10 h-10 text-slate-700 mb-3" />
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  No Extracted Tasks Yet
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Select emails on the left and click &quot;Analyze Selected&quot; to let AI extract actionable deliverables.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
