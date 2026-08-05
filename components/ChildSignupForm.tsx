'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { setActiveUser, recordLastLogin, registerChildUser } from '@/lib/userSession';
import ChildAccountForm, { ChildFormData, emptyChildForm } from '@/components/ChildAccountForm';

// Lets a child create their own account with no parent required yet — see
// docs/parent-child-linking-design.md. Mirrors the "Try Demo" flow in
// app/welcome/page.tsx (anonymous session -> server route -> RPC), except
// this creates a real, permanent `children` row instead of an ephemeral
// demo account, and logs the child straight into it afterward.
export default function ChildSignupForm() {
  const router = useRouter();
  const [data, setData] = useState<ChildFormData>(emptyChildForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!data.fullName.trim() || !data.schoolName.trim() || !data.username.trim() || data.pin.length !== 4) {
      setError('Please fill in every field, including a 4-digit PIN.');
      return;
    }

    setSubmitting(true);
    try {
      const authUid = await ensureAnonymousSession();
      if (!authUid) throw new Error('Could not start a session. Check your connection and try again.');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Could not start a session. Check your connection and try again.');

      const res = await fetch('/api/child-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: session.access_token,
          username: data.username,
          pin: data.pin,
          fullName: data.fullName,
          grade: data.grade,
          gender: data.gender,
          schoolName: data.schoolName,
          avatar: data.avatar,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not create your account.');
      }

      registerChildUser({
        id: result.id,
        fullName: data.fullName,
        grade: data.grade,
        gender: data.gender,
        avatar: data.avatar,
      });
      setActiveUser(result.id);
      await recordLastLogin(result.id);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      <ChildAccountForm label="Your details" data={data} onChange={setData} />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3"
      >
        {submitting ? 'Creating your account…' : 'Start Playing'}
      </button>

      <p className="text-center text-xs text-gray-500">
        You can play right away. Ask a parent to link their email later from inside the
        game to unlock leaderboards and PvP battles, and earn a 100 gold bonus.
      </p>
    </form>
  );
}
