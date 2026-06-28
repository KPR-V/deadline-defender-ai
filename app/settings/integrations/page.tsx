'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Database,
  Shield,
  Sparkles,
  Calendar,
  Mail,
  Bell,
  Copy,
  Check,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../../lib/firebase/AuthContext';
import LoadingState from '../../../components/LoadingState';

interface HealthStatus {
  status: 'connected' | 'error' | 'reconnect_required' | 'missing_scope' | 'disconnected' | 'in_app_only';
  message: string;
  suggestedFix?: string | null;
}

function IntegrationsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Health states
  const [firebaseAuthHealth, setFirebaseAuthHealth] = useState<HealthStatus>({
    status: 'disconnected',
    message: 'Checking authentication state...',
  });
  const [firestoreHealth, setFirestoreHealth] = useState<HealthStatus>({
    status: 'disconnected',
    message: 'Checking database connectivity...',
  });
  const [geminiHealth, setGeminiHealth] = useState<HealthStatus>({
    status: 'disconnected',
    message: 'Checking Gemini API health...',
  });
  const [googleHealth, setGoogleHealth] = useState<HealthStatus>({
    status: 'disconnected',
    message: 'Checking Google OAuth status...',
  });
  const [calendarHealth, setCalendarHealth] = useState<HealthStatus>({
    status: 'disconnected',
    message: 'Checking Calendar API scopes...',
  });
  const [gmailHealth, setGmailHealth] = useState<HealthStatus>({
    status: 'disconnected',
    message: 'Checking Gmail API scopes...',
  });
  const [notificationsHealth, setNotificationsHealth] = useState<HealthStatus>({
    status: 'disconnected',
    message: 'Checking notification configuration...',
  });

  const runHealthCheck = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    setErrorMsg(null);

    // 1. Client Auth Check
    setFirebaseAuthHealth({
      status: 'connected',
      message: `Authenticated as ${user.email || user.uid}.`,
      suggestedFix: null,
    });

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Parallel fetch across health endpoints
      const [fireRes, geminiRes, googleRes, calRes, gmailRes, notifRes] = await Promise.all([
        fetch('/api/health/firebase', { headers }),
        fetch('/api/health/gemini', { headers }),
        fetch('/api/health/google', { headers }),
        fetch('/api/health/calendar', { headers }),
        fetch('/api/health/gmail', { headers }),
        fetch('/api/health/notifications', { headers }),
      ]);

      if (fireRes.ok || fireRes.status === 401) setFirestoreHealth(await fireRes.json());
      if (geminiRes.ok || geminiRes.status === 401) setGeminiHealth(await geminiRes.json());
      if (googleRes.ok || googleRes.status === 401) setGoogleHealth(await googleRes.json());
      if (calRes.ok || calRes.status === 401) setCalendarHealth(await calRes.json());
      if (gmailRes.ok || gmailRes.status === 401) setGmailHealth(await gmailRes.json());
      if (notifRes.ok || notifRes.status === 401) setNotificationsHealth(await notifRes.json());
    } catch (err) {
      console.error('Health check failed:', err);
      setErrorMsg('Network error while executing diagnostic checks.');
    } finally {
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runHealthCheck();
    }
  }, [user, authLoading, router, runHealthCheck]);

  const handleConnectGoogle = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/auth/google/start?idToken=${token}`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, 'google_oauth_popup', 'width=600,height=700');
      } else {
        setErrorMsg('Failed to start Google connection.');
      }
    } catch (err) {
      setErrorMsg('Network error starting Google connection.');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setDisconnecting(true);
      const token = await user?.getIdToken();
      const res = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccessMsg('Google disconnected successfully.');
        await runHealthCheck();
      } else {
        setErrorMsg('Failed to disconnect Google.');
      }
    } catch (err) {
      setErrorMsg('Network error disconnecting Google.');
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.success) {
          setSuccessMsg('Google connected successfully!');
          runHealthCheck();
        } else {
          setErrorMsg('Google authentication failed.');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [runHealthCheck]);

  const handleCopyReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      firebaseAuth: firebaseAuthHealth,
      firestore: firestoreHealth,
      geminiApi: geminiHealth,
      googleOAuth: googleHealth,
      googleCalendar: calendarHealth,
      gmail: gmailHealth,
      notifications: notificationsHealth,
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (authLoading) {
    return <LoadingState message="Checking integration core..." className="min-h-screen bg-slate-950" />;
  }

  const renderBadge = (status: HealthStatus['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
            <CheckCircle className="w-3 h-3" /> Connected
          </span>
        );
      case 'in_app_only':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
            <CheckCircle className="w-3 h-3" /> In-App Enabled
          </span>
        );
      case 'reconnect_required':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded animate-pulse">
            <AlertTriangle className="w-3 h-3" /> Reconnect Required
          </span>
        );
      case 'missing_scope':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
            <AlertTriangle className="w-3 h-3" /> Missing Scope
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 rounded">
            <AlertTriangle className="w-3 h-3" /> Error
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700 rounded">
            Disconnected
          </span>
        );
    }
  };

  const renderCard = (title: string, icon: React.ReactNode, health: HealthStatus, extraActions?: React.ReactNode) => (
    <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-xl space-y-3 transition-all hover:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-850 text-indigo-400">{icon}</div>
          <h3 className="text-sm font-bold font-mono uppercase text-slate-200 tracking-wider">{title}</h3>
        </div>
        {renderBadge(health.status)}
      </div>

      <p className="text-xs text-slate-300 font-sans leading-relaxed">{health.message}</p>

      {health.suggestedFix && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span className="font-bold block mb-0.5 font-mono uppercase text-[10px]">Suggested Fix</span>
            {health.suggestedFix}
          </div>
        </div>
      )}

      {extraActions && <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/30">{extraActions}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            System Settings
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={runHealthCheck}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-lg transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Run health check'}
            </button>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded font-mono font-bold">
              INTEGRATIONS HUB
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-6 py-8 flex-grow space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans uppercase">Integration Health</h1>
              <p className="text-xs text-slate-400 mt-0.5">Real-time diagnostics and status report across system dependencies.</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg p-3.5 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Health Diagnostic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Firebase Auth */}
          {renderCard('Firebase Auth', <Shield className="w-4 h-4" />, firebaseAuthHealth)}

          {/* 2. Firestore */}
          {renderCard('Firestore', <Database className="w-4 h-4" />, firestoreHealth)}

          {/* 3. Gemini API */}
          {renderCard('Gemini API', <Sparkles className="w-4 h-4" />, geminiHealth)}

          {/* 4. Google OAuth */}
          {renderCard(
            'Google OAuth',
            <Image
              src="https://www.gstatic.com/images/branding/product/1x/google_32dp.png"
              alt="Google"
              width={16}
              height={16}
              className="w-4 h-4"
              unoptimized
              referrerPolicy="no-referrer"
            />,
            googleHealth,
            googleHealth.status === 'connected' ? (
              <button
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400 text-[10px] font-mono font-bold rounded border border-slate-700 transition-all"
              >
                {disconnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectGoogle}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-200 text-slate-900 text-[10px] font-mono font-bold rounded transition-colors"
              >
                Connect Google Account
              </button>
            )
          )}

          {/* 5. Google Calendar */}
          {renderCard('Google Calendar', <Calendar className="w-4 h-4" />, calendarHealth)}

          {/* 6. Gmail */}
          {renderCard('Gmail', <Mail className="w-4 h-4" />, gmailHealth)}

          {/* 7. Notifications */}
          {renderCard('Notifications', <Bell className="w-4 h-4" />, notificationsHealth)}
        </div>

        {/* Debug Report Panel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-mono uppercase text-slate-200 tracking-wider">Diagnostic Debug Report</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Copyable status manifest sanitized of sensitive keys and tokens for troubleshooting.
              </p>
            </div>
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg border border-slate-700 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied Report!' : 'Copy Debug Report'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading health diagnostics..." className="min-h-screen bg-slate-950" />}>
      <IntegrationsContent />
    </Suspense>
  );
}
