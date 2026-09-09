'use client';
// Admin tool for the voucher code redemption system (see lib/vouchers.ts +
// supabase/migrations/20260909130000_add_voucher_code_system.sql). Set a
// code, pick what it grants — a curio, an inventory item, or flat gold —
// and players redeem it once each from the Shop's "Have a Code?" box.
// voucher_codes has no client SELECT policy (a public read would let anyone
// browse every code), so even the list below goes through the passcode-
// gated admin_list_voucher_codes RPC, same as every other write here.
import { useEffect, useState } from 'react';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { SHOP_CATALOG } from '@/lib/inventory';
import { callAdminApi } from '@/lib/adminApi';

type RewardType = 'curio' | 'item' | 'gold';

interface VoucherRow {
  code: string;
  reward_type: RewardType;
  reward_curio_id: string | null;
  reward_item_key: string | null;
  reward_item_qty: number | null;
  reward_gold_amount: number | null;
  max_redemptions: number | null;
  is_active: boolean;
  expires_at: string | null;
  redemption_count: number;
  created_at: string;
}

const CURIO_OPTIONS = Object.values(ALL_MONSTERS).sort((a, b) => a.name.localeCompare(b.name));

function rewardSummary(v: VoucherRow): string {
  if (v.reward_type === 'curio') {
    const def = v.reward_curio_id ? ALL_MONSTERS[v.reward_curio_id] : undefined;
    return `${def?.emoji ?? '❓'} ${def?.name ?? v.reward_curio_id}`;
  }
  if (v.reward_type === 'item') {
    const item = SHOP_CATALOG.find(i => i.key === v.reward_item_key);
    return `${v.reward_item_qty}× ${item?.name ?? v.reward_item_key}`;
  }
  return `🪙 ${v.reward_gold_amount} Gold`;
}

