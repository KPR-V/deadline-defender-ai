export const TASK_CATEGORIES = [
  { value: 'assignment', label: 'Assignment', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { value: 'interview', label: 'Interview', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'bill', label: 'Bill', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'meeting', label: 'Meeting', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { value: 'project', label: 'Project', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { value: 'personal', label: 'Personal', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  { value: 'other', label: 'Other', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
] as const;

export const TASK_IMPORTANCE = [
  { value: 'low', label: 'Low', color: 'bg-slate-500/20 text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-300' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-300 animate-pulse' },
] as const;

export const RISK_LEVELS = {
  safe: { label: 'Safe', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', glow: 'shadow-emerald-500/20' },
  warning: { label: 'Warning', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', glow: 'shadow-amber-500/20' },
  danger: { label: 'Danger', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10', glow: 'shadow-orange-500/20' },
  critical: { label: 'Critical', color: 'text-red-400 border-red-500/30 bg-red-500/10', glow: 'shadow-red-500/20' },
} as const;
