import Image from 'next/image';
import Link from 'next/link';
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
  const topics = Object.entries(BLOG_TOPICS) as [BlogPost['guildKey'], (typeof BLOG_TOPICS)[BlogPost['guildKey']]][];

  return (
    <header className="sticky top-0 z-30 bg-[#0a0807]/95 backdrop-blur border-b border-[#241d16]">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
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

        <nav className="flex items-center gap-1 overflow-x-auto">
          <Link
            href="/blog"
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-[#c9bfae] hover:text-[#f0b429] hover:bg-[#1c1611] transition-colors"
          >
            All Guides
          </Link>
          <Link
            href="/curriculum"
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-[#c9bfae] hover:text-[#f0b429] hover:bg-[#1c1611] transition-colors"
          >
            Curriculum
          </Link>
          <span className="hidden md:contents">
            {topics.map(([key]) => (
              <Link
                key={key}
                href={`/blog/topic/${key}`}
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-[#c9bfae] hover:text-[#f0b429] hover:bg-[#1c1611] transition-colors"
              >
                {NAV_LABELS[key]}
              </Link>
            ))}
          </span>
          <Link
            href="/register"
            className="shrink-0 ml-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#c9781a] hover:bg-[#e2921e] text-black transition-colors"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
