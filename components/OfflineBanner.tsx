// components/OfflineBanner.tsx
//
// Shown by Dashboard while there's no connection. The realm still opens from
// the cached shell and the player's last-loaded progress (public/sw.js,
// lib/offlineSnapshot.ts), but anything that saves needs the server, so this
// says so up front instead of letting a quiz end in a failed save. With offline
// main quests on (lib/offlineQuests.ts) those do save, on the device.
export default function OfflineBanner({ questsWork = false }: { questsWork?: boolean }) {
  return (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)] flex items-center gap-1.5 bg-[#f0ddb8] border-2 border-[#8b5e2a] text-[#2a1505] text-xs font-bold px-3 py-1 rounded-full shadow-lg"
    >
      <span aria-hidden>📡</span>
      <span>{questsWork
        ? 'Offline: main quests save on this device and sync when you reconnect.'
        : 'Offline: showing your last saved progress. Reconnect to save.'}</span>
    </div>
  );
}
