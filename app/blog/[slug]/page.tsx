import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { BLOG_POSTS, getBlogPost, getGuildImage, getPostImage, getRelatedPosts } from '@/lib/blogPosts';
import ShareButtons from '@/components/ShareButtons';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';

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

  const faqJsonLd = post.faq && post.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
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

          <div className="flex items-center gap-2 flex-wrap mt-4">
            <Link
              href={`/blog/topic/${post.guildKey}`}
              className="text-[11px] tracking-[0.2em] font-bold text-[#a3610c] uppercase hover:text-[#c9781a] w-fit"
            >
              {post.skill}
              {post.guildName !== post.skill ? ` · ${post.guildName}` : ''}
            </Link>
            {post.grade !== 'all' && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                Grade {post.grade}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black mt-2 mb-4 leading-tight">
            {post.title}
          </h1>

          {(() => {
            const photo = getPostImage(post);
            if (photo) {
              return (
                <div className="mb-6">
                  <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-[#eee3ce] bg-white shadow-sm">
                    <Image
                      src={photo.url}
                      alt={photo.alt}
                      fill
                      sizes="(max-width: 672px) 100vw, 672px"
                      className="object-cover"
                      priority
                    />
                  </div>
                  <p className="text-[10px] text-[#948975] mt-1.5 text-right">
                    Photo by{' '}
                    <a href={photo.credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#5c5245]">
                      {photo.credit.name}
                    </a>{' '}
                    on {photo.credit.source}
                  </p>
                </div>
              );
            }
            const guildImage = getGuildImage(post.guildKey);
            return guildImage ? (
              <div className="relative w-full aspect-square max-w-xs mx-auto mb-6 rounded-xl overflow-hidden border border-[#eee3ce] bg-white shadow-sm">
                <Image
                  src={guildImage}
                  alt={post.guildName}
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-contain p-4"
                />
              </div>
            ) : null;
          })()}

          <time dateTime={post.publishedAt} className="block text-[11px] text-[#948975] mb-8">
            {new Date(post.publishedAt).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>

          <ShareButtons url={`https://learninghallph.com/blog/${post.slug}`} title={post.title} />

          <p className="text-[#5c5245] leading-relaxed mb-8">{post.intro}</p>

          {post.curriculumNote && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8">
              <p className="text-[10px] tracking-[0.2em] font-bold text-emerald-700 uppercase mb-2">
                What DepEd Actually Asks at This Level
              </p>
              <p className="text-sm text-[#5c5245] leading-relaxed">{post.curriculumNote}</p>
            </div>
          )}

          {post.sections.map((section) => (
            <section key={section.heading} className="mb-8">
              <h2 className="font-display text-xl sm:text-2xl font-black mb-3">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, i) => (
                <p key={i} className="text-[#5c5245] leading-relaxed mb-3">
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
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#a3610c] hover:text-[#c9781a] underline underline-offset-2"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          )}

          {post.faq && post.faq.length > 0 && (
            <section className="mb-8">
              <h2 className="font-display text-xl sm:text-2xl font-black mb-3">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {post.faq.map((item) => (
                  <div key={item.question} className="bg-white border border-[#eee3ce] rounded-xl p-5 shadow-sm">
                    <h3 className="font-display text-base font-bold mb-2 text-[#a3610c]">
                      {item.question}
                    </h3>
                    <p className="text-sm text-[#5c5245] leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="bg-white border border-[#eee3ce] rounded-xl p-6 mb-10 shadow-sm">
            <h2 className="font-display text-lg font-black mb-3">Quick Takeaways</h2>
            <ul className="space-y-2">
              {post.takeaways.map((takeaway) => (
                <li key={takeaway} className="flex items-start gap-2 text-sm text-[#5c5245]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c9781a] mt-1.5 shrink-0" />
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>

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
