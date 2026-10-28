// components/nav/BaylanQuestHeader.tsx
//
// The top of the Quests page when the map is home (new nav): Baylan the Loreteller, who gives
// out the Main Quests in Inkwell Town, says what's waiting today. Same parchment as the quest
// cards below it (docs/STYLE_GUIDE.md).
import { questTextShadowStyle, questTextStyle, questButtonFontFamily, questButtonLetterSpacing } from '@/components/GameButton';
import { TOWN_NPCS, BAYLAN_ID } from '@/lib/townNpcs';

const baylan = TOWN_NPCS.town?.find(n => n.id === BAYLAN_ID);
const SCALE = 0.62;

export default function BaylanQuestHeader({ hasQuestToday, questDone }: { hasQuestToday: boolean; questDone: boolean }) {
  const line = !hasQuestToday
    ? 'No new quest today. The guild masters in town have side quests for you!'
    : questDone
      ? 'Great job today! The guild masters in town have side quests for you.'
      : 'Your quest for today is ready! Tap it below to start.';
  return (
    <div data-testid="baylan-header" className="max-w-5xl mx-auto mt-3 flex items-center gap-3 rounded-2xl border-2 border-[#8b5e2a] bg-[#f0ddb8] px-3 py-2 shadow-[0_3px_0_#8b5e2a]">
      {baylan && (
        <div className="shrink-0 rounded-xl border-2 border-[#c9a87a] bg-[#e8d0a0] overflow-hidden flex items-end justify-center" style={{ width: 62, height: 76 }}>
          <div
            aria-hidden
            style={{
              width: baylan.frameW * SCALE,
              height: baylan.frameH * SCALE,
              backgroundImage: `url(${baylan.sheet})`,
              // The idle pose comes right after the walk frames.
              backgroundPosition: `${-(baylan.walkFrames ?? 25) * baylan.frameW * SCALE}px 0`,
              backgroundSize: 'auto 100%',
              backgroundRepeat: 'no-repeat',
            }}
          />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[17px]" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>Baylan&apos;s Quests</span>
            <span style={{ ...questTextStyle, color: '#f5c542' }}>Baylan&apos;s Quests</span>
          </span>
        </div>
        <p className="text-[14px] font-bold text-[#3a2610] leading-snug">{line}</p>
      </div>
    </div>
  );
}
