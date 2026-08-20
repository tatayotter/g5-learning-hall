import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { CURRICULUM_GRADES, SSES_SUBJECTS, getBudgetOfWork, getCitedSources, type CurriculumGrade } from '@/lib/curriculum';
import { BLOG_POSTS } from '@/lib/blogPosts';

// Always fetch fresh from Supabase — BOW content is edited live via admin tools.
export const dynamic = 'force-dynamic';

const GRADE_SLUG_RE = /^grade-([2-6])$/;

function parseGrade(slug: string): CurriculumGrade | null {
  const m = GRADE_SLUG_RE.exec(slug);
  if (!m) return null;
  return Number(m[1]) as CurriculumGrade;
}

export function generateStaticParams() {
  return CURRICULUM_GRADES.map((g) => ({ grade: `grade-${g}` }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ grade: string }>;
}): Promise<Metadata> {
  const { grade: slug } = await params;
  const grade = parseGrade(slug);
  if (!grade) return {};
  const title = `Grade ${grade} DepEd Curriculum & Budget of Work — Learning Hall`;
  const description = `Every subject in DepEd's MATATAG curriculum for Grade ${grade}, term by term — the same source material Learning Hall's Grade ${grade} quests are built from, including Special Science (SSES) enrichment for English, Math, and Science.`;
  return {
    title,
    description,
    alternates: { canonical: `/curriculum/grade-${grade}` },
    openGraph: { title, description, url: `/curriculum/grade-${grade}` },
    twitter: { card: 'summary_large_image', title, description },
  };
}

const markdownComponents = {
  h1: (props: any) => <h1 className="text-xl font-display font-black text-[#2b2417] mt-6 mb-3 first:mt-0" {...props} />,
  h2: (props: any) => <h2 className="text-lg font-display font-bold text-[#a3610c] mt-6 mb-3 first:mt-0" {...props} />,
  h3: (props: any) => <h3 className="text-base font-display font-bold text-[#c9781a] mt-5 mb-2 first:mt-0" {...props} />,
  p: (props: any) => <p className="text-[#5c5245] leading-relaxed mb-3" {...props} />,
  strong: (props: any) => <strong className="text-[#2b2417] font-bold" {...props} />,
  ul: (props: any) => <ul className="list-disc list-outside pl-5 mb-3 space-y-1 text-[#5c5245]" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-outside pl-5 mb-3 space-y-1 text-[#5c5245]" {...props} />,
  li: (props: any) => <li className="pl-1" {...props} />,
  hr: () => <hr className="border-[#eee3ce] my-5" />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-[#c9781a] pl-4 italic text-[#948975] my-4" {...props} />,
  table: (props: any) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse" {...props} /></div>,
  thead: (props: any) => <thead className="text-[#2b2417]" {...props} />,
  tr: (props: any) => <tr className="border-b border-[#eee3ce]" {...props} />,
  th: (props: any) => <th className="text-left font-bold py-2 px-3 border-b border-[#eee3ce]" {...props} />,
  td: (props: any) => <td className="py-2 px-3 text-[#5c5245]" {...props} />,
};

export default async function CurriculumGradePage({
  params,
}: {
  params: Promise<{ grade: string }>;
}) {
  const { grade: slug } = await params;
  const grade = parseGrade(slug);
  if (!grade) notFound();

  const entries = await getBudgetOfWork(grade);
  if (entries.length === 0) notFound();

  const sources = getCitedSources(entries);
  const relatedPosts = BLOG_POSTS.filter((p) => p.grade === grade).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Grade ${grade} DepEd Curriculum & Budget of Work`,
    description: `Every subject in DepEd's MATATAG curriculum for Grade ${grade}, term by term.`,
    author: { '@type': 'Organization', name: 'Learning Hall' },
    publisher: { '@type': 'Organization', name: 'Learning Hall' },
    mainEntityOfPage: `https://learninghallph.com/curriculum/grade-${grade}`,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Curriculum', item: 'https://learninghallph.com/curriculum' },
      { '@type': 'ListItem', position: 2, name: `Grade ${grade}`, item: `https://learninghallph.com/curriculum/grade-${grade}` },
    ],
  };

  return (
    <div className="min-h-screen bg-[#faf7f1] text-[#2b2417] font-[Inter,system-ui,sans-serif]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <BlogHeader theme="light" />

      <main className="px-6 py-12">
        <article className="max-w-2xl mx-auto">
          <Link href="/curriculum" className="text-xs text-[#948975] hover:text-[#5c5245]">
            ← All Curriculum Pages
          </Link>

          <h1 className="font-display text-3xl sm:text-4xl font-black mt-4 mb-4 leading-tight">
            Grade {grade} DepEd Curriculum: Full Budget of Work & MATATAG Alignment
          </h1>

          <p className="text-[#5c5245] leading-relaxed mb-6">
            This is the same source material Learning Hall's own Grade {grade} quests are built from — every subject
            DepEd's MATATAG curriculum covers this year, broken down term by term. It's here for two reasons: so a
            parent can see exactly what "DepEd-aligned" means for Grade {grade} in concrete terms, and so Learning
            Hall itself stays honest about what it's actually teaching against.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8">
            <p className="text-[10px] tracking-[0.2em] font-bold text-emerald-700 uppercase mb-2">
              Special Science (SSES) Enrichment
            </p>
            <p className="text-sm text-[#5c5245] leading-relaxed">
              English, Mathematics, and Science each carry an additional layer of Special Science Elementary School
              (SSES) enrichment at this grade level, marked below — an extra applied-reasoning task layered on top of
              the standard MATATAG competencies, not a separate curriculum. Every other subject follows the standard
              DepEd competencies as written.
            </p>
          </div>

          {entries.map((entry) => (
            <section key={entry.subject} className="mb-8 border-t border-[#eee3ce] pt-6">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-xl sm:text-2xl font-black">{entry.subject}</h2>
                {SSES_SUBJECTS.includes(entry.subject) && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    SSES Enrichment
                  </span>
                )}
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {entry.content_markdown}
              </ReactMarkdown>
            </section>
          ))}

          {relatedPosts.length > 0 && (
            <div className="bg-white border border-[#eee3ce] rounded-xl p-6 mb-8 shadow-sm">
              <h2 className="font-display text-lg font-black mb-3">Related Learning Hall Guides for Grade {grade}</h2>
              <ul className="space-y-2">
                {relatedPosts.map((post) => (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className="text-sm text-[#a3610c] hover:text-[#c9781a] underline underline-offset-2">
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sources.length > 0 && (
            <div className="mb-10">
              <p className="text-[10px] tracking-[0.2em] font-bold text-[#948975] uppercase mb-2">Primary Sources Cited</p>
              <div className="flex flex-wrap gap-3">
                {sources.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#948975] hover:text-[#5c5245] underline underline-offset-2"
                  >
                    Official MATATAG Curriculum Guide ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#eee3ce] pt-6">
            {grade > 2 ? (
              <Link href={`/curriculum/grade-${grade - 1}`} className="text-sm text-[#948975] hover:text-[#5c5245]">
                ← Grade {grade - 1}
              </Link>
            ) : <span />}
            {grade < 6 ? (
              <Link href={`/curriculum/grade-${grade + 1}`} className="text-sm text-[#948975] hover:text-[#5c5245]">
                Grade {grade + 1} →
              </Link>
            ) : <span />}
          </div>
        </article>
      </main>

      <BlogFooter />
    </div>
  );
}
