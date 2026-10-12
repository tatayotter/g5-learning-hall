'use client';
// components/monster/boss/BossArena.tsx
// The Term Boss fight as a full-screen arena scene (redesign of the card in
// components/monster/BossFightScreen.tsx). Same rules — the flat question queue
// from lib/bossFightEngine.ts (useBossFightQueue): a wrong answer costs a heart
// and requeues the question, clearing the queue wins, running out of hearts loses.
//
// What's new is how it looks and feels, built from the Curio battle's own parts:
// - the Phaser stage (components/battle/BattleCanvas.tsx): the kid's active Curio
//   on the left platform, the persona towering on the right;
// - answers are attacks: a correct answer fires the Curio's real moves, climbing
//   its tier 1 -> 2 -> 3 moves as the correct-answer combo grows; a wrong answer
//   is the persona's shadow beam, a shattered heart and the red damage vignette;
// - the "VS" battle intro (components/battle/BattleIntro.tsx);
// - a segmented boss health bar (one segment per question), hearts in the
//   Curio's wood panel, a parchment question card with gold answer buttons, and
//   the persona's taunts in the intro's dialogue-box style (lib/bossTaunts.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import BattleCanvas, { curioSpriteUrl } from '@/components/battle/BattleCanvas';
import BattleIntro from '@/components/battle/BattleIntro';
import { makeStageAction, type BattleStageMonster } from '@/components/battle/BattleStage';
import { questButtonBoxShadow, questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { AttackBanner, runBattleBeats, type BattleBeat } from '@/components/battle/shared';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';
import { BackgroundPersonas } from '@/components/monster/BossFightScreen';
import { SKILLS, getSkillIconSrc, type MonsterDef } from '@/lib/monsterConfig';
import { attackClassHits } from '@/lib/attackClasses';
import type { QualityTier } from '@/lib/curioQuality';
import type { BossPersona } from '@/lib/bossPersonas';
import { TAUNT_SPEAKER, getTaunt, type TauntMoment } from '@/lib/bossTaunts';
import { BossQuestion, gradeBossQuestion, shuffle, useBossFightQueue } from '@/lib/bossFightEngine';
import { playBattleSfx, playPageFlip, preloadBattleSfx, startBossFightTheme, stopBossFightTheme } from '@/lib/sounds';

export interface ArenaCurio {
  def: MonsterDef;
  level: number;
  name: string;
  quality?: QualityTier;
}

interface BossArenaProps {
  pool: BossQuestion[];
  persona: BossPersona;
  // This grade's other undefeated personas, lurking in the background.
  otherPersonas: BossPersona[];
  curio: ArenaCurio;
  playerName: string;
  // Full-bleed arena backdrop.
  arenaArt?: string;
  // Defaults to the server check (grade_boss_question). The /dev/ui-gallery
  // mockup passes a local grader.
  gradeAnswer?: (questionId: string, selected: string) => Promise<boolean | null>;
  onWon: (correctCount: number) => void;
  onLost: () => void;
  onRetreat: () => void;
}

const DEFAULT_ARENA_ART = '/intro/forgetting_void.webp';
// The Phaser stage's native size per layout (BattleStage's canvas minus its
// move panel), and the VS intro's full canvas size.
const STAGE_SIZE = { landscape: { w: 896, h: 332 }, portrait: { w: 480, h: 530 } } as const;
const INTRO_SIZE = { landscape: { w: 896, h: 504 }, portrait: { w: 480, h: 860 } } as const;
const INTRO_MIN_MS = 1400;
// The boss towers over any curio (the biggest curio size class is 200px).
const BOSS_HEIGHT_PX = 270;

const ARENA_CSS = `
@keyframes arena-heart-break { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(1.5) rotate(-12deg); opacity: 1; } 100% { transform: scale(0.6) rotate(20deg); opacity: 0.25; } }
.arena-heart-break { animation: arena-heart-break 0.6s ease-out forwards; }
@keyframes arena-heart-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }
.arena-heart-pulse { animation: arena-heart-pulse 0.9s ease-in-out infinite; }
@keyframes arena-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.arena-rise { animation: arena-rise 0.4s ease-out both; }
@keyframes arena-seg-drain { from { filter: brightness(2.2); } to { filter: brightness(1); } }

/* The question card: the main quest's card and answer buttons (QuestModule's
   .qcard + GameButton's QUIZ_OPTION_STYLES), recolored for The Forgetting:
   faded violet paper with rubbed-out white patches, a slow mist drifting
   across the bottom, and the persona's glow (--glow) around the edge. */
.fcard { position:relative; overflow:hidden; border:2px solid #3b2a5c; border-radius:18px; padding:14px 14px 16px;
  background:
    radial-gradient(ellipse 28% 38% at 5% 10%, rgba(255,255,255,.8), transparent 70%),
    radial-gradient(ellipse 24% 44% at 97% 92%, rgba(255,255,255,.7), transparent 70%),
    radial-gradient(ellipse 12% 20% at 62% 4%, rgba(255,255,255,.55), transparent 70%),
    linear-gradient(180deg,#f6f2fc 0%,#e4dcf2 100%);
  box-shadow:0 5px 0 #3b2a5c, 0 0 22px var(--glow), 0 12px 24px rgba(10,6,18,.5); transition:border-color .2s, box-shadow .2s; }
.fcard::before { content:''; position:absolute; inset:5px; border:1px dashed #b3a3d6; border-radius:13px; pointer-events:none; }
.fcard > :not(.fcard-mist) { position:relative; }
.fcard-mist { position:absolute; left:-20%; right:-20%; bottom:-30%; height:70%; pointer-events:none; filter:blur(8px);
  background:
    radial-gradient(ellipse 30% 50% at 25% 60%, rgba(167,139,250,.28), transparent 70%),
    radial-gradient(ellipse 28% 45% at 72% 55%, rgba(233,213,255,.55), transparent 70%);
  animation:fcard-drift 14s ease-in-out infinite alternate; }
@keyframes fcard-drift { from { transform:translateX(-7%); } to { transform:translateX(7%); } }
.fcard-right { border-color:#15803d; box-shadow:0 5px 0 #15803d, 0 0 18px rgba(34,197,94,.55), 0 12px 24px rgba(10,6,18,.5); }
.fcard-miss { border-color:#b91c1c; box-shadow:0 5px 0 #b91c1c, 0 0 18px rgba(239,68,68,.55), 0 12px 24px rgba(10,6,18,.5); }
.fcard-head { display:flex; align-items:flex-start; gap:12px; margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid #d4c8ea; }
.fcard-num { flex:none; position:relative; overflow:hidden; min-width:2em; height:2em; padding:0 .4em; display:flex; align-items:center; justify-content:center; border:0.0476em solid #000; border-radius:0.508em; }
.fcard-meta { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:#6d5a99; }
.fcard-q { font-weight:800; font-size:17px; line-height:1.35; color:#1e1030; }
.fopt { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:10px 14px;
  font-weight:700; font-size:15px; color:#1e1030; border-radius:14px; border:2px solid #4c3a78;
  background:linear-gradient(180deg,#fdfcff 0%,#e8e0f5 100%); box-shadow:0 4px 0 #4c3a78, 0 6px 8px rgba(20,8,40,.3);
  transition:transform .1s, box-shadow .1s, background .15s, opacity .2s; cursor:pointer; position:relative; }
.fopt:not(:disabled):hover { transform:translateY(-2px); background:linear-gradient(180deg,#ffffff 0%,#efe8fa 100%);
  box-shadow:0 6px 0 #4c3a78, 0 0 12px var(--glow), 0 9px 12px rgba(20,8,40,.3); }
.fopt:not(:disabled):active { transform:translateY(3px); box-shadow:0 1px 0 #4c3a78; }
.fopt:disabled { cursor:default; }
.fopt-badge { flex:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  font-weight:900; font-size:14px; color:#fff; background:radial-gradient(circle at 30% 25%,#a78bfa,#5b3a9e);
  border:2px solid #2e1b57; box-shadow:inset 0 -2px 0 rgba(0,0,0,.25); text-shadow:0 1px 1px rgba(0,0,0,.4); }
.fopt-text { flex:1; min-width:0; }
.fopt-mark { flex:none; width:22px; height:22px; }
.fopt-picked { border-color:#6d28d9; background:linear-gradient(180deg,#f3e8ff 0%,#d8b4fe 100%);
  box-shadow:0 4px 0 #6d28d9, 0 0 0 3px rgba(196,181,253,.6), 0 6px 12px rgba(109,40,217,.35); transform:translateY(-1px); }
.fopt-correct { border-color:#15803d; background:linear-gradient(180deg,#dcfce7 0%,#86efac 100%);
  box-shadow:0 4px 0 #15803d, 0 0 14px rgba(34,197,94,.6); animation:fopt-pop .35s ease-out; }
.fopt-correct .fopt-badge { background:radial-gradient(circle at 30% 25%,#4ade80,#15803d); border-color:#14532d; }
.fopt-wrong { border-color:#b91c1c; background:linear-gradient(180deg,#fee2e2 0%,#fca5a5 100%);
  box-shadow:0 4px 0 #b91c1c; animation:fopt-shake .35s ease-in-out; }
.fopt-wrong .fopt-badge { background:radial-gradient(circle at 30% 25%,#f87171,#b91c1c); border-color:#7f1d1d; }
.fopt-dim { opacity:.5; box-shadow:0 2px 0 #4c3a78; }
@keyframes fopt-pop { 0%{transform:scale(1)} 50%{transform:scale(1.04)} 100%{transform:scale(1)} }
@keyframes fopt-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
@media (prefers-reduced-motion: reduce) { .arena-heart-pulse, .arena-rise, .fcard-mist, .fopt-correct, .fopt-wrong { animation: none; } }
`;

// A stand-in MonsterDef so a persona can stand on the Phaser stage and appear
// in the VS intro. Only the fields those two read are real.
function personaDef(p: BossPersona): MonsterDef {
  return { id: `boss_${p.id}`, name: p.name, element: 'shadow', emoji: '', size: 'huge', floats: p.floats } as unknown as MonsterDef;
}

function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px) and (orientation: portrait)');
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return portrait;
}

