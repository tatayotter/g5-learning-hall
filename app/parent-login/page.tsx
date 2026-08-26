'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function ParentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError('Incorrect email or password.');
      return;
    }
    router.push('/parent-dashboard');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Image
          src="/learning_hall_full_logo.webp"
          alt="Learning Hall"
          width={495}
          height={367}
          priority
          className="h-16 w-auto mx-auto mb-6 object-contain drop-shadow-[0_6px_28px_rgba(0,0,0,0.18)]"
        />
        <form onSubmit={handleSubmit} className="bg-[#ffffff] border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h1 className="text-2xl font-display font-bold text-slate-800 text-center">Parent Login</h1>
          <input
            ref={emailRef}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            autoComplete="email"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-[#ffffff] border border-stone-300 px-4 py-3 pr-16 text-base text-gray-900 placeholder-stone-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-600 hover:text-amber-700 px-1 py-1"
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-base text-red-600">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-[#ffffff] font-bold text-lg py-3.5 shadow-lg shadow-orange-500/25 transition-all"
          >
            {submitting ? 'Logging in…' : 'Log In'}
          </button>
          <p className="text-center text-sm text-stone-500">
            No account yet? <a href="/register" className="text-amber-700 hover:text-amber-800 underline">Register here</a>
          </p>
        </form>
      </div>
    </main>
  );
}
