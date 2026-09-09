// components/dashboard/BonusQuestsTab.tsx
// Kid-facing entry point for Student Enrichment Content (SEC) packs — sibling to
// GuildsTab/JournalTab/VaultTab, following GuildsTab.tsx's own tile-grid ->
// detail-view pattern (see docs/STYLE_GUIDE.md's parchment palette).
//
// Ownership is a real check against sec_entitlements (via lib/secEngine.ts),
// keyed off the pack this child's grade maps to — see docs/sec-shop-design.md
// and supabase/migrations/20260905170000_add_sec_shop_schema.sql. A parent
// buys a pack for a specific child in the Shop (/parent-dashboard/shop); it
// shows up here once the purchase's webhook activates the entitlement.
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserId } from '@/lib/userSession';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import MtapTopicsView from '@/components/bonusquests/MtapTopicsView';
import { SEC_PACK_ID_BY_GRADE, fetchOwnedSecPackIds } from '@/lib/secEngine';
import { MTAP_STRANDS_BY_GRADE } from '@/lib/mtapContent';

// Grade-color hero gradient, matching the Shop's own GRADE_GRADIENT_COLOR
// palette (app/parent-dashboard/shop/page.tsx) so a grade reads the same
// color everywhere in the app.
const GRADE_HERO_GRADIENT: Record<number, string> = {
  2: 'from-amber-200 to-amber-500',
  3: 'from-emerald-200 to-emerald-500',
  4: 'from-sky-200 to-sky-500',
  5: 'from-indigo-200 to-indigo-500',
  6: 'from-rose-200 to-rose-500',
};

interface BonusQuestsTabProps {
  userId: UserId;
  onRewardEarned?: (xp: number, gold: number) => void;
}

export default function BonusQuestsTab({ userId, onRewardEarned }: BonusQuestsTabProps) {
  const [openGrade, setOpenGrade] = useState<number | null>(null);
  const [ownedPackIds, setOwnedPackIds] = useState<Set<string> | null>(null); // null = still loading

  // Inline + cancellation-guarded, same pattern as MtapTopicsView.tsx's own
  // attempt-reload effect — never setState synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const owned = await fetchOwnedSecPackIds(userId);
      if (!cancelled) setOwnedPackIds(owned);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Every grade the child owns a pack for — NOT just their current grade.
  // A child promoted to a new grade keeps whatever pack(s) they already
  // bought (mirrors app/parent-dashboard/my-secs/page.tsx's own pattern,
  // which already reads each pack by its own recorded grade rather than
  // the child's live grade — this brings the child-facing tab in line with
  // that instead of hiding a still-active, already-paid-for entitlement).
  const ownedGrades = ownedPackIds
    ? Object.entries(SEC_PACK_ID_BY_GRADE)
        .filter(([, packId]) => ownedPackIds.has(packId))
        .map(([g]) => Number(g))
        .sort((a, b) => a - b)
    : [];

  if (openGrade != null) {
    return (
      <div>
        <span className="text-xs text-[#a8a29e] cursor-pointer mb-2 inline-block" onClick={() => setOpenGrade(null)}>&larr; Bonus Quests</span>
        <MtapTopicsView userId={userId} grade={openGrade} onRewardEarned={onRewardEarned} />
      </div>
    );
  }

  return (
    <div data-tutorial-id="bonus-quests-welcome">
      <h1 className="text-2xl lg:text-3xl mt-4 mb-4" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span aria-hidden style={questTextShadowStyle}>Bonus Quests</span>
          <span style={{ ...questTextStyle, color: '#f5c542' }}>Bonus Quests</span>
        </span>
      </h1>
      <p className="text-gray-500 mb-4 text-sm">Extra quest packs your parent unlocked for you — play at your own pace.</p>

      {ownedPackIds === null ? (
        <div className="text-sm text-stone-400 py-6">Loading your packs…</div>
      ) : ownedGrades.length === 0 ? (
        <div className="border-2 border-dashed border-stone-300 rounded-2xl p-10 flex flex-col items-center gap-3 text-center max-w-md">
          <span className="text-4xl">📦</span>
          <h3 className="font-bold text-stone-700">No Bonus Quests yet</h3>
          <p className="text-sm text-stone-500">Ask your parent to visit the Shop to unlock extra quest packs — you&apos;ll see them appear right here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          {ownedGrades.map((g) => {
            const strands = MTAP_STRANDS_BY_GRADE[g] || [];
            const topicCount = strands.reduce((sum, s) => sum + s.archetypes.length, 0);
            return (
              <motion.div
                key={g}
                onClick={() => setOpenGrade(g)}
                role="button"
                tabIndex={0}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                variants={{ hover: {} }}
                className="overflow-hidden bg-white border-2 border-[#251616] hover:border-[#3a2020] rounded-2xl text-center transition-colors flex flex-col items-center shadow-sm cursor-pointer"
              >
                <div className={`relative overflow-hidden w-full flex justify-center pt-5 pb-3 px-5 bg-gradient-to-br ${GRADE_HERO_GRADIENT[g] || 'from-amber-200 to-amber-500'}`}>
                  <span className="text-5xl relative z-10">📘</span>
                </div>
                <div className="w-full flex flex-col items-center gap-1.5 px-5 pb-5 pt-3 bg-amber-50">
                  <h3 className="text-lg font-extrabold text-amber-700">Math+</h3>
                  <p className="text-xs text-gray-600 font-medium">Grade {g} Math Enrichment{topicCount > 0 ? ` · ${topicCount} topics` : ''}</p>
                  <div className="mt-1">
                    <GameButton variant="quest" style={{ fontSize: 14 }}>Enter</GameButton>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <div className="border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-2 py-8 px-4 text-stone-400">
            <span className="text-2xl">＋</span>
            <p className="text-xs text-center">More packs<br />coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}
