'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { KeyRound, Link2, Link2Off, Plus, RefreshCw, Repeat, UserX, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { callAdminApi } from '@/lib/adminApi';
import { GRADES } from '@/components/ChildAccountForm';
import {
  Badge, Button, Card, ErrorBanner, Field, Input, PageHeader, Pagination, SearchInput, Segmented, Select, Skeleton,
  StatTile, Switch, Table, Td, Th, useToast,
} from '@/components/admin/ui';
import { AdminSignInCard, useAdminAccount, WrongAccountNotice } from '@/components/admin/AdminAccountGate';

const DEFAULT_SCHOOL = 'Surigao City Special Science Elementary School';
const PAGE_SIZE = 50;

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

type KindFilter = 'all' | 'linked' | 'unlinked' | 'classmate';

const kindOf = (p: Person): Exclude<KindFilter, 'all'> =>
  p.source === 'classmate' ? 'classmate' : p.data.parent_id ? 'linked' : 'unlinked';

const KIND_BADGE = {
  linked: { tone: 'good', label: 'Parent-linked' },
  unlinked: { tone: 'warning', label: 'Unlinked' },
  classmate: { tone: 'neutral', label: 'Classmate' },
} as const;

const fmtDate = (ts: string) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function ChildrenSection({ passcode }: { passcode: string }) {
  const account = useAdminAccount();
  const toast = useToast();

  const [classmates, setClassmates] = useState<Classmate[] | null>(null);
  const [children, setChildren] = useState<AdminChild[]>([]);
  const [childrenError, setChildrenError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [schoolFilter, setSchoolFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(0);

  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [grade, setGrade] = useState('Grade 5');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // One inline panel open at a time: reset a classmate's password, or
  // request a parent reassignment for a parent-registered child.
  const [panel, setPanel] = useState<{ kind: 'reset' | 'reassign'; id: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [reassignEmail, setReassignEmail] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // classmates denies all direct client reads (RLS) — username isn't safe to
  // expose through a public view, so this goes through a passcode-gated route.
  useEffect(() => {
    let cancelled = false;
    callAdminApi<{ classmates: Classmate[] }>('/api/classmate-admin', { passcode, action: 'list' }).then((result) => {
      if (!cancelled) setClassmates(result.success ? result.classmates || [] : []);
    });
    return () => { cancelled = true; };
  }, [passcode, reloadTick]);

  useEffect(() => {
    if (account.status !== 'admin') return;
    let cancelled = false;
    supabase.rpc('admin_list_children').then(({ data, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) setChildrenError(rpcError.message);
      else { setChildrenError(''); setChildren((data as AdminChild[]) || []); }
    });
    return () => { cancelled = true; };
  }, [account.status, reloadTick]);

  const reload = () => setReloadTick((t) => t + 1);

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
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Failed to add classmate.');
      return;
    }
    toast(`Added ${fullName}.`);
    setFullName('');
    setUsername('');
    setNewPassword('');
    setGender('boy');
    setUsernameTouched(false);
    reload();
  };

  const updateClassmate = async (c: Classmate, changes: Record<string, unknown>, done: string) => {
    setBusyId(c.id);
    const result = await callAdminApi('/api/classmate-admin', {
      passcode, id: c.id, username: c.username, fullName: c.full_name, grade: c.grade, gender: c.gender, ...changes,
    });
    setBusyId(null);
    if (!result.success) { toast(result.error || 'Failed to update.', 'error'); return false; }
    toast(`${c.full_name}: ${done}.`);
    reload();
    return true;
  };

  const handleResetPassword = async (c: Classmate) => {
    if (!resetPassword.trim()) return;
    if (await updateClassmate(c, { password: resetPassword }, 'password updated')) {
      setPanel(null);
      setResetPassword('');
    }
  };

  const handleToggleChildActive = async (c: AdminChild) => {
    setBusyId(c.id);
    const { error: rpcError } = await supabase.rpc('admin_set_child_active', { p_child_id: c.id, p_is_active: !c.is_active });
    setBusyId(null);
    if (rpcError) { toast(rpcError.message, 'error'); return; }
    toast(`${c.full_name}: ${c.is_active ? 'deactivated' : 'activated'}.`);
    reload();
  };

  const handleReassign = async (c: AdminChild) => {
    if (!reassignEmail.trim() || !reassignReason.trim()) return;
    setReassignSubmitting(true);
    const result = await callAdminApi('/api/admin-child-reassignment', {
      passcode, childId: c.id, newParentEmail: reassignEmail.trim(), reason: reassignReason.trim(),
    });
    setReassignSubmitting(false);
    if (!result.success) { toast(result.error || 'Failed to request reassignment.', 'error'); return; }
    toast('Reassignment requested. Both parents were notified; it takes effect in 48 hours unless the current parent cancels.');
    setPanel(null);
    setReassignEmail('');
    setReassignReason('');
  };

  const openPanel = (kindName: 'reset' | 'reassign', id: string) => {
    setPanel((cur) => (cur?.kind === kindName && cur.id === id ? null : { kind: kindName, id }));
    setResetPassword('');
    setReassignEmail('');
    setReassignReason('');
  };

  const people: Person[] = useMemo(() => [
    ...(classmates ?? []).map((data): Person => ({ source: 'classmate', data })),
    ...children.map((data): Person => ({ source: 'child', data })),
  ], [classmates, children]);

  const schools = useMemo(
    () => Array.from(new Set(people.map(p => p.data.school_name).filter(Boolean))).sort(),
    [people],
  );

  const counts = useMemo(() => {
    const c = { all: people.length, linked: 0, unlinked: 0, classmate: 0, inactive: 0 };
    for (const p of people) { c[kindOf(p)]++; if (!p.data.is_active) c.inactive++; }
    return c;
  }, [people]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people
      .filter(p =>
        (kind === 'all' || kindOf(p) === kind) &&
        (schoolFilter === 'All' || p.data.school_name === schoolFilter) &&
        (gradeFilter === 'All' || p.data.grade === gradeFilter) &&
        (activeFilter === 'all' || (activeFilter === 'active') === p.data.is_active) &&
        (!q || p.data.full_name.toLowerCase().includes(q) || p.data.username.toLowerCase().includes(q) ||
          (p.source === 'child' && (p.data.parent_email ?? '').toLowerCase().includes(q))),
      )
      // Newest parent-registered first; classmates (no signup date) after.
      .sort((a, b) =>
        (b.source === 'child' ? b.data.created_at : '').localeCompare(a.source === 'child' ? a.data.created_at : '') ||
        a.data.full_name.localeCompare(b.data.full_name));
  }, [people, kind, schoolFilter, gradeFilter, activeFilter, search]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };

  return (
    <div>
      <PageHeader
        title="Children"
        description="Every child account: parent-registered, self-registered and legacy classmates."
        actions={
          <>
            <Button icon={Plus} variant={showAdd ? 'secondary' : 'primary'} onClick={() => setShowAdd((s) => !s)}>
              {showAdd ? 'Close form' : 'Add classmate'}
            </Button>
            <Button icon={RefreshCw} onClick={reload}>Refresh</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Accounts" icon={Users} value={counts.all.toLocaleString()} hint={account.status === 'admin' ? 'All account types' : 'Sign in to see all'} loading={!classmates} />
        <StatTile label="Parent-linked" icon={Link2} value={counts.linked.toLocaleString()} hint={counts.linked + counts.unlinked ? `${Math.round((counts.linked / (counts.linked + counts.unlinked)) * 100)}% of registered kids` : undefined} loading={!classmates} />
        <StatTile label="Unlinked" icon={Link2Off} value={counts.unlinked.toLocaleString()} hint="Self-registered, no parent" loading={!classmates} />
        <StatTile label="Inactive" icon={UserX} value={counts.inactive.toLocaleString()} hint="Can't sign in" loading={!classmates} />
      </div>

      {showAdd && (
        <Card title="Add classmate" description="Legacy classmate accounts sign in with a username and password." className="mb-4">
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <Input placeholder="e.g. Juan Dela Cruz" value={fullName} onChange={e => handleFullNameChange(e.target.value)} />
            </Field>
            <Field label="Username (login)">
              <Input mono placeholder="FirstNameLastname" value={username} onChange={e => { setUsername(e.target.value); setUsernameTouched(true); }} />
            </Field>
            <Field label="Password">
              <Input mono placeholder="Set their password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </Field>
            <Field label="Grade">
              <Select value={grade} onChange={e => setGrade(e.target.value)}>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </Field>
            <Field label="Character" group>
              <Segmented ariaLabel="Character" value={gender} onChange={setGender}
                options={[{ value: 'boy', label: 'Boy' }, { value: 'girl', label: 'Girl' }]} />
            </Field>
            <Field label="School" className="sm:col-span-2">
              <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add classmate'}</Button>
              {error && <p className="text-xs text-[var(--a-critical)]">{error}</p>}
            </div>
          </form>
        </Card>
      )}

      {account.status === 'signed_out' && (
        <div className="mb-4">
          <AdminSignInCard purpose="also see and manage parent-registered children" onSignedIn={account.refresh} />
        </div>
      )}
      {account.status === 'wrong_account' && <div className="mb-4"><WrongAccountNotice email={account.email} /></div>}
      {childrenError && <div className="mb-4"><ErrorBanner message={childrenError} onRetry={reload} /></div>}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Search name, username or parent email" className="min-w-[240px] flex-1" />
        <Segmented
          ariaLabel="Account type"
          value={kind}
          onChange={resetPage(setKind)}
          options={[
            { value: 'all', label: `All ${counts.all}` },
            { value: 'linked', label: `Linked ${counts.linked}` },
            { value: 'unlinked', label: `Unlinked ${counts.unlinked}` },
            { value: 'classmate', label: `Classmates ${counts.classmate}` },
          ]}
        />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Select value={schoolFilter} onChange={e => resetPage(setSchoolFilter)(e.target.value)} aria-label="School" className="w-auto max-w-[320px]">
          <option value="All">All schools</option>
          {schools.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={gradeFilter} onChange={e => resetPage(setGradeFilter)(e.target.value)} aria-label="Grade" className="w-auto">
          <option value="All">All grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </Select>
        <Select value={activeFilter} onChange={e => resetPage(setActiveFilter)(e.target.value as typeof activeFilter)} aria-label="Status" className="w-auto">
          <option value="all">Active and inactive</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </Select>
        <span className="ml-auto text-xs text-[var(--a-muted)]">{filtered.length.toLocaleString()} shown</span>
      </div>

      {!classmates ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Table minWidth={980}>
            <thead>
              <tr>
                <Th>Child</Th>
                <Th>Grade</Th>
                <Th>School</Th>
                <Th>Account</Th>
                <Th>Joined</Th>
                <Th>Active</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr><Td colSpan={7} className="py-10 text-center text-[var(--a-muted)]">No children match these filters.</Td></tr>
              )}
              {pageRows.map((p) => {
                const k = kindOf(p);
                const open = panel?.id === p.data.id ? panel.kind : null;
                return (
                  <Fragment key={`${p.source}-${p.data.id}`}>
                    <tr className="hover:bg-[var(--a-surface-2)]/60">
                      <Td>
                        <p className="font-medium text-[var(--a-ink)]">{p.data.full_name}</p>
                        <p className="font-mono text-xs text-[var(--a-muted)]">@{p.data.username}</p>
                      </Td>
                      <Td className="whitespace-nowrap">{p.data.grade}</Td>
                      <Td className="max-w-[240px]"><span className="line-clamp-2 text-xs">{p.data.school_name || 'Not set'}</span></Td>
                      <Td>
                        <Badge tone={KIND_BADGE[k].tone}>{KIND_BADGE[k].label}</Badge>
                        {p.source === 'child' && p.data.parent_email && (
                          <p className="mt-1 max-w-[220px] truncate text-xs text-[var(--a-muted)]">{p.data.parent_email}</p>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-xs">{p.source === 'child' ? fmtDate(p.data.created_at) : '-'}</Td>
                      <Td>
                        <Switch
                          checked={p.data.is_active}
                          disabled={busyId === p.data.id}
                          label={p.data.is_active ? 'On' : 'Off'}
                          onChange={() => p.source === 'classmate'
                            ? updateClassmate(p.data, { isActive: !p.data.is_active }, p.data.is_active ? 'deactivated' : 'activated')
                            : handleToggleChildActive(p.data)}
                        />
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          {p.source === 'classmate' ? (
                            <>
                              <Button size="sm" variant="ghost" disabled={busyId === p.data.id} title="Switch character sprite"
                                onClick={() => updateClassmate(p.data, { gender: p.data.gender === 'girl' ? 'boy' : 'girl' }, 'character switched')}>
                                {p.data.gender === 'girl' ? 'Girl' : 'Boy'}
                              </Button>
                              <Button size="sm" icon={KeyRound} onClick={() => openPanel('reset', p.data.id)}>Reset password</Button>
                            </>
                          ) : p.data.parent_id ? (
                            <Button size="sm" icon={Repeat} onClick={() => openPanel('reassign', p.data.id)}>Reassign parent</Button>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                    {open === 'reset' && p.source === 'classmate' && (
                      <tr>
                        <Td colSpan={7} className="bg-[var(--a-surface-2)]/50">
                          <div className="flex flex-wrap items-end gap-3">
                            <Field label={`New password for ${p.data.full_name}`} className="min-w-[240px] flex-1">
                              <Input mono value={resetPassword} onChange={e => setResetPassword(e.target.value)} autoFocus />
                            </Field>
                            <Button variant="primary" disabled={!resetPassword.trim() || busyId === p.data.id} onClick={() => handleResetPassword(p.data)}>Save password</Button>
                            <Button variant="ghost" onClick={() => setPanel(null)}>Cancel</Button>
                          </div>
                        </Td>
                      </tr>
                    )}
                    {open === 'reassign' && p.source === 'child' && (
                      <tr>
                        <Td colSpan={7} className="bg-[var(--a-surface-2)]/50">
                          <p className="mb-3 max-w-2xl text-xs text-[var(--a-muted)]">
                            Moves this child to a different, already-registered parent account. Takes effect in 48 hours:
                            the current parent gets a cancel link and the new parent gets a heads-up. A written reason is
                            required for the audit trail.
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="New parent's email">
                              <Input type="email" placeholder="Must already have an account" value={reassignEmail} onChange={e => setReassignEmail(e.target.value)} autoFocus />
                            </Field>
                            <Field label="Reason">
                              <Input placeholder="e.g. support ticket number" value={reassignReason} onChange={e => setReassignReason(e.target.value)} />
                            </Field>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button variant="primary" disabled={reassignSubmitting || !reassignEmail.trim() || !reassignReason.trim()} onClick={() => handleReassign(p.data)}>
                              {reassignSubmitting ? 'Requesting...' : 'Request reassignment'}
                            </Button>
                            <Button variant="ghost" onClick={() => setPanel(null)}>Cancel</Button>
                          </div>
                        </Td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
        </>
      )}
    </div>
  );
}
