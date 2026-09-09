import type { SupportWallEntry } from '@/lib/supportContributions';

const AVATAR_COLORS = [
  'bg-orange-100 text-orange-600',
  'bg-sky-100 text-sky-600',
  'bg-emerald-100 text-emerald-600',
  'bg-violet-100 text-violet-600',
  'bg-amber-100 text-amber-600',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
      <p className="text-center text-slate-400 text-sm py-8">
        Be the first to appear on the supporter wall.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => {
        const name = entry.display_name || 'A Supporter';
        return (
          <div key={i} className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor(name)}`}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-slate-800 text-sm">{name}</p>
                <p className="shrink-0 text-sm font-bold text-orange-500">₱{entry.amount_php.toLocaleString()}</p>
              </div>
              {entry.message && (
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">&ldquo;{entry.message}&rdquo;</p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">{timeAgo(entry.paid_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
