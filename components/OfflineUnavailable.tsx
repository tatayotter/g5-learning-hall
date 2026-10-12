// components/OfflineUnavailable.tsx
//
// Shown in place of a screen that is inherently online-only (live multiplayer,
// server-validated purchases, server-only grading) while the device is offline,
// e.g. the Curio Arena's Training Map, Trainers, Trade and Leaderboard. Uses the
// parchment "pending" panel from docs/STYLE_GUIDE.md.
interface OfflineUnavailableProps {
  feature: string;
  reason?: string;
  action?: { label: string; onClick: () => void };
}

export default function OfflineUnavailable({ feature, reason, action }: OfflineUnavailableProps) {
  return (
    <div className="bg-[#f0ddb8] border-2 border-[#8b5e2a] p-8 rounded-xl shadow-lg mb-6 text-center">
      <div className="text-4xl mb-3" aria-hidden>📡</div>
      <h2 className="text-xl font-bold text-[#2a1505] mb-2">{feature} needs internet</h2>
      <p className="text-[#3a2610] text-sm max-w-md mx-auto">
        {reason || `Connect to Wi-Fi or mobile data to use ${feature}. Anything you played without internet is safe and saves to your account when it's back.`}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2 rounded-lg font-bold bg-[#8b5e2a] hover:bg-[#6b4820] text-white active:scale-95 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
