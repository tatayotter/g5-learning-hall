import { stripInline } from '@/lib/blogPosts';
import { getAllPosts } from '@/lib/blogData';

export const revalidate = 300;

const BASE_URL = 'https://learninghallph.com';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await getAllPosts();

  const items = posts
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${BASE_URL}/blog/${post.slug}</link>
      <guid>${BASE_URL}/blog/${post.slug}</guid>
      <description>${escapeXml(stripInline(post.description))}</description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Learning Hall — Parent Guides</title>
    <link>${BASE_URL}/blog</link>
    <description>Free, practical guides for helping Grade 2-6 learners build reading, math, typing, logic, and vocabulary skills at home.</description>
    <language>en-ph</language>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
