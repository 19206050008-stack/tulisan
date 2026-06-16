'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, getProfile } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Eye, EyeOff, LogIn } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await signIn(email, password);
      if (data.user) {
        const profile = await getProfile(data.user.id);
        const userRole = profile?.role || 'user';
        login({ name: profile?.full_name || data.user.email, id: data.user.id, username: profile?.username, avatar_url: profile?.avatar_url }, userRole);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-3xl font-bold italic">
            <span className="text-accent">Di.</span><span className="text-brand-text dark:text-white">tulis</span>
          </Link>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t.welcome}</p>
        </div>

        <div className="p-8 rounded-2xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 space-y-6">
          <h1 className="text-2xl font-bold font-serif text-center">{t.loginBtn}</h1>

          {error && <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.email}</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-subtle dark:border-gray-700 bg-brand-muted dark:bg-gray-900 focus:outline-none focus:border-accent transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-subtle dark:border-gray-700 bg-brand-muted dark:bg-gray-900 focus:outline-none focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? t.loading : <><LogIn className="h-4 w-4" /> {t.loginBtn}</>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {t.noAccount} <Link href="/register" className="text-accent hover:underline">{t.registerHere}</Link>
          </p>
        </div>

        <div className="p-8 rounded-2xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 space-y-6">
          <h1 className="text-2xl font-bold font-serif text-center">Log In</h1>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full px-4 py-3 rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm" autoFocus />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium text-gray-600 dark:text-gray-400">Password</label>
                <Link href="/help" className="text-xs text-accent hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required className="w-full px-4 py-3 rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              <LogIn className="h-4 w-4" />
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account? <Link href="/register" className="text-accent font-medium hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
