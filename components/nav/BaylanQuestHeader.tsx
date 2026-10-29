// components/nav/BaylanQuestHeader.tsx
//
// The top of the Quests page when the map is home (new nav): Baylan the Loreteller, who gives
// out the Main Quests in Inkwell Town, says what's waiting today. It's the in-game pop-up's wood
// header (components/game/GamePopup.tsx, docs/STYLE_GUIDE.md "In-game pop-ups"), pinned to the
// top of the page while it scrolls; the page itself turns parchment (.map-home-panel.game-panel
// in app/globals.css).
import { GamePopupHeader } from '@/components/game/GamePopup';
import { TOWN_NPCS, BAYLAN_ID } from '@/lib/townNpcs';

const baylan = TOWN_NPCS.town?.find(n => n.id === BAYLAN_ID);

/** Baylan's head and shoulders for the header's round portrait (idle frame, facing right). */
function BaylanPortrait({ size = 56 }: { size?: number }) {
  if (!baylan) return null;
  const k = (size * 1.3) / baylan.frameW;
  return (
    <div
      aria-hidden
      className="relative flex-shrink-0"
      style={{
        width: baylan.frameW * k, height: baylan.frameH * k, marginTop: 3,
        backgroundImage: `url(${baylan.sheet})`, backgroundRepeat: 'no-repeat',
        backgroundSize: 'auto 100%',
        // The idle pose comes right after the walk frames.
        backgroundPosition: `${-(baylan.walkFrames ?? 25) * baylan.frameW * k}px 0`,
      }}
    />
  );
}

export default function BaylanQuestHeader({ hasQuestToday, questDone, onClose }: { hasQuestToday: boolean; questDone: boolean; onClose: () => void }) {
  const line = !hasQuestToday
    ? 'No new quest today. The guild masters in town have side quests for you!'
    : questDone
      ? 'Great job today! The guild masters in town have side quests for you.'
      : 'Your quest for today is ready! Tap it below to start.';
  return (
    <div className="map-panel-head" data-testid="baylan-header">
      <GamePopupHeader
        title="Baylan's Quests"
        speaker={{ portrait: <BaylanPortrait />, line }}
        onClose={onClose}
        testId="baylan"
        grabBar={false}
      />
    </div>
  );
}
