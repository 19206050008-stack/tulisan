'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Eye, EyeOff, UserPlus, BookOpen, PenTool } from 'lucide-react';

import { translations } from '@/lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const { login, lang } = useStore();
  const t = translations[lang].auth;
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [interest, setInterest] = useState<'read' | 'write' | 'both'>('both');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!username.match(/^[a-zA-Z0-9_]+$/)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      const data = await signUp(email, password, username, fullName, interest);
      if (data.user) {
        login({ name: fullName, id: data.user.id, username }, 'user');
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-3xl font-bold italic">
            <span className="text-accent">Di.</span><span className="text-tx">tulis</span>
          </Link>
          <p className="text-tx-soft mt-2">{t.join}</p>
        </div>

        <div className="p-8 rounded-2xl border border-border bg-bg-card space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold font-serif text-center">{t.join}</h1>
              <p className="text-center text-sm text-gray-500">What brings you here?</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setInterest('read')} className={`p-4 rounded-xl border text-center transition-all ${interest === 'read' ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-gray-300'}`}>
                  <BookOpen className="h-6 w-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Read</span>
                </button>
                <button onClick={() => setInterest('write')} className={`p-4 rounded-xl border text-center transition-all ${interest === 'write' ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-gray-300'}`}>
                  <PenTool className="h-6 w-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Write</span>
                </button>
                <button onClick={() => setInterest('both')} className={`p-4 rounded-xl border text-center transition-all ${interest === 'both' ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-gray-300'}`}>
                  <UserPlus className="h-6 w-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Both</span>
                </button>
              </div>
              <button onClick={() => setStep(2)} className="w-full py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity">
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h1 className="text-2xl font-bold font-serif text-center">Create Your Account</h1>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="text-xs font-medium text-tx-soft">{t.name}</label>
                  <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" required className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-xs font-medium text-tx-soft">{t.username}</label>
                  <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="unique_username" required className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-tx-soft">{t.email}</label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent text-sm" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-tx-soft">{t.password}</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent text-sm pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-medium text-tx-soft">Confirm Password</label>
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent text-sm" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 rounded-full border border-border text-sm hover:bg-bg-soft transition-colors">Back</button>
                <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  <UserPlus className="h-4 w-4" />
                  {loading ? t.loading : t.registerBtn}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 pt-2">
                By signing up, you agree to our <Link href="/terms" className="text-accent hover:underline">Terms</Link> and <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
              </p>
            </form>
          )}

          <p className="text-center text-sm text-tx-soft">
            {t.hasAccount} <Link href="/login" className="text-accent font-medium hover:underline">{t.loginHere}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
