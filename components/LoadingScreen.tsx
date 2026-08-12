// components/LoadingScreen.tsx
//
// Branded stand-in for the blank/plain-text states Dashboard shows while
// waiting on session hydration or the first weekly-data fetch — those gaps
// can run several seconds (more on native, where the app also has to open
// the SQLite cache and, cold, parse a larger bundle), and a bare colored div
// reads as "frozen" rather than "loading."
export default function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#0a0807] flex flex-col items-center justify-center gap-6 p-8">
      <img
        src="/learning_hall_full_logo.webp"
        alt=""
        className="w-40 sm:w-56 opacity-90 animate-pulse"
      />
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#c9781a] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-[#c9781a] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-[#c9781a] animate-bounce" />
      </div>
      {message && <p className="text-sm text-[#8a7c66] font-bold">{message}</p>}
    </div>
  );
}
