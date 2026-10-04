'use client';
import BlogArticleBody from '@/components/blog/BlogArticleBody';
import type { BlogPost } from '@/lib/blogPosts';

// The editor's live preview: the same article component the public page uses, on the blog's
// own parchment background, so what you see here is what gets published. Links inside the
// preview are disabled so a stray click doesn't navigate away from unsaved work.
export default function BlogPreview({ post }: { post: BlogPost }) {
  return (
    <div
      className="rounded-xl border border-[var(--a-border)] bg-[#faf7f1] text-[#2b2417] font-[Inter,system-ui,sans-serif] px-5 py-8 sm:px-8 [&_a]:pointer-events-none"
      aria-label="Post preview"
    >
      <article className="max-w-2xl mx-auto">
        <BlogArticleBody post={post} />
      </article>
    </div>
  );
}
