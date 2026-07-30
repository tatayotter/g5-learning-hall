import type { MetadataRoute } from 'next';
import { BLOG_POSTS, BLOG_TOPICS, getBlogIndexPageCount } from '@/lib/blogPosts';

const BASE_URL = 'https://learninghallph.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/welcome`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...Array.from({ length: Math.max(0, getBlogIndexPageCount() - 1) }, (_, i) => ({
      url: `${BASE_URL}/blog/page/${i + 2}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
    ...BLOG_POSTS.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...Object.keys(BLOG_TOPICS).map((topic) => ({
      url: `${BASE_URL}/blog/topic/${topic}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
