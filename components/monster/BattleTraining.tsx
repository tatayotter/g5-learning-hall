'use client';
// components/monster/BattleTraining.tsx
// Battle training: the first time a player with a Curio opens the Curio Arena,
// Tatay sends a battle invite. Accepting plays the Lorekeeper's voiced intro
// (Tatay is the creator of Learning Hall), then a coached live-battle against
// Tatay that he can't lose (by design, the kid's first loss), a short element
// lesson, and a coached Training Dummy fight that ends in a win. Finishing
// pays a one-time bonus (complete_battle_training, server-enforced).
//
// Both fights run on the real player-vs-player screen (LiveBattleScreen in
// bot mode), since this is what battles against other Keepers look like.
// Script + tuning: lib/intro/battleTraining.ts. Declining the invite just
// closes it; MonsterGuild offers it again on the next Arena visit.
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { StoryPlayer } from '@/components/intro/OriginStory';
import VoiceCaptions from '@/components/intro/VoiceCaptions';
import GlowCta, { GLOW_CSS } from '@/components/intro/GlowCta';
import GameButton from '@/components/GameButton';
import LiveBattleInviteToast from '@/components/LiveBattleInviteToast';
import LiveBattleScreen, { type BattleCoachMoment } from '@/components/LiveBattleScreen';
import type { ActiveBattleMonster } from '@/components/battle/shared';
import {
  ALL_MONSTERS, ELEMENT_ICON_SRC, MONSTERS, NPC_TRAINERS, getCounterElements, getScaledStats,
  type Element, type NpcTrainer,
} from '@/lib/monsterConfig';
import {
  DUMMY_ACCURACY, DUMMY_AVATAR, DUMMY_REMATCH_ACCURACY, DUMMY_RETRY_LINE, DUMMY_TIPS, ELEMENT_ORDER,
  INVITE_BEATS, TATAY_AVATAR, TATAY_TIPS, defeatBeats, loadResumeAtDummy, saveResumeAtDummy,
  tatayAccuracy, victoryBeats, type CoachTip,
} from '@/lib/intro/battleTraining';
import { voiceUrl, type Beat } from '@/lib/intro/originStory';
import { playCue, startIntroMusic, stopIntroMusic } from '@/lib/intro/introCues';
import { createVoiceAudio, isVoiceEnabled, playPageFlip } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import type { InventoryMap } from '@/lib/inventory';

type Stage = 'loading' | 'invite' | 'story_invite' | 'tatay' | 'story_defeat' | 'dummy' | 'story_victory';

const STORY_EVENTS = { beat: 'battle_training_beat_viewed', skip: 'battle_training_story_skipped' };
const STORY_MUSIC = { start: startIntroMusic, stop: stopIntroMusic };

const ELEMENT_LABEL = (el: Element) => el.charAt(0).toUpperCase() + el.slice(1);

// Whether this player has already finished battle training (RLS: own row only).
export async function hasCompletedBattleTraining(userId: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('battle_training_completions')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return !!data;
}

// Same shape as buildBotTeam (lib/botProfiles.ts) for a fixed NPC roster.
function npcTeam(ownerId: string, trainer: NpcTrainer): ActiveBattleMonster[] {
  return trainer.monsters.map((m, i) => {
    const def = ALL_MONSTERS[m.monsterId];
    const { hp } = getScaledStats(def, m.level, 'normal');
    return {
      def, level: m.level, currentHp: hp, maxHp: hp, status: null, statusTurns: 0, restUsed: 0, modifiers: [],
      userMonster: {
        id: `${ownerId}_m${i}`, user_id: ownerId, monster_id: m.monsterId, nickname: null,
        monster_exp: (m.level - 1) * 100, monster_level: m.level, slot: i + 1, rest_used: 0,
        equipped_skills: [null, null, null], graduation_tier: 0, quality: 'normal',
      },
    };
  });
}

const TATAY_TRAINER = NPC_TRAINERS.find(t => t.id === 'tatay')!;

