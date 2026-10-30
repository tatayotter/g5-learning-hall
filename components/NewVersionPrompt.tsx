// components/NewVersionPrompt.tsx
//
// Shown by Dashboard when the live site has a newer build than this page
// (lib/appVersion.ts). Only between activities, never mid-quest or mid-battle, so a tap
// can't throw away answers. Same spot as OfflineBanner (they never show together: the
// check needs internet).
export default function NewVersionPrompt() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed bottom-[6.5rem] landscape:bottom-3 left-1/2 -translate-x-1/2 z-40 w-max max-w-[calc(100vw-1.5rem)] flex items-center gap-1.5 bg-[#f5c542] border-2 border-[#8b5e2a] text-[#2a1505] text-sm font-extrabold px-4 py-1.5 rounded-2xl shadow-lg active:translate-y-0.5"
    >
      <span aria-hidden>✨</span>
      <span>New update ready! Tap to get it</span>
    </button>
  );
}