export default function VouchersSection({ passcode }: { passcode: string }) {
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState('');
  const [rewardType, setRewardType] = useState<RewardType>('curio');
  const [curioId, setCurioId] = useState('');
  const [itemKey, setItemKey] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [goldAmount, setGoldAmount] = useState(50);
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const reload = async () => {
    setLoading(true);
    const result = await callAdminApi<{ vouchers: VoucherRow[] }>('/api/admin-vouchers', { passcode, action: 'list' });
    setVouchers(result.success && result.vouchers ? result.vouchers : []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setCode('');
    setCurioId('');
    setItemKey('');
    setItemQty(1);
    setGoldAmount(50);
    setMaxRedemptions('');
    setExpiresAt('');
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!code.trim()) {
      alert('A code is required.');
      return;
    }
    if (rewardType === 'curio' && !curioId) {
      alert('Pick a curio to grant.');
      return;
    }
    if (rewardType === 'item' && !itemKey) {
      alert('Pick an item to grant.');
      return;
    }
    setSaving(true);
    const result = await callAdminApi('/api/admin-vouchers', {
      passcode,
      action: 'upsert',
      code: code.trim(),
      rewardType,
      rewardCurioId: curioId,
      rewardItemKey: itemKey,
      rewardItemQty: itemQty,
      rewardGoldAmount: goldAmount,
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      isActive,
    });
    setSaving(false);
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
      return;
    }
    resetForm();
    reload();
  };

  const handleDelete = async (v: VoucherRow) => {
    if (!confirm(`Delete voucher code "${v.code}"? It's already been redeemed ${v.redemption_count} time(s) — this only stops future redemptions, it doesn't undo past ones.`)) return;
    const result = await callAdminApi('/api/admin-vouchers', { passcode, action: 'delete', code: v.code });
    if (!result.success) {
      alert(`❌ Delete failed: ${result.error}`);
      return;
    }
    reload();
  };

  const handleToggleActive = async (v: VoucherRow) => {
    const result = await callAdminApi('/api/admin-vouchers', {
      passcode, action: 'upsert', code: v.code, rewardType: v.reward_type,
      rewardCurioId: v.reward_curio_id, rewardItemKey: v.reward_item_key, rewardItemQty: v.reward_item_qty,
      rewardGoldAmount: v.reward_gold_amount, maxRedemptions: v.max_redemptions, expiresAt: v.expires_at,
      isActive: !v.is_active,
    });
    if (!result.success) {
      alert(`❌ Update failed: ${result.error}`);
      return;
    }
    reload();
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">🎟️ Vouchers</h2>
      <p className="text-[#8a7c66] text-sm mb-6">
        A code any player can redeem once from the Shop's "Have a Code?" box, for an instant curio,
        item, or gold reward. Leave Max Redemptions blank for unlimited (e.g. a public event code).
      </p>

      <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4 mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BONOKBONOK"
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3] font-mono uppercase"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Reward Type</label>
            <select
              value={rewardType}
              onChange={e => setRewardType(e.target.value as RewardType)}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            >
              <option value="curio">Curio</option>
              <option value="item">Item</option>
              <option value="gold">Gold</option>
            </select>
          </div>
        </div>

        {rewardType === 'curio' && (
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Curio</label>
            <select
              value={curioId}
              onChange={e => setCurioId(e.target.value)}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            >
              <option value="">Select...</option>
              {CURIO_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
            </select>
          </div>
        )}

        {rewardType === 'item' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Item</label>
              <select
                value={itemKey}
                onChange={e => setItemKey(e.target.value)}
                className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
              >
                <option value="">Select...</option>
                {SHOP_CATALOG.map(i => <option key={i.key} value={i.key}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Quantity</label>
              <input
                type="number" min={1} value={itemQty}
                onChange={e => setItemQty(Math.max(1, Number(e.target.value)))}
                className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
              />
            </div>
          </div>
        )}

        {rewardType === 'gold' && (
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Gold Amount</label>
            <input
              type="number" min={1} value={goldAmount}
              onChange={e => setGoldAmount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Max Redemptions</label>
            <input
              type="number" min={1} value={maxRedemptions}
              onChange={e => setMaxRedemptions(e.target.value)}
              placeholder="Unlimited"
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8a7c66] uppercase tracking-widest block mb-1">Expires At</label>
            <input
              type="datetime-local" value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-2 py-2 text-xs text-[#ede4d3]"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#a89c86] pb-2">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-[#ede4d3] text-sm font-bold px-4 py-2 rounded-lg"
        >
          {saving ? 'Saving...' : 'Save Voucher'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm">Loading...</p>
      ) : vouchers.length === 0 ? (
        <p className="text-gray-600 text-sm">No voucher codes yet.</p>
      ) : (
        <div className="space-y-2">
          {vouchers.map(v => (
            <div key={v.code} className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[#ede4d3] font-bold text-sm font-mono flex items-center gap-2">
                  {v.code}
                  {!v.is_active && <span className="text-[10px] font-normal bg-[#2a2119] text-[#8a7c66] px-2 py-0.5 rounded-full">Inactive</span>}
                  {v.expires_at && new Date(v.expires_at) < new Date() && (
                    <span className="text-[10px] font-normal bg-[#4a0e0c] text-red-300 px-2 py-0.5 rounded-full">Expired</span>
                  )}
                </p>
                <p className="text-xs text-[#8a7c66]">
                  {rewardSummary(v)} · {v.redemption_count} redeemed{v.max_redemptions ? ` / ${v.max_redemptions}` : ''}
                  {v.expires_at && ` · expires ${new Date(v.expires_at).toLocaleString()}`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(v)}
                  className="text-xs bg-[#2a2119] hover:bg-[#3d3225] text-[#a89c86] px-3 py-1.5 rounded-lg"
                >
                  {v.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(v)}
                  className="text-xs bg-[#2a2119] hover:bg-[#4a0e0c] text-[#a89c86] hover:text-red-300 px-3 py-1.5 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
