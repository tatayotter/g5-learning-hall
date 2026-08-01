// components/OfflineUnavailable.tsx
//
// Placeholder shown in the Android offline shell for tabs that are
// inherently online-only (live multiplayer, server-validated purchases,
// server-only grading) — see the Phase 3 plan doc for why each one qualifies.
interface OfflineUnavailableProps {
  feature: string;
  reason?: string;
}

export default function OfflineUnavailable({ feature, reason }: OfflineUnavailableProps) {
  return (
    <div className="bg-[#111] border border-[#333] p-10 rounded-xl shadow-2xl mb-6 text-center">
      <div className="text-4xl mb-4">📡</div>
      <h2 className="text-xl font-bold text-gray-300 mb-2 font-display">{feature} needs an internet connection</h2>
      <p className="text-gray-500 text-sm max-w-md mx-auto">
        {reason || `Reconnect to Wi-Fi or mobile data to use ${feature}. Your offline practice progress is safe and will sync automatically once you're back online.`}
      </p>
    </div>
  );
}
