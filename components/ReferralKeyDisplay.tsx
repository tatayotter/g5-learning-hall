'use client';
// Displays the player's referral key with a tap-to-copy share link button.
// Used on Dashboard (compact) and HeroProfile (full).

import { useState } from 'react';

interface ReferralKeyDisplayProps {
  referralKey: string;
  compact?: boolean; // Dashboard card vs HeroProfile panel
}

function buildShareUrl(referralKey: string): string {
  if (typeof window === 'undefined') return `/child-signup?ref=${referralKey}`;
  return `${window.location.origin}/child-signup?ref=${referralKey}`;
}

export default function ReferralKeyDisplay({
  referralKey,
  compact = false,
}: ReferralKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = buildShareUrl(referralKey);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-amber-700 font-bold tracking-widest font-mono">
          {referralKey}
        </span>
        <button
          onClick={handleCopy}
          title="Copy invite link"
          className="text-xs px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300
                     text-amber-700 hover:bg-amber-200 transition-colors font-semibold whitespace-nowrap"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Code + share link */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">
            Your Referral Code
          </p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tracking-[0.3em] font-mono text-amber-700">
              {referralKey}
            </span>
          </div>
        </div>

        {/* Share URL row */}
        <div className="flex items-center gap-2 bg-white border border-amber-100 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-400 truncate flex-1 font-mono select-all">
            /child-signup?ref={referralKey}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600
                       text-white text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
          >
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
        </div>
      </div>

      {/* Reward description */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">You earn (per referral)</p>
          <p className="text-sm font-bold text-amber-600">🌱 1 Growth Pill</p>
          <p className="text-sm font-bold text-amber-600">💰 300 Gold</p>
          <p className="text-xs text-gray-400 mt-1">when they reach Level 5</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">They earn on signup</p>
          <p className="text-sm font-bold text-amber-600">🌱 1 Growth Pill</p>
          <p className="text-sm font-bold text-amber-600">💰 100 Gold</p>
          <p className="text-xs text-gray-400 mt-1">credited on first login</p>
        </div>
      </div>
    </div>
  );
}
