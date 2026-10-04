import type { MetadataRoute } from 'next';
import { BLOG_POSTS_PER_PAGE, BLOG_TOPICS } from '@/lib/blogPosts';
import { getAllPosts } from '@/lib/blogData';
import { CURRICULUM_GRADES } from '@/lib/curriculum';
import { GUILD_SLUGS } from '@/lib/guilds';

const BASE_URL = 'https://learninghallph.com';

// Posts come from the database now, so the sitemap refreshes on the blog's schedule.
export const revalidate = 300;

/**
 * Most-recent `updatedAt` across all posts, used as `lastModified` for
 * aggregate/listing pages (blog index, pagination, topic pages) whose real
 * "last changed" date is whenever the newest post was published or edited —
 * not "whenever this sitemap happened to be built." A fabricated build-time
 * timestamp on every entry tells Google everything changes on every deploy,
 * which is both inaccurate and undersells pages that are genuinely stable.
 */
function latestUpdate(posts: Awaited<ReturnType<typeof getAllPosts>>) {
  return posts.reduce<Date | null>((latest, post) => {
    const updated = new Date(post.updatedAt);
    return !latest || updated > latest ? updated : latest;
  }, null);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const latestBlogUpdate = latestUpdate(posts);
  const blogPageCount = Math.max(1, Math.ceil(posts.length / BLOG_POSTS_PER_PAGE));
  return [
    {
      url: BASE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/welcome`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/play`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/register`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: latestBlogUpdate ?? undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/account-deletion`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/curriculum`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...CURRICULUM_GRADES.map((grade) => ({
      url: `${BASE_URL}/curriculum/grade-${grade}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    {
      url: `${BASE_URL}/guilds`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...GUILD_SLUGS.map((slug) => ({
      url: `${BASE_URL}/guilds/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...Array.from({ length: Math.max(0, blogPageCount - 1) }, (_, i) => ({
      url: `${BASE_URL}/blog/page/${i + 2}`,
      lastModified: latestBlogUpdate ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
    ...posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...Object.keys(BLOG_TOPICS).map((topic) => ({
      url: `${BASE_URL}/blog/topic/${topic}`,
      lastModified: latestBlogUpdate ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
