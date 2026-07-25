// components/DemoBanner.tsx
export default function DemoBanner() {
  return (
    <div className="sticky top-0 z-40 bg-[#c9781a] text-white text-sm font-bold px-4 py-2 flex items-center justify-center gap-3 text-center">
      <span>👋 You&apos;re exploring a demo — progress here isn&apos;t saved long-term.</span>
      <a
        href="/register"
        className="underline decoration-2 underline-offset-2 hover:text-[#1c1611] transition-colors whitespace-nowrap"
      >
        Create your real account →
      </a>
    </div>
  );
}
