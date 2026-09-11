'use client';
// components/LinkParentGate.tsx
// Full-block gate for the two features docs/parent-child-linking-design.md
// always intended to require a linked parent (leaderboard viewing, PvP) but
// that were never actually enforced. Renders LinkParentForm inline instead
// of the gated feature. See hooks/useLinkedStatus.ts and the DB-level
// trigger (trg_pvp_requires_linked_parent) for the real enforcement on PvP —
// this is the matching UI so kids see why, instead of a raw DB error.
import LinkParentForm from '@/components/LinkParentForm';

export default function LinkParentGate({ feature }: { feature: string }) {
  return (
    <div className="max-w-sm mx-auto mt-10 bg-neutral-900 border border-indigo-500/40 text-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3 text-center">
      <p className="text-3xl">🔒</p>
      <p className="font-bold text-base">Link a parent to unlock {feature}</p>
      <p className="text-gray-400 text-xs">
        Your progress and single-player games are all still yours — {feature} just needs a parent
        linked first, and you earn 100 gold for doing it.
      </p>
      <div className="text-left">
        <LinkParentForm />
      </div>
    </div>
  );
}
