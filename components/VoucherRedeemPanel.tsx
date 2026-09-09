'use client';
// A small "have a code?" box for redeeming a voucher code (see lib/vouchers.ts
// + supabase/migrations/20260909130000_add_voucher_code_system.sql). Lives in
// the Shop for now (components/MonsterShop.tsx) since that's where players
// already look for new curios/items/gold — not tied to the shop otherwise,
// so it can be mounted anywhere a userId is available.
import { useState } from 'react';
import { SHOP_CATALOG } from '@/lib/inventory';
import { ALL_MONSTERS, MonsterDef } from '@/lib/monsterConfig';
import { redeemVoucherCode, VOUCHER_FAILURE_MESSAGES, VoucherRedeemResult } from '@/lib/vouchers';
import CurioRevealModal from '@/components/CurioRevealModal';

interface VoucherRedeemPanelProps {
  userId: string;
  // Fired only on a successful redemption, so callers can refresh whatever
  // they show (inventory list, gold total) without this panel needing to
  // know their state shape beyond the one field it actually changes.
  onRedeemed?: (result: VoucherRedeemResult) => void;
}

function rewardMessage(result: VoucherRedeemResult): string {
  // Curio rewards get the full-screen CurioRevealModal instead (same "NEW
  // CURIO OBTAINED!" treatment as a wild catch/guild grant/event reward) —
  // this inline line is only for item/gold, which don't have that moment.
  if (result.rewardType === 'item') {
    const item = SHOP_CATALOG.find(i => i.key === result.rewardItemKey);
    return `🎁 ${result.rewardItemQty}× ${item?.name ?? result.rewardItemKey} added to your inventory!`;
  }
  if (result.rewardType === 'gold') {
    return `🪙 +${result.rewardGoldAmount} Gold!`;
  }
  return '🎁 Reward claimed!';
}

export default function VoucherRedeemPanel({ userId, onRedeemed }: VoucherRedeemPanelProps) {
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [revealMonster, setRevealMonster] = useState<MonsterDef | null>(null);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setRedeeming(true);
    setMessage(null);
    const result = await redeemVoucherCode(userId, trimmed);
    setRedeeming(false);
    if (!result.redeemed) {
      setMessage({ text: VOUCHER_FAILURE_MESSAGES[result.reason ?? 'network_error'], ok: false });
      return;
    }
    if (result.rewardType === 'curio' && result.rewardCurioId && ALL_MONSTERS[result.rewardCurioId]) {
      setRevealMonster(ALL_MONSTERS[result.rewardCurioId]);
    } else {
      setMessage({ text: rewardMessage(result), ok: true });
    }
    setCode('');
    onRedeemed?.(result);
  };

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4 mb-6">
      {revealMonster && (
        <CurioRevealModal monster={revealMonster} userId={userId} onClose={() => setRevealMonster(null)} />
      )}
      <p className="text-xs font-bold text-amber-900 uppercase tracking-widest mb-2">🎟️ Have a Code?</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value); setMessage(null); }}
          onKeyDown={e => { if (e.key === 'Enter') handleRedeem(); }}
          placeholder="Enter voucher code"
          className="flex-1 min-w-0 bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-900 font-mono uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleRedeem}
          disabled={redeeming || !code.trim()}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          {redeeming ? 'Redeeming…' : 'Redeem'}
        </button>
      </div>
      {message && (
        <p className={`text-xs font-bold mt-2 ${message.ok ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