// Scales a fixed-size child to fit (contain) its container, centered.
function FitBox({ w, h, className = '', children }: { w: number; h: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / w, el.clientHeight / h)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);
  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className={`relative flex-none ${className}`} style={{ width: w, height: h, transform: `scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Heart({ state }: { state: 'full' | 'empty' | 'breaking' | 'last' }) {
  const full = state === 'full' || state === 'last' || state === 'breaking';
  return (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] ${state === 'breaking' ? 'arena-heart-break' : state === 'last' ? 'arena-heart-pulse' : ''}`} aria-hidden>
      <path
        d="M12 21.2s-7.6-4.7-10-9.3C.3 8.4 2.2 4.2 6.2 3.9c2.3-.2 3.8 1.1 4.6 2.4.4.6 1 .6 1.4 0 .8-1.3 2.3-2.6 4.6-2.4 4 .3 5.9 4.5 4.2 8C19.6 16.5 12 21.2 12 21.2z"
        fill={full ? '#ef4444' : '#3a2f2f'} stroke="#2a0a0a" strokeWidth="1.6"
      />
      {full && <path d="M7 7.2c-1.4.3-2.2 1.5-2.1 2.8" stroke="#fecaca" strokeWidth="1.6" strokeLinecap="round" fill="none" />}
    </svg>
  );
}

