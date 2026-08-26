import Link from 'next/link';
import { BLOG_POSTS, type BlogPost } from '@/lib/blogPosts';

const GUILD_LABEL: Record<BlogPost['guildKey'], string> = {
  lorekeeper:    'Reading',
  spellcaster:   'Typing',
  numberrealm:   'Math',
  logiclabyrinth:'Logic',
  lexiconarena:  'Vocabulary',
  resources:     'For Parents',
};

const GUILD_COLOR: Record<BlogPost['guildKey'], string> = {
  lorekeeper:    'bg-sky-50 border-sky-200 text-sky-700',
  spellcaster:   'bg-emerald-50 border-emerald-200 text-emerald-700',
  numberrealm:   'bg-violet-50 border-violet-200 text-violet-700',
  logiclabyrinth:'bg-amber-50 border-amber-200 text-amber-700',
  lexiconarena:  'bg-rose-50 border-rose-200 text-rose-700',
  resources:     'bg-indigo-50 border-indigo-200 text-indigo-700',
};

interface Props {
  /** Numeric grade levels of the parent's children, e.g. [5] or [3,5] */
  grades: number[];
}

export default function ParentBlogResources({ grades }: Props) {
  // 1. Resources posts first (grade-agnostic, parent-facing)
  // 2. Skill posts that match one of the child's grades or are grade:'all'
  // Deduplicate by slug, cap at 6.
  const seen = new Set<string>();
  const posts: BlogPost[] = [];

  const add = (p: BlogPost) => {
    if (!seen.has(p.slug)) { seen.add(p.slug); posts.push(p); }
  };

  // Resources first, newest first
  BLOG_POSTS
    .filter(p => p.guildKey === 'resources')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .forEach(add);

  // Grade-matched skill posts
  BLOG_POSTS
    .filter(p =>
      p.guildKey !== 'resources' &&
      (p.grade === 'all' || grades.includes(p.grade as number))
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .forEach(add);

  const shown = posts.slice(0, 6);

  if (shown.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500">
          📚 Parent Resources
        </h2>
        <Link
          href="/blog"
          className="text-xs text-amber-700 hover:text-amber-800 underline"
        >
          View all guides →
        </Link>
      </div>

      <div className="space-y-2">
        {shown.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-stone-200 bg-[#ffffff] px-4 py-3 hover:border-amber-300 hover:shadow-sm transition-all group shadow-sm"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-amber-700 leading-snug line-clamp-2">
                  {post.title}
                </p>
                <p className="text-xs text-stone-500 leading-snug line-clamp-2">
                  {post.description}
                </p>
              </div>
              <span className={`shrink-0 mt-0.5 rounded border text-[10px] px-1.5 py-0.5 leading-tight ${GUILD_COLOR[post.guildKey]}`}>
                {GUILD_LABEL[post.guildKey]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
