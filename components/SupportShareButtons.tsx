'use client';

import { useState } from 'react';
import FadeIn from '@/components/FadeIn';

const SHARE_URL = 'https://learninghallph.com/support';
const SHARE_TEXT = "I'm supporting Learning Hall PH — a free, DepEd-aligned learning game for Filipino kids. Any amount helps keep it running:";

const LINKS = [
  {
    name: 'Facebook',
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`,
    bg: 'bg-[#1877F2] hover:bg-[#1466d6]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12" />
      </svg>
    ),
  },
  {
    name: 'Messenger',
    href: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(SHARE_URL)}&app_id=&redirect_uri=${encodeURIComponent(SHARE_URL)}`,
    bg: 'bg-gradient-to-br from-[#00B2FF] to-[#B24DFF] hover:opacity-90',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.5 2 2 6.14 2 11.5c0 2.9 1.32 5.5 3.44 7.28V22l3.14-1.73c.84.23 1.73.36 2.66.36 5.5 0 10-4.14 10-9.5S17.5 2 12 2m1 12.79-2.5-2.67-4.88 2.67L11.05 9l2.55 2.67L18.4 9z" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${SHARE_TEXT} ${SHARE_URL}`)}`,
    bg: 'bg-[#25D366] hover:bg-[#1ebe59]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.1.2 2.1 3.2 5 4.4.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4M12 22c-1.7 0-3.4-.4-4.9-1.3L2 22l1.3-5c-.9-1.6-1.4-3.4-1.4-5.2C1.9 6.3 6.4 2 12 2s10.1 4.3 10.1 9.8S17.6 22 12 22" />
      </svg>
    ),
  },
  {
    name: 'X',
    href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`,
    bg: 'bg-black hover:bg-slate-800',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.9 2H22l-7.4 8.4L23.3 22h-6.8l-5.3-6.9L5 22H1.9l7.9-9L1 2h7l4.8 6.3zm-1.2 18h1.9L7.4 4H5.3z" />
      </svg>
    ),
  },
] as const;

export default function SupportShareButtons() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older browsers, non-secure
      // context) -- fail quietly rather than throwing at the user.
    }
  }

  return (
    <section className="px-6 py-16 bg-sky-50 border-y border-sky-100">
      <div className="max-w-lg mx-auto text-center">
        <FadeIn>
          <p className="text-[11px] tracking-[0.28em] font-bold text-sky-500 uppercase mb-4">
            Can&apos;t Chip In Right Now?
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black mb-4 text-slate-800">
            Sharing Helps Too
          </h2>
          <p className="text-slate-500 leading-relaxed mb-8">
            Know a parent who could use this? Passing it along costs nothing and reaches families
            who need it just as much.
          </p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${link.name}`}
                className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-colors shadow-sm ${link.bg}`}
              >
                {link.icon}
              </a>
            ))}
            <button
              type="button"
              onClick={copyLink}
              aria-label="Copy link"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-500 transition-colors shadow-sm"
            >
              {copied ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5l1-1a3.5 3.5 0 015 5l-2 2a3.5 3.5 0 01-5 0M10.5 17.5l-1 1a3.5 3.5 0 01-5-5l2-2a3.5 3.5 0 015 0" />
                </svg>
              )}
            </button>
          </div>
          {copied && <p className="text-xs text-emerald-600 font-semibold mt-3">Link copied!</p>}
        </FadeIn>
      </div>
    </section>
  );
}
