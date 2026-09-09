import type { SupportWallEntry } from '@/lib/supportContributions';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export default function SupportWall({ entries }: { entries: SupportWallEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-[#948975] text-sm py-8">
        Be the first to appear on the supporter wall.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start justify-between gap-4 bg-white border border-[#eee3ce] rounded-xl p-4">
          <div className="min-w-0">
            <p className="font-bold text-[#2b2417] text-sm">{entry.display_name || 'A Supporter'}</p>
            {entry.message && (
              <p className="text-sm text-[#5c5245] mt-1 leading-relaxed">&ldquo;{entry.message}&rdquo;</p>
            )}
            <p className="text-[11px] text-[#948975] mt-1">{timeAgo(entry.paid_at)}</p>
          </div>
          <p className="shrink-0 text-sm font-bold text-[#a3610c]">₱{entry.amount_php.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
