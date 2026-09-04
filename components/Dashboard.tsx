// components/Dashboard.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UserId, getActiveUser, clearActiveUser, loadAllUsersData, saveTheme, linkIdentity, recordLastLogin, USERS, gradeToNumber } from '@/lib/userSession';
import { THEME_CLASSES, getThemeItem } from '@/lib/themeShop';
import SplashScreen from '@/components/SplashScreen';
import LoadingScreen from '@/components/LoadingScreen';
import { useWeeklyData, CharacterStats } from '@/hooks/useWeeklyData';
import { markGuildSessionToday, GuildKey, GUILDS, fetchDailyChecklistStreak } from '@/lib/dailyChecklist';
import { buildWeeklyReviewDay } from '@/lib/weeklyReview';
import { useReadTimer } from '@/hooks/useReadTimer';
import { format } from 'date-fns';
import AchievementsBoard from '@/components/AchievementsBoard';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/playerlog';
import { trackEvent } from '@/lib/analytics';
import MonsterGuild from '@/components/MonsterGuild';
import CodexPanel from '@/components/CodexPanel';
import { playShopPurchase, playPageFlip, startMainTheme, stopMainTheme, startTermBossTheme, stopTermBossTheme, isSfxEnabled, isMusicEnabled, setSfxEnabled, setMusicEnabled } from '@/lib/sounds';
import Toast from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import AchievementToast from '@/components/AchievementToast';
import { useAchievementNotifier } from '@/hooks/useAchievementNotifier';
import { fetchSubclassProfile, SubclassProfile } from '@/lib/guildEngine';
import { prefetchAllTabs } from '@/lib/tabPrefetch';
import { claimRegistrantReward, fetchNotifications, markNotificationsRead, getMyReferralKey, PlayerNotification } from '@/lib/referral';
import { claimMarketingGoldBonus } from '@/lib/marketingBonus';
import { claimPushGoldBonusChild, claimPushGoldBonusParent } from '@/lib/pushBonus';
import { autoPromptForPush, sendPushToSelf } from '@/lib/push';
import type { GuildView } from '@/components/monster/types';

