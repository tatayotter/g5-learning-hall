import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogIndexPage, getBlogIndexPageCount } from '@/lib/blogPosts';
import BlogHeader from '@/components/BlogHeader';
import BlogPostList from '@/components/BlogPostList';
import BlogPagination from '@/components/BlogPagination';

export function generateStaticParams() {
  const totalPages = getBlogIndexPageCount();
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    page: String(i + 2),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const title = `Parent Guides — Page ${page} — Learning Hall Blog`;
  const description =
    'Free, practical guides for helping Grade 2-6 learners build reading comprehension, mental math, typing, critical thinking, and vocabulary skills at home.';
  return {
    title,
    description,
    alternates: { canonical: `/blog/page/${page}` },
    openGraph: { title, description, url: `/blog/page/${page}` },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BlogIndexPaginatedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageNumber = Number(page);
  const totalPages = getBlogIndexPageCount();

  if (!Number.isInteger(pageNumber) || pageNumber < 2 || pageNumber > totalPages) {
    notFound();
  }

  const posts = getBlogIndexPage(pageNumber);

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
          currentPage={pageNumber}
          totalPages={totalPages}
          hrefForPage={(p) => (p <= 1 ? '/blog' : `/blog/page/${p}`)}
        />
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
