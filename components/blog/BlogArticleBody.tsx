import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getGuildImage, getPostImage, type BlogPost } from '@/lib/blogPosts';
import RichText from '@/components/blog/RichText';

// The article itself: topic line, title, photo, date, intro, sections, links, FAQ and takeaways.
// Shared by the public post page (app/blog/[slug]/page.tsx) and the admin editor's live preview
// (components/admin/blog/BlogPreview.tsx), so the preview is exactly what will be published.
// No data fetching or hooks, so it renders on the server and in client components alike.
export default function BlogArticleBody({ post, afterDate }: { post: BlogPost; afterDate?: ReactNode }) {
  const photo = getPostImage(post);
  const guildImage = getGuildImage(post.guildKey);

  return (
    <>
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

      {photo ? (
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
            {photo.credit.source === 'Learning Hall PH' ? (
              'Photo: Learning Hall PH'
            ) : (
              <>
                Photo by{' '}
                <a href={photo.credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#5c5245]">
                  {photo.credit.name}
                </a>{' '}
                on {photo.credit.source}
              </>
            )}
          </p>
        </div>
      ) : guildImage ? (
        <div className="relative w-full aspect-square max-w-xs mx-auto mb-6 rounded-xl overflow-hidden border border-[#eee3ce] bg-white shadow-sm">
          <Image
            src={guildImage}
            alt={post.guildName}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-contain p-4"
          />
        </div>
      ) : null}

      <time dateTime={post.publishedAt} className="block text-[11px] text-[#948975] mb-8">
        {new Date(post.publishedAt).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })}
      </time>

      {afterDate}

      <p className="text-[#5c5245] leading-relaxed mb-8"><RichText text={post.intro} /></p>

      {post.curriculumNote && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8">
          <p className="text-[10px] tracking-[0.2em] font-bold text-emerald-700 uppercase mb-2">
            What DepEd Actually Asks at This Level
          </p>
          <p className="text-sm text-[#5c5245] leading-relaxed"><RichText text={post.curriculumNote} /></p>
        </div>
      )}

      {post.sections.map((section, s) => (
        <section key={`${s}-${section.heading}`} className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl font-black mb-3">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="text-[#5c5245] leading-relaxed mb-3">
              <RichText text={paragraph} />
            </p>
          ))}
          {section.image && (
            <figure className="mt-5">
              <Image
                src={section.image.url}
                alt={section.image.alt}
                width={section.image.width}
                height={section.image.height}
                sizes="(max-width: 672px) 100vw, 672px"
                className={`block h-auto rounded-xl border border-[#eee3ce] shadow-sm ${
                  section.image.height > section.image.width ? 'w-full max-w-sm mx-auto' : 'w-full'
                }`}
              />
              {section.image.caption && (
                <figcaption className="text-xs text-[#948975] mt-2 text-center">
                  {section.image.caption}
                </figcaption>
              )}
            </figure>
          )}
        </section>
      ))}

      {post.externalLinks && post.externalLinks.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-8">
          {post.externalLinks.map((link) =>
            link.url.startsWith('/') ? (
              <Link
                key={link.url}
                href={link.url}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#a3610c] hover:text-[#c9781a] underline underline-offset-2"
              >
                {link.label} →
              </Link>
            ) : (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#a3610c] hover:text-[#c9781a] underline underline-offset-2"
              >
                {link.label} ↗
              </a>
            )
          )}
        </div>
      )}

      {post.faq && post.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl font-black mb-3">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {post.faq.map((item, i) => (
              <div key={`${i}-${item.question}`} className="bg-white border border-[#eee3ce] rounded-xl p-5 shadow-sm">
                <h3 className="font-display text-base font-bold mb-2 text-[#a3610c]">
                  {item.question}
                </h3>
                <p className="text-sm text-[#5c5245] leading-relaxed"><RichText text={item.answer} /></p>
              </div>
            ))}
          </div>
        </section>
      )}

      {post.takeaways.length > 0 && (
        <div className="bg-white border border-[#eee3ce] rounded-xl p-6 mb-10 shadow-sm">
          <h2 className="font-display text-lg font-black mb-3">Quick Takeaways</h2>
          <ul className="space-y-2">
            {post.takeaways.map((takeaway, i) => (
              <li key={`${i}-${takeaway}`} className="flex items-start gap-2 text-sm text-[#5c5245]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9781a] mt-1.5 shrink-0" />
                <span><RichText text={takeaway} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
