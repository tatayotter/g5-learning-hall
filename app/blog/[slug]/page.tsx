import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { BLOG_POSTS, getBlogPost, getGuildImage, getRelatedPosts } from '@/lib/blogPosts';
import ShareButtons from '@/components/ShareButtons';
import BlogHeader from '@/components/BlogHeader';

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const guildImage = getGuildImage(post.guildKey);
  const image = guildImage
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
  const post = getBlogPost(slug);
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

  const related = getRelatedPosts(post);

  return (
    <div className="min-h-screen bg-[#0a0807] text-[#ede4d3] font-[Inter,system-ui,sans-serif]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <BlogHeader />

      <main className="px-6 py-12">
        <article className="max-w-2xl mx-auto">
          <Link href="/blog" className="text-xs text-[#8a7c66] hover:text-[#c9bfae]">
            ← All guides
          </Link>

          <div className="flex items-center gap-2 flex-wrap mt-4">
            <Link
              href={`/blog/topic/${post.guildKey}`}
              className="text-[11px] tracking-[0.2em] font-bold text-[#d4b46a]/90 uppercase hover:text-[#f0b429] w-fit"
            >
              {post.skill}
              {post.guildName !== post.skill ? ` · ${post.guildName}` : ''}
            </Link>
            {post.grade !== 'all' && (
              <span className="text-[10px] font-bold text-[#7fae52] bg-[#1c2a18] border border-[#2f4023] rounded-full px-2 py-0.5">
                Grade {post.grade}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black mt-2 mb-4 leading-tight">
            {post.title}
          </h1>

          {getGuildImage(post.guildKey) && (
            <div className="relative w-full aspect-square max-w-xs mx-auto mb-6 rounded-xl overflow-hidden border border-[#3d3225] bg-[#1c1611]">
              <Image
                src={getGuildImage(post.guildKey) as string}
                alt={post.guildName}
                fill
                sizes="(max-width: 640px) 100vw, 320px"
                className="object-contain p-4"
              />
            </div>
          )}

          <time dateTime={post.publishedAt} className="block text-[11px] text-[#5c5245] mb-8">
            {new Date(post.publishedAt).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>

          <ShareButtons url={`https://learninghallph.com/blog/${post.slug}`} title={post.title} />

          <p className="text-[#c9bfae] leading-relaxed mb-8">{post.intro}</p>

          {post.curriculumNote && (
            <div className="bg-[#161f13] border border-[#2f4023] rounded-xl p-5 mb-8">
              <p className="text-[10px] tracking-[0.2em] font-bold text-[#7fae52] uppercase mb-2">
                What DepEd Actually Asks at This Level
              </p>
              <p className="text-sm text-[#c9bfae] leading-relaxed">{post.curriculumNote}</p>
            </div>
          )}

          {post.sections.map((section) => (
            <section key={section.heading} className="mb-8">
              <h2 className="font-display text-xl sm:text-2xl font-black mb-3">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, i) => (
                <p key={i} className="text-[#c9bfae] leading-relaxed mb-3">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          {post.externalLinks && post.externalLinks.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              {post.externalLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f0b429] hover:text-[#f5c542] underline underline-offset-2"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          )}

          <div className="bg-[#1c1611] border border-[#3d3225] rounded-xl p-6 mb-10">
            <h2 className="font-display text-lg font-black mb-3">Quick Takeaways</h2>
            <ul className="space-y-2">
              {post.takeaways.map((takeaway) => (
                <li key={takeaway} className="flex items-start gap-2 text-sm text-[#c9bfae]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429] mt-1.5 shrink-0" />
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#13100c] border border-[#3d3225] rounded-xl p-6 text-center mb-12">
            <p className="text-[#c9bfae] leading-relaxed mb-4">
              {post.guildKey === 'resources'
                ? "Learning Hall turns that same curriculum into a daily quest your child actually wants to finish — free during Early Access."
                : `Learning Hall turns ${post.skill.toLowerCase()} practice into a daily quest your child actually wants to finish — free during Early Access.`}
            </p>
            <Link
              href="/register"
              className="inline-block bg-[#c9781a] hover:bg-[#e2921e] text-black font-bold text-sm px-6 py-3 rounded-lg transition-colors"
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
                    className="block bg-[#1c1611] border border-[#3d3225] rounded-lg p-4 hover:border-[#c9781a]/60 transition-colors"
                  >
                    <span className="text-[10px] tracking-[0.2em] font-bold text-[#d4b46a]/90 uppercase">
                      {p.skill}
                    </span>
                    <p className="font-bold text-sm mt-1">{p.title}</p>
                  </Link>
                ))}
              </div>
              <Link
                href={`/blog/topic/${post.guildKey}`}
                className="inline-block mt-4 text-xs text-[#8a7c66] hover:text-[#c9bfae]"
              >
                See all {post.skill} guides →
              </Link>
            </div>
          )}
        </article>
      </main>

      <footer className="px-6 py-8 text-center border-t border-[#241d16]">
        <p className="text-[11px] tracking-[0.06em] text-white/25 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
        <p className="mt-2 text-[11px] tracking-wide">
          <a href="https://www.facebook.com/learninghallph" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 underline">Facebook</a>
          <span className="text-white/20 mx-2">·</span>
          <a href="/privacy" className="text-white/40 hover:text-white/70 underline">Privacy Policy</a>
          <span className="text-white/20 mx-2">·</span>
          <a href="/account-deletion" className="text-white/40 hover:text-white/70 underline">Delete Account</a>
        </p>
      </footer>
    </div>
  );
}
