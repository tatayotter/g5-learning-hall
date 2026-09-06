'use client';
// Admin tool for processing SEC pack refunds against the policy published at
// /terms — see docs/sec-shop-design.md open item #6 and
// supabase/migrations/20260906100000_add_sec_entitlement_refunds.sql.
// Refunding here only revokes in-app access; actually returning the
// parent's money still happens outside this app (PayMongo dashboard).
import { useState } from 'react';
import { callAdminApi } from '@/lib/adminApi';

interface Child {
  id: string;
  full_name: string;
  username: string;
  grade: string;
}

interface Entitlement {
  id: string;
  pack_id: string;
  pack_title: string;
  status: 'pending' | 'active' | 'refunded';
  amount_php: number;
  purchased_at: string | null;
  refunded_at: string | null;
  created_at: string;
  attempt_count: number;
}

const REFUND_WINDOW_DAYS = 7;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function SecRefundsSection({ passcode }: { passcode: string }) {
  const [username, setUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [child, setChild] = useState<Child | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!username.trim()) return;
    setSearching(true);
    setError('');
    setChild(null);
    setEntitlements([]);
    const result = await callAdminApi<{ child: Child; entitlements: Entitlement[] }>('/api/admin-sec-refunds', {
      passcode, action: 'search_child', username: username.trim(),
    });
    setSearching(false);
    if (!result.success) {
      setError(result.error || 'Search failed.');
      return;
    }
    setChild(result.child!);
    setEntitlements(result.entitlements || []);
  };

  const handleRefund = async (ent: Entitlement) => {
    const purchasedDaysAgo = ent.purchased_at ? daysSince(ent.purchased_at) : null;
    const outsideWindow = purchasedDaysAgo !== null && purchasedDaysAgo > REFUND_WINDOW_DAYS;
    const usedAlready = ent.attempt_count > 0;
    let warning = '';
    if (outsideWindow) warning += `\n⚠ Purchased ${purchasedDaysAgo} days ago — outside the ${REFUND_WINDOW_DAYS}-day policy window.`;
    if (usedAlready) warning += `\n⚠ Child has ${ent.attempt_count} recorded attempt(s) — the pack has already been used.`;
    const confirmMsg = `Refund "${ent.pack_title}" for ${child!.full_name}? This revokes their access immediately.${warning}${warning ? '\n\nThis is outside the stated policy — proceed only as a deliberate exception.' : ''}`;
    if (!confirm(confirmMsg)) return;

    setRefundingId(ent.id);
    const result = await callAdminApi('/api/admin-sec-refunds', { passcode, action: 'refund', entitlementId: ent.id });
    setRefundingId(null);
    if (!result.success) {
      alert(`❌ Refund failed: ${result.error}`);
      return;
    }
    handleSearch();
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">💸 SEC Refunds</h2>
      <p className="text-[#8a7c66] text-sm mb-6">
        Policy (see /terms): refundable within {REFUND_WINDOW_DAYS} days of purchase, and only if the
        pack hasn&apos;t been used yet. Refunding here revokes access immediately — actually returning
        the money is a separate step in the PayMongo dashboard.
      </p>

      <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4 mb-6 flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Child username"
          className="flex-1 bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-sm text-[#ede4d3]"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-[#ede4d3] text-sm font-bold px-4 py-2 rounded-lg"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {child && (
        <div className="space-y-3">
          <p className="text-[#ede4d3] text-sm font-bold">{child.full_name} <span className="text-[#8a7c66] font-normal">@{child.username} · {child.grade}</span></p>
          {entitlements.length === 0 ? (
            <p className="text-gray-600 text-sm">No SEC purchases for this child.</p>
          ) : (
            entitlements.map((ent) => {
              const purchasedDaysAgo = ent.purchased_at ? daysSince(ent.purchased_at) : null;
              const eligible = ent.status === 'active' && ent.attempt_count === 0 && purchasedDaysAgo !== null && purchasedDaysAgo <= REFUND_WINDOW_DAYS;
              return (
                <div key={ent.id} className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[#ede4d3] font-bold text-sm flex items-center gap-2">
                      {ent.pack_title}
                      <span className={`text-[10px] font-normal uppercase tracking-widest rounded-full px-2 py-0.5 border ${
                        ent.status === 'active' ? 'text-green-300 bg-green-950 border-green-800'
                        : ent.status === 'refunded' ? 'text-orange-300 bg-orange-950 border-orange-800'
                        : 'text-stone-400 bg-stone-900 border-stone-700'
                      }`}>{ent.status}</span>
                      {eligible && <span className="text-[10px] font-normal uppercase tracking-widest text-cyan-300 bg-cyan-950 border border-cyan-800 rounded-full px-2 py-0.5">Eligible</span>}
                    </p>
                    <p className="text-xs text-[#8a7c66]">
                      ₱{ent.amount_php} · {ent.attempt_count} attempt(s)
                      {purchasedDaysAgo !== null && ` · purchased ${purchasedDaysAgo}d ago`}
                      {ent.refunded_at && ` · refunded ${new Date(ent.refunded_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {ent.status === 'active' && (
                    <button
                      onClick={() => handleRefund(ent)}
                      disabled={refundingId === ent.id}
                      className="text-xs bg-[#2a2119] hover:bg-[#4a0e0c] text-[#a89c86] hover:text-red-300 disabled:opacity-40 px-3 py-1.5 rounded-lg flex-shrink-0"
                    >
                      {refundingId === ent.id ? 'Refunding…' : 'Refund'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
