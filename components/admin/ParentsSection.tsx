'use client';
import { useEffect, useMemo, useState } from 'react';
import { Clock, Mail, RefreshCw, UserCheck, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Badge, Button, ErrorBanner, PageHeader, Pagination, SearchInput, Segmented, Skeleton, StatTile, Table, Td, Th, useToast,
} from '@/components/admin/ui';
import { AdminSignInCard, useAdminAccount, WrongAccountNotice } from '@/components/admin/AdminAccountGate';

interface ParentChild {
  id: string;
  full_name: string;
  grade: string;
  school_name: string;
  is_active: boolean;
}

interface Parent {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  marketing_opt_in: boolean;
  created_at: string;
  children: ParentChild[];
}

type StatusFilter = 'all' | Parent['status'];

const STATUS_TONE = { pending: 'warning', approved: 'good', rejected: 'critical' } as const;
// 'rejected' covers both a declined registration and a suspended account.
const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' } as const;
const PAGE_SIZE = 50;

const fmtDate = (ts: string) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function ParentsSection() {
  const account = useAdminAccount();
  const toast = useToast();
  const [parents, setParents] = useState<Parent[] | null>(null);
  const [listError, setListError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (account.status !== 'admin') return;
    let cancelled = false;
    supabase.rpc('admin_list_parents').then(({ data, error }) => {
      if (cancelled) return;
      if (error) setListError(error.message);
      else { setListError(''); setParents((data as Parent[]) || []); }
    });
    return () => { cancelled = true; };
  }, [account.status, reloadTick]);

  const reload = () => setReloadTick((t) => t + 1);

  const runAction = async (p: Parent, rpc: string, args: Record<string, unknown>, done: string) => {
    setBusyId(p.id);
    const { error } = await supabase.rpc(rpc, args);
    setBusyId(null);
    if (error) { toast(error.message, 'error'); return; }
    toast(`${p.full_name}: ${done}.`);
    reload();
  };

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0, rejected: 0 };
    for (const p of parents ?? []) { c.all++; c[p.status]++; }
    return c;
  }, [parents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (parents ?? []).filter((p) =>
      (statusFilter === 'all' || p.status === statusFilter) &&
      (!q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.phone ?? '').includes(q)),
    );
  }, [parents, statusFilter, search]);

  const withKids = (parents ?? []).filter((p) => p.children.length > 0).length;
  const optedIn = (parents ?? []).filter((p) => p.marketing_opt_in).length;
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (account.status === 'loading') return <Skeleton className="h-40 w-full" />;

  return (
    <div>
      <PageHeader
        title="Parents"
        description="Every parent account: pending, approved and rejected or suspended."
        actions={account.status === 'admin' && <Button icon={RefreshCw} onClick={reload}>Refresh</Button>}
      />

      {account.status === 'signed_out' && <AdminSignInCard purpose="manage parent accounts" onSignedIn={account.refresh} />}
      {account.status === 'wrong_account' && <WrongAccountNotice email={account.email} />}

      {account.status === 'admin' && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Parents" icon={Users} value={counts.all.toLocaleString()} hint="All accounts" loading={!parents} />
            <StatTile label="Pending review" icon={Clock} value={counts.pending.toLocaleString()} hint="Waiting for a decision" loading={!parents} />
            <StatTile label="With children" icon={UserCheck} value={withKids.toLocaleString()} hint={parents && counts.all ? `${Math.round((withKids / counts.all) * 100)}% of parents` : undefined} loading={!parents} />
            <StatTile label="Email opt-in" icon={Mail} value={optedIn.toLocaleString()} hint="Marketing emails" loading={!parents} />
          </div>

          {listError && <div className="mb-4"><ErrorBanner message={listError} onRetry={reload} /></div>}

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Segmented
              ariaLabel="Status"
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(0); }}
              options={[
                { value: 'all', label: `All ${counts.all}` },
                { value: 'pending', label: `Pending ${counts.pending}` },
                { value: 'approved', label: `Approved ${counts.approved}` },
                { value: 'rejected', label: `Rejected ${counts.rejected}` },
              ]}
            />
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name, email or phone" className="min-w-[220px] flex-1" />
          </div>

          {!parents ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Table minWidth={860}>
                <thead>
                  <tr>
                    <Th>Parent</Th>
                    <Th>Children</Th>
                    <Th>Status</Th>
                    <Th>Registered</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr><Td colSpan={5} className="py-10 text-center text-[var(--a-muted)]">No parents match these filters.</Td></tr>
                  )}
                  {pageRows.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--a-surface-2)]/60">
                      <Td>
                        <p className="font-medium text-[var(--a-ink)]">{p.full_name}</p>
                        <p className="text-xs text-[var(--a-muted)]">{p.email}{p.phone ? ` · ${p.phone}` : ''}</p>
                      </Td>
                      <Td>
                        {p.children.length === 0 ? (
                          <span className="text-xs text-[var(--a-muted)]">None yet</span>
                        ) : (
                          <ul className="space-y-0.5 text-xs">
                            {p.children.map((c) => (
                              <li key={c.id}>
                                <span className="text-[var(--a-ink)]">{c.full_name}</span>
                                <span className="text-[var(--a-muted)]"> · {c.grade}{c.is_active ? '' : ' · inactive'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                          {p.marketing_opt_in && <Badge tone="info">Email opt-in</Badge>}
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-xs">{fmtDate(p.created_at)}</Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          {p.status === 'pending' && (
                            <>
                              <Button size="sm" variant="primary" disabled={busyId === p.id}
                                onClick={() => runAction(p, 'approve_parent', { p_parent_id: p.id }, 'approved')}>Approve</Button>
                              <Button size="sm" disabled={busyId === p.id}
                                onClick={() => runAction(p, 'reject_parent', { p_parent_id: p.id }, 'rejected')}>Reject</Button>
                            </>
                          )}
                          {p.status === 'approved' && (
                            <Button size="sm" disabled={busyId === p.id}
                              onClick={() => runAction(p, 'admin_set_parent_status', { p_parent_id: p.id, p_status: 'rejected' }, 'suspended')}>Suspend</Button>
                          )}
                          {p.status === 'rejected' && (
                            <Button size="sm" variant="primary" disabled={busyId === p.id}
                              onClick={() => runAction(p, 'admin_set_parent_status', { p_parent_id: p.id, p_status: 'approved' }, 'reinstated')}>Reinstate</Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}