// Runtime mirror of the GuildView union — needed to validate a query-param
// value (`?view=`) at runtime, since a type alone can't check a string
// pulled from window.location at deep-link time.
const GUILD_VIEWS: readonly GuildView[] = ['map', 'team', 'trainers', 'compendium', 'battle', 'live_battle', 'leaderboard', 'trade', 'hatchery'];
import BoardMapView from '@/components/dashboard/board/BoardMapView';
import ActiveQuestView from '@/components/dashboard/board/ActiveQuestView';
import ActiveEventQuestView from '@/components/dashboard/board/ActiveEventQuestView';
import ActiveBossFightView from '@/components/dashboard/board/ActiveBossFightView';
import ActiveGauntletDayView from '@/components/dashboard/board/ActiveGauntletDayView';
import JournalTab from '@/components/dashboard/JournalTab';
import TodoTab from '@/components/dashboard/TodoTab';
import ProfileTab from '@/components/dashboard/ProfileTab';
import GuildsTab from '@/components/dashboard/GuildsTab';
import VaultTab from '@/components/dashboard/VaultTab';
import VaultKeeperNpc from '@/components/VaultKeeperNpc';
import CurioExpertNpc from '@/components/CurioExpertNpc';
import EventAnnouncementPopup from '@/components/EventAnnouncementPopup';
import CurioRevealModal from '@/components/CurioRevealModal';
import LinkParentBanner from '@/components/LinkParentBanner';
import InstallNudge from '@/components/InstallNudge';
import SidebarRail, { RailTabId } from '@/components/SidebarRail';
import TutorialSpotlight from '@/components/TutorialSpotlight';
import { useTutorialSequence, TutorialStep } from '@/hooks/useTutorialSequence';
import { useTabTutorialGate } from '@/hooks/useTabTutorialGate';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
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
} from '@/lib/customEvents';
import BossMistOverlay from '@/components/BossMistOverlay';
import BossCutscene from '@/components/BossCutscene';
import { useBossFightProgress } from '@/hooks/useBossFightProgress';
import { getPersonasForGrade, isBossFightGrade, hasCutsceneBeenSeen, markCutsceneSeen } from '@/lib/bossPersonas';
import { fetchBossPoolCounts, BossQuestion } from '@/lib/bossFightEngine';
import {
  fetchGauntletQuestionPool,
  fetchGauntletMistakes,
  buildMasteryGauntletPool,
  splitPoolIntoDays,
  fetchGauntletDaysDone,
} from '@/lib/masteryGauntletEngine';
import { CURRENT_TERM } from '@/lib/guildConfig';
import { WEEKDAYS } from '@/lib/weekdays';

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
            // Self-notification — the hatch is already visible in-session via
            // EggHatchModal, but a push also confirms it landed on other
            // devices/tabs and matches the other event types below. Purely
            // client-triggered (no cron needed): hatching only ever happens
            // during a session, unlike mission completion.
            const firstSpecies = ALL_MONSTERS[result.hatched[0].species_id]?.name ?? result.hatched[0].species_id;
            const title = result.hatched.length > 1 ? 'Eggs Hatched! 🐣' : 'Egg Hatched! 🐣';
            const body = result.hatched.length > 1
              ? `${result.hatched.length} eggs hatched, including a ${firstSpecies}!`
              : `Your egg hatched into a ${firstSpecies}!`;
            // '/play' is a static marketing landing page, never the actual
            // game (that's root '/', which Dashboard itself renders) —
            // every push notification's url was wrongly pointing at '/play'
            // until this was caught. Deep-links straight to the Hatchery.
            sendPushToSelf({ kind: 'app_user', id: activeUserId }, title, body, '/?tab=monster&view=hatchery');
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

        // Push notifications: fire the browser's native permission prompt
        // automatically (once per browser) instead of waiting for the kid to
        // find the Profile tab's manual toggle, then claim the self-opt-in
        // bonus — chained after the prompt settles, not fired in parallel:
        // the native dialog can sit open for several seconds while a human
        // reads and taps it, and claiming immediately raced the subscription
        // write every time (confirmed live — the RPC ran ~4s before the
        // subscription row existed, so it always found nothing to award).
        autoPromptForPush({ kind: 'app_user', id: activeUserId }).then(() => {
          claimPushGoldBonusChild(activeUserId).then(reward => {
            if (reward) {
              setToast({
                show: true,
                message: `🔔 Notifications on! +${reward.gold} Gold added to your account!`,
              });
            }
          });
        });
        // The parent-opt-in bonus doesn't depend on anything happening in
        // this page load (it's the parent's own subscription, from their own
        // device/session) — safe to check immediately, same as the other
        // idempotent bonus claims above.
        claimPushGoldBonusParent(activeUserId).then(reward => {
          if (reward) {
            setToast({
              show: true,
              message: `🔔 Your parent turned on notifications! +${reward.gold} Gold added to your account!`,
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
  const [guildInitialView, setGuildInitialView] = useState<GuildView | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const view = new URLSearchParams(window.location.search).get('view');
    return (GUILD_VIEWS as readonly string[]).includes(view ?? '') ? (view as GuildView) : undefined;
  });
  const [guildProfile, setGuildProfile] = useState<SubclassProfile | null>(null);

  // Push-notification deep links (see lib/push.ts / push_notification_queue
  // inserts) land on '/' with a `?tab=` (and optionally `?view=`, read into
  // guildInitialView above) query param. One-shot at mount, same lifecycle
  // as guildInitialView below — then strips the params so a later refresh
  // doesn't keep re-forcing the tab, and a manual tab switch isn't fighting
  // a URL that still says otherwise.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (!tab) return;
    setActiveTab(tab);
    if (params.has('view') || params.has('tab')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <InstallNudge userId={activeUserId} />
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
        notifications={notifications}
        onMarkNotificationsRead={() => {
          if (!activeUserId) return;
          markNotificationsRead(activeUserId);
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }}
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
          <BoardMapView
            activeUserId={activeUserId}
            loginStreak={loginStreak}
            totalQuests={totalQuests}
            masteredQuizzes={data.mastered_quizzes}
            dashReferralKey={dashReferralKey}
            activeEvent={activeEvent}
            eventClaimed={eventClaimed}
            claimedMonsterId={claimedMonsterId}
            onViewClaimedInCompendium={() => { setGuildInitialView('compendium'); setActiveTab('monster'); }}
            eventQuests={eventQuests}
            eventProgress={eventProgress}
            onEnterEventQuest={(questId) => {
              setActiveEventQuest(questId);
              // Same fix as the board-quest entry point — show the notes
              // first, not the ready-confirm screen, so the read-timer
              // actually engages.
              setEventQuizPhase('study');
            }}
            bossEventActive={bossEventActive}
            bossGradeLevel={bossGradeLevel}
            bossDefeated={bossProgress.defeated}
            bossPoolCounts={bossPoolCounts}
            onChallengeBoss={(subject) => setActiveBossFight(subject)}
            currentDayName={currentDayName}
            mainQuestPackageData={mainQuestPackageData}
            gauntletDayPools={gauntletDayPools}
            gauntletDaysDone={gauntletDaysDone}
            onEnterGauntletDay={(day) => setActiveGauntletDay(day)}
            openTutorialDayName={openTutorialDayName}
            onEnterQuest={(questKey) => {
              setActiveQuest(questKey);
              // Land on the notes screen first, not the "ready" confirm
              // screen — that's what was letting kids skip straight past
              // the summary without the read-timer ever engaging.
              setQuizPhase('study');
            }}
          />
        )}

        {/* --- ACTIVE QUEST VIEW --- */}
        {activeTab === 'board' && activeQuest !== null && (
          <ActiveQuestView
            activeUserId={activeUserId}
            activeQuest={activeQuest}
            mainQuestPackageData={mainQuestPackageData}
            quizPhase={quizPhase}
            setQuizPhase={setQuizPhase}
            setActiveQuest={setActiveQuest}
            studyReadRemaining={studyReadRemaining}
            data={data}
            updateStatsAndJournal={updateStatsAndJournal}
          />
        )}

        {/* --- ACTIVE EVENT QUEST VIEW --- */}
        {activeTab === 'board' && activeEventQuest !== null && activeEvent && (
          <ActiveEventQuestView
            activeUserId={activeUserId}
            activeEvent={activeEvent}
            eventQuests={eventQuests}
            activeEventQuest={activeEventQuest}
            eventQuizPhase={eventQuizPhase}
            setEventQuizPhase={setEventQuizPhase}
            setActiveEventQuest={setActiveEventQuest}
            eventStudyReadRemaining={eventStudyReadRemaining}
            data={data}
            updateStatsAndJournal={updateStatsAndJournal}
            eventProgress={eventProgress}
            setEventProgress={setEventProgress}
            setEventClaimed={setEventClaimed}
            setRevealEventMonster={setRevealEventMonster}
          />
        )}

        {/* --- ACTIVE BOSS FIGHT VIEW --- */}
        {activeTab === 'board' && activeBossFight !== null && (
          <ActiveBossFightView
            activeUserId={activeUserId}
            bossGradeLevel={bossGradeLevel}
            activeBossFight={activeBossFight}
            bossDefeated={bossProgress.defeated}
            onExit={(defeated) => {
              setActiveBossFight(null);
              if (defeated) bossProgress.refresh();
            }}
          />
        )}

        {/* --- ACTIVE TOPIC MASTERY GAUNTLET VIEW --- */}
        {activeTab === 'board' && activeGauntletDay !== null && activeEvent && (
          <ActiveGauntletDayView
            activeUserId={activeUserId}
            activeEvent={activeEvent}
            activeGauntletDay={activeGauntletDay}
            gauntletDayPools={gauntletDayPools}
            weekStartingDate={data.week_starting_date}
            setActiveGauntletDay={setActiveGauntletDay}
            setGauntletDaysDone={setGauntletDaysDone}
            setRevealEventMonster={setRevealEventMonster}
            loadEventData={loadEventData}
          />
        )}

        {/* --- TAB B: REWARDS VAULT / SHOP --- */}
        {activeTab === 'vault' && (
          <VaultTab
            activeUserId={activeUserId}
            isFamily={USERS[activeUserId].isFamily}
            characterStats={data.character_stats}
            onSpendGold={setCharacterStatsDirect}
            onThemeChange={handleThemeChange}
            handleClaimReward={handleClaimReward}
            claimingKey={claimingKey}
            myClaims={myClaims}
          />
        )}

        {activeTab === 'vault' && <VaultKeeperNpc key={vaultGreetKey} />}

        {/* --- TAB: SIDE QUEST GUILDS --- */}
        {activeTab === 'guilds' && (
          <GuildsTab
            activeGuild={activeGuild}
            setActiveGuild={setActiveGuild}
            guildProfile={guildProfile}
            activeUserId={activeUserId}
            weekStartingDate={data.week_starting_date}
            characterStats={data.character_stats}
            onGuildGoldEarned={handleGuildGoldEarned}
          />
        )}

        {/* --- TAB: JOURNAL --- */}
        {activeTab === 'journal' && (
          <JournalTab
            activeUserId={activeUserId}
            journalLogs={data.journal_logs}
            characterStats={data.character_stats}
            weekStartingDate={data.week_starting_date}
            onSave={updateStatsAndJournal}
          />
        )}

        {/* --- TAB: TO-DO --- */}
        {activeTab === 'todo' && (
          <TodoTab
            activeUserId={activeUserId}
            weekStartingDate={data.week_starting_date}
            currentDayName={currentDayName}
            mainQuestPackageData={mainQuestPackageData}
            journalLogs={data.journal_logs}
            masteredQuizzes={data.mastered_quizzes}
            applyGoldDelta={applyGoldDelta}
            todoCount={todoCount}
            onTodoCountChange={handleTodoCountChange}
            setActiveTab={setActiveTab}
            setActiveGuild={setActiveGuild}
            setActiveQuest={setActiveQuest}
          />
        )}

        {/* --- TAB: PROFILE --- */}
        {activeTab === 'profile' && (
          <ProfileTab
            activeUserId={activeUserId}
            data={data}
            currentDayName={currentDayName}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
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
