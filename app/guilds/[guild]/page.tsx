import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import { GUILDS, GUILD_SLUGS, getGuild } from '@/lib/guilds';
import { BLOG_POSTS } from '@/lib/blogPosts';

export function generateStaticParams() {
  return GUILD_SLUGS.map((guild) => ({ guild }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ guild: string }>;
}): Promise<Metadata> {
  const { guild: slug } = await params;
  const guild = getGuild(slug);
  if (!guild) return {};
  const title = `${guild.name} — Purpose, Science, Progression & DepEd Basis — Learning Hall`;
  const description = `What the ${guild.name} side-quest guild trains, the learning science behind it, its Grade 2-6 difficulty ladder, its DepEd basis, and the Curio companion it earns.`;
  return {
    title,
    description,
    alternates: { canonical: `/guilds/${guild.slug}` },
    openGraph: { title, description, url: `/guilds/${guild.slug}` },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function GuildDetailPage({
  params,
}: {
  params: Promise<{ guild: string }>;
}) {
  const { guild: slug } = await params;
  const guild = getGuild(slug);
  if (!guild) notFound();

  const index = GUILDS.findIndex((g) => g.slug === guild.slug);
  const prevGuild = index > 0 ? GUILDS[index - 1] : null;
  const nextGuild = index < GUILDS.length - 1 ? GUILDS[index + 1] : null;

  const relatedPosts = BLOG_POSTS.filter((p) => p.guildKey === guild.blogTopicKey)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 5);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${guild.name} — Purpose, Science, Progression & DepEd Basis`,
    description: `What the ${guild.name} side-quest guild trains and why, grade by grade.`,
    author: { '@type': 'Organization', name: 'Learning Hall' },
    publisher: { '@type': 'Organization', name: 'Learning Hall' },
    mainEntityOfPage: `https://learninghallph.com/guilds/${guild.slug}`,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'The Guild Ledger', item: 'https://learninghallph.com/guilds' },
      { '@type': 'ListItem', position: 2, name: guild.name, item: `https://learninghallph.com/guilds/${guild.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-[#faf7f1] text-[#2b2417] font-[Inter,system-ui,sans-serif]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <BlogHeader theme="light" />

      <div className={`h-1.5 ${guild.accent.solidBg}`} />

      <main className="px-6 py-12">
        <article className="max-w-2xl mx-auto">
          <Link href="/guilds" className="text-xs text-[#948975] hover:text-[#5c5245]">
            ← The Guild Ledger
          </Link>

          <div className="flex items-center gap-4 mt-4 mb-2">
            <div className={`shrink-0 w-16 h-16 rounded-xl ${guild.accent.wash} border ${guild.accent.washBorder} flex items-center justify-center overflow-hidden`}>
              <GuardianSprite guild={guild.guardianSlug} pose="idle" className="w-12 h-12" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-black leading-tight">{guild.name}</h1>
              <p className={`text-sm font-bold uppercase tracking-wide ${guild.accent.text}`}>{guild.subject}</p>
            </div>
          </div>

          <div className={`bg-white border ${guild.accent.washBorder} rounded-xl p-5 mb-8 flex items-start gap-3`}>
            <div className={`shrink-0 w-14 h-14 rounded-lg ${guild.accent.wash} flex items-center justify-center overflow-hidden`}>
              <img
                src={`/monsters/${guild.curio.tier1.spriteId}.webp`}
                alt={`${guild.curio.tier1.name}, the ${guild.name} companion Curio`}
                className="w-11 h-11 object-contain"
              />
            </div>
            <p className="text-sm text-[#5c5245] leading-relaxed">
              <strong className="text-[#2b2417]">Companion: {guild.curio.tier1.name}.</strong>{' '}
              {guild.curio.tier1.description}
            </p>
          </div>

          <section className="mb-8">
            <h2 className="font-display text-lg font-black mb-2">Purpose</h2>
            <p className="text-[#5c5245] leading-relaxed">{guild.purpose}</p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-lg font-black mb-2">The science</h2>
            <p className="text-[#5c5245] leading-relaxed mb-2">{guild.science}</p>
            <Link
              href={`/blog/${guild.sciencePostSlug}`}
              className={`text-sm font-semibold ${guild.accent.hoverText} text-[#948975] underline underline-offset-2`}
            >
              Read the full research behind this →
            </Link>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-lg font-black mb-3">Progression</h2>
            <p className="text-sm text-[#948975] mb-4">
              Same ladder rule as every guild — a grade only unlocks the next once every question in it has been
              answered correctly. Full grade-by-grade DepEd source material is on the{' '}
              <Link href={`/curriculum/grade-2`} className="text-[#a3610c] hover:text-[#c9781a] underline">
                Curriculum
              </Link>{' '}
              pages.
            </p>
            <div className="grid gap-3">
              {guild.rungs.map((rung) => (
                <div key={rung.grade} className="bg-white border border-[#eee3ce] rounded-lg px-4 py-3">
                  <Link
                    href={`/curriculum/grade-${rung.grade}`}
                    className="flex items-center gap-3 mb-3 group"
                  >
                    <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wide ${guild.accent.tagText} ${guild.accent.tagBg} border ${guild.accent.tagBorder} rounded-full px-2.5 py-1`}>
                      Grade {rung.grade}
                    </span>
                    <span className="text-sm text-[#5c5245] group-hover:text-[#2b2417]">{rung.topic}</span>
                  </Link>
                  <div className="bg-[#faf7f1] border border-[#eee3ce] rounded-md px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#948975] mb-1.5">Sample question</p>
                    <p className="text-sm text-[#2b2417] mb-1.5">{rung.sample.prompt}</p>
                    {rung.sample.kind === 'mcq' ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {rung.sample.options.map((opt) => (
                          <li
                            key={opt}
                            className={
                              opt === rung.sample.answer
                                ? 'text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1'
                                : 'text-xs text-[#948975] bg-white border border-[#eee3ce] rounded-full px-2.5 py-1'
                            }
                          >
                            {opt}
                            {opt === rung.sample.answer ? ' ✓' : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full inline-block px-2.5 py-1">
                        Answer: {rung.sample.answer} ✓
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-lg font-black mb-3">DepEd basis</h2>
            <div className="flex flex-wrap gap-2">
              {guild.depedTags.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs font-semibold ${guild.accent.tagText} ${guild.accent.tagBg} border ${guild.accent.tagBorder} rounded-full px-3 py-1`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="mb-8 border-t border-[#eee3ce] pt-6">
            <h2 className="font-display text-lg font-black mb-1">Curio earned &amp; graduations</h2>
            <p className="text-sm text-[#948975] mb-4">
              One companion, three stages — each unlocked by leveling up the {guild.name} guild itself.
            </p>
            <div className="grid gap-3">
              {[guild.curio.tier1, guild.curio.tier2, guild.curio.tier3].map((stage, i) => (
                <div key={stage.name} className={`bg-white border ${guild.accent.washBorder} rounded-xl p-4 flex items-start gap-3`}>
                  <div className={`shrink-0 w-14 h-14 rounded-lg ${guild.accent.wash} flex items-center justify-center overflow-hidden`}>
                    <img
                      src={`/monsters/${stage.spriteId}.webp`}
                      alt={stage.name}
                      className="w-11 h-11 object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display font-black text-base">{stage.name}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${guild.accent.tagText} ${guild.accent.tagBg} border ${guild.accent.tagBorder} rounded-full px-2 py-0.5`}>
                        {i === 0 ? 'Earned at' : 'Graduates at'} guild level {stage.guildLevel}
                      </span>
                    </div>
                    <p className="text-sm text-[#5c5245] leading-relaxed">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-lg font-black mb-2">What your child earns</h2>
            <p className="text-[#5c5245] leading-relaxed">{guild.earns}</p>
          </section>

          {relatedPosts.length > 0 && (
            <div className="bg-white border border-[#eee3ce] rounded-xl p-6 mb-8 shadow-sm">
              <h2 className="font-display text-lg font-black mb-3">Related Learning Hall Guides</h2>
              <ul className="space-y-2">
                {relatedPosts.map((post) => (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className="text-sm text-[#a3610c] hover:text-[#c9781a] underline underline-offset-2">
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/blog/topic/${guild.blogTopicKey}`}
                className="inline-block mt-3 text-xs font-bold uppercase tracking-wide text-[#948975] hover:text-[#5c5245]"
              >
                All {guild.name} guides →
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#eee3ce] pt-6">
            {prevGuild ? (
              <Link href={`/guilds/${prevGuild.slug}`} className={`text-sm text-[#948975] ${prevGuild.accent.hoverText}`}>
                ← {prevGuild.name}
              </Link>
            ) : <span />}
            {nextGuild ? (
              <Link href={`/guilds/${nextGuild.slug}`} className={`text-sm text-[#948975] ${nextGuild.accent.hoverText}`}>
                {nextGuild.name} →
              </Link>
            ) : <span />}
          </div>
        </article>
      </main>

      <BlogFooter />
    </div>
  );
}
