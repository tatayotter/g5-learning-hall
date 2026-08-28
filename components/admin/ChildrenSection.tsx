'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { callAdminApi } from '@/lib/adminApi';
import { GRADES } from '@/components/ChildAccountForm';

const DEFAULT_SCHOOL = 'Surigao City Special Science Elementary School';
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

interface Classmate {
  id: string;
  username: string;
  full_name: string;
  grade: string;
  gender: 'boy' | 'girl';
  is_active: boolean;
  school_name: string;
}

interface AdminChild {
  id: string;
  parent_id: string | null;
  parent_email: string | null;
  parent_status: string | null;
  username: string;
  full_name: string;
  grade: string;
  gender: 'boy' | 'girl';
  school_name: string;
  avatar: string;
  is_active: boolean;
  created_at: string;
}

type Person =
  | { source: 'classmate'; data: Classmate }
  | { source: 'child'; data: AdminChild };

export default function ChildrenSection({ passcode }: { passcode: string }) {
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [children, setChildren] = useState<AdminChild[]>([]);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [childrenError, setChildrenError] = useState('');

  const [schoolFilter, setSchoolFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [grade, setGrade] = useState('Grade 5');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const [reassignTargetId, setReassignTargetId] = useState<string | null>(null);
  const [reassignEmail, setReassignEmail] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [reassignMessage, setReassignMessage] = useState('');

  const loadClassmates = async () => {
    // classmates denies all direct client reads (RLS) — username isn't safe
    // to expose through a public view, so this goes through a passcode-
    // gated route instead, same pattern as every write below.
    const result = await callAdminApi<{ classmates: Classmate[] }>('/api/classmate-admin', { passcode, action: 'list' });
    setClassmates(result.success ? result.classmates || [] : []);
  };

  const loadSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email || null);
  };

  const loadChildren = async () => {
    setChildrenError('');
    const { data, error } = await supabase.rpc('admin_list_children');
    if (error) {
      setChildrenError(error.message);
      return;
    }
    setChildren((data as AdminChild[]) || []);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadClassmates(), loadSession()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (userEmail && userEmail === ADMIN_EMAIL) loadChildren();
  }, [userEmail]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoggingIn(false);
    if (error) {
      setLoginError('Incorrect email or password.');
      return;
    }
    loadSession();
  };

  const suggestUsername = (name: string) =>
    name.replace(/[^a-zA-Z ]/g, '').split(' ').filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1)).join('');

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (!usernameTouched) setUsername(suggestUsername(value));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !newPassword.trim()) {
      setError('Full name, username, and password are all required.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await callAdminApi('/api/classmate-admin', { passcode, username, fullName, grade, gender, password: newPassword, schoolName });
    if (!result.success) {
      setError(result.error || 'Failed to add classmate.');
    } else {
      setFullName('');
      setUsername('');
      setNewPassword('');
      setGender('boy');
      setUsernameTouched(false);
      loadClassmates();
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (c: Classmate) => {
    const result = await callAdminApi('/api/classmate-admin', { passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender, isActive: !c.is_active });
    if (result.success) loadClassmates();
    else alert(result.error || 'Failed to update.');
  };

  const handleToggleGender = async (c: Classmate) => {
    const result = await callAdminApi('/api/classmate-admin', { passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender === 'girl' ? 'boy' : 'girl' });
    if (result.success) loadClassmates();
    else alert(result.error || 'Failed to update.');
  };

  const handleResetPassword = async (c: Classmate) => {
    if (!resetPassword.trim()) return;
    const result = await callAdminApi('/api/classmate-admin', { passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender, password: resetPassword });
    if (result.success) {
      alert(`✅ Password updated for ${c.full_name}.`);
      setResetTargetId(null);
      setResetPassword('');
    } else {
      alert(result.error || 'Failed to reset password.');
    }
  };

  const handleToggleChildActive = async (c: AdminChild) => {
    const { error } = await supabase.rpc('admin_set_child_active', { p_child_id: c.id, p_is_active: !c.is_active });
    if (error) alert(error.message);
    else loadChildren();
  };

  const handleReassign = async (c: AdminChild) => {
    if (!reassignEmail.trim() || !reassignReason.trim()) return;
    setReassignSubmitting(true);
    setReassignMessage('');
    const result = await callAdminApi('/api/admin-child-reassignment', {
      passcode, childId: c.id, newParentEmail: reassignEmail.trim(), reason: reassignReason.trim(),
    });
    setReassignSubmitting(false);
    if (result.success) {
      setReassignMessage('✅ Reassignment requested — both parents have been notified. It takes effect in 48 hours unless the current parent cancels it.');
      setReassignEmail('');
      setReassignReason('');
    } else {
      setReassignMessage(`❌ ${result.error || 'Failed to request reassignment.'}`);
    }
  };

  const people: Person[] = useMemo(() => [
    ...classmates.map((data): Person => ({ source: 'classmate', data })),
    ...children.map((data): Person => ({ source: 'child', data })),
  ], [classmates, children]);

  const schools = useMemo(() => {
    const set = new Set(people.map(p => p.data.school_name).filter(Boolean));
    return Array.from(set).sort();
  }, [people]);

  const filtered = people.filter(p =>
    (schoolFilter === 'All' || p.data.school_name === schoolFilter) &&
    (gradeFilter === 'All' || p.data.grade === gradeFilter)
  );

  const grouped = useMemo(() => {
    const bySchool = new Map<string, Map<string, Person[]>>();
    for (const p of filtered) {
      const school = p.data.school_name || 'Unknown School';
      if (!bySchool.has(school)) bySchool.set(school, new Map());
      const byGrade = bySchool.get(school)!;
      const grade = p.data.grade || 'Unknown Grade';
      if (!byGrade.has(grade)) byGrade.set(grade, []);
      byGrade.get(grade)!.push(p);
    }
    return bySchool;
  }, [filtered]);

  return (
    <div>
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">Children</h2>
      <p className="text-[#8a7c66] text-sm mb-6">
        Every child account — legacy classmates and parent-registered kids alike — organized by school and grade.
      </p>

      {/* Add classmate */}
      <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5 mb-6">
        <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-4">Add Classmate</p>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="text-xs text-[#8a7c66] block mb-1">Full Name</label>
            <input type="text" placeholder="e.g. Juan Dela Cruz" value={fullName} onChange={e => handleFullNameChange(e.target.value)}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-[#8a7c66] block mb-1">Username (login)</label>
            <input type="text" placeholder="FirstNameLastname" value={username} onChange={e => { setUsername(e.target.value); setUsernameTouched(true); }}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] font-mono focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-[#8a7c66] block mb-1">Password</label>
            <input type="text" placeholder="Set their password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] font-mono focus:outline-none focus:border-neutral-500" />
          </div>
          <div>
            <label className="text-xs text-[#8a7c66] block mb-1">Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value)}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] focus:outline-none focus:border-neutral-500">
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#8a7c66] block mb-1">Gender (sprite)</label>
            <select value={gender} onChange={e => setGender(e.target.value as 'boy' | 'girl')}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] focus:outline-none focus:border-neutral-500">
              <option value="boy">Boy</option>
              <option value="girl">Girl</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-[#8a7c66] block mb-1">School</label>
            <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-[#ede4d3] focus:outline-none focus:border-neutral-500" />
          </div>
          <div className="col-span-2">
            {error && <p className="text-[#e0605a] text-xs mb-3">{error}</p>}
            <button type="submit" disabled={submitting} className="bg-[#3f6428] hover:bg-[#4d7a32] disabled:opacity-40 text-[#ede4d3] font-bold px-6 py-2 rounded-lg transition-colors">
              {submitting ? 'Adding...' : '➕ Add Classmate'}
            </button>
          </div>
        </form>
      </div>

      {/* Parent-registered children note / login gate */}
      {userEmail === null && (
        <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-5 mb-6">
          <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-3">Parent-Registered Children</p>
          <p className="text-[#8a7c66] text-sm mb-4">Sign in with the admin account to also see and manage parent-registered children here.</p>
          <form onSubmit={handleLogin} className="max-w-sm space-y-3">
            <input type="email" placeholder="Admin email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full rounded-lg bg-neutral-950 border border-[#3d3225] px-3 py-2 text-sm text-[#ede4d3]" required />
            <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full rounded-lg bg-neutral-950 border border-[#3d3225] px-3 py-2 text-sm text-[#ede4d3]" required />
            {loginError && <p className="text-[#e0605a] text-xs">{loginError}</p>}
            <button type="submit" disabled={loggingIn} className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[#ede4d3] font-bold py-2.5">
              {loggingIn ? 'Logging in…' : 'Log In'}
            </button>
          </form>
        </div>
      )}
      {userEmail && userEmail !== ADMIN_EMAIL && (
        <p className="text-[#8a7c66] text-sm mb-6">Signed in as {userEmail}, which isn&apos;t the admin account, so parent-registered children aren&apos;t shown.</p>
      )}
      {childrenError && <p className="text-[#e0605a] text-sm mb-4">{childrenError}</p>}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}
          className="bg-[#1c1611] border border-[#3d3225] rounded-lg px-3 py-2 text-sm text-[#ede4d3]">
          <option value="All">All Schools</option>
          {schools.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="bg-[#1c1611] border border-[#3d3225] rounded-lg px-3 py-2 text-sm text-[#ede4d3]">
          <option value="All">All Grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-[#8a7c66] text-sm animate-pulse">Loading...</p>
      ) : grouped.size === 0 ? (
        <p className="text-gray-600 text-sm">No children match these filters.</p>
      ) : (
        Array.from(grouped.entries()).map(([school, byGrade]) => (
          <div key={school} className="mb-6">
            <p className="text-sm font-bold text-indigo-300 mb-3">{school}</p>
            {Array.from(byGrade.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([gradeName, list]) => (
              <div key={gradeName} className="mb-4">
                <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-2">{gradeName} · {list.length}</p>
                <div className="space-y-2">
                  {list.map(p => p.source === 'classmate' ? (
                    <div key={`classmate-${p.data.id}`} className="bg-neutral-950 border border-[#2a2119] rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#ede4d3] font-medium text-sm">{p.data.full_name} <span className="text-gray-600 text-xs font-normal">· classmate</span></p>
                          <p className="text-xs text-[#8a7c66] font-mono">{p.data.username}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleGender(p.data)}
                            className="bg-[#2a2119] hover:bg-[#3d3225] text-[#ede4d3] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors" title="Toggle sprite gender">
                            {p.data.gender === 'girl' ? '👧 Girl' : '👦 Boy'}
                          </button>
                          <button onClick={() => { setResetTargetId(resetTargetId === p.data.id ? null : p.data.id); setResetPassword(''); }}
                            className="bg-[#2a2119] hover:bg-[#3d3225] text-[#ede4d3] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                            🔑 Reset Password
                          </button>
                          <button onClick={() => handleToggleActive(p.data)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${p.data.is_active ? 'bg-[#223616]/50 text-[#7fae52] border border-[#33501f] hover:bg-[#4a0e0c]/50 hover:text-[#e0605a] hover:border-[#6e1512]' : 'bg-[#2a2119] text-[#8a7c66] border border-[#3d3225] hover:bg-[#223616]/50 hover:text-[#7fae52]'}`}>
                            {p.data.is_active ? '✅ Active' : '⛔ Inactive'}
                          </button>
                        </div>
                      </div>
                      {resetTargetId === p.data.id && (
                        <div className="mt-3 flex gap-2">
                          <input type="text" placeholder="New password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                            className="flex-1 bg-[#1c1611] border border-[#3d3225] rounded-lg px-3 py-1.5 text-[#ede4d3] text-sm font-mono focus:outline-none focus:border-neutral-500" />
                          <button onClick={() => handleResetPassword(p.data)}
                            className="bg-[#a8620f] hover:bg-[#c9781a] text-[#ede4d3] text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={`child-${p.data.id}`} className="bg-neutral-950 border border-[#2a2119] rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#ede4d3] font-medium text-sm">
                            {p.data.full_name}{' '}
                            <span className="text-gray-600 text-xs font-normal">
                              · {p.data.parent_id ? 'parent-registered' : 'self-registered, unlinked'}
                            </span>
                          </p>
                          <p className="text-xs text-[#8a7c66] font-mono">
                            {p.data.username}{' '}
                            {p.data.parent_id
                              ? `· parent: ${p.data.parent_email}`
                              : <span className="text-amber-500">· no parent linked yet</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#ede4d3] text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2a2119]">
                            {p.data.gender === 'girl' ? '👧 Girl' : '👦 Boy'}
                          </span>
                          {p.data.parent_id && (
                            <button onClick={() => {
                              setReassignTargetId(reassignTargetId === p.data.id ? null : p.data.id);
                              setReassignEmail(''); setReassignReason(''); setReassignMessage('');
                            }}
                              className="bg-[#2a2119] hover:bg-[#3d3225] text-[#ede4d3] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                              🔁 Reassign Parent
                            </button>
                          )}
                          <button onClick={() => handleToggleChildActive(p.data)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${p.data.is_active ? 'bg-[#223616]/50 text-[#7fae52] border border-[#33501f] hover:bg-[#4a0e0c]/50 hover:text-[#e0605a] hover:border-[#6e1512]' : 'bg-[#2a2119] text-[#8a7c66] border border-[#3d3225] hover:bg-[#223616]/50 hover:text-[#7fae52]'}`}>
                            {p.data.is_active ? '✅ Active' : '⛔ Inactive'}
                          </button>
                        </div>
                      </div>
                      {reassignTargetId === p.data.id && (
                        <div className="mt-3 space-y-2 border-t border-[#2a2119] pt-3">
                          <p className="text-xs text-[#8a7c66]">
                            Moves this child to a different (already-registered) parent account. Takes effect in
                            48 hours — the current parent gets a cancel link, the new parent gets a heads-up.
                            Requires a written reason for the audit trail.
                          </p>
                          <input type="email" placeholder="New parent's email (must already have an account)"
                            value={reassignEmail} onChange={e => setReassignEmail(e.target.value)}
                            className="w-full bg-[#1c1611] border border-[#3d3225] rounded-lg px-3 py-1.5 text-[#ede4d3] text-sm focus:outline-none focus:border-neutral-500" />
                          <input type="text" placeholder="Reason (required, e.g. support ticket #)"
                            value={reassignReason} onChange={e => setReassignReason(e.target.value)}
                            className="w-full bg-[#1c1611] border border-[#3d3225] rounded-lg px-3 py-1.5 text-[#ede4d3] text-sm focus:outline-none focus:border-neutral-500" />
                          {reassignMessage && <p className="text-xs">{reassignMessage}</p>}
                          <button onClick={() => handleReassign(p.data)} disabled={reassignSubmitting}
                            className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-[#ede4d3] text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">
                            {reassignSubmitting ? 'Requesting…' : 'Request Reassignment'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
