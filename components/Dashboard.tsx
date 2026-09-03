// components/Dashboard.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserId, getActiveUser, clearActiveUser, loadAllUsersData, saveTheme, linkIdentity, recordLastLogin, USERS, gradeToNumber } from '@/lib/userSession';
import { THEME_CLASSES, getThemeItem } from '@/lib/themeShop';
import SplashScreen from '@/components/SplashScreen';
import LoadingScreen from '@/components/LoadingScreen';
import { useWeeklyData, CharacterStats } from '@/hooks/useWeeklyData';
import HeroProfile from '@/components/HeroProfile';
import GuildJournal from '@/components/GuildJournal';
import DailyChecklist from '@/components/DailyChecklist';
import { markGuildSessionToday, GuildKey, GUILDS, fetchDailyChecklistStreak } from '@/lib/dailyChecklist';
import { buildWeeklyReviewDay } from '@/lib/weeklyReview';
import QuestModule, { markdownComponents } from '@/components/QuestModule';
import { useReadTimer } from '@/hooks/useReadTimer';
import { format } from 'date-fns';
import AchievementsBoard from '@/components/AchievementsBoard';
import { supabase } from '@/lib/supabase';
import PlayerLog from '@/components/PlayerLog';
import Lorekeeper from '@/components/guilds/Lorekeeper';
import SpellCaster from '@/components/guilds/SpellCaster';
import NumberRealm from '@/components/guilds/NumberRealm';
import LogicLabyrinth from '@/components/guilds/LogicLabyrinth';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import MonsterGuild from '@/components/MonsterGuild';
import CodexPanel from '@/components/CodexPanel';
import { playShopPurchase, playPageFlip, startMainTheme, stopMainTheme, startTermBossTheme, stopTermBossTheme, isSfxEnabled, isMusicEnabled, setSfxEnabled, setMusicEnabled } from '@/lib/sounds';
import Toast from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import AchievementToast from '@/components/AchievementToast';
import { useAchievementNotifier } from '@/hooks/useAchievementNotifier';
import LexiconArena from '@/components/guilds/LexiconArena';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import { fetchSubclassProfile, SubclassProfile } from '@/lib/guildEngine';
import { prefetchAllTabs } from '@/lib/tabPrefetch';
import { claimRegistrantReward, fetchNotifications, markNotificationsRead, getMyReferralKey, PlayerNotification } from '@/lib/referral';
import { claimMarketingGoldBonus } from '@/lib/marketingBonus';
import ReferralKeyDisplay from '@/components/ReferralKeyDisplay';
import NotificationInbox from '@/components/NotificationInbox';
import MonsterShop from '@/components/MonsterShop';
import VaultKeeperNpc from '@/components/VaultKeeperNpc';
import CurioExpertNpc from '@/components/CurioExpertNpc';
import EventAnnouncementPopup from '@/components/EventAnnouncementPopup';
import CurioRevealModal from '@/components/CurioRevealModal';
import LinkParentBanner from '@/components/LinkParentBanner';
import SidebarRail, { RailTabId } from '@/components/SidebarRail';
import WelcomeCard from '@/components/WelcomeCard';
import QuestCard from '@/components/QuestCard';
import TutorialSpotlight from '@/components/TutorialSpotlight';
import { useTutorialSequence, TutorialStep } from '@/hooks/useTutorialSequence';
import { useTabTutorialGate } from '@/hooks/useTabTutorialGate';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import { syncEggProgress, fetchUserEggs, HatchedEgg } from '@/lib/curioEggs';
import EggHatchModal from '@/components/EggHatchModal';
import {
  CustomEvent,
  EventQuest,
  UserEventProgressRow,
  fetchActiveEvent,
  fetchEventQuests,
  fetchUserEventProgress,
  hasClaimedEventReward,
  fetchClaimedMonsterId,
  recordEventQuizMastery,
  claimEventReward,
} from '@/lib/customEvents';
import BossFightScreen from '@/components/monster/BossFightScreen';
import MasteryGauntletScreen from '@/components/monster/MasteryGauntletScreen';
import BossPersonaFan from '@/components/monster/BossPersonaFan';
import BossMistOverlay from '@/components/BossMistOverlay';
import BossCutscene from '@/components/BossCutscene';
import { useBossFightProgress } from '@/hooks/useBossFightProgress';
import { getPersonasForGrade, isBossFightGrade, hasCutsceneBeenSeen, markCutsceneSeen } from '@/lib/bossPersonas';
import { fetchBossPoolCounts, POOL_READY_THRESHOLD, BossQuestion } from '@/lib/bossFightEngine';
import {
  fetchGauntletQuestionPool,
  fetchGauntletMistakes,
  buildMasteryGauntletPool,
  splitPoolIntoDays,
  fetchGauntletDaysDone,
  markGauntletDayComplete,
} from '@/lib/masteryGauntletEngine';
import { CURRENT_TERM } from '@/lib/guildConfig';

