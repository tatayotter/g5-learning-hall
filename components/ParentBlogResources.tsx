'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BlogPost } from '@/lib/blogPosts';
import { IosGroup, IosRow } from '@/components/parent/ios';

const GUILD_LABEL: Record<BlogPost['guildKey'], string> = {
  lorekeeper:    'Reading',
  spellcaster:   'Typing',
  numberrealm:   'Math',
  logiclabyrinth:'Logic',
  lexiconarena:  'Vocabulary',
  resources:     'For Parents',
};

type PostSummary = { slug: string; title: string; description: string; guild_key: BlogPost['guildKey']; grade: number | null };

interface Props {
  /** Numeric grade levels of the parent's children, e.g. [5] or [3,5] */
  grades: number[];
}

export default function ParentBlogResources({ grades }: Props) {
  const [all, setAll] = useState<PostSummary[]>([]);

  // Only the list fields, newest first. RLS returns published posts whose time has passed.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('blog_posts')
      .select('slug, title, description, guild_key, grade')
      .order('published_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { if (!cancelled && data) setAll(data as PostSummary[]); });
    return () => { cancelled = true; };
  }, []);

  // 1. Resources posts first (grade-agnostic, parent-facing)
  // 2. Skill posts that match one of the child's grades or are for all grades
  // Deduplicate by slug, cap at 4 (the full list is one tap away).
  const seen = new Set<string>();
  const posts: PostSummary[] = [];
  const add = (p: PostSummary) => {
    if (!seen.has(p.slug)) { seen.add(p.slug); posts.push(p); }
  };
  all.filter(p => p.guild_key === 'resources').forEach(add);
  all
    .filter(p => p.guild_key !== 'resources' && (p.grade == null || grades.includes(p.grade)))
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
          subtitle={`${GUILD_LABEL[post.guild_key]} · ${post.description}`}
          chevron
        />
      ))}
      <IosRow href="/blog" title="View All Guides" tint="blue" detail={undefined} />
    </IosGroup>
  );
}
