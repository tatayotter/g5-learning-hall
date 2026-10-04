'use client';
// The second admin login. Parent and parent-registered child data come from
// RPCs (admin_list_parents, admin_list_children, ...) that check the caller's
// Supabase Auth email, so those sections also need the admin account signed
// in on top of the passcode. Shared by ParentsSection and ChildrenSection.
import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Card, Input } from '@/components/admin/ui';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

export type AdminAccountStatus = 'loading' | 'signed_out' | 'wrong_account' | 'admin';

export function useAdminAccount() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email || null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setEmail(user?.email || null);
    });
    return () => { cancelled = true; };
  }, []);

  const status: AdminAccountStatus =
    email === undefined ? 'loading' : !email ? 'signed_out' : email === ADMIN_EMAIL ? 'admin' : 'wrong_account';

  return { status, email: email ?? null, refresh };
}

export function AdminSignInCard({ purpose, onSignedIn }: { purpose: string; onSignedIn: () => void }) {
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setBusy(false);
    if (signInError) {
      setError('Incorrect email or password.');
      return;
    }
    onSignedIn();
  };

  return (
    <Card className="max-w-md">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--a-accent-soft)] text-[var(--a-accent)]">
          <ShieldCheck size={18} aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--a-ink)]">Admin account required</p>
          <p className="mt-0.5 text-xs text-[var(--a-muted)]">Sign in with the admin account to {purpose}.</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <Input type="email" placeholder="Admin email" aria-label="Admin email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="text-xs text-[var(--a-critical)]">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy} className="w-full">{busy ? 'Signing in...' : 'Sign in'}</Button>
      </form>
    </Card>
  );
}

export function WrongAccountNotice({ email }: { email: string | null }) {
  return (
    <Card className="max-w-md">
      <p className="text-sm text-[var(--a-ink-2)]">
        Signed in as <span className="font-medium text-[var(--a-ink)]">{email}</span>, which isn&apos;t the admin account.
        Sign out of the parent dashboard on this device and sign in with the admin account.
      </p>
    </Card>
  );
}
