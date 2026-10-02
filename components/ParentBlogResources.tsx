import { BLOG_POSTS, type BlogPost } from '@/lib/blogPosts';
import { IosGroup, IosRow } from '@/components/parent/ios';

const GUILD_LABEL: Record<BlogPost['guildKey'], string> = {
  lorekeeper:    'Reading',
  spellcaster:   'Typing',
  numberrealm:   'Math',
  logiclabyrinth:'Logic',
  lexiconarena:  'Vocabulary',
  resources:     'For Parents',
};

interface Props {
  /** Numeric grade levels of the parent's children, e.g. [5] or [3,5] */
  grades: number[];
}

export default function ParentBlogResources({ grades }: Props) {
  // 1. Resources posts first (grade-agnostic, parent-facing)
  // 2. Skill posts that match one of the child's grades or are grade:'all'
  // Deduplicate by slug, cap at 4 (the full list is one tap away).
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

  const shown = posts.slice(0, 4);

  if (shown.length === 0) return null;

  return (
    <IosGroup header="Guides for parents">
      {shown.map(post => (
        <IosRow
          key={post.slug}
          href={`/blog/${post.slug}`}
          external
          title={post.title}
          subtitle={`${GUILD_LABEL[post.guildKey]} · ${post.description}`}
          chevron
        />
      ))}
      <IosRow href="/blog" title="View All Guides" tint="blue" detail={undefined} />
    </IosGroup>
  );
}
