'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Sparkles, Key, Mail, User, ArrowRight, AlertTriangle, Play } from 'lucide-react';
import { loginWithEmail, signupWithEmail, loginWithGoogle } from '../../lib/firebase/auth';
import { useAuth } from '../../lib/firebase/AuthContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signInDemo, loading: authLoading } = useAuth();

  const isSignUpRequested = searchParams?.get('signup') === 'true';
  const isDemoRequested = searchParams?.get('demo') === 'true' && process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';

  const [isSignUp, setIsSignUp] = useState(isSignUpRequested);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async () => {
    setError('');
    try {
      await signInDemo();
      router.push('/dashboard');
    } catch (err: any) {
      setError('Failed to initialize local demo session.');
    }
  };

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    // If demo flag in URL, log in instantly
    if (isDemoRequested && !user) {
      const timer = setTimeout(() => {
        handleDemoLogin();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoRequested, user]);


  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (isSignUp && !displayName) {
      setError('Please enter your display name.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signupWithEmail(email, displayName, password);
      } else {
        await loginWithEmail(email, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      let readableError = err.message || 'Authentication failed.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        readableError = 'Invalid email or password credentials.';
      } else if (err.code === 'auth/email-already-in-use') {
        readableError = 'This email address is already registered.';
      } else if (err.code === 'auth/weak-password') {
        readableError = 'Password must be at least 6 characters.';
      }
      setError(readableError);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">
        LOADING DEFENDER CORE...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative blurred rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

      <div className="w-full max-w-md bg-slate-900/65 border border-slate-800 rounded-xl p-8 shadow-2xl backdrop-blur-md relative">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-cyan-950/40">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase font-sans">
            Deadline Defender System
          </h2>
          <p className="text-xs text-slate-400">
            Secure client portal. Intercept slippage before failure.
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3.5 flex items-start gap-2">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tactical Commander"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@deadline.defender"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Key className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-cyan-900/10 disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing Grid Security...' : isSignUp ? 'Initiate Account' : 'Authenticate Credentials'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-mono uppercase tracking-wider">OR SIGN IN WITH</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-bold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>

        {process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true' && (
          <>
            {/* OR divider */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-mono uppercase tracking-wider">OR BYPASS</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Demo login bypass button */}
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700/80 text-cyan-400 hover:text-cyan-300 font-bold py-2.5 rounded-lg text-xs transition-all font-mono uppercase tracking-widest"
            >
              <Play className="w-3.5 h-3.5" />
              Instant Hackathon Demo Login
            </button>
          </>
        )}

        {/* Toggle */}
        <div className="text-center mt-6">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {isSignUp ? (
              <span>Already have a grid account? <strong className="text-cyan-400">Sign In</strong></span>
            ) : (
              <span>New to Defender? <strong className="text-cyan-400">Create Grid Profile</strong></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">LOADING CLIENT GATEWAY...</div>}>
      <LoginContent />
    </Suspense>
  );
}
