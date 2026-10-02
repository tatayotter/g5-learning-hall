'use client';
// components/LinkParentGate.tsx
// Full-block gate for the two features docs/parent-child-linking-design.md
// always intended to require a linked parent (leaderboard viewing, PvP) but
// that were never actually enforced. Renders LinkParentForm inline instead
// of the gated feature. See hooks/useLinkedStatus.ts and the DB-level
// trigger (trg_pvp_requires_linked_parent) for the real enforcement on PvP —
// this is the matching UI so kids see why, instead of a raw DB error.
import LinkParentForm from '@/components/LinkParentForm';
import GrowthPillIcon from '@/components/GrowthPillIcon';
import { playPageFlip } from '@/lib/sounds';

// `onClose` turns it into a dismissible alert (used as a modal when a kid
// taps Challenge on another student in the Curio Arena); without it, it's
// the inline full-block gate (Leaderboard tab).
export default function LinkParentGate({ feature, onClose }: { feature: string; onClose?: () => void }) {
  return (
    <div className={`max-w-sm mx-auto ${onClose ? '' : 'mt-10'} bg-[#f0ddb8] border-2 border-[#8b5e2a] text-[#3a2610] rounded-2xl shadow-2xl p-5 flex flex-col gap-3 text-center`}>
      <p className="font-bold text-base text-[#2a1505]">Link a parent to unlock {feature}</p>
      <p className="text-[#6b4820] text-xs">
        Your progress and single-player games are all still yours — {feature} just needs a parent
        linked first.
      </p>
      <div className="bg-white border border-[#c9a87a] rounded-xl px-3 py-2 flex items-center justify-center gap-2">
        <GrowthPillIcon size={26} />
        <GrowthPillIcon size={26} className="-ml-3" />
        <span className="text-xs text-[#2a1505]">
          You also earn <span className="font-bold text-[#7c3aed]">2 Growth Pills</span> + 100 Gold
        </span>
      </div>
      <div className="text-left">
        <LinkParentForm />
      </div>
      {onClose && (
        <button
          onClick={() => { playPageFlip(); onClose(); }}
          className="text-xs font-bold text-[#6b4820] hover:text-[#2a1505]"
        >
          Maybe later
        </button>
      )}
    </div>
  );
}