// The Forgetting's mark (a cracked seal with a closed eye) — every persona
// carries it in its art. Stands in as the speaker's portrait for the taunts,
// since The Forgetting itself is never seen.
function ForgettingMark({ glow, className = '' }: { glow: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={{ filter: `drop-shadow(0 0 6px ${glow})` }} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="#1a0f2a" stroke="#6b5a8e" strokeWidth="2" />
      <circle cx="24" cy="24" r="15.5" fill="none" stroke="#3b2a5c" strokeWidth="1.5" />
      <path d="M12 24 Q24 32 36 24" fill="none" stroke="#ede4ff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M18 27 L17 30.5 M24 28 L24 31.8 M30 27 L31 30.5" stroke="#ede4ff" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 4 L24 12 L21 18 L25.5 22" fill="none" stroke="#8b7bb0" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function AnswerMark({ correct }: { correct: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="fopt-mark" aria-hidden>
      {correct
        ? <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#15803d" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="#b91c1c" strokeWidth="3.4" strokeLinecap="round" />}
    </svg>
  );
}

function RuleRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-white border border-[#d8cdef] rounded px-2 py-1.5 text-[12px] leading-snug text-[#1e1030]">
      <span className="flex-none w-7 h-7 flex items-center justify-center">{icon}</span>
      <div className="min-w-0 self-center">{children}</div>
    </div>
  );
}

type IntroPhase = 'loading' | 'ready' | 'leaving' | 'done';