const VAULT_CATALOG = {
  "voucher_30m": {
    "name": "🎮 30-Min Gaming Voucher",
    "cost": 100,
    "desc": "Unlocks 30 minutes of console gaming or modding runtime privileges.",
  },
  "jollibee_burger": {
    "name": "🍔 Jollibee Yumburger Reward",
    "cost": 250,
    "desc": "Claim a real-world Jollibee hamburger snack ordered by Tatay. (Limit: 1 per week)",
  },
  "ai_lording": {
    "name": "🧙‍♂️ 30-Min AI Lording Sandbox",
    "cost": 100,
    "desc": "Unlocks 30 minutes of advanced AI prompt mastery using Google Gemini.",
  },
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Swaps <html>'s theme class for the one tied to `themeKey` (default has
// none). Always removes every known theme class first so switching between
// two non-default themes doesn't leave the old one stacked on top.
function applyThemeClass(themeKey: string) {
  document.documentElement.classList.remove(...THEME_CLASSES);
  const cls = getThemeItem(themeKey)?.cssClass;
  if (cls) document.documentElement.classList.add(cls);
}

export default function Dashboard() {
  const [activeUserId, setActiveUserId] = useState<UserId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function hydrate() {
      // Classmates/children/etc. must be populated into USERS before
      // anything reads USERS[savedUserId] below.
      await loadAllUsersData();
      const saved = getActiveUser();
      if (saved && USERS[saved]) {
        setActiveUserId(saved);
        applyThemeClass(USERS[saved].theme);
      } else if (saved) {
        // Stale/deactivated account — clear it so the splash screen shows.
        clearActiveUser();
      }
      setHydrated(true);
    }
    hydrate();
  }, []);

  // Main theme plays for the whole logged-in session; BattleScreen and
  // LiveBattleScreen duck it (pauseMainTheme/resumeMainTheme) while their
  // own battle track plays instead of stopping/restarting it.
  useEffect(() => {
    if (!activeUserId) return;
    startMainTheme();
    return () => stopMainTheme();
  }, [activeUserId]);

  // Volume toggles surfaced next to the Replay Tutorial button — local state
  // just mirrors lib/sounds.ts's module-level flags so the icons update
  // immediately on click; the flags themselves persist to localStorage.
  const [sfxOn, setSfxOn] = useState(() => isSfxEnabled());
  const [musicOn, setMusicOn] = useState(() => isMusicEnabled());
  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxEnabled(next);
    setSfxOn(next);
  };
  const toggleMusic = () => {
    const next = !musicOn;
    setMusicEnabled(next);
    setMusicOn(next);
  };

  // Curio egg mechanism (see docs/curio-egg-mechanism-design.md). Hatches
  // reveal here (not scoped to MonsterGuild) so the ceremony still plays
  // even if the player never opens Curio Arena that session — the streak
  // itself already advanced in the sync_egg_progress call below regardless
  // of which tab is active, since "checking in" just means opening the app.
  const [pendingEggHatches, setPendingEggHatches] = useState<HatchedEgg[]>([]);
  // Bumped when a hatch reveal closes so MonsterGuild refetches userMonsters
  // — the new bench curio is inserted server-side by sync_egg_progress
  // (which resolves async, on its own timer relative to MonsterGuild's own
  // mount-time fetch), so without this the freshly hatched curio wouldn't
  // show up in My Team until an unrelated reload happened to refresh it.
  const [eggRefreshSignal, setEggRefreshSignal] = useState(0);
  const [hasStalledEgg, setHasStalledEgg] = useState(false);
  // Set by MonsterGuild once it's loaded userMonsters + the egg chain map —
  // whether any owned curio has crossed its egg-ready threshold but hasn't
  // claimed yet. Combined with hasStalledEgg/pendingEggHatches below for the
  // sidebar's Curio Arena badge.
  const [hasEggReadyCurio, setHasEggReadyCurio] = useState(false);
  const eggBadge = hasEggReadyCurio || hasStalledEgg || pendingEggHatches.length > 0;

  useEffect(() => {
    if (!hydrated) return;
    if (activeUserId) {
      applyThemeClass(USERS[activeUserId].theme);
      // linkIdentity must resolve first — analytics_events/player_log RLS now
      // requires the user_identity_map row it writes, so firing trackEvent
      // before it lands would silently drop the session_start event.
      (async () => {
        const linked = await linkIdentity(activeUserId);
        if (!linked) {
          // The anonymous Supabase session rotated since the last login (e.g.
          // a parent used the Parent Dashboard on this device, which signs out
          // the anonymous session and creates a new one with a different
          // auth.uid()). Without a credential we can't re-claim this account
          // for the new auth.uid(), so RLS would silently return empty rows for
          // everything (inventory, monsters, gold, etc.). Force back to the
          // splash screen so the user re-enters their password once and
          // linkIdentity re-runs with a credential — at which point it works.
          clearActiveUser();
          setActiveUserId(null);
          return;
        }
        recordLastLogin(activeUserId);
        // Warms every guild tab's data (and the default Training Map's tile
        // art) in the background so switching tabs for the first time this
        // session finds it already loaded instead of showing each tab's own
        // plain "Loading..." placeholder — see lib/tabPrefetch.ts.
        prefetchAllTabs(activeUserId, USERS[activeUserId].grade);
        syncEggProgress(activeUserId).then(result => {
          if (result?.hatched?.length) {
            setPendingEggHatches(prev => [...prev, ...result.hatched]);
            const today = format(new Date(), 'yyyy-MM-dd');
            result.hatched.forEach(h => {
              const speciesName = ALL_MONSTERS[h.species_id]?.name ?? h.species_id;
              logAction(activeUserId, today, 'egg', `🐣 An egg hatched into ${speciesName}!`, 0, 0);
            });
          }
        });
        fetchUserEggs(activeUserId).then(eggs => {
          setHasStalledEgg(eggs.some(e => e.status === 'stalled'));
        });
        // Referral: claim registrant welcome reward (idempotent — no-ops if
        // already claimed or no referral was used). Show a reward toast if
        // something was actually credited this session.
        claimRegistrantReward(activeUserId).then(reward => {
          if (reward) {
            setToast({
              show: true,
              message: `🎁 Referral bonus! +${reward.growth_pills} Growth Pill & +${reward.gold} Gold added to your account!`,
            });
          }
        });

        // Marketing opt-in welcome bonus: claims once, whether the parent
        // checked the box at registration or opted in later from the
        // dashboard — idempotent, no-ops if already claimed or not opted in.
        claimMarketingGoldBonus(activeUserId).then(reward => {
          if (reward) {
            setToast({
              show: true,
              message: `🪙 Welcome bonus! +${reward.gold} Gold added to your account!`,
            });
          }
        });

        // Load inbox notifications (unread badge + persistent inbox).
        fetchNotifications(activeUserId).then(setNotifications);

        // Load referral key for the compact Dashboard display.
        getMyReferralKey().then(key => { if (key) setDashReferralKey(key); });

        // One-shot per browser session, regardless of which user ends up logged
        // in first — guards against firing again on every activeUserId change.
        if (typeof window !== 'undefined' && !sessionStorage.getItem('lh_session_started')) {
          sessionStorage.setItem('lh_session_started', '1');
          trackEvent('session_start');
        }
      })();
    }
  }, [activeUserId, hydrated]);

  // Reused by both demo and real accounts (user_last_login.onboarding_completed_at)
  // so the guided tour only auto-shows once per account, ever.
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!activeUserId) return;
    (async () => {
      const { data: row } = await supabase
        .from('user_last_login')
        .select('onboarding_completed_at')
        .eq('user_id', activeUserId)
        .maybeSingle();
      if (!row?.onboarding_completed_at) {
        setShowOnboarding(true);
      }
    })();
  }, [activeUserId]);

  const handleCompleteOnboarding = async () => {
    setShowOnboarding(false);
    if (!activeUserId) return;
    await supabase
      .from('user_last_login')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('user_id', activeUserId);
  };

  const handleUserSelect = (id: UserId) => {
    setActiveUserId(id);
    applyThemeClass(USERS[id].theme);
    trackEvent('login');
  };

  const handleSwitchUser = () => {
    clearActiveUser();
    document.documentElement.classList.remove(...THEME_CLASSES);
    setActiveUserId(null);
  };

  const handleThemeChange = async (themeKey: string) => {
    if (!activeUserId) return;
    applyThemeClass(themeKey);
    await saveTheme(activeUserId, themeKey);
  };

  const { data, loading, updateStatsAndJournal, currentSunday, contentWeekId, applyGoldDelta, bumpCounters, syncCharacterStats, setCharacterStatsDirect } = useWeeklyData(activeUserId ?? 'damien');
  // Sticks to whichever top-level tab the player was on across a page refresh
  // instead of always dropping back to Main Quests. sessionStorage (not
  // localStorage) so a fresh browser session still starts clean.
  const [activeTab, setActiveTab] = useState(() =>
    (typeof window !== 'undefined' && sessionStorage.getItem('activeTab')) || 'board'
  );
  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  useEffect(() => {
    trackEvent('tab_view', {}, activeTab);
  }, [activeTab]);
  // Retriggers the Vault Keeper's slide-in greeting each time the player
  // (re)enters the vault tab, rather than just once on mount.
  // HUD login streak — fetched once when the active user is known.
  const [loginStreak, setLoginStreak] = useState(0);
  const [checklistClaimedToday, setChecklistClaimedToday] = useState(false);
  const [todoCount, setTodoCount] = useState<{ done: number; total: number } | null>(null);
  // Stable identity across renders — DailyChecklist's own effect depends on
  // this callback, so an inline arrow here (a fresh function every render)
  // would re-fire that effect every render, which calls this, which
  // re-renders Dashboard, forever ("Maximum update depth exceeded").
  const handleTodoCountChange = useCallback((done: number, total: number) => {
    setTodoCount({ done, total });
  }, []);
  useEffect(() => {
    if (!activeUserId) return;
    const today = new Date().toISOString().slice(0, 10);
    fetchDailyChecklistStreak(activeUserId, today).then(info => {
      setLoginStreak(info.currentStreak);
      setChecklistClaimedToday(info.claimedToday);
    });
  }, [activeUserId]);

  const [vaultGreetKey, setVaultGreetKey] = useState(0);
  // Retriggers the Curio Expert's slide-in greeting each time the player
  // (re)enters the Curio Arena tab, rather than just once on mount.
  const [curioGreetKey, setCurioGreetKey] = useState(0);
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab === 'vault' && prevTabRef.current !== 'vault') {
      setVaultGreetKey((k) => k + 1);
    }
    if (activeTab === 'monster' && prevTabRef.current !== 'monster') {
      setCurioGreetKey((k) => k + 1);
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const claimBusyRef = useRef(false);

  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [activeGuild, setActiveGuild] = useState<GuildKey | null>(null);
  const [guildInitialView, setGuildInitialView] = useState<'compendium' | 'team' | undefined>(undefined);
  const [guildProfile, setGuildProfile] = useState<SubclassProfile | null>(null);

  useEffect(() => {
    if (activeTab !== 'guilds' || !activeUserId) return;
    fetchSubclassProfile(activeUserId).then(setGuildProfile);
  }, [activeTab, activeUserId]);

  // One-shot: MonsterGuild reads guildInitialView only at mount, so clear it
  // right after so a later manual tab visit defaults back to the map view.
  useEffect(() => {
    if (activeTab === 'monster' && guildInitialView) {
      setGuildInitialView(undefined);
    }
  }, [activeTab]);
  const [quizPhase, setQuizPhase] = useState<'study' | 'ready' | 'quiz'>('study');
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [dashReferralKey, setDashReferralKey] = useState<string | null>(null);
  const { newlyUnlocked, clearNotifications } = useAchievementNotifier(data);

  // --- Custom Events ---
  const [activeEvent, setActiveEvent] = useState<CustomEvent | null>(null);
  const [eventQuests, setEventQuests] = useState<EventQuest[]>([]);
  const [eventProgress, setEventProgress] = useState<UserEventProgressRow[]>([]);
  const [eventClaimed, setEventClaimed] = useState(false);
  // What this student actually got, persisted on the claims row — needed
  // because a 'random_starter' event's activeEvent.reward_monster_id is
  // just a sentinel, not a real curio id.
  const [claimedMonsterId, setClaimedMonsterId] = useState<string | null>(null);
  const [revealEventMonster, setRevealEventMonster] = useState<string | null>(null);
  const [activeEventQuest, setActiveEventQuest] = useState<string | null>(null);
  const [eventQuizPhase, setEventQuizPhase] = useState<'study' | 'ready' | 'quiz'>('study');
  const [showEventPopup, setShowEventPopup] = useState(false);
  // 'gauntlet'-type events substitute the normal Mon-Fri quest board rather
  // than sitting alongside it — the full-week pool is built once and split
  // into 5 daily chunks so each weekday's card opens just its own slice.
  // See project_term_break_special_content_plan memory.
  const [gauntletDayPools, setGauntletDayPools] = useState<Record<string, BossQuestion[]>>({});
  const [gauntletDaysDone, setGauntletDaysDone] = useState<Set<string>>(new Set());
  const [activeGauntletDay, setActiveGauntletDay] = useState<string | null>(null);

  // --- Term Exam Boss Fight ---
  const [activeBossFight, setActiveBossFight] = useState<string | null>(null); // subject key
  const bossGradeLevel = gradeToNumber(USERS[activeUserId ?? 'damien']?.grade);
  const bossProgress = useBossFightProgress(activeUserId ?? 'damien', bossGradeLevel);
  const [bossPoolCounts, setBossPoolCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!isBossFightGrade(bossGradeLevel) || !bossProgress.bossFightsEnabled) return;
    fetchBossPoolCounts(bossGradeLevel, CURRENT_TERM).then(setBossPoolCounts);
  }, [bossGradeLevel, bossProgress.bossFightsEnabled]);
  // Term boss ambient overrides the main theme game-wide while the event is
  // active — same gate as the mist overlay. Falls back to whatever was
  // already playing (main theme) once the event ends or the player leaves.
  const bossEventActive = isBossFightGrade(bossGradeLevel) && bossProgress.bossFightsEnabled;
  useEffect(() => {
    if (bossEventActive) startTermBossTheme();
    else stopTermBossTheme();
    return () => { stopTermBossTheme(); };
  }, [bossEventActive]);

  // Opening cutscene — plays once per player per grade/term, the first time
  // the event is seen active. Music already starts via the effect above at
  // the same moment, so the reveal and the ambient track land together.
  const [showBossCutscene, setShowBossCutscene] = useState(false);
  useEffect(() => {
    if (bossEventActive && !hasCutsceneBeenSeen(bossGradeLevel, CURRENT_TERM)) {
      setShowBossCutscene(true);
    }
  }, [bossEventActive, bossGradeLevel]);
  const dismissBossCutscene = () => {
    markCutsceneSeen(bossGradeLevel, CURRENT_TERM);
    setShowBossCutscene(false);
  };

  // Forced-read countdown for the pre-quiz "Study Session" screens, sized to
  // each quest's own notes. Computed here (before the loading/no-data early
  // returns below) so useReadTimer's internal hooks are called on every
  // render — hooks can't live behind a conditional return. `data` may still
  // be null/loading at this point, which the optional chaining below handles;
  // the Weekly Review quest's synthesized content isn't in raw package_data,
  // so it falls back to useReadTimer's minimum duration rather than a
  // length-aware one — an acceptable gap, not a broken gate.
  const [timerQuestDay, timerQuestSubject] = activeQuest ? activeQuest.split('_') : [undefined, undefined];
  const rawPackageDataForTimer = data && typeof data.package_data === 'string' && data.package_data.trim() !== ''
    ? JSON.parse(data.package_data)
    : (data?.package_data || {});
  const activeStudyContent = timerQuestDay && timerQuestSubject
    ? rawPackageDataForTimer?.[timerQuestDay]?.[timerQuestSubject]?.summary_markdown
    : undefined;
  const studyReadRemaining = useReadTimer(activeStudyContent, activeQuest || '');

  const activeEventQuestForTimer = eventQuests.find(q => q.id === activeEventQuest);
  const eventStudyReadRemaining = useReadTimer(activeEventQuestForTimer?.summary_markdown, activeEventQuest || '');

  const loadEventData = async (userId: UserId) => {
    const ev = await fetchActiveEvent();
    setActiveEvent(ev);
    if (!ev) {
      setEventQuests([]);
      setEventProgress([]);
      setEventClaimed(false);
      setClaimedMonsterId(null);
      return;
    }
    const gradeLevel = gradeToNumber(USERS[userId]?.grade);
    const [quests, progress, claimed] = await Promise.all([
      fetchEventQuests(ev.id, gradeLevel),
      fetchUserEventProgress(userId, ev.id),
      hasClaimedEventReward(userId, ev.id),
    ]);
    setEventQuests(quests);
    setEventProgress(progress);
    setEventClaimed(claimed);
    setClaimedMonsterId(claimed ? await fetchClaimedMonsterId(userId, ev.id) : null);

    if (
      !claimed &&
      typeof window !== 'undefined' &&
      !sessionStorage.getItem(`event_popup_shown_${ev.id}`)
    ) {
      setShowEventPopup(true);
    }
  };

  useEffect(() => {
    if (!activeUserId) return;
    loadEventData(activeUserId);
  }, [activeUserId]);

  // Builds the gauntlet's full-week pool once per active event and splits
  // it into the 5 weekday chunks the board renders in place of the normal
  // per-subject cards. Re-runs if the event or grade changes; does nothing
  // for 'authored' events. Pulls from content_questions_public — every
  // grade's own weekly lessons from before the event started — rather than
  // a term-scoped authored bank, so this works for every grade, not just
  // the two that ever had draft_questions content.
  useEffect(() => {
    if (!activeUserId || !activeEvent || activeEvent.content_source !== 'gauntlet') {
      setGauntletDayPools({});
      setGauntletDaysDone(new Set());
      return;
    }
    const grade = gradeToNumber(USERS[activeUserId]?.grade);
    Promise.all([
      fetchGauntletQuestionPool(grade, activeEvent.start_date),
      fetchGauntletMistakes(activeUserId),
      fetchGauntletDaysDone(activeUserId, activeEvent.id),
    ]).then(([all, mistakes, daysDone]) => {
      const pool = buildMasteryGauntletPool(all, mistakes);
      setGauntletDayPools(splitPoolIntoDays(pool, WEEKDAYS));
      setGauntletDaysDone(daysDone);
    });
  }, [activeUserId, activeEvent?.id, activeEvent?.content_source, activeEvent?.start_date]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissEventPopup = () => {
    setShowEventPopup(false);
    if (activeEvent && typeof window !== 'undefined') {
      sessionStorage.setItem(`event_popup_shown_${activeEvent.id}`, '1');
    }
  };

  // Fetch claims filtered to the active user
  const fetchMyClaims = async () => {
    if (!activeUserId) return;
    const { data: claimsData } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('app_user_id', activeUserId)
      .order('created_at', { ascending: false });
    if (claimsData) setMyClaims(claimsData);
  };

  useEffect(() => {
    fetchMyClaims();
  }, [activeUserId]);

  // Live-refresh claimed rewards so the claimable-hours total updates as
  // soon as an admin marks a reward "supplied" from the Admin Dashboard,
  // without the kid needing to reload the page.
  useEffect(() => {
    if (!activeUserId) return;
    const channel = supabase
      .channel(`reward-claims-${activeUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reward_claims', filter: `app_user_id=eq.${activeUserId}` },
        () => fetchMyClaims()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUserId]);

  const handleClaimReward = async (cost: number, itemName: string, itemKey: string) => {
    if (!data || !activeUserId) return;
    // Guards against a rapid double-click firing two claims before the gold
    // deduction above re-renders — without this, both clicks read the same
    // pre-deduction `data.character_stats.gold` and both pass the balance
    // check, charging gold once (stale-closure double-set) but inserting two
    // reward_claims rows.
    if (claimBusyRef.current) return;
    claimBusyRef.current = true;
    setClaimingKey(itemKey);

    try {
      if (data.character_stats.gold >= cost) {
        const newStats = {
          ...data.character_stats,
          gold: data.character_stats.gold - cost
        };

        const newPurchasedItems = (data.purchased_items || 0) + 1;
        updateStatsAndJournal(newStats, data.journal_logs, newPurchasedItems);
        logAction(activeUserId, data.week_starting_date, 'purchase', `Claimed reward: ${itemName}`, 0, -cost);

        // Insert with user_id so each user's claims are independent
        const { error } = await supabase.from('reward_claims').insert({
          app_user_id: activeUserId,
          item_key: itemKey,
          item_name: itemName,
          cost: cost,
          status: 'pending'
        });

        if (error) {
          console.error("Failed to queue reward:", error);
          alert("Error queuing reward, but gold was deducted. Please tell Tatay!");
        } else {
          playShopPurchase();
          setToast({ show: true, message: `Successfully claimed: ${itemName}!` });
          fetchMyClaims();
        }
      } else {
        const short = cost - data.character_stats.gold;
        alert(`❌ Not enough Gold! You need 🪙 ${short} more gold to claim this.`);
      }
    } finally {
      claimBusyRef.current = false;
      setClaimingKey(null);
    }
  };

  // These memos must sit above every early return so the hook call order
  // stays stable across renders (Rules of Hooks).
  const packageData = useMemo(() => {
    if (!data) return {};
    return typeof data.package_data === 'string' && data.package_data.trim() !== ''
      ? JSON.parse(data.package_data)
      : (data.package_data || {});
  }, [data?.package_data]);
  // Main Quest board shows Friday as one auto-built "Weekly Review" quest
  // instead of whatever's stored under Friday — the Monster Arena question
  // pool (which reads `packageData` directly) is left untouched.
  const mainQuestPackageData = useMemo(
    () => ({ ...packageData, Friday: buildWeeklyReviewDay(packageData) }),
    [packageData]
  );
  const totalQuests = useMemo(
    () => Object.values(mainQuestPackageData).flatMap(subjects => Object.keys(subjects as object)).length,
    [mainQuestPackageData]
  );

  // The weekday whose quest section the board tutorial should spotlight:
  // the first one with quests that aren't all mastered yet. Deliberately NOT
  // "today" — a returning kid can easily have today's section already fully
  // cleared, which would point the spotlight at an empty "✅ Completed" box
  // instead of something actually tappable.
  const openTutorialDayName = useMemo(() => {
    const masteredQuizzes = data?.mastered_quizzes || [];
    for (const day of WEEKDAYS) {
      const daySubjects = mainQuestPackageData[day] || {};
      const subjectKeys = Object.keys(daySubjects);
      if (subjectKeys.length === 0) continue;
      const dayFullyMastered = subjectKeys.every((subjectName) => masteredQuizzes.includes(`${day}_${subjectName}`));
      if (!dayFullyMastered) return day;
    }
    return null;
  }, [mainQuestPackageData, data?.mastered_quizzes]);

  // Board-tab first-visit tutorial: real spotlight on real elements instead
  // of an upfront slideshow. Gated by the same server-tracked
  // showOnboarding/handleCompleteOnboarding flag the old OnboardingTour
  // modal used, so it still only auto-shows once per account, ever. The
  // second step only exists when there's an open quest section to point at
  // (openTutorialDayName), and completes itself once a real quest is opened.
  const boardTutorialSteps: TutorialStep[] = useMemo(() => {
    const steps: TutorialStep[] = [{
      id: 'board-welcome',
      title: 'Welcome to Home Base',
      body: "This is your Active Campaign Map — your weekly quests live here. Let's find an open one.",
    }];
    if (openTutorialDayName) {
      steps.push({
        id: 'board-today-quest',
        title: 'Open Quest',
        body: "This is an open quest card. Tap it to open your study notes, then take the quiz for XP and Gold.",
        waitFor: activeQuest !== null,
      });
    }
    return steps;
  }, [openTutorialDayName, activeQuest]);

  const boardTutorial = useTutorialSequence({
    tabKey: 'board',
    active: showOnboarding && activeTab === 'board',
    steps: boardTutorialSteps,
    onDone: () => { handleCompleteOnboarding(); },
  });

  // Guilds-tab first-visit tutorial — same spotlight pattern as board's, but
  // gated by localStorage (lib/tutorial.ts) since this tab has no DB column
  // tracking it. Only shows on the guild-picker screen (activeGuild ===
  // null); the second step completes itself once a real guild is entered.
  const guildsTutorialGate = useTabTutorialGate('guilds', activeTab, activeUserId);
  const guildsTutorialSteps: TutorialStep[] = useMemo(() => [
    {
      id: 'guilds-welcome',
      title: 'Side Quest Guilds',
      body: 'Five guilds, five skills — reading, typing, math, logic, and spelling. Playing any of them earns extra XP and Gold.',
    },
    {
      id: 'guilds-first-tile',
      title: 'Pick a Guild',
      body: 'Tap a guild tile to jump in and start playing.',
      waitFor: activeGuild !== null,
    },
  ], [activeGuild]);

  const guildsTutorial = useTutorialSequence({
    tabKey: 'guilds',
    // NOT also gated on `activeGuild === null` — that's exactly the signal
    // step 2's waitFor watches for completion. Gating `active` on it too
    // would flip both `active` and `waitFor` false→derived-from-undefined
    // in the very same render as the real click, so the sequence would see
    // itself deactivate before ever observing waitFor turn true. The
    // picker-only target (guilds-first-tile) naturally vanishes from the
    // DOM once inside a guild anyway, so there's nothing left to spotlight.
    active: guildsTutorialGate.active,
    steps: guildsTutorialSteps,
    onDone: () => { guildsTutorialGate.markDone(); },
  });

  // Journal and To-Do tabs are low-stakes — a single non-blocking pointer,
  // no forced action. Both single-step, so isLast is true immediately and
  // the coachmark shows "Got it!" rather than a real-action gate.
  const journalTutorialGate = useTabTutorialGate('journal', activeTab, activeUserId);
  const journalTutorialSteps: TutorialStep[] = useMemo(() => [{
    id: 'journal-welcome',
    title: 'Guild Journal',
    body: "Reflect on today's run here, then check Player Log below for a full history of everything you've earned.",
  }], []);
  const journalTutorial = useTutorialSequence({
    tabKey: 'journal',
    active: journalTutorialGate.active,
    steps: journalTutorialSteps,
    onDone: () => { journalTutorialGate.markDone(); },
  });

  const todoTutorialGate = useTabTutorialGate('todo', activeTab, activeUserId);
  const todoTutorialSteps: TutorialStep[] = useMemo(() => [{
    id: 'todo-welcome',
    title: 'Daily To-Dos',
    body: 'Clear this checklist each day for bonus Gold — it tracks your journal, quest, guilds, and training map progress.',
  }], []);
  const todoTutorial = useTutorialSequence({
    tabKey: 'todo',
    active: todoTutorialGate.active,
    steps: todoTutorialSteps,
    onDone: () => { todoTutorialGate.markDone(); },
  });

  if (!hydrated) {
    return <LoadingScreen />;
  }

  if (!activeUserId) {
    return <SplashScreen onSelect={handleUserSelect} />;
  }

  if (loading) {
    return <LoadingScreen message="Loading realm..." />;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#ffffff] text-[#2a1505] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">✨ Great job checking in!</h1>
          <p className="text-[#6b4820]">Your study package for the week is currently being prepared.</p>
        </div>
      </div>
    );
  }

  // Shared by all 5 guild mini-games' onGoldEarned — each was an identical
  // ~15-line inline callback differing only by which guild rendered it, and
  // activeGuild already identifies that from closure.
  const handleGuildGoldEarned = (newStats: CharacterStats) => {
    if (!activeGuild) return;
    markGuildSessionToday(activeUserId, activeGuild, format(new Date(), 'yyyy-MM-dd'));
    updateStatsAndJournal(
      newStats, data.journal_logs,
      data.purchased_items, data.mastery_count, data.honor_grants,
      data.quiz_attempts || {}, data.mastered_quizzes || [],
      data.honor_grants,
      (data.guild_sessions_count || 0) + 1,
      data.monster_battles_won || 0,
      data.sibling_battles_won || 0,
      data.perfect_quizzes || 0
    );
  };

  const currentDayName = format(new Date(), 'EEEE');

  return (
    <>
      {bossEventActive && (
        <BossMistOverlay defeated={bossProgress.defeated.size} total={bossProgress.total} />
      )}
      {showBossCutscene && (
        <BossCutscene personas={getPersonasForGrade(bossGradeLevel)} onDismiss={dismissBossCutscene} />
      )}
      <div className="h-screen flex flex-col">
      <LinkParentBanner />
      {boardTutorial.step && (
        <TutorialSpotlight
          key={boardTutorial.step.id}
          step={boardTutorial.step}
          stepIndex={boardTutorial.stepIndex}
          totalSteps={boardTutorial.totalSteps}
          isLast={boardTutorial.isLast}
          onNext={boardTutorial.next}
          onSkip={boardTutorial.skip}
          // `waitFor` is the live truthiness of the step's completion
          // condition, which starts false and only flips true right as the
          // hook auto-advances away from this step — checking it directly
          // would always read false while the step is actually showing.
          // Whether the step *has* a waitFor mechanism at all (i.e. requires
          // a real action rather than a Next click) is a structural fact —
          // the key's presence, independent of its current value.
          waitingForAction={boardTutorial.step.waitFor !== undefined}
        />
      )}
      {guildsTutorial.step && (
        <TutorialSpotlight
          key={guildsTutorial.step.id}
          step={guildsTutorial.step}
          stepIndex={guildsTutorial.stepIndex}
          totalSteps={guildsTutorial.totalSteps}
          isLast={guildsTutorial.isLast}
          onNext={guildsTutorial.next}
          onSkip={guildsTutorial.skip}
          waitingForAction={guildsTutorial.step.waitFor !== undefined}
        />
      )}
      {journalTutorial.step && (
        <TutorialSpotlight
          key={journalTutorial.step.id}
          step={journalTutorial.step}
          stepIndex={journalTutorial.stepIndex}
          totalSteps={journalTutorial.totalSteps}
          isLast={journalTutorial.isLast}
          onNext={journalTutorial.next}
          onSkip={journalTutorial.skip}
          waitingForAction={journalTutorial.step.waitFor !== undefined}
        />
      )}
      {todoTutorial.step && (
        <TutorialSpotlight
          key={todoTutorial.step.id}
          step={todoTutorial.step}
          stepIndex={todoTutorial.stepIndex}
          totalSteps={todoTutorial.totalSteps}
          isLast={todoTutorial.isLast}
          onNext={todoTutorial.next}
          onSkip={todoTutorial.skip}
          waitingForAction={todoTutorial.step.waitFor !== undefined}
        />
      )}
      <div className="app-content flex-1 min-h-0 flex flex-col">
        <div className="h-full bg-[#ffffff] text-[#2a1505]">
      {/* Notifications bell — fixed top-right, no layout impact */}
      {activeUserId && notifications.length > 0 && (
        <div className="fixed top-3 right-16 z-[90]">
          <NotificationInbox
            notifications={notifications}
            onMarkRead={() => {
              markNotificationsRead(activeUserId);
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }}
          />
        </div>
      )}

      {/* Floating nav — fixed-position, no layout impact */}
      {pendingEggHatches[0] && (
        <EggHatchModal
          speciesId={pendingEggHatches[0].species_id}
          element={ALL_MONSTERS[pendingEggHatches[0].species_id]?.element || 'fire'}
          quality={pendingEggHatches[0].quality}
          userId={activeUserId}
          onClose={() => {
            setPendingEggHatches(prev => prev.slice(1));
            setEggRefreshSignal(n => n + 1);
            bumpCounters({ eggs_hatched: 1 });
          }}
        />
      )}

      <SidebarRail
        activeTab={activeTab}
        railBadges={{
          monster: eggBadge,
          board: !!data && (() => {
            const allQuests = Object.entries(data.package_data ?? {}).flatMap(([day, subjects]) =>
              Object.keys(subjects as object).map(sub => `${day}_${sub}`)
            );
            const mastered = new Set(data.mastered_quizzes ?? []);
            return allQuests.some(q => !mastered.has(q));
          })(),
          todo: !checklistClaimedToday,
          journal: !!data && !data.journal_logs?.[new Date().toISOString().slice(0, 10)],
        }}
        onNavigate={(tab) => {
          playPageFlip();
          // Curio Arena defaults to the full-screen World Map stage; landing
          // on Team instead keeps the sidebar usable when arriving fresh
          // from the rail. Re-clicking while already there leaves the view alone.
          if (tab === 'monster' && activeTab !== 'monster') setGuildInitialView('team');
          setActiveTab(tab);
          setActiveQuest(null);
          setActiveEventQuest(null);
          setActiveBossFight(null);
        }}
        onLogout={handleSwitchUser}
        sfxOn={sfxOn}
        musicOn={musicOn}
        onToggleSfx={toggleSfx}
        onToggleMusic={toggleMusic}
        playerName={activeUserId ? USERS[activeUserId]?.name : undefined}
        playerGrade={activeUserId ? USERS[activeUserId]?.grade : undefined}
        playerLevel={data?.character_stats.level}
        playerXp={data?.character_stats.xp}
        playerGold={data?.character_stats.gold}
        playerStreak={loginStreak}
        weekLabel={(() => {
          if (!currentSunday) return undefined;
          // SY 2026-2027: continuous week numbers, Week 1 = Sunday June 14 2026.
          const SY_START = new Date('2026-06-14').getTime();
          const weekNum = Math.floor((new Date(currentSunday).getTime() - SY_START) / (7 * 24 * 60 * 60 * 1000)) + 1;
          return weekNum > 0 ? `Week ${weekNum}` : undefined;
        })()}
      />

      {/* Main Content Area */}
      {/* min-w-0 overrides the flex default of min-width:auto — without it,
          this flex item refuses to shrink below its content's natural width,
          so anything inside wider than the available space (long unbroken
          text, etc.) stretches the whole row and forces the page into
          horizontal scroll, especially on narrower landscape viewports. */}
      {/* overflow-x-hidden: min-w-0 above stops this pane from *growing* to
          fit wide content, but doesn't stop that content from still
          visually spilling past this box's edge (overflow-x was left at
          its 'visible' default) — which was still widening the page's
          real scrollable area even though it looked fine. That phantom
          width is why the fixed-position audio rail's `right: 6` (further
          down this file) was resolving off-screen: fixed elements pin to
          the viewport, but only once nothing upstream is still stretching
          it. */}
      <main className="h-full w-full pt-16 lg:pt-24 px-4 lg:px-8 pb-28 lg:pb-12 overflow-y-auto overflow-x-hidden relative bg-white">


        {/* Tab switches from the sidebar rail fade/slide the content area
            instead of snapping — keyed on activeTab only, so in-tab state
            (quest view, quiz phase) doesn't retrigger it. */}
        <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >

        {/* --- TAB A: QUEST BOARD --- */}
        {activeTab === 'board' && activeQuest === null && activeEventQuest === null && activeBossFight === null && activeGauntletDay === null && (
          <div>
            {/* Same Bungee/stroke/shadow text treatment as the quest
                GameButton's label (2026-08-29), in quest gold instead of
                the button's white. */}
            <h1 className="text-2xl lg:text-3xl mt-4 mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span aria-hidden style={questTextShadowStyle}>Active Campaign Map</span>
                <span style={{ ...questTextStyle, color: '#f5c542' }}>Active Campaign Map</span>
              </span>
            </h1>
            <p className="text-gray-500 mb-4 text-sm">Select an open, active quest card from the schedule below to begin your training.</p>

            <div data-tutorial-id="board-welcome">
              <WelcomeCard
                playerName={USERS[activeUserId]?.name ?? activeUserId}
                loginStreak={loginStreak}
                totalQuests={totalQuests}
                completedQuests={data.mastered_quizzes?.length ?? 0}
              />
            </div>

            {/* Compact referral key — invite friends from the board */}
            {dashReferralKey && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-amber-500 text-base">🔗</span>
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider leading-tight">
                      Invite Friends
                    </p>
                    <p className="text-xs text-gray-500 leading-tight">Share your code — you both earn rewards</p>
                  </div>
                </div>
                <ReferralKeyDisplay referralKey={dashReferralKey} compact />
              </div>
            )}

            {activeEvent && (
              <div className="mb-10">
                <div className="relative rounded-2xl border-2 border-amber-500/70 bg-gradient-to-br from-[#1a1005] to-black shadow-[0_0_0_2px_#000,0_0_40px_-8px_rgba(245,158,11,0.35)] overflow-hidden">
                  {activeEvent.banner_url && (
                    <div className="absolute inset-0 z-0">
                      <img src={activeEvent.banner_url} alt="" className="w-full h-full object-cover opacity-35" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0700] via-[#0d0700]/85 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0700] via-transparent to-transparent" />
                    </div>
                  )}
                  <div className="relative z-10">
                  <div className="p-6 pb-5">
                    <h2 className="text-2xl font-bold text-white font-display mb-1">{activeEvent.title}</h2>
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      Limited-time event <span className="text-amber-700 mx-1">•</span> Bonus loot inside
                    </p>
                  </div>
                  {eventClaimed ? (
                    <div className="px-6 pb-6 flex flex-col items-center text-center gap-3">
                      <p className="text-green-400 font-bold">
                        ✅ Special Event Completed. You have collected {(claimedMonsterId && ALL_MONSTERS[claimedMonsterId]?.name) ?? 'your reward'}!
                      </p>
                      {claimedMonsterId && ALL_MONSTERS[claimedMonsterId] && (
                        <button
                          type="button"
                          onClick={() => { setGuildInitialView('compendium'); setActiveTab('monster'); }}
                          className="cursor-pointer"
                          title="View in Compendium"
                        >
                          <MonsterImage
                            monster={ALL_MONSTERS[claimedMonsterId]}
                            className="w-24 h-24 hover:scale-105 transition-transform"
                            emojiClassName="text-7xl"
                          />
                        </button>
                      )}
                    </div>
                  ) : (
                  <div className="px-6 pb-6">
                    {(activeEvent.details_markdown || activeEvent.reward_lore_markdown) && (
                      <div className="mb-5 space-y-3">
                        {activeEvent.details_markdown && (
                          <div className="text-sm text-gray-300 leading-relaxed">
                            <ReactMarkdown>{activeEvent.details_markdown}</ReactMarkdown>
                          </div>
                        )}
                        {activeEvent.reward_lore_markdown && (
                          <div className="text-sm text-yellow-200/90 leading-relaxed bg-amber-900/10 border border-amber-900/40 rounded-lg p-3">
                            <ReactMarkdown>{activeEvent.reward_lore_markdown}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}
                    {activeEvent.content_source === 'gauntlet' ? (
                      <p className="text-xs text-emerald-400/90 font-bold uppercase tracking-wide">
                        ⚔️ This week's board below is your Topic Mastery Gauntlet — one review session per day.
                      </p>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {eventQuests.map((q) => {
                        const isQuestMastered = eventProgress.some(p => p.event_quest_id === q.id && p.is_mastered);
                        return (
                          <QuestCard
                            key={q.id}
                            subjectName={q.subject_name}
                            completed={isQuestMastered}
                            onEnter={() => {
                              setActiveEventQuest(q.id);
                              // Same fix as the board-quest entry point —
                              // show the notes first, not the ready-confirm
                              // screen, so the read-timer actually engages.
                              setEventQuizPhase('study');
                            }}
                          />
                        );
                      })}
                    </div>
                    )}
                  </div>
                  )}
                  </div>
                </div>
              </div>
            )}

            {bossEventActive && (
              <div className="mb-10">
                {/* overflow-hidden: BossPersonaFan fans its cards out with
                    absolute positioning, which can spill past this box's
                    edges (the source of the horizontal-scroll bug) — clip it
                    here instead of relying solely on the page-level
                    overflow-x guard in globals.css. */}
                <div className="rounded-2xl border-2 border-purple-700/70 bg-gradient-to-br from-[#0d0512] to-black shadow-[0_0_0_2px_#000,0_0_40px_-8px_rgba(147,51,234,0.35)] p-6 overflow-hidden">
                  <h2 className="text-xl font-bold text-white font-display mb-1">Term Boss — The Forgetting</h2>
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wide mb-4">
                    Defeat every persona to push it back
                  </p>
                  <BossPersonaFan
                    personas={getPersonasForGrade(bossGradeLevel)}
                    defeated={bossProgress.defeated}
                    readySubjects={new Set(Object.entries(bossPoolCounts).filter(([, c]) => c >= POOL_READY_THRESHOLD).map(([s]) => s))}
                    onChallenge={(subject) => setActiveBossFight(subject)}
                  />
                </div>
              </div>
            )}

            {WEEKDAYS.map((day) => {
              const isToday = currentDayName === day;
              const gauntletActive = activeEvent?.content_source === 'gauntlet';
              // During a live gauntlet event, that day's slice of the review
              // pool substitutes the normal per-subject cards entirely —
              // mainQuestPackageData is irrelevant this week (break weeks
              // don't get BOW-generated content in the first place, see
              // project_term_break_special_content_plan memory).
              const daySubjects = mainQuestPackageData[day] || {};
              const subjectKeys = Object.keys(daySubjects);
              const gauntletDayQuestions = gauntletDayPools[day] || [];
              const dayFullyMastered = gauntletActive
                ? gauntletDaysDone.has(day)
                : subjectKeys.length > 0 &&
                  subjectKeys.every((subjectName) => (data.mastered_quizzes || []).includes(`${day}_${subjectName}`));

              return (
                <div key={day} className="mb-8" data-tutorial-id={day === openTutorialDayName ? 'board-today-quest' : undefined}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className={`text-sm font-bold uppercase tracking-wide whitespace-nowrap ${isToday ? 'text-amber-600' : 'text-gray-400'}`}>
                      {day} Objectives {isToday && <span className="text-amber-500">⚡ (Current Run)</span>}
                    </h2>
                    <div className={`flex-1 h-px ${isToday ? 'bg-amber-400/50' : 'bg-gray-200'}`} />
                  </div>

                  {dayFullyMastered ? (
                    <p className="text-sm text-green-600 font-bold">✅ {day} Quests Completed</p>
                  ) : gauntletActive ? (
                    gauntletDayQuestions.length === 0 ? (
                      <p className="text-sm text-gray-400">Gathering this day's review questions…</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <QuestCard
                          subjectName="Topic Mastery Gauntlet"
                          completed={false}
                          onEnter={() => setActiveGauntletDay(day)}
                        />
                      </div>
                    )
                  ) : isToday || subjectKeys.length > 0 ? (
                    subjectKeys.length === 0 ? (
                      <p className="text-sm text-gray-400">No quests registered for this specific calendar path.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {subjectKeys.map((subjectName) => (
                          <QuestCard
                            key={subjectName}
                            subjectName={subjectName}
                            completed={(data.mastered_quizzes || []).includes(`${day}_${subjectName}`)}
                            onEnter={() => {
                              setActiveQuest(`${day}_${subjectName}`);
                              // Land on the notes screen first, not the
                              // "ready" confirm screen — that's what was
                              // letting kids skip straight past the summary
                              // without the read-timer ever engaging.
                              setQuizPhase('study');
                            }}
                          />
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              );
            })}

            {/* AchievementsBoard removed — accessible via Hero Profile tab */}
          </div>
        )}

        {/* --- ACTIVE QUEST VIEW --- */}
        {activeTab === 'board' && activeQuest !== null && (() => {
          const [day, subject] = activeQuest.split('_');
          const questData = mainQuestPackageData[day]?.[subject];

          return (
            <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
              {quizPhase === 'study' && (
                <div className="space-y-6">
                  <GameButton variant="quest" color="#d4d4d4" onClick={() => { setActiveQuest(null); setQuizPhase('study'); }} style={{ fontSize: 13 }}>
                    ← Retreat to Map
                  </GameButton>

                  <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-8 rounded-xl shadow-lg">
                    <h2 className="text-3xl font-bold mb-6 text-[#7a4a0f] font-display">Study Session: {subject}</h2>
                    <div className="border-t border-[#c9a87a] pt-6">
                      {questData?.summary_markdown
                        ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{questData.summary_markdown}</ReactMarkdown>
                        : <p className="text-[#3a2610] leading-relaxed">No notes available for this module.</p>}
                    </div>
                  </div>

                  <GameButton
                    variant="quest"
                    color="#eab308"
                    onClick={() => { if (studyReadRemaining <= 0) setQuizPhase('ready'); }}
                    disabled={studyReadRemaining > 0}
                    className="w-full"
                    style={{ fontSize: 18 }}
                  >
                    {studyReadRemaining > 0 ? `🔒 Keep Reading... ${studyReadRemaining}s` : 'I Am Ready To Fight'}
                  </GameButton>
                </div>
              )}

              {quizPhase === 'ready' && (
                <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-12 rounded-2xl text-center shadow-2xl">
                  <p className="text-[#c9781a] font-bold uppercase tracking-wider text-sm mb-2 font-display">{subject} Encounter</p>
                  <h2 className="text-4xl font-display font-bold text-[#2a1505] mb-4">Prepare for Battle</h2>
                  <p className="text-[#6b4820] mb-8 max-w-sm mx-auto">
                    You are about to start the assessment. Once you enter the exam, there is no turning back.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <GameButton variant="quest" color="#d4d4d4" onClick={() => setQuizPhase('study')} style={{ fontSize: 15 }}>
                      Go Back to Notes
                    </GameButton>
                    <GameButton variant="quest" color="#3b82f6" onClick={() => setQuizPhase('quiz')} style={{ fontSize: 15 }}>
                      Start Exam
                    </GameButton>
                  </div>
                </div>
              )}

              {quizPhase === 'quiz' && (
                <QuestModule
                  userId={activeUserId}
                  questName={subject}
                  questKey={activeQuest}
                  questData={questData}
                  currentStats={data.character_stats}
                  attemptsSoFar={(data.quiz_attempts || {})[activeQuest] || 0}
                  isMastered={(data.mastered_quizzes || []).includes(activeQuest)}
                  gradeQuiz={async (selectedAnswers) => {
                    // Every question now carries a stable content_questions.id (Phase 4 Wave 3,
                    // see docs/weekly-progress-redesign-plan.md) — Weekly Review (built
                    // client-side by lib/weeklyReview.ts from real questions pulled out of the
                    // rest of the week) grades through the exact same id-keyed path as a normal
                    // day/subject quiz now, no more bespoke text-matching RPC needed.
                    const quizQuestions: { id: string }[] = questData?.quiz || [];
                    const answers = quizQuestions.map((q, i) => ({
                      question_id: q.id,
                      selected: selectedAnswers[i],
                    }));
                    const { data: graded, error } = await supabase.rpc('grade_content_quiz', {
                      p_user_id: activeUserId,
                      p_answers: answers,
                    });
                    if (error || !graded) throw error || new Error('grade_content_quiz returned no data');
                    return {
                      correct_count: graded.correct_count,
                      total: graded.total,
                      is_perfect: graded.is_perfect,
                      correct_answers: (graded.results || []).map((r: any) => r.correct_answer),
                    };
                  }}
                  onQuizSubmit={(isPerfect, newAttempts, newStats, xpEarned, goldEarned) => {
                    const newQuizAttempts = { ...(data.quiz_attempts || {}), [activeQuest]: newAttempts };
                    if (isPerfect) {
                      const newMasteredQuizzes = [...(data.mastered_quizzes || []), activeQuest];
                      const newMasteryCount = (data.mastery_count || 0) + 1;
                      updateStatsAndJournal(
                        newStats, data.journal_logs,
                        data.purchased_items, newMasteryCount, data.honor_grants,
                        newQuizAttempts, newMasteredQuizzes,
                        data.honor_grants,
                        data.guild_sessions_count || 0,
                        data.monster_battles_won || 0,
                        data.sibling_battles_won || 0,
                        (data.perfect_quizzes || 0) + 1
                      );
                      logAction(activeUserId, data.week_starting_date, 'quiz', `Completed ${subject} in ${newAttempts} attempt(s)`, xpEarned, goldEarned);
                      trackEvent('main_quest_completed', { subject, attempts: newAttempts, xp_earned: xpEarned, gold_earned: goldEarned });
                      if (newStats.level > data.character_stats.level) {
                        logAction(activeUserId, data.week_starting_date, 'achievement', `🎉 Leveled up to Level ${newStats.level}!`, 0, 0);
                        trackEvent('guild_level_up', { new_level: newStats.level });
                      }
                    } else {
                      updateStatsAndJournal(
                        data.character_stats, data.journal_logs,
                        data.purchased_items, data.mastery_count, data.honor_grants,
                        newQuizAttempts, data.mastered_quizzes,
                        data.honor_grants,
                        data.guild_sessions_count || 0,
                        data.monster_battles_won || 0,
                        data.sibling_battles_won || 0,
                        data.perfect_quizzes || 0
                      );
                    }
                  }}
                  onExit={() => {
                    setActiveQuest(null);
                    setQuizPhase('study');
                  }}
                />
              )}
            </div>
          );
        })()}

        {/* --- ACTIVE EVENT QUEST VIEW --- */}
        {activeTab === 'board' && activeEventQuest !== null && activeEvent && (() => {
          const eventQuest = eventQuests.find(q => q.id === activeEventQuest);
          const questRow = eventProgress.find(p => p.event_quest_id === activeEventQuest);

          const handleEventQuizSubmit = (isPerfect: boolean, newAttempts: number, newStats: CharacterStats, xpEarned: number, goldEarned: number) => {
            if (!activeUserId || !activeEvent || !eventQuest) return;
            if (isPerfect) {
              updateStatsAndJournal(newStats, data.journal_logs);
              logAction(activeUserId, data.week_starting_date, 'event_quiz', `Completed event quest ${eventQuest.subject_name} in ${newAttempts} attempt(s)`, xpEarned, goldEarned);
              trackEvent('event_quiz_completed', { event_id: activeEvent.id, subject: eventQuest.subject_name, attempts: newAttempts });
            }
            (async () => {
              await recordEventQuizMastery(activeUserId, activeEvent.id, eventQuest.id, isPerfect, newAttempts);
              const newProgress = await fetchUserEventProgress(activeUserId, activeEvent.id);
              setEventProgress(newProgress);

              if (isPerfect) {
                const allMastered = eventQuests.every(q =>
                  q.id === eventQuest.id || newProgress.some(p => p.event_quest_id === q.id && p.is_mastered)
                );
                if (allMastered) {
                  const gradeLevel = gradeToNumber(USERS[activeUserId]?.grade);
                  const grantedMonsterId = await claimEventReward(activeUserId, activeEvent.id, gradeLevel);
                  if (grantedMonsterId) {
                    setEventClaimed(true);
                    setRevealEventMonster(grantedMonsterId);
                    logAction(activeUserId, data.week_starting_date, 'event_reward', `Completed event: ${activeEvent.title}`, 0, 0);
                    trackEvent('event_reward_claimed', { event_id: activeEvent.id });
                  }
                }
              }
            })();
          };

          return (
            <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
              {eventQuizPhase === 'study' && (
                <div className="space-y-6">
                  <GameButton variant="quest" color="#d4d4d4" onClick={() => { setActiveEventQuest(null); setEventQuizPhase('study'); }} style={{ fontSize: 13 }}>
                    ← Retreat to Map
                  </GameButton>

                  <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-8 rounded-xl shadow-lg">
                    <h2 className="text-3xl font-bold mb-6 text-[#7a4a0f] font-display">Study Session: {eventQuest?.subject_name}</h2>
                    <div className="border-t border-[#c9a87a] pt-6">
                      {eventQuest?.summary_markdown
                        ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{eventQuest.summary_markdown}</ReactMarkdown>
                        : <p className="text-[#3a2610] leading-relaxed">No notes available for this module.</p>}
                    </div>
                  </div>

                  <GameButton
                    variant="quest"
                    color="#d97706"
                    onClick={() => { if (eventStudyReadRemaining <= 0) setEventQuizPhase('ready'); }}
                    disabled={eventStudyReadRemaining > 0}
                    className="w-full"
                    style={{ fontSize: 18 }}
                  >
                    {eventStudyReadRemaining > 0 ? `🔒 Keep Reading... ${eventStudyReadRemaining}s` : 'I Am Ready To Fight'}
                  </GameButton>
                </div>
              )}

              {eventQuizPhase === 'ready' && (
                <div className="bg-[#f0ddb8] border border-[#8b5e2a] p-12 rounded-2xl text-center shadow-2xl">
                  <p className="text-[#c9781a] font-bold uppercase tracking-wider text-sm mb-2 font-display">{eventQuest?.subject_name} Encounter</p>
                  <h2 className="text-4xl font-display font-bold text-[#2a1505] mb-4">Prepare for Battle</h2>
                  <p className="text-[#6b4820] mb-8 max-w-sm mx-auto">
                    You are about to start the event assessment. Once you enter the exam, there is no turning back.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <GameButton variant="quest" color="#d4d4d4" onClick={() => setEventQuizPhase('study')} style={{ fontSize: 15 }}>
                      Go Back to Notes
                    </GameButton>
                    <GameButton variant="quest" color="#d97706" onClick={() => setEventQuizPhase('quiz')} style={{ fontSize: 15 }}>
                      Start Exam
                    </GameButton>
                  </div>
                </div>
              )}

              {eventQuizPhase === 'quiz' && eventQuest && (
                <QuestModule
                  userId={activeUserId}
                  questName={eventQuest.subject_name}
                  questKey={`event_${eventQuest.id}`}
                  questData={eventQuest}
                  currentStats={data.character_stats}
                  attemptsSoFar={questRow?.attempts || 0}
                  isMastered={!!questRow?.is_mastered}
                  gradeQuiz={async (selectedAnswers) => {
                    const { data: graded, error } = await supabase.rpc('grade_event_quiz', {
                      p_event_quest_id: eventQuest.id,
                      p_selected: selectedAnswers,
                    });
                    if (error || !graded) throw error || new Error('grade_event_quiz returned no data');
                    return {
                      correct_count: graded.correct_count,
                      total: graded.total,
                      is_perfect: graded.is_perfect,
                      correct_answers: graded.correct_answers,
                    };
                  }}
                  onQuizSubmit={handleEventQuizSubmit}
                  onExit={() => {
                    setActiveEventQuest(null);
                    setEventQuizPhase('study');
                  }}
                />
              )}
            </div>
          );
        })()}

        {/* --- ACTIVE BOSS FIGHT VIEW --- */}
        {activeTab === 'board' && activeBossFight !== null && (
          <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
            <GameButton variant="quest" color="#d4d4d4" onClick={() => setActiveBossFight(null)} className="mb-4" style={{ fontSize: 13 }}>
              ← Retreat to Map
            </GameButton>
            <BossFightScreen
              userId={activeUserId}
              grade={bossGradeLevel}
              subject={activeBossFight}
              otherPersonas={getPersonasForGrade(bossGradeLevel).filter(
                p => p.subject !== activeBossFight && !bossProgress.defeated.has(p.subject)
              )}
              onExit={(defeated) => {
                setActiveBossFight(null);
                if (defeated) bossProgress.refresh();
              }}
            />
          </div>
        )}

        {/* --- ACTIVE TOPIC MASTERY GAUNTLET VIEW --- */}
        {activeTab === 'board' && activeGauntletDay !== null && activeEvent && (
          <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
            <GameButton
              onClick={() => setActiveGauntletDay(null)}
              className="text-[#6b4820] hover:text-[#2a1505] flex items-center text-sm font-bold transition-colors mb-4"
            >
              ← Retreat to Map
            </GameButton>
            <MasteryGauntletScreen
              userId={activeUserId}
              grade={gradeToNumber(USERS[activeUserId]?.grade)}
              term={activeEvent.gauntlet_term ?? 1}
              day={activeGauntletDay}
              pool={gauntletDayPools[activeGauntletDay] || []}
              eventTitle={activeEvent.title}
              onExit={async (completedThisDay) => {
                const day = activeGauntletDay;
                setActiveGauntletDay(null);
                if (!completedThisDay || !day) return;
                const grade = gradeToNumber(USERS[activeUserId]?.grade);
                const term = activeEvent.gauntlet_term ?? 1;
                await markGauntletDayComplete(activeUserId, activeEvent.id, grade, term, day);
                const daysDone = await fetchGauntletDaysDone(activeUserId, activeEvent.id);
                setGauntletDaysDone(daysDone);
                if (daysDone.size >= WEEKDAYS.length) {
                  const { data: grantedMonsterId } = await supabase.rpc('claim_event_reward', {
                    p_event_id: activeEvent.id,
                    p_user_id: activeUserId,
                    p_grade_level: grade,
                  });
                  if (grantedMonsterId) {
                    setRevealEventMonster(grantedMonsterId);
                    logAction(activeUserId, data.week_starting_date, 'event_reward', `Completed event: ${activeEvent.title}`, 0, 0);
                    trackEvent('event_reward_claimed', { event_id: activeEvent.id });
                  }
                  loadEventData(activeUserId);
                }
              }}
            />
          </div>
        )}

        {/* --- TAB B: REWARDS VAULT / SHOP --- */}
        {activeTab === 'vault' && !USERS[activeUserId].isFamily && (
          <MonsterShop
            userId={activeUserId}
            currentStats={data.character_stats}
            onSpendGold={setCharacterStatsDirect}
            onThemeChange={handleThemeChange}
          />
        )}

        {activeTab === 'vault' && USERS[activeUserId].isFamily && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <h1 className="text-3xl font-bold font-display text-gray-900">The Gold Token Rewards Vault</h1>
              <div className="flex items-center gap-1.5 bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-full px-3 py-1.5 shadow-[2px_2px_0_0_#000] flex-shrink-0">
                <img src="/icons/rewards/gold_coin.svg" alt="" className="w-4 h-4" />
                <span className="text-[#c9781a] font-extrabold text-sm">{data.character_stats.gold}</span>
              </div>
            </div>
            <p className="text-gray-400 mb-8">
              Spend your hard-earned Gold on real-world rewards from the catalog below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Object.entries(VAULT_CATALOG).map(([key, item]) => {
                const affordable = data.character_stats.gold >= item.cost;
                return (
                  <div key={key} className="bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-2xl p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full">
                    <div>
                      <h3 className="text-lg font-bold text-[#2a1505] leading-tight mb-2">{item.name}</h3>
                      <div className="mb-3">
                        <span className={`inline-flex items-center gap-1 border-2 border-[#000000] text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${affordable ? 'bg-[#47982a] text-black shadow-[2px_2px_0_0_#000]' : 'bg-[#e8d0a0]/60 text-[#6b4820]'}`}>
                          <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3 h-3" /> {item.cost} GOLD
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-6">{item.desc}</p>
                    </div>
                    <motion.button
                      onClick={() => handleClaimReward(item.cost, item.name, key)}
                      whileHover={affordable ? { scale: 1.02 } : {}}
                      whileTap={affordable ? { scale: 0.95 } : {}}
                      className="w-full py-2.5 rounded-lg font-extrabold text-sm uppercase tracking-wide text-black bg-yellow-500 hover:bg-yellow-400 border-2 border-[#000000] shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:bg-[#e8d0a0] disabled:text-[#a8916a] disabled:shadow-none disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 transition-all"
                      disabled={!affordable || claimingKey === key}
                    >
                      {claimingKey === key ? 'Claiming...' : affordable ? 'Claim Reward' : 'Not Enough Gold'}
                    </motion.button>
                  </div>
                );
              })}
            </div>

            {/* Monster Arena Shop for family too */}
            <div className="mt-12">
              <MonsterShop
                userId={activeUserId}
                currentStats={data.character_stats}
                onSpendGold={setCharacterStatsDirect}
                onThemeChange={handleThemeChange}
              />
            </div>

            {/* My Claimed Rewards — filtered to this user */}
            <div className="mt-10 bg-[#f0ddb8] border border-[#8b5e2a] p-8 rounded-xl shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#c9a87a] pb-4 mb-6">
                <h2 className="text-2xl font-bold text-[#7a4a0f] font-display"><img src="/icons/rewards/package.svg" alt="" className="inline w-5 h-5 align-[-4px] mr-1" /> My Claimed Rewards</h2>
                <span className="bg-[#c9781a]/20 text-[#7a4a0f] text-xs font-bold px-3 py-1 rounded-full border border-[#8b5e2a]">
                  {myClaims.length} TOTAL
                </span>
              </div>

              {(() => {
                const countOf = (key: string) => myClaims.filter(c => c.item_key === key).length;
                const pendingCountOf = (key: string) => myClaims.filter(c => c.item_key === key && c.status === 'pending').length;
                const voucherCount = countOf('voucher_30m');
                const aiLordingCount = countOf('ai_lording');
                const jollibeeCount = countOf('jollibee_burger');
                // Tatay marks a claim "supplied" only after the hours have already
                // been used (usually Fri/Sat), so remaining claimable hours are the
                // ones still pending — not yet spent.
                const totalClaimableHours = (pendingCountOf('voucher_30m') + pendingCountOf('ai_lording')) * 0.5;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-sm">
                    <div className="bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                      <p className="text-[#6b4820] text-xs">🎮 Gaming Voucher</p>
                      <p className="font-bold text-[#2a1505]">{voucherCount}</p>
                    </div>
                    <div className="bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                      <p className="text-[#6b4820] text-xs">🧙‍♂️ AI Lording</p>
                      <p className="font-bold text-[#2a1505]">{aiLordingCount}</p>
                    </div>
                    <div className="bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                      <p className="text-[#6b4820] text-xs">🍔 Jollibee Yumburger</p>
                      <p className="font-bold text-[#2a1505]">{jollibeeCount}</p>
                    </div>
                    <div className="bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                      <p className="text-[#6b4820] text-xs">⏱️ Total Claimable Hours</p>
                      <p className="font-bold text-[#c9781a]">{totalClaimableHours}</p>
                      <p className="text-[10px] text-[#8b7355] mt-0.5">still unused, spend by Saturday</p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {myClaims.length > 0 ? (
                  [...myClaims]
                    .sort((a, b) => {
                      if (a.status === 'pending' && b.status !== 'pending') return -1;
                      if (a.status !== 'pending' && b.status === 'pending') return 1;
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((claim) => (
                    <div key={claim.id} className="flex justify-between items-center bg-[#e8d0a0]/60 p-3 rounded border border-[#c9a87a]">
                      <div>
                        <p className="font-bold text-[#2a1505]">{claim.item_name}</p>
                        <p className="text-xs text-[#6b4820]">{new Date(claim.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        claim.status === 'pending'
                          ? 'bg-[#f0ddb8] text-[#7a4a0f] border-[#8b5e2a]'
                          : 'bg-[#e8f5e0] text-green-800 border-green-700'
                      }`}>
                        {claim.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[#6b4820] text-sm italic">No rewards claimed yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vault' && <VaultKeeperNpc key={vaultGreetKey} />}

        {/* --- TAB: SIDE QUEST GUILDS --- */}
        {activeTab === 'guilds' && (
          <div>
            {activeGuild === null ? (
              <div className="battle-panel-in" data-tutorial-id="guilds-welcome">
                {/* Same Bungee/stroke/shadow text treatment as the quest
                    GameButton's label (2026-08-29), in quest gold instead
                    of the button's white. */}
                <h1 className="text-2xl lg:text-3xl mt-4 mb-4" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    <span aria-hidden style={questTextShadowStyle}>Side Quest Guilds</span>
                    <span style={{ ...questTextStyle, color: '#f5c542' }}>Side Quest Guilds</span>
                  </span>
                </h1>
                <p className="text-gray-500 mb-4 text-sm">Five guilds, five skills — pick one below to earn extra XP and Gold.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {([
                    { key: 'lorekeeper' as GuildKey, guild: 'lorekeeper' as const, name: 'Lorekeeper', desc: 'English guild — Time Attack reading & grammar challenges.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#34d399', badge: 'bg-emerald-50 text-emerald-700', contentBg: 'bg-emerald-50', bg: '/guilds/lorekeeper-bg.png', lvl: guildProfile?.lorekeeper_lvl, tier: guildProfile?.lorekeeper_tier },
                    { key: 'spellcaster' as GuildKey, guild: 'spellcaster' as const, name: 'SpellCaster', desc: 'Typing guild — Real-time speed spelling under the clock.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#a78bfa', badge: 'bg-violet-50 text-violet-700', contentBg: 'bg-violet-50', bg: '/guilds/spell-bg.png', lvl: guildProfile?.spellcaster_lvl, tier: guildProfile?.spellcaster_tier },
                    { key: 'number_realm' as GuildKey, guild: 'numberrealm' as const, name: 'Number Realm', desc: 'Math guild — Fractions, time, and operations at speed.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#fbbf24', badge: 'bg-amber-50 text-amber-700', contentBg: 'bg-amber-50', bg: '/guilds/number-bg.png', lvl: guildProfile?.number_realm_lvl, tier: guildProfile?.number_realm_tier },
                    { key: 'logic_labyrinth' as GuildKey, guild: 'logiclabyrinth' as const, name: 'Logic Labyrinth', desc: 'IQ guild — Pattern matrices and deduction puzzles.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#22d3ee', badge: 'bg-cyan-50 text-cyan-700', contentBg: 'bg-cyan-50', bg: '/guilds/logic-bg.png', lvl: guildProfile?.logic_labyrinth_lvl, tier: guildProfile?.logic_labyrinth_tier },
                    { key: 'lexicon_arena' as GuildKey, guild: 'lexiconarena' as const, name: 'Lexicon Arena', desc: 'Spelling guild — Read the definition, pick the correct spelling before time runs out.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#818cf8', badge: 'bg-indigo-50 text-indigo-700', contentBg: 'bg-indigo-50', bg: '/guilds/lex-bg.png', lvl: guildProfile?.lexicon_arena_lvl, tier: guildProfile?.lexicon_arena_tier },
                  ]).map((g, i) => (
                    <motion.div
                      key={g.key}
                      onClick={() => setActiveGuild(g.key)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveGuild(g.key); }}
                      role="button"
                      tabIndex={0}
                      whileHover="hover"
                      whileTap={{ scale: 0.98 }}
                      variants={{ hover: {} }}
                      data-tutorial-id={i === 0 ? 'guilds-first-tile' : undefined}
                      className={`overflow-hidden bg-white border-2 ${g.border} rounded-2xl text-center transition-colors flex flex-col items-center shadow-sm cursor-pointer`}
                    >
                      {/* Sprite zone — bg image only here */}
                      <div className="relative overflow-hidden w-full flex justify-center pt-5 pb-3 px-5">
                        {g.bg && (
                          <motion.img
                            src={g.bg}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            initial={{ scale: 1.08 }}
                            variants={{ hover: { scale: 1.0 } }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                          />
                        )}
                        <div className="relative z-10 w-32 h-32">
                          <GuardianSprite guild={g.guild} pose="idle" className="w-full h-full" />
                        </div>
                      </div>
                      {/* Content zone — always plain white */}
                      <div className={`w-full flex flex-col items-center gap-1.5 px-5 pb-5 pt-3 ${g.contentBg}`}>
                        <div className="flex items-center gap-2">
                          {/* Same Bungee/stroke/shadow text treatment as the quest
                              GameButton's label, but keeping each guild's own theme
                              hue as the fill instead of the button's white
                              (2026-08-29) — reuses GameButton's exported style
                              constants rather than re-deriving the em ratios. */}
                          <h3 className="text-xl font-extrabold" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                            <span style={{ position: 'relative', display: 'inline-block' }}>
                              <span aria-hidden style={questTextShadowStyle}>{g.name}</span>
                              <span style={{ position: 'relative', color: g.titleColor, WebkitTextStroke: '0.0952em #000', paintOrder: 'stroke fill' as const, textTransform: 'uppercase' as const }}>{g.name}</span>
                            </span>
                          </h3>
                          {typeof g.lvl === 'number' && (
                            <span className={`text-xs font-mono font-bold ${g.badge} rounded-full px-2 py-0.5 shrink-0`}>
                              Lvl {g.lvl}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 font-medium">{g.desc}</p>
                        <div className="mt-1">
                          <GameButton variant="quest" style={{ fontSize: 15 }}>Enter</GameButton>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative -mx-4 lg:-mx-8">
                <img
                  src={({ lorekeeper: '/guilds/lorekeeper-bg.png', spellcaster: '/guilds/spell-bg.png', number_realm: '/guilds/number-bg.png', logic_labyrinth: '/guilds/logic-bg.png', lexicon_arena: '/guilds/lex-bg.png' } as Record<string, string>)[activeGuild] ?? ''}
                  alt=""
                  className="fixed inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ zIndex: 0, filter: 'blur(6px)', transform: 'scale(1.05)' }}
                />
                <div className="relative px-4 lg:px-8 pt-6 pb-12">
                  {activeGuild === 'lorekeeper' ? (
                    <Lorekeeper
                      userId={activeUserId}
                      weekStartingDate={data.week_starting_date}
                      currentStats={data.character_stats}
                      onGoldEarned={handleGuildGoldEarned}
                      onExit={() => setActiveGuild(null)}
                    />
                  ) : activeGuild === 'spellcaster' ? (
                    <SpellCaster
                      userId={activeUserId}
                      weekStartingDate={data.week_starting_date}
                      currentStats={data.character_stats}
                      onGoldEarned={handleGuildGoldEarned}
                      onExit={() => setActiveGuild(null)}
                    />
                  ) : activeGuild === 'number_realm' ? (
                    <NumberRealm
                      userId={activeUserId}
                      weekStartingDate={data.week_starting_date}
                      currentStats={data.character_stats}
                      onGoldEarned={handleGuildGoldEarned}
                      onExit={() => setActiveGuild(null)}
                    />
                  ) : activeGuild === 'logic_labyrinth' ? (
                    <LogicLabyrinth
                      userId={activeUserId}
                      weekStartingDate={data.week_starting_date}
                      currentStats={data.character_stats}
                      onGoldEarned={handleGuildGoldEarned}
                      onExit={() => setActiveGuild(null)}
                    />
                  ) : activeGuild === 'lexicon_arena' ? (
                    <LexiconArena
                      userId={activeUserId}
                      weekStartingDate={data.week_starting_date}
                      currentStats={data.character_stats}
                      onGoldEarned={handleGuildGoldEarned}
                      onExit={() => setActiveGuild(null)}
                    />
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: JOURNAL --- */}
        {activeTab === 'journal' && (
          <div data-tutorial-id="journal-welcome">
            {/* Same Bungee/stroke/shadow text treatment as the quest
                GameButton's label (2026-08-29), in quest gold instead of
                the button's white. */}
            <h1 className="text-2xl lg:text-3xl mb-2" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span aria-hidden style={questTextShadowStyle}>Guild Journal</span>
                <span style={{ ...questTextStyle, color: '#f5c542' }}>Guild Journal</span>
              </span>
            </h1>
            <p className="text-gray-500 mb-8">Reflect on today's run and seal your ledger entry to claim your reward.</p>
            <GuildJournal
              userId={activeUserId}
              journalLogs={data.journal_logs || {}}
              stats={data.character_stats}
              currentSunday={data.week_starting_date}
              onSave={updateStatsAndJournal}
            />
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mt-6 mb-2">Player Log</h3>
            <PlayerLog userId={activeUserId} />
          </div>
        )}

        {/* --- TAB: TO-DO --- */}
        {activeTab === 'todo' && (
          <div>
            <div className="flex items-center justify-between gap-3 mt-4 mb-2" data-tutorial-id="todo-welcome">
              {/* Same Bungee/stroke/shadow text treatment as the quest
                  GameButton's label (2026-08-29), in quest gold instead of
                  the button's white. */}
              <h1 className="text-2xl lg:text-3xl" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span aria-hidden style={questTextShadowStyle}>Daily To-Dos</span>
                  <span style={{ ...questTextStyle, color: '#f5c542' }}>Daily To-Dos</span>
                </span>
              </h1>
              {todoCount && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0
                  ${todoCount.done === todoCount.total ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {todoCount.done}/{todoCount.total} done
                </span>
              )}
            </div>
            <p className="text-gray-500 mb-6">Clear today's checklist to claim your daily bonus gold.</p>
            <DailyChecklist
              userId={activeUserId}
              grade={gradeToNumber(USERS[activeUserId]?.grade)}
              currentSunday={data.week_starting_date}
              currentDayName={currentDayName}
              packageData={mainQuestPackageData}
              journalLogs={data.journal_logs}
              masteredQuizzes={data.mastered_quizzes}
              onGoldAwarded={applyGoldDelta}
              onPlayGuild={(guildKey) => { setActiveTab('guilds'); setActiveGuild(guildKey); }}
              onGoToJournal={() => setActiveTab('journal')}
              onGoToMainQuest={() => { setActiveTab('board'); setActiveQuest(null); }}
              onGoToTrainingMap={() => setActiveTab('monster')}
              onCountChange={handleTodoCountChange}
            />
          </div>
        )}

        {/* --- TAB: PROFILE --- */}
        {activeTab === 'profile' && (
          <div>
            <h1 className="text-3xl font-bold mb-2 font-display text-gray-900">Hero Profile</h1>
            <p className="text-gray-500 mb-8">Your rank, stats, and everything you've earned on the journey so far.</p>
            <HeroProfile
              userId={activeUserId}
              data={data}
              currentDay={currentDayName}
              onViewAchievements={() => setActiveTab('profile')}
            />
          </div>
        )}

        {/* --- TAB: ADMIN --- */}

        {activeTab === 'monster' && <CurioExpertNpc key={curioGreetKey} />}

        {activeTab === 'monster' && (
          <MonsterGuild
            userId={activeUserId}
            playerLevel={data.character_stats.level}
            currentGold={data.character_stats.gold}
            packageData={packageData}
            weekStartingDate={data.week_starting_date}
            initialView={guildInitialView}
            onBattleWon={(kind) => updateStatsAndJournal(
              data.character_stats, data.journal_logs,
              data.purchased_items, data.mastery_count, data.honor_grants,
              data.quiz_attempts || {}, data.mastered_quizzes || [],
              data.honor_grants,
              data.guild_sessions_count || 0,
              (data.monster_battles_won || 0) + (kind === 'trainer' ? 1 : 0),
              (data.sibling_battles_won || 0) + (kind === 'sibling' ? 1 : 0),
              data.perfect_quizzes || 0,
              (data.dummy_battles_won || 0) + (kind === 'dummy' ? 1 : 0)
            )}
            onGoldAwarded={(amount) => updateStatsAndJournal(
              { ...data.character_stats, gold: data.character_stats.gold + amount },
              data.journal_logs
            )}
            onGoldSynced={setCharacterStatsDirect}
            onProgressSynced={syncCharacterStats}
            onEggBadgeChange={setHasEggReadyCurio}
            eggRefreshSignal={eggRefreshSignal}
            onGraduated={() => bumpCounters({ curios_graduated: 1 })}
            onTutored={() => bumpCounters({ tutor_rerolls: 1 })}
            onTradeConfirmed={() => bumpCounters({ trades_completed: 1 })}
            onLegendaryCaught={() => bumpCounters({ legendaries_caught: 1 })}
            onTatayBattleResult={(won) => bumpCounters(won ? { tatay_battles_won: 1 } : { tatay_battles_lost: 1 })}
          />
        )}

        {/* --- TAB: CODEX --- */}
        {activeTab === 'codex' && <CodexPanel />}

        </motion.div>
        </AnimatePresence>

        <AchievementToast
          userId={activeUserId}
          newlyUnlocked={newlyUnlocked}
          onDismissAll={clearNotifications}
        />
        <Toast
          message={toast.message}
          show={toast.show}
          onClose={() => setToast({ show: false, message: '' })}
        />
        {showEventPopup && activeEvent && (
          <EventAnnouncementPopup event={activeEvent} onDismiss={handleDismissEventPopup} />
        )}
        {revealEventMonster && ALL_MONSTERS[revealEventMonster] && activeUserId && (
          <CurioRevealModal
            monster={ALL_MONSTERS[revealEventMonster]}
            userId={activeUserId}
            onClose={() => setRevealEventMonster(null)}
          />
        )}

        {/* Floating utility rail removed — music/sfx moved into nav drawer */}
      </main>
    </div>
      </div>
      </div>
    </>
  );
}
