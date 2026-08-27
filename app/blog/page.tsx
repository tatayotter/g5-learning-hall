import type { Metadata } from 'next';
import Link from 'next/link';
import { getBlogIndexPage, getBlogIndexPageCount, getSciencePosts, SCIENCE_POST_SLUGS } from '@/lib/blogPosts';
import BlogHeader from '@/components/BlogHeader';
import BlogPostList from '@/components/BlogPostList';
import BlogPagination from '@/components/BlogPagination';
import BlogFooter from '@/components/BlogFooter';

export const metadata: Metadata = {
  title: 'Parent Guides — Learning Hall Blog',
  description:
    'Free, practical guides for helping Grade 2-6 learners build reading comprehension, mental math, typing, critical thinking, and vocabulary skills at home.',
  alternates: {
    canonical: '/blog',
    types: { 'application/rss+xml': '/blog/rss.xml' },
  },
  openGraph: {
    title: 'Parent Guides — Learning Hall Blog',
    description:
      'Free, practical guides for helping Grade 2-6 learners build reading comprehension, mental math, typing, critical thinking, and vocabulary skills at home.',
    url: '/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Parent Guides — Learning Hall Blog',
    description:
      'Free, practical guides for helping Grade 2-6 learners build reading comprehension, mental math, typing, critical thinking, and vocabulary skills at home.',
  },
};

export default function BlogIndexPage() {
  // Page 1 excludes the 5 science posts below — they're already surfaced in
  // their own featured section instead of appearing twice on the same page.
  const posts = getBlogIndexPage(1).filter((p) => !(SCIENCE_POST_SLUGS as readonly string[]).includes(p.slug));
  const totalPages = getBlogIndexPageCount();
  const sciencePosts = getSciencePosts();

  return (
    <div className="min-h-screen bg-[#faf7f1] text-[#2b2417] font-[Inter,system-ui,sans-serif]">
      <BlogHeader theme="light" />

      <div className="px-6 py-10 border-b border-[#eee3ce] text-center">
        <h1 className="font-display text-3xl sm:text-4xl font-black mb-3">Parent Guides</h1>
        <p className="text-[#6b5f4d] max-w-xl mx-auto leading-relaxed">
          Free, practical ways to build reading, math, typing, logic, and vocabulary skills at home —
          no worksheets required.
        </p>
      </div>

      <main className="px-6 py-12">
        <section className="max-w-3xl mx-auto mb-12">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <p className="text-[10px] tracking-[0.2em] font-bold text-emerald-700 uppercase mb-2">
              The Research Behind Learning Hall
            </p>
            <h2 className="font-display text-xl font-black mb-2">The Science Behind Every Guild</h2>
            <p className="text-sm text-[#5c5245] leading-relaxed mb-5">
              Five cited, research-backed explainers — one per skill — on why each guild is built the way it is:
              the testing effect, orthographic mapping, procedural fluency, fluid intelligence, and dual coding.
              See how each one maps to actual gameplay on{' '}
              <Link href="/guilds" className="text-[#a3610c] hover:text-[#c9781a] underline">
                The Guild Ledger
              </Link>
              .
            </p>
            <BlogPostList posts={sciencePosts} />
          </div>
        </section>

        <BlogPostList posts={posts} />

        <BlogPagination
          currentPage={1}
          totalPages={totalPages}
          hrefForPage={(page) => (page <= 1 ? '/blog' : `/blog/page/${page}`)}
        />
      </main>

      <BlogFooter />
    </div>
  );
}
