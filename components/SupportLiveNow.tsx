import Link from 'next/link';

// Turns "trust me" into "see for yourself" — a direct link out to the real,
// already-live product instead of asking the visitor to take the pitch on
// faith.
export default function SupportLiveNow() {
  return (
    <section className="px-6 py-5 bg-slate-900">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Live now
        </span>
        <p className="text-sm text-slate-300">
          This isn&apos;t a pitch for something coming someday — it&apos;s a real app kids are
          playing right now.
        </p>
        <Link
          href="/welcome"
          className="text-sm font-bold text-orange-400 hover:text-orange-300 underline underline-offset-2 shrink-0"
        >
          See Learning Hall →
        </Link>
      </div>
    </section>
  );
}