interface BattleTrainingProps {
  userId: string;
  // Started from the Trainers list rather than the first-visit invite.
  replay: boolean;
  buildPlayerTeam: () => ActiveBattleMonster[];
  buildTrainingDummy: () => NpcTrainer;
  questions: ComponentProps<typeof LiveBattleScreen>['questions'];
  inventory: InventoryMap;
  onUseItem: (key: string) => Promise<boolean>;
  gold: number;
  onSpendGold: (amount: number) => Promise<boolean>;
  // Battle bookkeeping (battle log, player log, counters) lives in MonsterGuild.
  onTatayResult: (won: boolean) => void;
  onDummyResult: (won: boolean, expEarned: number) => Promise<void>;
  // complete_battle_training's {level, xp, gold} when the bonus was paid.
  onBonusPaid: (stats: { gold: number; xp: number; level: number }) => void;
  // True while the story or a fight covers the screen.
  onImmersiveChange: (immersive: boolean) => void;
  onClose: () => void;
  // Dev previews only: see BattleQuestionModal's gradeOverride.
  gradeOverride?: ComponentProps<typeof LiveBattleScreen>['gradeOverride'];
}

export default function BattleTraining({
  userId, replay, buildPlayerTeam, buildTrainingDummy, questions, inventory, onUseItem, gold, onSpendGold,
  onTatayResult, onDummyResult, onBonusPaid, onImmersiveChange, onClose, gradeOverride,
}: BattleTrainingProps) {
  const [stage, setStage] = useState<Stage>(replay ? 'story_invite' : 'loading');
  const [firstTime, setFirstTime] = useState(!replay);
  // Resumed after a reload past Tatay's fight: skip straight to the Dummy part.
  const [resumeAtDummy, setResumeAtDummy] = useState(false);
  // Tips queue up: a round's "resolved" tip and the next round's "select"
  // tip arrive a moment apart, and both should play.
  const [tips, setTips] = useState<CoachTip[]>([]);
  const tip = tips[0] ?? null;
  const [dummyAttempt, setDummyAttempt] = useState(0);
  const [retryTip, setRetryTip] = useState(false);
  const [claiming, setClaiming] = useState(false);
  // The element the kid tapped in the element lesson. Leaf beats two
  // elements, so the Dummy's lead curio is built from the one they chose,
  // keeping "the Training Dummy uses that element" true.
  const [pickedElement, setPickedElement] = useState<Element | null>(null);

  // Teams are snapshotted per fight so a re-render never rebuilds them mid-battle.
  const [battle, setBattle] = useState<{ id: string; mine: ActiveBattleMonster[]; opp: ActiveBattleMonster[]; dummyTrainer?: NpcTrainer } | null>(null);
  const leadElement: Element = (battle?.mine[0] ?? buildPlayerTeam()[0])?.def.element ?? 'fire';

  useEffect(() => {
    if (replay) {
      trackEvent('battle_training_started', { replay: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const done = await hasCompletedBattleTraining(userId);
      if (cancelled) return;
      if (done !== false) { onClose(); return; } // done already, or unknown (don't nag on an error)
      setFirstTime(true);
      setResumeAtDummy(loadResumeAtDummy(userId));
      // A beat after the Arena appears, so the invite reads as arriving.
      setTimeout(() => { if (!cancelled) setStage('invite'); }, 1200);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onImmersiveChange(stage !== 'loading' && stage !== 'invite');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const startTatay = () => {
    setBattle({ id: `bt_tatay_${Date.now()}`, mine: buildPlayerTeam(), opp: npcTeam('tatay', TATAY_TRAINER) });
    setStage('tatay');
  };

  const startDummy = () => {
    const built = buildTrainingDummy();
    const picked = pickedElement && Object.values(MONSTERS).find(m => m.element === pickedElement);
    const dummyTrainer = picked && built.monsters.length > 0
      ? { ...built, monsters: [{ ...built.monsters[0], monsterId: picked.id }, ...built.monsters.slice(1)] }
      : built;
    setBattle({ id: `bt_dummy_${Date.now()}`, mine: buildPlayerTeam(), opp: npcTeam('training_tester', dummyTrainer), dummyTrainer });
    setStage('dummy');
  };

  const handleCoachMoment = (tips: Record<string, CoachTip>) => (moment: BattleCoachMoment) => {
    if (moment.kind === 'ended') return;
    // The element-bonus tip only makes sense if the hit actually landed.
    if (moment.kind === 'resolved' && tips === DUMMY_TIPS && moment.myDamageDealt <= 0) return;
    const next = tips[`${moment.kind}:${moment.round}`];
    if (next) setTips(q => (q.some(t => t.key === next.key) ? q : [...q, next]));
  };

  const finish = async () => {
    if (claiming) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc('complete_battle_training');
    if (!error && data?.awarded) onBonusPaid({ gold: data.gold, xp: data.xp, level: data.level });
    trackEvent('battle_training_completed', { replay, bonus_paid: !error && !!data?.awarded });
    saveResumeAtDummy(userId, false);
    onClose();
  };

  if (stage === 'loading') return null;

  if (stage === 'invite') {
    return (
      <LiveBattleInviteToast
        fromName={resumeAtDummy ? 'The Training Dummy' : 'Tatay'}
        headline={resumeAtDummy ? 'Finish your battle training!' : undefined}
        noExpiry
        onAccept={() => {
          trackEvent('battle_training_started', { replay: false, resumed: resumeAtDummy });
          setStage(resumeAtDummy ? 'story_defeat' : 'story_invite');
        }}
        onDecline={() => { trackEvent('battle_training_declined', { resumed: resumeAtDummy }); onClose(); }}
      />
    );
  }

  if (stage === 'story_invite') {
    return (
      <StoryPlayer
        beats={INVITE_BEATS}
        events={STORY_EVENTS}
        music={STORY_MUSIC}
        skipLabel="Skip to the battle"
        renderOverlay={beat => <BeatSprite beat={beat} />}
        onFinish={startTatay}
        onSkip={startTatay}
      />
    );
  }

  if (stage === 'story_defeat') {
    const beats = defeatBeats(leadElement);
    return (
      <StoryPlayer
        // Resuming after a reload: the consolation already played, go to the element lesson.
        beats={resumeAtDummy ? beats.slice(1) : beats}
        events={STORY_EVENTS}
        music={STORY_MUSIC}
        skipLabel="Skip to the Training Dummy"
        renderOverlay={beat => <BeatSprite beat={beat} />}
        renderInteraction={(beat, onComplete) =>
          beat.interaction.kind === 'elements'
            ? <ElementQuiz element={leadElement} retry={beat.interaction.retry} onCorrect={setPickedElement} onComplete={onComplete} />
            : null}
        onFinish={startDummy}
        onSkip={startDummy}
      />
    );
  }

  if (stage === 'story_victory') {
    return (
      <StoryPlayer
        beats={victoryBeats(firstTime)}
        events={STORY_EVENTS}
        music={STORY_MUSIC}
        skipLabel={firstTime ? 'Skip and claim' : 'Skip'}
        renderOverlay={beat => <BeatSprite beat={beat} />}
        onFinish={finish}
        onSkip={finish}
      />
    );
  }

  if (!battle) return null;
  const isTatay = stage === 'tatay';

  return (
    <>
      <LiveBattleScreen
        key={battle.id}
        battleId={battle.id}
        myUserId={userId}
        opponentId={isTatay ? 'tatay' : 'training_tester'}
        opponentName={isTatay ? 'Tatay' : 'Training Dummy'}
        opponentAvatarSrc={isTatay ? TATAY_AVATAR : DUMMY_AVATAR}
        side="challenger"
        myTeam={battle.mine}
        opponentTeam={battle.opp}
        botAccuracy={isTatay ? tatayAccuracy : dummyAttempt > 0 ? DUMMY_REMATCH_ACCURACY : DUMMY_ACCURACY}
        untimed
        gradeOverride={gradeOverride}
        questions={questions}
        gradingUserId={userId}
        inventory={inventory}
        onUseItem={onUseItem}
        gold={gold}
        onSpendGold={onSpendGold}
        onCoachMoment={handleCoachMoment(isTatay ? TATAY_TIPS : dummyAttempt === 0 ? DUMMY_TIPS : {})}
        onBattleEnd={async (won) => {
          setTips([]);
          if (isTatay) {
            onTatayResult(won);
            trackEvent('battle_training_tatay_done', { won });
            saveResumeAtDummy(userId, true);
            setResumeAtDummy(false);
            setStage('story_defeat');
            return;
          }
          await onDummyResult(won, won ? battle.dummyTrainer?.reward.exp ?? 0 : 0);
          trackEvent('battle_training_dummy_done', { won, attempt: dummyAttempt + 1 });
          if (won) {
            setStage('story_victory');
          } else {
            setDummyAttempt(a => a + 1);
            setRetryTip(true);
          }
        }}
      />

      {tip && <CoachTipOverlay key={tip.key} tip={tip} onDone={() => setTips(q => q.slice(1))} />}

      {retryTip && (
        <CoachTipOverlay
          tip={{ key: 'retry', target: null, lines: [DUMMY_RETRY_LINE] }}
          doneLabel="Rematch"
          secondary={{ label: 'Finish later', onClick: onClose }}
          onDone={() => { setRetryTip(false); startDummy(); }}
        />
      )}
    </>
  );
}

// Tatay or the Training Dummy over the story art, where Solarch stands in the intro.
// `stand` is where the character's feet go, as a share of the screen height
// measured from the bottom: the top of the center platform in bt_tatay.webp
// sits ~64% down; in bt_elements.webp he stands on the bare dirt patch (~70%
// down). The element-quiz panel covers his legs once it opens, which is fine.
function BeatSprite({ beat }: { beat: Beat }) {
  if (beat.id === 'bt_victory') return <VictoryCheerers />;
  const sprite = beat.id === 'bt_elements' ? { src: DUMMY_AVATAR, stand: '30%' } : { src: TATAY_AVATAR, stand: '36%' };
  return (
    <div className="absolute inset-x-0 top-12 flex items-end justify-center pointer-events-none" style={{ bottom: sprite.stand }}>
      <style>{SPRITE_BREATHE_CSS}</style>
      <img src={sprite.src} alt="" className="bt-breathe h-full max-h-72 w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)]" />
    </div>
  );
}

// bt_victory.webp already shows Tatay and the Dummy cheering near its left and
// right edges, but narrow screens crop them off (a portrait phone only sees
// the middle slice). There, draw them flanking the glowing platform instead;
// wide screens keep the art as-is so nobody appears twice.
function VictoryCheerers() {
  return (
    <div className="bt-cheerers absolute inset-x-0 top-12 pointer-events-none" style={{ bottom: '36%' }}>
      <style>{SPRITE_BREATHE_CSS + VICTORY_CHEERERS_CSS}</style>
      <div className="absolute bottom-0 left-[6%] h-[45%] max-h-48 flex items-end">
        <img src={TATAY_AVATAR} alt="" className="bt-breathe h-full w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)]" />
      </div>
      {/* Mirrored so he faces the platform (character art faces right). */}
      <div className="absolute bottom-0 right-[6%] h-[45%] max-h-48 flex items-end" style={{ transform: 'scaleX(-1)' }}>
        <img src={DUMMY_AVATAR} alt="" className="bt-breathe h-full w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)]" />
      </div>
    </div>
  );
}

// The art's cheerers fall outside the crop below about a 3:2 screen (cover
// fit plus the story player's 1.12x slow zoom).
const VICTORY_CHEERERS_CSS = `
.bt-cheerers { display: none; }
@media (max-aspect-ratio: 3/2) { .bt-cheerers { display: block; } }
`;

// Same idle "breathing" as grounded curios on the battle stage
// (BattleStageScene.startIdle): stretch up 3%, narrow 1.2%, anchored at the feet.
const SPRITE_BREATHE_CSS = `
@keyframes bt-breathe { from { transform: scale(1, 1); } to { transform: scale(0.988, 1.03); } }
.bt-breathe { transform-origin: 50% 100%; animation: bt-breathe 1.1s ease-in-out infinite alternate; }
@media (prefers-reduced-motion: reduce) { .bt-breathe { animation: none; } }
`;

// The element lesson: read the chart, tap the element your Curio beats.
function ElementQuiz({ element, retry, onCorrect, onComplete }: {
  element: Element;
  retry: Beat['lines'][number];
  onCorrect: (picked: Element) => void;
  onComplete: () => void;
}) {
  const [missed, setMissed] = useState<Element | null>(null);
  const answers = getCounterElements(element);

  const pick = (el: Element) => {
    if (answers.includes(el)) {
      onCorrect(el);
      playCue('reink');
      onComplete();
      return;
    }
    playCue('stairsWrong');
    setMissed(el);
    if (isVoiceEnabled()) {
      const a = createVoiceAudio(voiceUrl(retry.id));
      a.play().catch(() => {});
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 rounded-2xl bg-black/45 border border-white/15 p-2.5">
        {ELEMENT_ORDER.map(el => (
          <div
            key={el}
            className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-lg px-1 py-1 text-xs sm:text-sm font-bold"
            style={el === element ? { background: 'rgba(245,197,66,0.22)', outline: '1px solid #f5c542' } : undefined}
          >
            <img src={ELEMENT_ICON_SRC[el]} alt="" className="w-5 h-5 object-contain" />
            <span>{ELEMENT_LABEL(el)}</span>
            <span className="text-[#f5c542]" aria-label="beats">&rarr;</span>
            {getCounterElements(el).map(t => (
              <span key={t} className="flex items-center gap-1">
                <img src={ELEMENT_ICON_SRC[t]} alt="" className="w-5 h-5 object-contain" />
                <span>{ELEMENT_LABEL(t)}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-bold text-[#e8d0a0]">
        Which element does {ELEMENT_LABEL(element)} beat?
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ELEMENT_ORDER.map(el => (
          <button
            key={el}
            onClick={() => pick(el)}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 bg-[#f0ddb8] text-[#2a1505] border-2 border-[#8b5e2a] shadow-[0_4px_0_#8b5e2a] font-extrabold text-sm ${missed === el ? 'intro-shake opacity-50' : 'intro-choice-glow'}`}
          >
            <img src={ELEMENT_ICON_SRC[el]} alt="" className="w-8 h-8 object-contain" />
            {ELEMENT_LABEL(el)}
          </button>
        ))}
      </div>
      {missed !== null && (
        <p className="intro-rise text-center text-sm text-[#f5c542]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}>
          <span className="font-extrabold">The Lorekeeper:</span> {retry.text}
        </p>
      )}
    </div>
  );
}

const COACH_CSS = `
@keyframes coach-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.intro-rise { animation: coach-rise .45s ease-out both; }
@keyframes coach-ring { 0%,100% { box-shadow: 0 0 0 3px #f5c542, 0 0 18px 4px rgba(245,197,66,0.55); } 50% { box-shadow: 0 0 0 3px #f5c542, 0 0 30px 10px rgba(245,197,66,0.8); } }
.coach-ring { animation: coach-ring 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .intro-rise, .coach-ring { animation: none; } }
`;

// A voiced Lorekeeper/Tatay tip over the battle: dims the screen except the
// spotlighted control, plays the lines, then waits for "Got it".
function CoachTipOverlay({ tip, onDone, doneLabel = 'Got it', secondary }: {
  tip: CoachTip;
  onDone: () => void;
  doneLabel?: string;
  secondary?: { label: string; onClick: () => void };
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [linesDone, setLinesDone] = useState(false);
  const shownAt = useRef(0);

  // Panels animate in, so keep re-measuring the target while the tip is up.
  useEffect(() => {
    if (!tip.target) return;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${tip.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const t = setInterval(measure, 250);
    return () => clearInterval(t);
  }, [tip.target]);

  useEffect(() => {
    shownAt.current = Date.now();
    trackEvent('battle_training_tip_viewed', { tip: tip.key });
  }, [tip.key]);

  const pad = 8;
  // Captions go wherever the spotlight isn't.
  const captionsOnTop = rect ? rect.top + rect.height / 2 > window.innerHeight / 2 : false;
  const ringStyle: CSSProperties | undefined = rect ? {
    position: 'fixed', left: rect.left - pad, top: rect.top - pad,
    width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: 16,
  } : undefined;

  return createPortal(
    <div className="fixed inset-0 text-white select-none" style={{ zIndex: 110 }}>
      <style>{COACH_CSS + GLOW_CSS}</style>
      {rect && ringStyle ? (
        <>
          {/* Four dim panels around the spotlight (a giant box-shadow doesn't
              reliably paint over the battle's WebGL canvas). */}
          {[
            { left: 0, top: 0, right: 0, height: Math.max(0, rect.top - pad) },
            { left: 0, top: rect.bottom + pad, right: 0, bottom: 0 },
            { left: 0, top: rect.top - pad, width: Math.max(0, rect.left - pad), height: rect.height + pad * 2 },
            { left: rect.right + pad, top: rect.top - pad, right: 0, height: rect.height + pad * 2 },
          ].map((pos, i) => <div key={i} className="fixed bg-black/65" style={pos} />)}
          <div className="coach-ring pointer-events-none" style={ringStyle} />
        </>
      ) : <div className="absolute inset-0 bg-black/65" />}
      <div className={`absolute inset-x-0 ${captionsOnTop ? 'top-0 pt-16' : 'bottom-0 pb-8'} px-4`}>
        <div className="max-w-2xl mx-auto space-y-3">
          <VoiceCaptions lines={tip.lines} startDelayMs={250} onDone={() => setLinesDone(true)} />
          {linesDone && (
            <div className="intro-rise flex justify-center gap-3">
              {secondary && (
                <GameButton variant="quest" color="#57534e" onClick={() => { playPageFlip(); secondary.onClick(); }} style={{ fontSize: 15 }}>
                  {secondary.label}
                </GameButton>
              )}
              <GlowCta>
                <GameButton
                  variant="quest"
                  onClick={() => {
                    playPageFlip();
                    trackEvent('battle_training_tip_done', { tip: tip.key, ms: Date.now() - shownAt.current });
                    onDone();
                  }}
                  style={{ fontSize: 16 }}
                >
                  {doneLabel}
                </GameButton>
              </GlowCta>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
