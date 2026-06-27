'use client';

import React, { useState } from 'react';
import { Calendar, Clock, AlertTriangle, Layers, Save, RefreshCw } from 'lucide-react';
import { TaskImportance, TaskCategory } from '../types/task';
import { TASK_CATEGORIES, TASK_IMPORTANCE } from '../lib/utils/constants';

interface TaskFormProps {
  onSubmit: (taskData: {
    title: string;
    description: string;
    deadline: Date;
    importance: TaskImportance;
    estimatedMinutes: number;
    category: TaskCategory;
    dependencies: string[];
  }) => Promise<void>;
  isLoading?: boolean;
  initialValues?: {
    title?: string;
    description?: string;
    deadline?: string;
    importance?: TaskImportance;
    estimatedMinutes?: number;
    category?: TaskCategory;
    dependencies?: string[];
  };
}

export default function TaskForm({ onSubmit, isLoading = false, initialValues = {} }: TaskFormProps) {
  const [title, setTitle] = useState(initialValues.title || '');
  const [description, setDescription] = useState(initialValues.description || '');
  
  // Format local deadline string for the input type="datetime-local"
  const getInitialDateTimeString = () => {
    if (initialValues.deadline) {
      try {
        const d = new Date(initialValues.deadline);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch (e) {
        // fail silent
      }
    }
    // Default tomorrow at 6 PM local
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [deadlineStr, setDeadlineStr] = useState(getInitialDateTimeString());
  const [importance, setImportance] = useState<TaskImportance>(initialValues.importance || 'medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialValues.estimatedMinutes || 60);
  const [category, setCategory] = useState<TaskCategory>(initialValues.category || 'project');
  const [dependenciesText, setDependenciesText] = useState((initialValues.dependencies || []).join(', '));
  
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    if (!deadlineStr) {
      setError('A valid deadline date and time is required.');
      return;
    }

    const deadlineDate = new Date(deadlineStr);
    if (isNaN(deadlineDate.getTime())) {
      setError('Invalid deadline format selected.');
      return;
    }

    if (estimatedMinutes <= 0) {
      setError('Estimated effort duration must be greater than 0.');
      return;
    }

    const parsedDeps = dependenciesText
      .split(',')
      .map(dep => dep.trim())
      .filter(dep => dep.length > 0);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        deadline: deadlineDate,
        importance,
        estimatedMinutes,
        category,
        dependencies: parsedDeps
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <form id="manual-task-form" onSubmit={handleSubmit} className="space-y-5 text-white">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3 flex items-start gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Title and Category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Submit DBMS assignment"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500/70 text-slate-100 font-sans"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500/70 text-slate-100"
            disabled={isLoading}
          >
            {TASK_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter core scope details, required deliverables, links, or instructions..."
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500/70 text-slate-100 resize-none font-sans"
          disabled={isLoading}
        />
      </div>

      {/* Grid: Deadline, Duration, Importance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Deadline <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={deadlineStr}
            onChange={(e) => setDeadlineStr(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500/70 text-slate-100 font-mono"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Effort (Minutes) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(parseInt(e.target.value, 10) || 0)}
            min="1"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500/70 text-slate-100 font-mono"
            disabled={isLoading}
          />
          <span className="text-[10px] text-slate-500 mt-1 block font-mono">
            {estimatedMinutes > 0 ? `~ ${(estimatedMinutes / 60).toFixed(1)} focus hours` : '0 hours'}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Importance
          </label>
          <select
            value={importance}
            onChange={(e) => setImportance(e.target.value as TaskImportance)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500/70 text-slate-100 font-semibold"
            disabled={isLoading}
          >
            {TASK_IMPORTANCE.map(imp => (
              <option key={imp.value} value={imp.value}>
                {imp.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dependencies */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
          Dependencies (Comma separated)
        </label>
        <input
          type="text"
          value={dependenciesText}
          onChange={(e) => setDependenciesText(e.target.value)}
          placeholder="e.g. Gather lecture PDFs, Complete mock testing, Get reviewer approval"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500/70 text-slate-100"
          disabled={isLoading}
        />
        <span className="text-[10px] text-slate-500 mt-1 block">
          Separate multiple items with commas. These increase task dependency risk indexes.
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/50">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Calculating risk & steps...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Analyze and Secure Deadline
            </>
          )}
        </button>
      </div>
    </form>
  );
}
