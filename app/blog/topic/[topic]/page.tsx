import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_TOPICS, getGuildImage, getPostsByTopic, type BlogPost } from '@/lib/blogPosts';
import BlogHeader from '@/components/BlogHeader';

export function generateStaticParams() {
  return Object.keys(BLOG_TOPICS).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const info = BLOG_TOPICS[topic as BlogPost['guildKey']];
  if (!info) return {};

  const title = `${info.skill} Guides for Parents — Learning Hall`;
  const guildImage = getGuildImage(topic as BlogPost['guildKey']);
  const image = guildImage
    ? { url: guildImage, width: 640, height: 640, alt: info.name }
    : { url: '/splash1.webp', width: 2096, height: 1184, alt: 'Learning Hall' };
  return {
    title,
    description: info.description,
    alternates: { canonical: `/blog/topic/${topic}` },
    openGraph: {
      title,
      description: info.description,
      url: `/blog/topic/${topic}`,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: info.description,
      images: [image.url],
    },
  };
}

export default async function BlogTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const info = BLOG_TOPICS[topic as BlogPost['guildKey']];
  if (!info) notFound();

  const posts = getPostsByTopic(topic as BlogPost['guildKey']).sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : -1
  );

  return (
    <div className="min-h-screen bg-[#0a0807] text-[#ede4d3] font-[Inter,system-ui,sans-serif]">
      <BlogHeader />

      <div className="px-6 py-10 border-b border-[#241d16] text-center">
        <Link href="/blog" className="text-xs text-[#8a7c66] hover:text-[#c9bfae]">
          ← All guides
        </Link>
        <span className="block text-[11px] tracking-[0.2em] font-bold text-[#d4b46a]/90 uppercase mt-4">
          {info.name}
        </span>
        {getGuildImage(topic as BlogPost['guildKey']) && (
          <div className="relative w-24 h-24 mx-auto my-4 rounded-xl overflow-hidden border border-[#3d3225] bg-[#1c1611]">
            <Image
              src={getGuildImage(topic as BlogPost['guildKey']) as string}
              alt={info.name}
              fill
              sizes="96px"
              className="object-contain p-2"
            />
          </div>
        )}
        <h1 className="font-display text-3xl sm:text-4xl font-black mb-3 mt-4">{info.skill}</h1>
        <p className="text-[#c9bfae] max-w-xl mx-auto leading-relaxed">{info.description}</p>
      </div>

      <main className="px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block bg-[#1c1611] border border-[#3d3225] rounded-xl p-6 hover:border-[#c9781a]/60 transition-colors"
            >
              {post.grade !== 'all' && (
                <span className="inline-block text-[10px] font-bold text-[#7fae52] bg-[#1c2a18] border border-[#2f4023] rounded-full px-2 py-0.5 mb-2">
                  Grade {post.grade}
                </span>
              )}
              <h2 className="font-display text-xl sm:text-2xl font-black mb-2">{post.title}</h2>
              <p className="text-sm text-[#8a7c66] leading-relaxed">{post.description}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="px-6 py-8 text-center border-t border-[#241d16]">
        <p className="text-[11px] tracking-[0.06em] text-white/25 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
        <p className="mt-2 text-[11px] tracking-wide">
          <a href="/privacy" className="text-white/40 hover:text-white/70 underline">Privacy Policy</a>
          <span className="text-white/20 mx-2">·</span>
          <a href="/account-deletion" className="text-white/40 hover:text-white/70 underline">Delete Account</a>
        </p>
      </footer>
    </div>
  );
}