export default function BossArena({
  pool, persona, otherPersonas, curio, playerName, arenaArt = DEFAULT_ARENA_ART,
  gradeAnswer = gradeBossQuestion, onWon, onLost, onRetreat,
}: BossArenaProps) {
  const { status, current, hearts, maxHearts, correctCount, originalPoolSize, submitAnswer } = useBossFightQueue(pool);
  const portrait = usePortrait();
  const layout = portrait ? 'portrait' : 'landscape';

  const shuffledOptions = useMemo(() => (current ? shuffle(current.options) : []), [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [grading, setGrading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [combo, setCombo] = useState(0);
  const [banner, setBanner] = useState<{ text: string; iconSrc: string | null } | null>(null);
  const [connectionHiccup, setConnectionHiccup] = useState(false);
  const [taunt, setTaunt] = useState<{ key: number; text: string } | null>(null);
  const [brokenHeart, setBrokenHeart] = useState<{ index: number; key: number } | null>(null);
  const [hurt, setHurt] = useState<{ key: number; fraction: number; knockout: boolean } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  // The answer the kid just tapped, while it's graded and its attack plays.
  const [picked, setPicked] = useState<{ opt: string; result: 'pending' | 'correct' | 'wrong' } | null>(null);

  // Phaser stage signals (same contract as BattleScreen.tsx).
  const [curioAction, setCurioAction] = useState<BattleStageMonster['action']>(null);
  const [bossAction, setBossAction] = useState<BattleStageMonster['action']>(null);
  const [curioAnim, setCurioAnim] = useState('');
  const [bossAnim, setBossAnim] = useState('');
  const [curioDamage, setCurioDamage] = useState<BattleStageMonster['damagePopup']>(null);
  const [bossDamage, setBossDamage] = useState<BattleStageMonster['damagePopup']>(null);

  const triggerAnim = (setter: (v: string) => void, anim: string) => {
    setter('');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setter(anim);
      setTimeout(() => setter(''), 600);
    }));
  };

  // ── Intro ────────────────────────────────────────────────────────────
  const [introPhase, setIntroPhase] = useState<IntroPhase>('loading');
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [introMinDone, setIntroMinDone] = useState(false);
  useEffect(() => {
    preloadBattleSfx();
    startBossFightTheme();
    document.body.classList.add('battle-fullscreen-active');
    const t1 = setTimeout(() => setIntroMinDone(true), INTRO_MIN_MS);
    const t2 = setTimeout(() => playBattleSfx('intro_vs'), 780);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      stopBossFightTheme();
      document.body.classList.remove('battle-fullscreen-active');
    };
  }, []);
  useEffect(() => {
    if (introPhase === 'loading' && sceneLoaded && introMinDone) {
      const t = setTimeout(() => setIntroPhase('ready'), 0);
      return () => clearTimeout(t);
    }
  }, [introPhase, sceneLoaded, introMinDone]);
  const startFight = useCallback(() => setIntroPhase(p => (p === 'ready' ? 'leaving' : p)), []);
  useEffect(() => {
    if (introPhase !== 'leaving') return;
    playBattleSfx('battle_start');
    const t = setTimeout(() => setIntroPhase('done'), 350);
    return () => clearTimeout(t);
  }, [introPhase]);

  // ── Taunts ───────────────────────────────────────────────────────────
  const saidRef = useRef<Set<TauntMoment>>(new Set());
  const sayTaunt = useCallback((moment: TauntMoment) => {
    if (saidRef.current.has(moment)) return;
    saidRef.current.add(moment);
    const key = Date.now();
    setTaunt({ key, text: getTaunt(persona.id, moment) });
    setTimeout(() => setTaunt(t => (t?.key === key ? null : t)), 3600);
  }, [persona.id]);
  useEffect(() => {
    if (introPhase !== 'done') return;
    const t = setTimeout(() => sayTaunt('entry'), 700);
    return () => clearTimeout(t);
  }, [introPhase, sayTaunt]);

  const remaining = originalPoolSize - correctCount;
  useEffect(() => {
    if (status !== 'active') return;
    if (correctCount > 0 && remaining <= originalPoolSize / 2) {
      const t = setTimeout(() => sayTaunt('half'), 0);
      return () => clearTimeout(t);
    }
  }, [correctCount, remaining, originalPoolSize, status, sayTaunt]);
  useEffect(() => {
    if (status === 'active' && hearts === 1 && maxHearts > 1) {
      const t = setTimeout(() => sayTaunt('lastHeart'), 0);
      return () => clearTimeout(t);
    }
  }, [hearts, maxHearts, status, sayTaunt]);

  // ── Endings: let the knockout play, then hand off ────────────────────
  useEffect(() => {
    if (status === 'won') {
      const t1 = setTimeout(() => sayTaunt('bossDefeated'), 300);
      const t2 = setTimeout(() => onWon(correctCount), 3200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (status === 'lost') {
      const t1 = setTimeout(() => sayTaunt('bossWins'), 300);
      const t2 = setTimeout(onLost, 3200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Answering ────────────────────────────────────────────────────────
  const handleAnswer = async (opt: string) => {
    if (grading || locked || !current || status !== 'active' || introPhase !== 'done') return;
    setLocked(true);
    setGrading(true);
    setPicked({ opt, result: 'pending' });
    setConnectionHiccup(false);
    const isCorrect = await gradeAnswer(current.id, opt);
    setGrading(false);
    if (isCorrect === null) {
      // Couldn't reach the server: no heart lost, the question stays up.
      setPicked(null);
      setLocked(false);
      setConnectionHiccup(true);
      return;
    }
    setPicked({ opt, result: isCorrect ? 'correct' : 'wrong' });

    let beat: BattleBeat;
    if (isCorrect) {
      const nextCombo = combo + 1;
      const tier = Math.min(3, nextCombo);
      const skill = SKILLS[curio.def.skills[tier - 1]] ?? SKILLS[curio.def.skills[0]];
      setCombo(nextCombo);
      beat = {
        actor: 'player',
        message: `${nextCombo >= 2 ? `Combo x${nextCombo}! ` : 'Correct! '}${curio.name} used ${skill.name}!`,
        iconSrc: getSkillIconSrc(skill),
        damage: null,
        missed: false,
        apply: () => {
          setCurioAction(makeStageAction(skill));
          if (attackClassHits(skill.animation)) {
            triggerAnim(setBossAnim, 'battle-hit');
            setBossDamage({ key: Date.now(), value: 100 * tier, missed: false });
          }
        },
      };
    } else {
      setCombo(0);
      const lostIndex = hearts - 1;
      beat = {
        actor: 'opponent',
        message: `Not quite! ${persona.name} strikes back!`,
        iconSrc: null,
        damage: null,
        missed: false,
        apply: () => {
          setBossAction(makeStageAction({ animation: 'beam', element: 'shadow' }));
          triggerAnim(setCurioAnim, 'battle-hit');
          setCurioDamage({ key: Date.now(), value: 1, missed: false });
          setBrokenHeart({ index: lostIndex, key: Date.now() });
        },
      };
    }
    runBattleBeats([beat], b => setBanner({ text: b.message, iconSrc: b.iconSrc }), () => {
      setBanner(null);
      setLocked(false);
      setPicked(null);
      submitAnswer(isCorrect);
    });
  };

  const onPlayerHurt = useCallback((fraction: number, knockout: boolean) => {
    setHurt({ key: Date.now(), fraction: Math.max(0, Math.min(1, fraction)), knockout });
  }, []);

  // ── Stage data ───────────────────────────────────────────────────────
  const bossDef = useMemo(() => personaDef(persona), [persona]);
  const leftMon: BattleStageMonster = {
    name: curio.name, level: curio.level, def: curio.def, quality: curio.quality,
    currentHp: hearts, maxHp: maxHearts, status: null,
    animClassName: curioAnim, action: curioAction, damagePopup: curioDamage,
  };
  const rightMon: BattleStageMonster = {
    name: persona.name, level: 0, def: bossDef, spriteUrl: persona.artUrl, heightPx: BOSS_HEIGHT_PX,
    currentHp: remaining * 100, maxHp: originalPoolSize * 100, status: null,
    animClassName: bossAnim, action: bossAction, damagePopup: bossDamage,
  };
  const [preloadUrls] = useState(() => [curioSpriteUrl(curio.def), persona.artUrl]);

  // Mist thins as the boss weakens; gone once it falls.
  const mist = status === 'won' ? 0 : 0.15 + 0.45 * (remaining / Math.max(1, originalPoolSize));
  const stageReady = introPhase === 'leaving' || introPhase === 'done';
  const answering = status === 'active' && introPhase === 'done' && !banner;
  // The Curio's three moves, in combo order (see handleAnswer).
  const comboSkills = curio.def.skills.map(id => SKILLS[id]).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-[#0a0612] text-white select-none">
      <style>{ARENA_CSS}</style>

      {/* ── Arena scene ── */}
      <img src={arenaArt} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(0.55) brightness(0.55)' }} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 70% 45%, ${persona.glowColor}55, transparent 55%), linear-gradient(180deg, rgba(20,8,40,0.55) 0%, rgba(10,6,18,0.15) 40%, rgba(10,6,18,0.85) 100%)` }}
      />
      <div aria-hidden className="absolute inset-x-0 top-[14%] h-28 opacity-80">
        <BackgroundPersonas personas={otherPersonas} />
      </div>
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ transition: 'opacity 1.5s ease-out', opacity: status === 'won' ? 0 : 1 }}>
        <div className="boss-mist-layer boss-mist-layer--a" style={{ '--mist-density': mist } as CSSProperties} />
        <div className="boss-mist-layer boss-mist-layer--b" style={{ '--mist-density': mist } as CSSProperties} />
        <div className="boss-mist-layer boss-mist-layer--c" style={{ '--mist-density': mist * 0.8 } as CSSProperties} />
      </div>

      <div className="relative h-full flex flex-col">
        {/* ── Boss health ── */}
        <div className="relative z-20 shrink-0 px-3 pt-3 sm:pt-4">
          <div className="max-w-2xl mx-auto flex items-start gap-2">
            <button
              onClick={onRetreat}
              className="shrink-0 mt-1 text-[11px] font-bold uppercase tracking-wide text-[#f3dfb4] border-2 border-[#4a2f18] rounded-lg px-2.5 py-1.5"
              style={woodTextureStyle}
            >
              Retreat
            </button>
            <div className="flex-1 min-w-0 rounded-xl border-2 border-[#1a0a2a] px-3 py-2" style={{ background: 'linear-gradient(180deg,#2a1640 0%,#150a24 100%)', boxShadow: `0 0 0 2px #d4a017, 0 0 18px ${persona.glowColor}66` }}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 mb-1.5">
                <p className="font-display font-bold text-base sm:text-lg leading-tight" style={{ color: '#f3e8ff', textShadow: `0 0 10px ${persona.glowColor}` }}>{persona.name}</p>
                <p className="shrink-0 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#c4b5fd]">{persona.subject} · Exam Review</p>
              </div>
              <div className="flex gap-[3px] h-3 sm:h-3.5" aria-label={`${remaining} of ${originalPoolSize} left`}>
                {Array.from({ length: originalPoolSize }, (_, i) => {
                  const alive = i < remaining;
                  return (
                    <span
                      key={i}
                      className="flex-1 rounded-[3px] transition-all duration-500"
                      style={{
                        background: alive ? `linear-gradient(180deg, #f5d0fe 0%, ${persona.glowColor} 45%, #6b21a8 100%)` : 'rgba(255,255,255,0.08)',
                        boxShadow: alive ? `0 0 6px ${persona.glowColor}` : 'inset 0 1px 2px rgba(0,0,0,0.6)',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stage ── */}
        <div className="relative flex-1 min-h-0">
          <FitBox w={STAGE_SIZE[layout].w} h={STAGE_SIZE[layout].h} className={portrait ? 'bstage-portrait' : ''}>
            <BattleCanvas
              key={layout}
              leftMon={leftMon}
              rightMon={rightMon}
              layout={layout}
              ready={stageReady}
              preloadUrls={preloadUrls}
              onAssetsReady={() => setSceneLoaded(true)}
              onPlayerHurt={onPlayerHurt}
            />
          </FitBox>

          {taunt && (
            <div key={taunt.key} className="arena-rise absolute left-1/2 -translate-x-1/2 top-2 z-20 w-[min(92%,34rem)]">
              <div className="flex items-end gap-3 rounded-2xl border-2 px-3 pt-2 pb-3" style={{ background: 'rgba(18,8,30,0.9)', borderColor: `${persona.glowColor}99`, boxShadow: '0 10px 28px rgba(0,0,0,0.55)' }}>
                <ForgettingMark glow={persona.glowColor} className="w-14 h-14 -mt-6 flex-none" />
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider mb-0.5 text-[#e9dcff]" style={{ textShadow: `0 0 8px ${persona.glowColor}` }}>{TAUNT_SPEAKER}</p>
                  <p className="text-sm sm:text-base leading-snug text-[#f3e8ff] italic">{taunt.text}</p>
                </div>
              </div>
            </div>
          )}

          {banner && (
            <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
              <AttackBanner text={banner.text} iconSrc={banner.iconSrc} />
            </div>
          )}

          {/* The Curio's panel: hearts are the mistake budget. */}
          <div className="absolute left-3 bottom-3 z-10">
            <div className="relative rounded-xl border-2 border-[#4a2f18] px-3 py-1.5" style={{ ...woodTextureStyle, boxShadow: '0 0 0 2px #d4a017, 0 3px 0 rgba(0,0,0,0.6)' }}>
              <Nail className="top-[3px] left-[3px]" />
              <Nail className="top-[3px] right-[3px]" />
              <p className="text-[11px] sm:text-xs font-extrabold text-[#fde68a] leading-tight">
                {curio.name} <span className="text-[#f3dfb4]">Lv.{curio.level}</span>
                {combo >= 2 && <span className="ml-2 px-1.5 py-0.5 rounded bg-[#f5c542] text-[#2a1505]">Combo x{combo}</span>}
              </p>
              <div className="flex gap-1 mt-1" aria-label={`${hearts} of ${maxHearts} hearts`}>
                {Array.from({ length: maxHearts }, (_, i) => {
                  // The heart lost on the last wrong answer plays its break once it empties.
                  const breaking = brokenHeart?.index === i && i >= hearts;
                  const state = i < hearts ? (hearts === 1 && maxHearts > 1 ? 'last' : 'full') : breaking ? 'breaking' : 'empty';
                  return <Heart key={breaking ? `b${brokenHeart?.key}` : i} state={state} />;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Question card ── */}
        <div className="relative z-20 shrink-0 px-3 pb-3">
          <div className="relative max-w-3xl mx-auto">
          {/* Fight rules drawer: a tab on the card's top edge (like the Curio
              battle's Show Log) that pulls a panel up out of the card, in the
              card's Forgetting colors. Hidden while an attack banner plays. */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-[min(100%,26rem)] flex flex-col items-center transition-opacity duration-200 ${banner || introPhase !== 'done' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            style={{ bottom: 'calc(100% - 2px)' }}
          >
            <button
              onClick={() => { playPageFlip(); setRulesOpen(o => !o); }}
              aria-expanded={rulesOpen}
              className="border-2 border-b-0 border-[#3b2a5c] rounded-t-[7px] px-4 py-1.5 text-[11px] font-bold text-[#e9dcff] hover:text-white whitespace-nowrap"
              style={{ background: 'linear-gradient(180deg,#2a1640 0%,#150a24 100%)' }}
            >
              {rulesOpen ? 'Hide Rules' : 'Fight Rules'}
            </button>
            <div className="grid w-full transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: rulesOpen ? '1fr' : '0fr' }}>
              <div className="min-h-0 overflow-hidden">
                <div className="bg-[#f6f2fc]/95 border-2 border-b-0 border-[#b3a3d6] rounded-t-lg flex flex-col max-h-[min(46vh,20rem)]">
                  <p className="px-3 py-1.5 border-b border-[#b3a3d6] text-[11px] font-bold uppercase tracking-wide text-[#4c3a78] flex-none">Fight Rules</p>
                  <div className="overflow-y-auto px-2.5 py-2 space-y-1.5">
                    <RuleRow icon={comboSkills[0] && <img src={getSkillIconSrc(comboSkills[0])} alt="" className="w-7 h-7 object-contain" />}>
                      <b>Right answer:</b> {curio.name} attacks and breaks one bar off {persona.name}&apos;s health.
                    </RuleRow>
                    <RuleRow icon={<span className="px-1.5 py-0.5 rounded bg-[#f5c542] text-[#2a1505] text-[11px] font-extrabold">x3</span>}>
                      <b>Right answers in a row</b> power up {curio.name}&apos;s attack. A wrong answer starts the combo over.
                      <div className="mt-1 flex flex-wrap gap-1">
                        {comboSkills.map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded border border-[#d8cdef] bg-[#f3eefb] pl-0.5 pr-1.5 py-0.5 text-[11px]">
                            <img src={getSkillIconSrc(s)} alt="" className="w-4 h-4 object-contain" />
                            <span className="font-bold">{i === 0 ? '1' : i === 1 ? '2 in a row' : '3 in a row'}:</span> {s.name}
                          </span>
                        ))}
                      </div>
                    </RuleRow>
                    <RuleRow icon={<Heart state="full" />}>
                      <b>Wrong answer:</b> {persona.name} strikes back and you lose a heart. That question comes back later. You have {maxHearts} hearts.
                    </RuleRow>
                    <RuleRow icon={<Heart state="empty" />}>
                      <b>Out of hearts:</b> the fight ends. Review your lessons and try again. Trying again is free.
                    </RuleRow>
                    <RuleRow
                      icon={
                        <span className="flex gap-[2px] w-7 h-2.5">
                          {[0, 1, 2].map(i => (
                            <span key={i} className="flex-1 rounded-[2px]" style={{ background: `linear-gradient(180deg, #f5d0fe 0%, ${persona.glowColor} 45%, #6b21a8 100%)` }} />
                          ))}
                        </span>
                      }
                    >
                      <b>To win:</b> break all {originalPoolSize} bars. Every shadow you defeat pushes back the mist. Defeat them all to free the sealed Curio.
                    </RuleRow>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={`fcard ${picked?.result === 'correct' ? 'fcard-right' : picked?.result === 'wrong' ? 'fcard-miss' : ''}`}
            style={{ '--glow': `${persona.glowColor}88` } as CSSProperties}
          >
            <div aria-hidden className="fcard-mist" />
            {current && (
              <>
                <div className="fcard-head">
                  <span
                    className="fcard-num"
                    style={{
                      fontSize: 20,
                      fontFamily: questButtonFontFamily,
                      letterSpacing: questButtonLetterSpacing,
                      boxShadow: questButtonBoxShadow,
                      background: picked?.result === 'correct' ? '#22c55e' : picked?.result === 'wrong' ? '#ef4444' : '#a78bfa',
                    }}
                  >
                    <span aria-hidden style={{ position: 'absolute', top: '0.22em', right: '0.15em', width: '0.5em', height: '0.22em', background: 'rgba(255,255,255,0.75)', borderRadius: '50%', transform: 'rotate(10deg)' }} />
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      <span aria-hidden style={questTextShadowStyle}>{Math.min(correctCount + 1, originalPoolSize)}</span>
                      <span style={questTextStyle}>{Math.min(correctCount + 1, originalPoolSize)}</span>
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="fcard-meta truncate">
                      Question {Math.min(correctCount + 1, originalPoolSize)} of {originalPoolSize}{current.topic ? ` · ${current.topic}` : ''}
                    </p>
                    <p className="fcard-q">{current.question}</p>
                    {connectionHiccup && (
                      <p className="fcard-meta" style={{ color: '#b45309', marginTop: 4 }}>📡 The internet hiccuped. Tap your answer again!</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {shuffledOptions.map((opt, i) => {
                    // A wrong pick doesn't reveal the right answer: the
                    // question comes back later in the fight.
                    const state = picked
                      ? opt === picked.opt ? (picked.result === 'pending' ? 'picked' : picked.result) : 'dim'
                      : 'idle';
                    return (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(opt)}
                        disabled={!answering || grading || locked}
                        className={`fopt fopt-${state}`}
                      >
                        <span className="fopt-badge">{String.fromCharCode(65 + i)}</span>
                        <span className="fopt-text">{opt}</span>
                        {(state === 'correct' || state === 'wrong') && <AnswerMark correct={state === 'correct'} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>

      {hurt && (
        <div
          key={hurt.key}
          aria-hidden
          className={`bstage-hurt ${hurt.knockout ? 'bstage-hurt-ko' : ''}`}
          style={{
            '--hurt-strength': hurt.knockout ? 1 : Math.min(1, 0.4 + hurt.fraction * 1.2),
            '--hurt-clear': `${hurt.knockout ? 25 : Math.round(62 - Math.min(hurt.fraction, 0.6) * 50)}%`,
          } as CSSProperties}
          onAnimationEnd={() => setHurt(h => (h?.key === hurt.key ? null : h))}
        />
      )}

      {/* ── VS intro ── */}
      {introPhase !== 'done' && (
        <div className={`absolute inset-0 z-[60] bg-[#0a0807] transition-opacity duration-300 ${introPhase === 'leaving' ? 'opacity-0' : ''}`}>
          <FitBox w={INTRO_SIZE[layout].w} h={INTRO_SIZE[layout].h} className={portrait ? 'bstage-portrait' : ''}>
            <BattleIntro
              left={{ trainerName: playerName || 'Keeper', leadName: curio.name, leadSpriteUrl: curioSpriteUrl(curio.def), teamSize: 1, caption: 'Keeper', element: curio.def.element, size: curio.def.size }}
              right={{ trainerName: 'The Forgetting', leadName: persona.name, leadSpriteUrl: persona.artUrl, teamSize: 1, caption: 'Exam Review', element: 'shadow', size: 'huge' }}
              progress={sceneLoaded ? 1 : 0.6}
              leaving={introPhase === 'leaving'}
              showReady={introPhase === 'ready'}
              onReady={startFight}
            />
          </FitBox>
        </div>
      )}
    </div>
  );
}
