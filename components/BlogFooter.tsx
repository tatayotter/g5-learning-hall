import Link from 'next/link';

export default function BlogFooter() {
  return (
    <footer className="px-6 py-8 text-center border-t border-[#eee3ce]">
      <p className="text-[11px] tracking-[0.06em] text-[#948975] font-medium">
        © {new Date().getFullYear()} Ruelo Learning Hall. All Rights Reserved.
      </p>
      <p className="mt-2 text-[11px] tracking-wide">
        <a href="https://www.facebook.com/learninghallph" target="_blank" rel="noopener noreferrer" className="text-[#948975] hover:text-[#5c5245] underline">Facebook</a>
        <span className="text-[#d8cdb5] mx-2">·</span>
        <Link href="/privacy" className="text-[#948975] hover:text-[#5c5245] underline">Privacy Policy</Link>
        <span className="text-[#d8cdb5] mx-2">·</span>
        <Link href="/account-deletion" className="text-[#948975] hover:text-[#5c5245] underline">Delete Account</Link>
      </p>
    </footer>
  );
}
