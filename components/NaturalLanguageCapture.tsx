'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Clock, AlertTriangle, Check, RefreshCw, Command, Mic, MicOff } from 'lucide-react';
import { AIParsedTask } from '../types/ai';
import { formatDeadline } from '../lib/utils/date';
import { formatDuration } from '../lib/utils/format';
import { browserSpeechService } from '../lib/voice/browserSpeechService';
import { useAuth } from '../lib/firebase/AuthContext';
import { auth } from '../lib/firebase/client';

interface NaturalLanguageCaptureProps {
  onConfirm: (parsedData: AIParsedTask) => Promise<void>;
}

export default function NaturalLanguageCapture({ onConfirm }: NaturalLanguageCaptureProps) {
  const { user } = useAuth();
  const [userInput, setUserInput] = useState('');

  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  
  const [parsedPreview, setParsedPreview] = useState<AIParsedTask | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(browserSpeechService.isSupported());
  }, []);

  const toggleListening = () => {
    if (isListening) {
      browserSpeechService.stopListening();
      setIsListening(false);
    } else {
      setError('');
      browserSpeechService.startListening(
        (result) => {
          // You could optionally just append instead of replacing, but replacing is easier for simple commands
          // If it's not final, we update the input field so user sees what is being recognized
          if (result.isFinal) {
            setUserInput(prev => {
              const newVal = prev + (prev ? ' ' : '') + result.transcript;
              // Auto-submit after voice if you want, but for now just populate text
              return newVal;
            });
            setIsListening(false);
          } else {
            // For interim results, we could show them temporarily, but let's just append to current input
            // To avoid messy interim append loops, we could have a separate state for `interimTranscript`.
            // For simplicity, let's just wait for final or show the interim as the value.
            setUserInput(result.transcript);
          }
        },
        (err) => {
          setError(`Voice capture error: ${err}`);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
      setIsListening(true);
    }
  };

  // Suggestions to make the demo incredibly easy to use
  const suggestions = [
    "I have an assignment due tonight.",
    "Plan my next three hours.",
    "Start rescue mode for my interview.",
    "What is most urgent today?",
    "Submit DBMS assignment by tonight 11:59 PM, probably 4 hours of work."
  ];

  const handleParse = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    setError('');
    setParsedPreview(null);

    const textToParse = customText || userInput;
    if (!textToParse.trim()) {
      setError('Please enter some text detailing your deadline.');
      return;
    }

    setIsParsing(true);

    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const response = await fetch('/api/ai/parse-task', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          userInput: textToParse,
          nowISO: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('AI Parsing failed. Using fallback parsed task.');
        // Fallback behavior
        setParsedPreview({
          title: textToParse.substring(0, 40) + '...',
          description: textToParse,
          deadline: (() => {
            const d = new Date();
            d.setHours(d.getHours() + 24);
            return d.toISOString();
          })(),
          estimatedMinutes: 60,
          category: 'project',
          importance: 'medium',
          dependencies: [],
          confidence: 0.8
        });
        return;
      }

      const parsedData: AIParsedTask = await response.json();
      setParsedPreview(parsedData);
    } catch (err: any) {
      setError(err.message || 'AI parse failed. Fallback bypassed.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!parsedPreview) return;
    setIsSaving(true);
    setError('');
    try {
      await onConfirm(parsedPreview);
      // reset
      setParsedPreview(null);
      setUserInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to save parsed task.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="natural-language-capture" className="space-y-4">
      {/* Input box */}
      <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl -z-10" />

        <form onSubmit={handleParse} className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              AI Command Capture
            </h3>
          </div>
          {/* [FUTURE ROADMAP] Phase 4: Gmail integration. Add a button here to "Scan Inbox for Deadlines" which securely fetches Gmail messages and pushes them through this same parser. */}

          <div className="relative">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Paste or speak your deadline here (e.g. Submit DBMS assignment by tonight 11:59 PM, 4 hrs of work)..."
              rows={3}
              className={`w-full bg-[#050505] border ${isListening ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/10'} rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-cyan-500/70 text-gray-200 pr-20 resize-none font-sans transition-all duration-300`}
              disabled={isParsing || isSaving}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isParsing || isSaving}
                  className={`p-2 rounded-lg transition-all disabled:opacity-40 disabled:pointer-events-none ${
                    isListening 
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30 animate-pulse' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                  title={isListening ? "Stop listening" : "Start voice capture"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={isParsing || !userInput.trim() || isSaving || isListening}
                className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-cyan-900/30"
                title="Process task"
              >
                {isParsing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Command className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Suggestions list */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-mono">
              ⚡ Demo presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUserInput(s);
                    handleParse(undefined, s);
                  }}
                  disabled={isParsing || isSaving}
                  className="bg-[#050505] hover:bg-[#111] border border-white/5 rounded-lg px-2.5 py-1 text-[11px] text-gray-400 hover:text-cyan-400 transition-all font-mono text-left max-w-full truncate"
                >
                  &ldquo;{s}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Confirmation Preview */}
      {parsedPreview && (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5 shadow-2xl animate-in fade-in duration-300 relative">
          <div className="absolute top-0 right-0 p-3">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>

          <h4 className="text-xs uppercase font-black text-cyan-400 tracking-wider mb-3 font-mono">
            🛡️ DEFENDER RADAR: Extracted Commitment Details
          </h4>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Commitment Title</span>
              <p className="text-base font-bold text-white mt-0.5">{parsedPreview.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Resolved Deadline
                </span>
                <p className="text-xs font-semibold text-slate-200 mt-1">
                  {formatDeadline(parsedPreview.deadline)}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Effort Estimate
                </span>
                <p className="text-xs font-semibold text-slate-200 mt-1">
                  {formatDuration(parsedPreview.estimatedMinutes)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Category</span>
                <p className="text-xs font-bold text-slate-300 uppercase mt-0.5 font-mono">{parsedPreview.category}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Importance Index</span>
                <p className="text-xs font-bold text-slate-300 uppercase mt-0.5 font-mono">{parsedPreview.importance}</p>
              </div>
            </div>

            {parsedPreview.confidence !== undefined && (
              <div className="bg-cyan-900/20 border border-cyan-800/30 rounded p-2 flex items-center justify-between">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider font-mono">AI Confidence Score</span>
                <span className="text-xs font-black text-cyan-300">{Math.round(parsedPreview.confidence * 100)}%</span>
              </div>
            )}

            {parsedPreview.dependencies.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Unresolved Dependencies</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {parsedPreview.dependencies.map((dep, idx) => (
                    <span key={idx} className="bg-slate-950 border border-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono">
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2 text-[10px] text-gray-500">
                <summary className="cursor-pointer hover:text-gray-400 font-mono">Show Raw AI Output (Dev Mode)</summary>
                <pre className="mt-2 p-2 bg-black rounded border border-gray-800 overflow-auto max-h-32">
                  {JSON.stringify(parsedPreview, null, 2)}
                </pre>
              </details>
            )}

            <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-800/60 mt-4">
              <button
                onClick={() => setParsedPreview(null)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
              >
                Dismiss
              </button>

              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold py-2 px-5 rounded-lg text-xs transition-all shadow-lg shadow-cyan-900/20"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Securing...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Confirm & Secure
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
