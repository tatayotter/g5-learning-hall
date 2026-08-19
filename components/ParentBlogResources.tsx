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
  lorekeeper:    'bg-sky-900/40 border-sky-700/40 text-sky-300',
  spellcaster:   'bg-emerald-900/40 border-emerald-700/40 text-emerald-300',
  numberrealm:   'bg-violet-900/40 border-violet-700/40 text-violet-300',
  logiclabyrinth:'bg-amber-900/40 border-amber-700/40 text-amber-300',
  lexiconarena:  'bg-rose-900/40 border-rose-700/40 text-rose-300',
  resources:     'bg-indigo-900/40 border-indigo-700/40 text-indigo-300',
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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          📚 Parent Resources
        </h2>
        <Link
          href="/blog"
          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
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
            className="block rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 hover:border-neutral-600 hover:bg-neutral-900 transition-colors group"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs font-semibold text-gray-200 group-hover:text-white leading-snug line-clamp-2">
                  {post.title}
                </p>
                <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">
                  {post.description}
                </p>
              </div>
              <span className={`shrink-0 mt-0.5 rounded border text-[9px] px-1.5 py-0.5 leading-tight ${GUILD_COLOR[post.guildKey]}`}>
                {GUILD_LABEL[post.guildKey]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
