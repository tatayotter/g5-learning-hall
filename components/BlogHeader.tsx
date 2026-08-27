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

export default function BlogHeader({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false);
  const topics = Object.entries(BLOG_TOPICS) as [BlogPost['guildKey'], (typeof BLOG_TOPICS)[BlogPost['guildKey']]][];

  const isLight = theme === 'light';

  const headerClass = isLight
    ? 'sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#eee3ce]'
    : 'sticky top-0 z-30 bg-[#0a0807]/95 backdrop-blur border-b border-[#241d16]';

  const linkClass = isLight
    ? 'px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide text-[#6b5f4d] hover:text-[#a3610c] hover:bg-[#faf3e6] transition-colors'
    : 'px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide text-[#c9bfae] hover:text-[#f0b429] hover:bg-[#1c1611] transition-colors';

  const ctaClass = isLight
    ? 'px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#c9781a] hover:bg-[#b3690f] text-white transition-colors shrink-0'
    : 'px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#c9781a] hover:bg-[#e2921e] text-black transition-colors shrink-0';

  const mobileCtaClass = isLight
    ? 'px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#c9781a] hover:bg-[#b3690f] text-white transition-colors'
    : 'px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#c9781a] hover:bg-[#e2921e] text-black transition-colors';

  const menuBtnClass = isLight
    ? 'p-2 rounded-lg text-[#6b5f4d] hover:text-[#a3610c] hover:bg-[#faf3e6] transition-colors'
    : 'p-2 rounded-lg text-[#c9bfae] hover:text-[#f0b429] hover:bg-[#1c1611] transition-colors';

  const dropdownClass = isLight
    ? 'md:hidden border-t border-[#eee3ce] bg-white/98 px-4 py-3 flex flex-col gap-1'
    : 'md:hidden border-t border-[#241d16] bg-[#0a0807]/98 px-4 py-3 flex flex-col gap-1';

  const logoTextClass = isLight
    ? 'font-display font-black text-sm tracking-wide hidden sm:inline text-[#2b2417]'
    : 'font-display font-black text-sm tracking-wide hidden sm:inline';

  return (
    <header className={headerClass}>
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
          <span className={logoTextClass}>
            Learning Hall
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/blog" className={linkClass}>All Guides</Link>
          <Link href="/curriculum" className={linkClass}>Curriculum</Link>
          <Link href="/guilds" className={linkClass}>Guilds</Link>
          {topics.map(([key]) => (
            <Link key={key} href={`/blog/topic/${key}`} className={linkClass}>
              {NAV_LABELS[key]}
            </Link>
          ))}
          <Link href="/register" className={`ml-2 ${ctaClass}`}>
            Get Started
          </Link>
        </nav>

        {/* Mobile: Get Started + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/register" className={mobileCtaClass}>
            Get Started
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className={menuBtnClass}
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
        <div className={dropdownClass}>
          <Link href="/blog" className={linkClass} onClick={() => setOpen(false)}>All Guides</Link>
          <Link href="/curriculum" className={linkClass} onClick={() => setOpen(false)}>Curriculum</Link>
          <Link href="/guilds" className={linkClass} onClick={() => setOpen(false)}>Guilds</Link>
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
