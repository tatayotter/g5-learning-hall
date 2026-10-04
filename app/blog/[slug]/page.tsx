import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGuildImage, getPostImage, getRelatedPosts, stripInline } from '@/lib/blogPosts';
import { getAllPosts, getBlogPost } from '@/lib/blogData';
import BlogArticleBody from '@/components/blog/BlogArticleBody';
import ShareButtons from '@/components/ShareButtons';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';

// Matches BLOG_REVALIDATE_SECONDS in lib/blogData.ts: scheduled posts appear within this window.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getAllPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};

  const photo = getPostImage(post);
  const guildImage = getGuildImage(post.guildKey);
  const image = photo
    ? { url: photo.url, width: photo.width, height: photo.height, alt: photo.alt }
    : guildImage
      ? { url: guildImage, width: 640, height: 640, alt: post.guildName }
      : { url: '/splash1.webp', width: 2096, height: 1184, alt: 'Learning Hall' };

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [image.url],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: 'Learning Hall' },
    publisher: { '@type': 'Organization', name: 'Learning Hall' },
    mainEntityOfPage: `https://learninghallph.com/blog/${post.slug}`,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Blog', item: 'https://learninghallph.com/blog' },
      {
        '@type': 'ListItem',
        position: 2,
        name: post.skill,
        item: `https://learninghallph.com/blog/topic/${post.guildKey}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://learninghallph.com/blog/${post.slug}`,
      },
    ],
  };

  const related = getRelatedPosts(await getAllPosts(), post);

  const faqJsonLd = post.faq && post.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: stripInline(item.answer) },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-[#faf7f1] text-[#2b2417] font-[Inter,system-ui,sans-serif]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <BlogHeader theme="light" />

      <main className="px-6 py-12">
        <article className="max-w-2xl mx-auto">
          <Link href="/blog" className="text-xs text-[#948975] hover:text-[#5c5245]">
            ← All guides
          </Link>

          <BlogArticleBody
            post={post}
            afterDate={<ShareButtons url={`https://learninghallph.com/blog/${post.slug}`} title={post.title} />}
          />

          <div className="bg-[#fdf1de] border border-[#f0d9ad] rounded-xl p-6 text-center mb-12">
            <p className="text-[#5c5245] leading-relaxed mb-4">
              {post.guildKey === 'resources'
                ? "Learning Hall turns that same curriculum into a daily quest your child actually wants to finish — free during Early Access."
                : `Learning Hall turns ${post.skill.toLowerCase()} practice into a daily quest your child actually wants to finish — free during Early Access.`}
            </p>
            <Link
              href="/register"
              className="inline-block bg-[#c9781a] hover:bg-[#b3690f] text-white font-bold text-sm px-6 py-3 rounded-lg transition-colors"
            >
              Start Your Family's Quest
            </Link>
          </div>

          {related.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-black mb-4">More Guides</h2>
              <div className="space-y-3">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="block bg-white border border-[#eee3ce] rounded-lg p-4 shadow-sm hover:shadow-md hover:border-[#e2b978] transition-all"
                  >
                    <span className="text-[10px] tracking-[0.2em] font-bold text-[#a3610c] uppercase">
                      {p.skill}
                    </span>
                    <p className="font-bold text-sm mt-1">{p.title}</p>
                  </Link>
                ))}
              </div>
              <Link
                href={`/blog/topic/${post.guildKey}`}
                className="inline-block mt-4 text-xs text-[#948975] hover:text-[#5c5245]"
              >
                See all {post.skill} guides →
              </Link>
            </div>
          )}
        </article>
      </main>

      <BlogFooter />
    </div>
  );
}
