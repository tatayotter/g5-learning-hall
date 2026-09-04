// components/dashboard/VaultTab.tsx
// Extracted from Dashboard.tsx's `activeTab === 'vault'` block (was ~135
// inline lines) as the first slice of splitting that god component apart —
// see docs/STYLE_GUIDE.md conventions, no behavior change from the original.
'use client';

import { motion } from 'framer-motion';
import { UserId } from '@/lib/userSession';
import { CharacterStats } from '@/hooks/useWeeklyData';
import MonsterShop from '@/components/MonsterShop';

export const VAULT_CATALOG = {
  "voucher_30m": {
    "name": "🎮 30-Min Gaming Voucher",
    "cost": 100,
    "desc": "Unlocks 30 minutes of console gaming or modding runtime privileges.",
  },
  "jollibee_burger": {
    "name": "🍔 Jollibee Yumburger Reward",
    "cost": 250,
    "desc": "Claim a real-world Jollibee hamburger snack ordered by Tatay. (Limit: 1 per week)",
  },
  "ai_lording": {
    "name": "🧙‍♂️ 30-Min AI Lording Sandbox",
    "cost": 100,
    "desc": "Unlocks 30 minutes of advanced AI prompt mastery using Google Gemini.",
  },
} as const;

// Loose shape matching what Dashboard's myClaims state actually holds
// (straight from a `reward_claims` select) — kept untyped-ish (any-ish
// fields) to match the pre-extraction behavior, not tightened here.
interface RewardClaim {
  id: string;
  item_key: string;
  item_name: string;
  status: string;
  created_at: string;
}

interface VaultTabProps {
  activeUserId: UserId;
  isFamily: boolean;
  characterStats: CharacterStats;
  onSpendGold: (stats: CharacterStats) => void;
  onThemeChange: (themeKey: string) => void;
  handleClaimReward: (cost: number, itemName: string, itemKey: string) => void;
  claimingKey: string | null;
  myClaims: RewardClaim[];
}

export default function VaultTab({
  activeUserId,
  isFamily,
  characterStats,
  onSpendGold,
  onThemeChange,
  handleClaimReward,
  claimingKey,
  myClaims,
}: VaultTabProps) {
  if (!isFamily) {
    return (
      <MonsterShop
        userId={activeUserId}
        currentStats={characterStats}
        onSpendGold={onSpendGold}
        onThemeChange={onThemeChange}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold font-display text-gray-900">The Gold Token Rewards Vault</h1>
        <div className="flex items-center gap-1.5 bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-full px-3 py-1.5 shadow-[2px_2px_0_0_#000] flex-shrink-0">
          <img src="/icons/rewards/gold_coin.svg" alt="" className="w-4 h-4" />
          <span className="text-[#c9781a] font-extrabold text-sm">{characterStats.gold}</span>
        </div>
      </div>
      <p className="text-gray-400 mb-8">
        Spend your hard-earned Gold on real-world rewards from the catalog below.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Object.entries(VAULT_CATALOG).map(([key, item]) => {
          const affordable = characterStats.gold >= item.cost;
          return (
            <div key={key} className="bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-2xl p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full">
              <div>
                <h3 className="text-lg font-bold text-[#2a1505] leading-tight mb-2">{item.name}</h3>
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1 border-2 border-[#000000] text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${affordable ? 'bg-[#47982a] text-black shadow-[2px_2px_0_0_#000]' : 'bg-[#e8d0a0]/60 text-[#6b4820]'}`}>
                    <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> {item.cost} GOLD
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-6">{item.desc}</p>
              </div>
              <motion.button
                onClick={() => handleClaimReward(item.cost, item.name, key)}
                whileHover={affordable ? { scale: 1.02 } : {}}
                whileTap={affordable ? { scale: 0.95 } : {}}
                className="w-full py-2.5 rounded-lg font-extrabold text-sm uppercase tracking-wide text-black bg-yellow-500 hover:bg-yellow-400 border-2 border-[#000000] shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:bg-[#e8d0a0] disabled:text-[#a8916a] disabled:shadow-none disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 transition-all"
                disabled={!affordable || claimingKey === key}
              >
                {claimingKey === key ? 'Claiming...' : affordable ? 'Claim Reward' : 'Not Enough Gold'}
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* Monster Arena Shop for family too */}
      <div className="mt-12">
        <MonsterShop
          userId={activeUserId}
          currentStats={characterStats}
          onSpendGold={onSpendGold}
          onThemeChange={onThemeChange}
        />
      </div>

      {/* My Claimed Rewards — filtered to this user */}
      <div className="mt-10 bg-[#f0ddb8] border border-[#8b5e2a] p-8 rounded-xl shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#c9a87a] pb-4 mb-6">
          <h2 className="text-2xl font-bold text-[#7a4a0f] font-display"><img src="/icons/rewards/package.svg" alt="" className="inline w-5 h-5 align-[-4px] mr-1" /> My Claimed Rewards</h2>
          <span className="bg-[#c9781a]/20 text-[#7a4a0f] text-xs font-bold px-3 py-1 rounded-full border border-[#8b5e2a]">
            {myClaims.length} TOTAL
          </span>
        </div>

        {(() => {
          const countOf = (key: string) => myClaims.filter(c => c.item_key === key).length;
          const pendingCountOf = (key: string) => myClaims.filter(c => c.item_key === key && c.status === 'pending').length;
          const voucherCount = countOf('voucher_30m');
          const aiLordingCount = countOf('ai_lording');
          const jollibeeCount = countOf('jollibee_burger');
          // Tatay marks a claim "supplied" only after the hours have already
          // been used (usually Fri/Sat), so remaining claimable hours are the
          // ones still pending — not yet spent.
          const totalClaimableHours = (pendingCountOf('voucher_30m') + pendingCountOf('ai_lording')) * 0.5;
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-sm">
              <div className="bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                <p className="text-[#6b4820] text-xs">🎮 Gaming Voucher</p>
                <p className="font-bold text-[#2a1505]">{voucherCount}</p>
              </div>
              <div className="bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                <p className="text-[#6b4820] text-xs">🧙‍♂️ AI Lording</p>
                <p className="font-bold text-[#2a1505]">{aiLordingCount}</p>
              </div>
              <div className="bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                <p className="text-[#6b4820] text-xs">🍔 Jollibee Yumburger</p>
                <p className="font-bold text-[#2a1505]">{jollibeeCount}</p>
              </div>
              <div className="bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                <p className="text-[#6b4820] text-xs">⏱️ Total Claimable Hours</p>
                <p className="font-bold text-[#c9781a]">{totalClaimableHours}</p>
                <p className="text-[10px] text-[#8b7355] mt-0.5">still unused, spend by Saturday</p>
              </div>
            </div>
          );
        })()}

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {myClaims.length > 0 ? (
            [...myClaims]
              .sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              })
              .map((claim) => (
              <div key={claim.id} className="flex justify-between items-center bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                <div>
                  <p className="font-bold text-[#2a1505]">{claim.item_name}</p>
                  <p className="text-xs text-[#6b4820]">{new Date(claim.created_at).toLocaleDateString()}</p>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  claim.status === 'pending'
                    ? 'bg-[#f0ddb8] text-[#7a4a0f] border-[#8b5e2a]'
                    : 'bg-[#e8f5e0] text-green-800 border-green-700'
                }`}>
                  {claim.status}
                </div>
              </div>
            ))
          ) : (
            <p className="text-[#6b4820] text-sm italic">No rewards claimed yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
