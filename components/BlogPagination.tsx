import Link from 'next/link';

export default function BlogPagination({
  currentPage,
  totalPages,
  hrefForPage,
}: {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pageHref = hrefForPage;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-2 mt-8 flex-wrap"
    >
      {currentPage > 1 && (
        <Link
          href={pageHref(currentPage - 1)}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-[#6b5f4d] border border-[#e2d9c4] bg-white hover:border-[#e2b978] hover:text-[#a3610c] transition-colors"
        >
          ← Previous
        </Link>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={pageHref(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={
            page === currentPage
              ? 'px-3 py-1.5 rounded-full text-xs font-bold bg-[#c9781a] text-white'
              : 'px-3 py-1.5 rounded-full text-xs font-bold text-[#6b5f4d] border border-[#e2d9c4] bg-white hover:border-[#e2b978] hover:text-[#a3610c] transition-colors'
          }
        >
          {page}
        </Link>
      ))}

      {currentPage < totalPages && (
        <Link
          href={pageHref(currentPage + 1)}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-[#6b5f4d] border border-[#e2d9c4] bg-white hover:border-[#e2b978] hover:text-[#a3610c] transition-colors"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
