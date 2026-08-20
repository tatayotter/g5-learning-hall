import type { Metadata } from 'next';
import { getBlogIndexPage, getBlogIndexPageCount } from '@/lib/blogPosts';
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
  const posts = getBlogIndexPage(1);
  const totalPages = getBlogIndexPageCount();

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
