import type { Metadata } from 'next';
import { getBlogIndexPage, getBlogIndexPageCount } from '@/lib/blogPosts';
import BlogHeader from '@/components/BlogHeader';
import BlogPostList from '@/components/BlogPostList';
import BlogPagination from '@/components/BlogPagination';

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
  const posts = getBlogIndexPage(1);
  const totalPages = getBlogIndexPageCount();

  return (
    <div className="min-h-screen bg-[#0a0807] text-[#ede4d3] font-[Inter,system-ui,sans-serif]">
      <BlogHeader />

      <div className="px-6 py-10 border-b border-[#241d16] text-center">
        <h1 className="font-display text-3xl sm:text-4xl font-black mb-3">Parent Guides</h1>
        <p className="text-[#c9bfae] max-w-xl mx-auto leading-relaxed">
          Free, practical ways to build reading, math, typing, logic, and vocabulary skills at home —
          no worksheets required.
        </p>
      </div>

      <main className="px-6 py-12">
        <BlogPostList posts={posts} />

        <BlogPagination
          currentPage={1}
          totalPages={totalPages}
          hrefForPage={(page) => (page <= 1 ? '/blog' : `/blog/page/${page}`)}
        />
      </main>

      <footer className="px-6 py-8 text-center border-t border-[#241d16]">
        <p className="text-[11px] tracking-[0.06em] text-white/25 font-medium">
          © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
