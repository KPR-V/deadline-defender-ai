'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft, Save, Sparkles, Sliders, Check, User, Clock, Bell, Settings, RefreshCw, Calendar, Mail } from 'lucide-react';
import { useAuth } from '../../lib/firebase/AuthContext';
import { getUserProfile, updateUserProfile } from '../../lib/firebase/firestore';
import { UserProfile } from '../../types/user';
import { isDemoMode, env } from '../../lib/env';

// Component
import LoadingState from '../../components/LoadingState';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, googleAccessToken, connectGoogleCalendar, gmailAccessToken, connectGmail } = useAuth();

  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);
  const [gmailSyncError, setGmailSyncError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string>('idle');
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  const handleEnablePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushMsg('❌ Browser push notifications are not supported in this browser or environment.');
      return;
    }
    try {
      setPushStatus('requesting');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushMsg('❌ Permission denied. Please enable notifications in your browser.');
        setPushStatus('idle');
        return;
      }
      const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(env.FIREBASE_API_KEY)}&projectId=${encodeURIComponent(env.FIREBASE_PROJECT_ID)}&messagingSenderId=${encodeURIComponent(env.FIREBASE_MESSAGING_SENDER_ID)}&appId=${encodeURIComponent(env.FIREBASE_APP_ID)}`;
      await navigator.serviceWorker.register(swUrl);
      const clientDeviceToken = 'web_push_' + crypto.randomUUID();
      const res = await fetch('/api/notifications/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: clientDeviceToken, deviceId: 'web_' + navigator.userAgent.slice(0, 20) })
      });
      if (res.ok) {
        setPushMsg('✅ Browser notifications enabled successfully!');
        setPushStatus('enabled');
      } else {
        setPushMsg('❌ Failed to register device token.');
        setPushStatus('idle');
      }
    } catch (err: any) {
      console.error(err);
      setPushMsg('❌ Error enabling push notifications: ' + (err?.message || err));
      setPushStatus('idle');
    }
  };

  const handleTestNotification = async () => {
    try {
      setPushStatus('testing');
      const res = await fetch('/api/notifications/send-test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPushMsg('✅ Test notification sent! Check your notification center.');
      } else {
        setPushMsg('❌ Failed to send test: ' + data.error);
      }
    } catch (err: any) {
      setPushMsg('❌ Error sending test notification.');
    } finally {
      setPushStatus('enabled');
    }
  };
  
  // Settings values state
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('22:00');
  const [focusLength, setFocusLength] = useState(45);
  const [reminderIntensity, setReminderIntensity] = useState<'gentle' | 'normal' | 'aggressive'>('normal');
  const [productivityStyle, setProductivityStyle] = useState<'morning' | 'afternoon' | 'night' | 'flexible'>('flexible');
  const [bufferPercent, setBufferPercent] = useState(15);
  const [displayName, setDisplayName] = useState('');

  const loadSettings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      if (isDemoMode() || user.isDemo) {
        const { getDemoSettings } = await import('../../lib/demo/demoStorage');
        const parsed = getDemoSettings();
        if (parsed) {
          setWorkStart(parsed.workHours?.start || '09:00');
          setWorkEnd(parsed.workHours?.end || '22:00');
          setFocusLength(parsed.preferredFocusBlockMinutes || 45);
          setReminderIntensity(parsed.reminderIntensity || 'normal');
          setProductivityStyle(parsed.productivityStyle || 'flexible');
          setBufferPercent(parsed.defaultBufferPercentage || 15);
          setDisplayName(parsed.displayName || user.displayName || 'Tactical Commander');
        } else {
          setDisplayName(user.displayName || 'Tactical Commander');
        }
      } else {
        // fetch from Firestore
        const prf = await getUserProfile(user.uid);
        if (prf) {
          setProfile(prf);
          setWorkStart(prf.workHours?.start || '09:00');
          setWorkEnd(prf.workHours?.end || '22:00');
          setFocusLength(prf.preferredFocusBlockMinutes || 45);
          setReminderIntensity(prf.reminderIntensity || 'normal');
          setProductivityStyle(prf.productivityStyle || 'flexible');
          setBufferPercent(prf.defaultBufferPercentage || 15);
          setDisplayName(prf.displayName || user.displayName || '');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      const timer = setTimeout(() => {
        loadSettings();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccess(false);

    const updates = {
      displayName,
      workHours: {
        start: workStart,
        end: workEnd,
      },
      preferredFocusBlockMinutes: Number(focusLength) || 45,
      reminderIntensity,
      productivityStyle,
      defaultBufferPercentage: Number(bufferPercent) || 15,
    };

    try {
      if (isDemoMode() || user.isDemo) {
        const { saveDemoSettings } = await import('../../lib/demo/demoStorage');
        saveDemoSettings(updates);
      } else {
        // save to Firestore
        await updateUserProfile(user.uid, updates);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      setCalendarSyncError(null);
      await connectGoogleCalendar();
    } catch (err: any) {
      setCalendarSyncError(err.message || 'Failed to connect Calendar.');
    }
  };

  const handleConnectGmail = async () => {
    try {
      setGmailSyncError(null);
      await connectGmail();
    } catch (err: any) {
      setGmailSyncError(err.message || 'Failed to connect Gmail.');
    }
  };

  if (authLoading || loading) {
    return <LoadingState message="Connecting to Settings Core..." className="min-h-screen bg-slate-950" />;
  }

  return (
    <div id="settings-view" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header Panel */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Strategic Dashboard
          </Link>

          <div>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold">
              SYSTEM CONFIG
            </span>
          </div>
        </div>
      </header>

      {/* Main Form container */}
      <main className="max-w-3xl w-full mx-auto px-6 py-8 flex-grow space-y-6">
        
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white tracking-tight font-sans uppercase">
            User System Settings
          </h2>
        </div>

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg p-3.5 flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4" />
            <span>Tactical preferences successfully stored. Calibration complete.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section: Profile and Display Name */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
              <User className="w-4 h-4 text-cyan-500" />
              User Profile Configuration
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Operator Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tactical Commander"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100"
                disabled={saving}
              />
            </div>
          </div>

          {/* Section: Integrations Link */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              External System Integrations
            </h3>
            <p className="text-xs text-slate-400">
              Configure connections to Google Calendar, Gmail, and other external data sources to enhance your deadline defense capabilities.
            </p>
            <Link 
              href="/settings/integrations" 
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg text-xs font-mono tracking-wider transition-all"
            >
              Manage Integrations &rarr;
            </Link>
          </div>

          {/* Section: Work Schedule Constraints */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
              <Clock className="w-4 h-4 text-cyan-500" />
              Work & Productivity Schedule
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Daily Work Hours Start
                </label>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Daily Work Hours End
                </label>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Preferred Focus Session length
                </label>
                <select
                  value={focusLength}
                  onChange={(e) => setFocusLength(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-semibold"
                  disabled={saving}
                >
                  <option value="25">25 minutes (Pomodoro)</option>
                  <option value="45">45 minutes (Standard)</option>
                  <option value="60">60 minutes (Deep Focus)</option>
                  <option value="90">90 minutes (Sprint Block)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Productivity Rhythm
                </label>
                <select
                  value={productivityStyle}
                  onChange={(e) => setProductivityStyle(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-semibold"
                  disabled={saving}
                >
                  <option value="morning">🌅 Morning Warrior (Early hours focus)</option>
                  <option value="afternoon">☀️ Afternoon Hustler (Mid-day peak)</option>
                  <option value="night">🌙 Night Owl (Late-night flow state)</option>
                  <option value="flexible">⚡ Flexible Adaptor (Dynamic slots)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Reminder Intensity & Safety Buffer */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
              <Bell className="w-4 h-4 text-cyan-500" />
              Defense & Risk Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  System Reminder Intensity
                </label>
                <select
                  value={reminderIntensity}
                  onChange={(e) => setReminderIntensity(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-semibold"
                  disabled={saving}
                >
                  <option value="gentle">Gentle (Passive notices)</option>
                  <option value="normal">Normal (Moderate pings)</option>
                  <option value="aggressive">🔥 Aggressive (Continuous escalation alerts)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Target Safety Buffer Percentage
                </label>
                <input
                  type="number"
                  value={bufferPercent}
                  onChange={(e) => setBufferPercent(parseInt(e.target.value, 10) || 0)}
                  min="0"
                  max="100"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Section: Web Push Notifications */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              Browser & Push Notifications (Optional)
            </h3>
            <p className="text-xs text-slate-400">
              Receive timely desktop alerts for critical rescue states and approaching deadlines even when your tab is in the background. Works without push using in-app reminders.
            </p>
            {pushMsg && (
              <div className="p-3 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800 text-slate-200">
                {pushMsg}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushStatus === 'requesting'}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold px-4 py-2 rounded-lg transition-all"
              >
                {pushStatus === 'requesting' ? 'Requesting Permission...' : 'Enable browser notifications'}
              </button>
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={pushStatus === 'testing'}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold px-4 py-2 rounded-lg border border-slate-700 transition-all"
              >
                {pushStatus === 'testing' ? 'Sending Test...' : 'Test notification'}
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-2.5 px-8 rounded-lg text-xs font-mono uppercase tracking-widest transition-all shadow-lg shadow-cyan-900/10"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Storing calibrations...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Calibrate Preferences
                </>
              )}
            </button>
          </div>

        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-6 text-center text-[10px] text-slate-600 font-mono uppercase tracking-widest mt-12">
        🛡️ DEADLINE DEFENDER AI CONFIG PANEL • SYSTEM SECURE
      </footer>
    </div>
  );
}
