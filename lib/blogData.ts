import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import {
  BLOG_POST_PUBLIC_COLUMNS, BLOG_POSTS_PER_PAGE, SCIENCE_POST_SLUGS, rowToPost, sortNewestFirst,
  type BlogGuildKey, type BlogPost,
} from '@/lib/blogPosts';

// Server-side reads of published blog posts for the public pages (blog, sitemap, RSS, guild and
// curriculum pages). Uses the anon key, so RLS ("blog_posts: public read published") decides what
// is visible: drafts and posts scheduled for later never come back from here.
//
// One cached query serves every page. It refreshes every BLOG_REVALIDATE_SECONDS, which is also
// how a scheduled post goes live without anyone touching it, and the admin API drops the cache
// straight away on every save (revalidateTag(BLOG_CACHE_TAG) in app/api/admin-blog/route.ts).
export const BLOG_CACHE_TAG = 'blog-posts';
export const BLOG_REVALIDATE_SECONDS = 300;

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const getAllPosts = unstable_cache(
  async (): Promise<BlogPost[]> => {
    const { data, error } = await anon
      .from('blog_posts')
      .select(BLOG_POST_PUBLIC_COLUMNS)
      .order('published_at', { ascending: false })
      .range(0, 999);
    if (error) {
      // Don't take the whole site down over the blog. An empty list renders the listing pages
      // and 404s posts; the next revalidation retries.
      console.error('[blog] failed to load posts:', error.message);
      return [];
    }
    return sortNewestFirst((data ?? []).map(rowToPost));
  },
  ['blog-posts-all'],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_REVALIDATE_SECONDS }
);

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  return (await getAllPosts()).find((p) => p.slug === slug);
}

export async function getPostsByTopic(guildKey: BlogGuildKey): Promise<BlogPost[]> {
  return (await getAllPosts()).filter((p) => p.guildKey === guildKey);
}

export async function getBlogIndexPageCount(): Promise<number> {
  return Math.max(1, Math.ceil((await getAllPosts()).length / BLOG_POSTS_PER_PAGE));
}

/** 1-indexed page number. Returns an empty array if the page is out of range. */
export async function getBlogIndexPage(pageNumber: number): Promise<BlogPost[]> {
  const start = (pageNumber - 1) * BLOG_POSTS_PER_PAGE;
  return (await getAllPosts()).slice(start, start + BLOG_POSTS_PER_PAGE);
}

export async function getSciencePosts(): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return SCIENCE_POST_SLUGS.map((slug) => posts.find((p) => p.slug === slug)).filter((p): p is BlogPost => !!p);
}
