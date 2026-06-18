'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, getProfile, supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Eye, EyeOff, LogIn, Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { translations } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { login, lang } = useStore();
  const t = translations[lang].auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset state
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const resetLabels = lang === 'en' ? {
    title: 'Reset Password',
    desc: 'Enter your email and we\'ll send you a link to reset your password.',
    emailLabel: 'Email',
    send: 'Send Reset Link',
    sent: 'Reset link sent! Check your email inbox.',
    back: 'Back to login',
    forgot: 'Forgot password?',
    error: 'Failed to send reset link. Please try again.',
  } : {
    title: 'Reset Password',
    desc: 'Masukkan email Anda dan kami akan mengirim link untuk mereset password.',
    emailLabel: 'Email',
    send: 'Kirim Link Reset',
    sent: 'Link reset terkirim! Cek inbox email Anda.',
    back: 'Kembali ke login',
    forgot: 'Lupa password?',
    error: 'Gagal mengirim link reset. Silakan coba lagi.',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signIn(email, password);
      if (data.user) {
        const profile = await getProfile(data.user.id);
        const userRole = profile?.role || 'user';
        login(
          { name: profile?.full_name || data.user.email, id: data.user.id, username: profile?.username, avatar_url: profile?.avatar_url, frame_id: profile?.frame_id },
          userRole
        );
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetError('');
    try {
      if (!supabase) throw new Error('Not configured');
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      if (error) throw error;
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || resetLabels.error);
    } finally {
      setResetLoading(false);
    }
  };

  // Password reset view
  if (showReset) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Link href="/" className="font-serif text-3xl font-bold italic">
              <span className="text-accent">Di.</span>
              <span className="text-tx">tulis</span>
            </Link>
          </div>

          <div className="p-8 rounded-2xl border border-border bg-bg-card space-y-5">
            <h1 className="text-2xl font-bold font-serif text-center">{resetLabels.title}</h1>
            <p className="text-sm text-tx-soft text-center">{resetLabels.desc}</p>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm text-center flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 shrink-0" /> {resetLabels.sent}
                </div>
                <button
                  onClick={() => { setShowReset(false); setResetSuccess(false); setResetEmail(''); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-bg-soft transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> {resetLabels.back}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm text-center">
                    {resetError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-tx-soft uppercase tracking-wider">{resetLabels.emailLabel}</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-gray-100 dark:bg-gray-900 focus:outline-none focus:border-accent transition-colors text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  {resetLoading ? t.loading : resetLabels.send}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetError(''); setResetEmail(''); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-bg-soft transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> {resetLabels.back}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Login view
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="font-serif text-3xl font-bold italic">
            <span className="text-accent">Di.</span>
            <span className="text-tx">tulis</span>
          </Link>
          <p className="text-tx-soft mt-2">{t.welcome}</p>
        </div>

        <div className="p-8 rounded-2xl border border-border bg-bg-card space-y-5">
          <h1 className="text-2xl font-bold font-serif text-center">{t.loginBtn}</h1>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-tx-soft uppercase tracking-wider">
                {t.email}
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-border bg-gray-100 dark:bg-gray-900 focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-tx-soft uppercase tracking-wider">
                  {t.password}
                </label>
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-xs text-accent hover:underline"
                >
                  {resetLabels.forgot}
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-3 rounded-lg border border-border bg-gray-100 dark:bg-gray-900 focus:outline-none focus:border-accent transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {loading ? t.loading : t.loginBtn}
            </button>
          </form>

          <p className="text-center text-sm text-tx-soft">
            {t.noAccount}{' '}
            <Link href="/register" className="text-accent font-medium hover:underline">
              {t.registerHere}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
