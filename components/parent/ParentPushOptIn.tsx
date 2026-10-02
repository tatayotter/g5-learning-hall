// components/parent/ParentPushOptIn.tsx
// Parent-dashboard version of PushOptInCard: same show/hide rules
// (usePushAsk), iOS-glass look. Sits near the top of the dashboard because
// the Notifications switch further down got 0 of 59 parents to opt in, and
// there's now something real to receive (parent-daily-summary, 8pm).
'use client';

import { usePushAsk, type CardState } from '@/components/PushOptInCard';
import { IOS, IosButton, IosGroup, IosIconTile } from '@/components/parent/ios';

interface ParentPushOptInProps {
  parentId: string;
  childNames: string[];
  /** /dev/ui-gallery only. */
  previewState?: Exclude<CardState, 'hidden'>;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return 'your child';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default function ParentPushOptIn({ parentId, childNames, previewState }: ParentPushOptInProps) {
  const { state, busy, blocked, snooze, enable } = usePushAsk({ kind: 'parent', id: parentId }, previewState);
  if (state === 'hidden') return null;

  const names = joinNames(childNames);
  const goldLine = childNames.length > 1 ? 'Each child also gets 300 free gold.' : 'Your child also gets 300 free gold.';

  return (
    <IosGroup>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <IosIconTile icon="bell" color={IOS.red} />
          <div className="min-w-0 flex-1">
            <p className="text-[17px] leading-[22px] font-semibold" style={{ color: IOS.label }}>
              {state === 'ask' ? `See what ${names} learned today` : 'Get alerts on this iPhone'}
            </p>
            <p className="mt-1 text-[15px] leading-[20px]" style={{ color: IOS.secondary }}>
              {state === 'ask'
                ? `A short summary at 8pm on days they play. ${goldLine}`
                : 'Add Learning Hall to your Home Screen first: tap Share, then Add to Home Screen, and open it from there.'}
            </p>
            {blocked && (
              <p className="mt-2 text-[13px]" style={{ color: IOS.red }}>
                Notifications are blocked for this site. Allow them in your browser settings to turn this on.
              </p>
            )}
          </div>
        </div>
        {state === 'ask' && !blocked && (
          <IosButton onClick={() => { void enable(); }} disabled={busy}>
            {busy ? 'Turning On…' : 'Turn On Alerts'}
          </IosButton>
        )}
        <IosButton variant="plain" onClick={snooze}>
          {state === 'ask' ? 'Not Now' : 'Got It'}
        </IosButton>
      </div>
    </IosGroup>
  );
}
