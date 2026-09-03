'use client';
// components/LiveBattleInviteToast.tsx
// Shows an Accept/Decline card when another player challenges this one to a
// live battle (hooks/useLiveBattleInbox.ts's incomingInvite). Mounted at the
// Dashboard root (app/page.tsx) rather than inside MonsterGuild.tsx, so a
// challenge reaches the player no matter which tab they're on. Styled to
// match components/AchievementToast.tsx's toast conventions.
//
// Auto-expires after INVITE_EXPIRY_MS unanswered — a real invite otherwise
// sits open forever if the invitee just never taps anything, leaving the
// challenger stuck on the "waiting for opponent" battle screen. `onExpire`
// (falls back to `onDecline` if the caller doesn't pass one) lets the parent
// send a distinct "expired" response instead of a real decline — see
// MonsterGuild.tsx's handleExpireLiveBattleInvite / lib/liveBattle.ts's
// expireInvite().
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPvpChallenge, playPvpAccept, playPvpDecline, playMiss } from '@/lib/sounds';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

const INVITE_EXPIRY_MS = 15000;

interface LiveBattleInviteToastProps {
  fromName: string;
  onAccept: () => void;
  onDecline: () => void;
  onExpire?: () => void;
}

export default function LiveBattleInviteToast({ fromName, onAccept, onDecline, onExpire }: LiveBattleInviteToastProps) {
  // Drives the countdown bar's width via inline style rather than a CSS
  // transition kicked off post-mount — starting the width transition from
  // the very first paint (see the `useEffect` below) keeps the bar and the
  // setTimeout that actually fires the expiry in lockstep.
  const [expiring, setExpiring] = useState(false);

  useEffect(() => {
    playPvpChallenge();
    // Two rAFs so the browser commits the 100%-width initial paint before
    // the transition to 0% starts — otherwise the two states can collapse
    // into one and the bar never visibly animates.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setExpiring(true));
      cleanupRefs.push(() => cancelAnimationFrame(raf2));
    });
    const cleanupRefs: (() => void)[] = [() => cancelAnimationFrame(raf1)];
    const timer = setTimeout(() => {
      playMiss();
      (onExpire ?? onDecline)();
    }, INVITE_EXPIRY_MS);
    return () => {
      clearTimeout(timer);
      cleanupRefs.forEach(fn => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="live-battle-invite"
        initial={{ opacity: 0, y: -16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed top-[63px] left-1/2 -translate-x-1/2 z-[80] w-full max-w-sm px-4"
      >
        {/* Same wood-plank + gold trim + corner-nail frame as the battle
            screen's MonsterHpPanel/PostBattleSummary, reusing its exported
            style pieces rather than re-deriving them. */}
        <div
          className="relative border-2 border-[#4a2f18] rounded-2xl p-5 overflow-hidden"
          style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
        >
          <Nail className="top-2 left-2" />
          <Nail className="top-2 right-2" />
          <Nail className="bottom-2 left-2" />
          <Nail className="bottom-2 right-2" />
          <div className="flex items-center gap-2 mb-3">
            <img src="/icons/encounter/atk.svg" alt="" className="w-8 h-8 object-contain flex-shrink-0" />
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: '#f5c542', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
              >
                Live Battle Challenge!
              </p>
              <h3
                className="text-lg leading-tight"
                style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}
              >
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span aria-hidden style={questTextShadowStyle}>{fromName} wants to battle!</span>
                  <span style={questTextStyle}>{fromName} wants to battle!</span>
                </span>
              </h3>
            </div>
          </div>
          <div className="flex gap-3 mt-4" style={{ fontSize: 15 }}>
            <GameButton variant="quest" color="#16a34a" onClick={() => { playPvpAccept(); onAccept(); }} className="flex-1">
              Accept
            </GameButton>
            <GameButton variant="quest" color="#57534e" onClick={() => { playPvpDecline(); onDecline(); }} className="flex-1">
              Decline
            </GameButton>
          </div>

          {/* Expiry countdown — a slim gold bar that drains over
              INVITE_EXPIRY_MS so the "this closes on its own" behavior is
              visible, not just a silent timer. */}
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/30">
            <div
              className="h-full bg-[#f5c542]"
              style={{
                width: expiring ? '0%' : '100%',
                transition: expiring ? `width ${INVITE_EXPIRY_MS}ms linear` : 'none',
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
