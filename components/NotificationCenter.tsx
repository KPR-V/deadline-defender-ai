"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  Check,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../lib/firebase/AuthContext";
import {
  getReminders,
  updateReminder,
  addBehaviorSignal,
} from "../lib/firebase/firestore";
import { Reminder } from "../types/reminder";
import { useRouter } from "next/navigation";

export default function NotificationCenter() {
  const { user } = useAuth();
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadReminders = async () => {
    if (!user) return;
    const fetched = await getReminders(user.uid);
    setReminders(fetched);
  };

  useEffect(() => {
    if (!user) return;

    queueMicrotask(() => {
      loadReminders();
    });

    const interval = setInterval(loadReminders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unreadCount = reminders.filter((r) => r.status === "unread").length;

  const handleAction = async (
    reminder: Reminder,
    actionType:
      | "start_now"
      | "snooze_15"
      | "reduce_scope"
      | "open_rescue"
      | "dismiss",
  ) => {
    if (!user) return;

    // Log behavior signal
    await addBehaviorSignal(user.uid, {
      type: actionType === "dismiss" ? "reminder_ignored" : "reminder_actioned",
      taskId: reminder.taskId || "general",
      value: { action: actionType, reminderType: reminder.type },
    });

    // Update status
    await updateReminder(user.uid, reminder.id, {
      status: actionType === "dismiss" ? "dismissed" : "actioned",
      readAt: new Date(),
    });

    setIsOpen(false);

    // Reload local list
    loadReminders();

    // Route based on action
    if (actionType === "start_now" && reminder.taskId) {
      router.push(`/tasks/${reminder.taskId}`);
    } else if (actionType === "open_rescue" && reminder.taskId) {
      router.push(`/rescue/${reminder.taskId}`);
    } else if (actionType === "reduce_scope" && reminder.taskId) {
      router.push(`/rescue/${reminder.taskId}?action=reduce_scope`);
    } else if (actionType === "snooze_15") {
      alert("Reminder snoozed for 15 minutes.");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "rescue":
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case "action":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "deadline_approaching":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-[#0E0E0E] hover:bg-[#111] border border-white/10 hover:border-white/20 rounded-lg transition-colors"
      >
        <Bell className="w-4 h-4 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#050505]">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]">
            <div className="flex items-center justify-between p-3 border-b border-slate-800/50 bg-slate-900/50">
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
                Notifications
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {reminders.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-mono">
                  No reminders. All clear.
                </div>
              ) : (
                <div className="flex flex-col">
                  {reminders.slice(0, 20).map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`p-4 border-b border-slate-800/50 transition-colors ${reminder.status === "unread" ? "bg-slate-900/30" : "opacity-60"}`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getIcon(reminder.type)}</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-200 mb-1 leading-tight">
                            {reminder.title}
                          </h4>
                          <p className="text-xs text-slate-400 mb-3 leading-snug">
                            {reminder.reason || reminder.message}
                          </p>

                          {reminder.status === "unread" && (
                            <div className="flex flex-wrap gap-2">
                              {reminder.suggestedAction === "start_now" && (
                                <button
                                  onClick={() =>
                                    handleAction(reminder, "start_now")
                                  }
                                  className="text-[10px] font-mono font-bold uppercase bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded"
                                >
                                  Start Now
                                </button>
                              )}
                              {reminder.suggestedAction === "open_rescue" && (
                                <button
                                  onClick={() =>
                                    handleAction(reminder, "open_rescue")
                                  }
                                  className="text-[10px] font-mono font-bold uppercase bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
                                >
                                  Rescue Mode
                                </button>
                              )}
                              {reminder.suggestedAction === "snooze_15" && (
                                <button
                                  onClick={() =>
                                    handleAction(reminder, "snooze_15")
                                  }
                                  className="text-[10px] font-mono font-bold uppercase bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded"
                                >
                                  Snooze 15m
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleAction(reminder, "dismiss")
                                }
                                className="text-[10px] font-mono font-bold uppercase text-slate-500 hover:text-white px-2 py-1"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
