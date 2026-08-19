'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { BLOG_TOPICS, type BlogPost } from '@/lib/blogPosts';

const NAV_LABELS: Record<BlogPost['guildKey'], string> = {
  lorekeeper: 'Reading',
  numberrealm: 'Math',
  spellcaster: 'Typing',
  logiclabyrinth: 'Logic',
  lexiconarena: 'Vocabulary',
  resources: 'Resources',
};

export default function BlogHeader() {
  const [open, setOpen] = useState(false);
  const topics = Object.entries(BLOG_TOPICS) as [BlogPost['guildKey'], (typeof BLOG_TOPICS)[BlogPost['guildKey']]][];

  const linkClass =
    'px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide text-[#c9bfae] hover:text-[#f0b429] hover:bg-[#1c1611] transition-colors';

  return (
    <header className="sticky top-0 z-30 bg-[#0a0807]/95 backdrop-blur border-b border-[#241d16]">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/welcome" className="flex items-center gap-2 shrink-0">
          <Image
            src="/learning_hall_full_logo.webp"
            alt="Learning Hall"
            width={495}
            height={367}
            className="h-8 w-auto object-contain"
          />
          <span className="font-display font-black text-sm tracking-wide hidden sm:inline">
            Learning Hall
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/blog" className={linkClass}>All Guides</Link>
          <Link href="/curriculum" className={linkClass}>Curriculum</Link>
          {topics.map(([key]) => (
            <Link key={key} href={`/blog/topic/${key}`} className={linkClass}>
              {NAV_LABELS[key]}
            </Link>
          ))}
          <Link
            href="/register"
            className="ml-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#c9781a] hover:bg-[#e2921e] text-black transition-colors shrink-0"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile: Get Started + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/register"
            className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#c9781a] hover:bg-[#e2921e] text-black transition-colors"
          >
            Get Started
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="p-2 rounded-lg text-[#c9bfae] hover:text-[#f0b429] hover:bg-[#1c1611] transition-colors"
          >
            {open ? (
              /* X icon */
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="17" y2="6" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14" x2="17" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-[#241d16] bg-[#0a0807]/98 px-4 py-3 flex flex-col gap-1">
          <Link href="/blog" className={linkClass} onClick={() => setOpen(false)}>All Guides</Link>
          <Link href="/curriculum" className={linkClass} onClick={() => setOpen(false)}>Curriculum</Link>
          {topics.map(([key]) => (
            <Link key={key} href={`/blog/topic/${key}`} className={linkClass} onClick={() => setOpen(false)}>
              {NAV_LABELS[key]}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
