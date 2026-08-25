'use client';
// Displays the player's referral key with a tap-to-copy button.
// Used on Dashboard (compact) and HeroProfile (full).

import { useState } from 'react';

interface ReferralKeyDisplayProps {
  referralKey: string;
  compact?: boolean; // Dashboard card vs HeroProfile panel
}

export default function ReferralKeyDisplay({
  referralKey,
  compact = false,
}: ReferralKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralKey);
    } catch {
      // Fallback for older browsers / WebView
      const el = document.createElement('textarea');
      el.value = referralKey;
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
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-300 font-semibold tracking-widest font-mono">
          {referralKey}
        </span>
        <button
          onClick={handleCopy}
          title="Copy referral code"
          className="text-xs px-2 py-0.5 rounded bg-amber-700/40 border border-amber-500/50
                     text-amber-300 hover:bg-amber-600/50 transition-colors"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-4 space-y-2">
      <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
        Your Referral Code
      </p>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold tracking-[0.25em] font-mono text-amber-300">
          {referralKey}
        </span>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500
                     text-white text-sm font-semibold transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-xs text-amber-500/80 leading-relaxed">
        Share this code with friends. When they sign up and reach{' '}
        <span className="text-amber-400 font-semibold">Level 5</span>, you earn{' '}
        <span className="text-amber-400 font-semibold">1 Growth Pill + 300 Gold</span>.
        They also get <span className="text-amber-400 font-semibold">1 Growth Pill + 100 Gold</span>{' '}
        just for signing up!
      </p>
    </div>
  );
}
