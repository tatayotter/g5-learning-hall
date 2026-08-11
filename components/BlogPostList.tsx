import Image from 'next/image';
import Link from 'next/link';
import { getGuildImage, getPostImage, type BlogPost } from '@/lib/blogPosts';

export default function BlogPostList({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {posts.map((post) => {
        const photo = getPostImage(post);
        return (
        <div
          key={post.slug}
          className="flex gap-4 bg-[#1c1611] border border-[#3d3225] rounded-xl p-6 hover:border-[#c9781a]/60 transition-colors"
        >
          <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-[#3d3225] bg-[#13100c]">
            {photo ? (
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <Image
                src={getGuildImage(post.guildKey) ?? '/learning_hall_full_logo.webp'}
                alt=""
                fill
                sizes="80px"
                className="object-contain p-1.5"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/blog/topic/${post.guildKey}`}
                className="inline-block text-[11px] tracking-[0.2em] font-bold text-[#d4b46a]/90 uppercase hover:text-[#f0b429]"
              >
                {post.skill}
              </Link>
              {post.grade !== 'all' && (
                <span className="text-[10px] font-bold text-[#7fae52] bg-[#1c2a18] border border-[#2f4023] rounded-full px-2 py-0.5">
                  Grade {post.grade}
                </span>
              )}
            </div>
            <Link href={`/blog/${post.slug}`} className="block">
              <h2 className="font-display text-xl sm:text-2xl font-black mt-2 mb-2">{post.title}</h2>
              <p className="text-sm text-[#8a7c66] leading-relaxed">{post.description}</p>
              <time dateTime={post.publishedAt} className="block text-[11px] text-[#5c5245] mt-4">
                {new Date(post.publishedAt).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </Link>
          </div>
        </div>
        );
      })}
    </div>
  );
}
