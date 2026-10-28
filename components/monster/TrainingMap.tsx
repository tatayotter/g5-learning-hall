'use client';
import { useState, useEffect, useCallback, useRef, useMemo, useContext, type ComponentProps } from 'react';
import type { BattleQuestion } from '@/components/battle/shared';
import { supabase } from '@/lib/supabase';
import { createTrailingThrottle } from '@/lib/throttle';
import { playMonsterAppear, playChime, playClash, playFootstepGrass, playFootstepTown, playWallBump, playCoins, playPageFlip, playLevelUp, playAttackWhoosh, playMiss, playChop } from '@/lib/sounds';
import { useMapPresence } from '@/hooks/useMapPresence';
import { useContinuousMovement } from '@/hooks/useContinuousMovement';
import PlayerStatsPopup from '@/components/PlayerStatsPopup';
import {
  MonsterDef, BATTLE_CONSTANTS, getMonsterLevel,
  getWildEncounterChance, WILD_ENCOUNTER_PITY_THRESHOLD,
  NpcTrainer, NPC_TRAINERS,
} from '@/lib/monsterConfig';
import { UserMonster } from '@/components/battle/shared';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import MapStage, { MapScaleContext } from '@/components/MapStage';
import { rememberSpot } from '@/lib/lastPlace';
import MapCanvas from '@/components/monster/map/MapCanvas';
import FloatingJoystick from '@/components/monster/map/FloatingJoystick';
import MapInfoDrawer, { type InfoTab } from '@/components/monster/map/MapInfoDrawer';
import RecyclerTradePanel from '@/components/monster/map/panels/RecyclerTradePanel';
import CurioEncounterPanel from '@/components/monster/map/panels/CurioEncounterPanel';
import TrainerChallengePanel from '@/components/monster/map/panels/TrainerChallengePanel';
import ScrollQuestionPanel from '@/components/monster/map/panels/ScrollQuestionPanel';
import GatherQuestionPanel from '@/components/monster/map/panels/GatherQuestionPanel';
import ChopTreePanel from '@/components/monster/map/panels/ChopTreePanel';
import HideoutPanel, { type HideoutPanelMode } from '@/components/monster/map/panels/HideoutPanel';
import MissionsPanel from '@/components/monster/MissionsPanel';
import GameButton from '@/components/GameButton';
import { useHideoutMap, type HideoutSpot } from '@/hooks/useHideoutMap';
import { HIDEOUT_REGION, SIGNPOST, SIGNPOST_ARRIVE, hideoutMapPath, pluralVeggie } from '@/lib/hideoutConfig';
import { REGIONS, ELEMENT_COLOR, type MapTile } from '@/lib/regions';
import { loadTiledMap, blankLoadingMap } from '@/lib/tiledMap';
import { loadTiledArtMap, stepInside, type TiledArtExit, type TiledArtPortal } from '@/lib/tiledArtMap';
import { nearestOpen, setWanderMap } from '@/lib/wander';
import { tilesAround } from '@/lib/mapPath';
import type { MapBackground, MapExit, ToolStrike } from '@/lib/phaserMap/TrainingMapScene';
import { CaughtMonster, BattleState, PendingWildCurio } from '@/components/monster/types';
import type { QualityTier } from '@/lib/curioQuality';
import { logWildEncounterEvent } from '@/lib/wildEncounterLog';
import { useTrashItems } from '@/hooks/useTrashItems';
import { useItemBar } from '@/hooks/useItemBar';
import { useGarden, type PlantView, type TreeView } from '@/hooks/useGarden';
import { useFeatureFlag } from '@/lib/featureFlags';
import {
  SWING_REVEAL_MS, TREES, VEGGIES, WILD_PLANTS, withA, WOOD_KEY, gardenItemIcon, gardenItemLabel, parseGardenKey, pickVerb, regrowWords, saplingKey, seedsKey, veggieKey,
  swingTiming, strikeImpactMs, type SwingKind, type VeggieId, type WildTreeNode,
} from '@/lib/gardenConfig';
import { refreshGear, useGear } from '@/lib/gear';
import { GEAR, TOOL_ORDER, bagSizeFor, toolForVeggie, toolIcon, toolKey, toolName, toolVerb, type ToolId } from '@/lib/gearConfig';
import { isItemSlot } from '@/lib/itemBar';
import { flyToBag } from '@/components/monster/map/flyToBag';
import { useIsOffline } from '@/hooks/useIsOffline';
import MapItemBar from '@/components/monster/map/MapItemBar';
import { AMBIENCE, isRaining, nightStrength, sunsetStrength } from '@/lib/ambience';
import { bubbleMs, cameFrom, canTalk, firstGreetToday, noteWildMap, pickExchange, pickLine, type NpcSay } from '@/lib/npcTalk';
import { USERS } from '@/lib/userSession';
import { WILDLIFE, GROUND_FX } from '@/lib/wildlife';
import { TOWN_NPCS, BAYLAN_ID, type TownPage } from '@/lib/townNpcs';
import type { NpcMark } from '@/lib/phaserMap/guildNpcs';
import { NIGHT_WINDOWS } from '@/lib/nightWindows';
import { fetchChecklistBattleFlags, GUILDS, type GuildKey } from '@/lib/dailyChecklist';
import { manilaToday } from '@/lib/appDay';
import { natureDay } from '@/lib/mapNature';
import type { InventoryMap } from '@/lib/inventory';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { TRACKING_GOAL } from '@/lib/curioTracking';
import { TRASH_DEFS, RECYCLER_TILES } from '@/lib/trashConfig';
import { BOT_IDS } from '@/lib/botProfiles';
import {
  playingMapOffline, offlineScrollQuestions, gradeScrollOffline, queueScrollAnswer, queueTrash, queuePosition,
} from '@/lib/offlineMap';
import { fetchMyFriendData, respondToFriendRequest, cancelFriendRequest, removeFriend, type FriendData } from '@/lib/friends';

// The training map is a single painted background image (public/maps/map-1.webp)
// with an invisible logical grid overlaid for walkability + markers. The grid and
// all positioning are percentage-based (not fixed pixels) so the whole map scales
// fluidly to any container width — no horizontal scrolling on mobile/small desktops.
// Every region's walkability grid is authored in Tiled (see public/maps-tiled/*.json
// + lib/tiledMap.ts) — REGIONS[id].tiledMapPath points at each one.

// Scrolls (training questions) and curios (wild-encounter entry points) are
// visible, walked-into map entities — replacing the old "random 40% chance
// while stepping on any grass tile" model. Both are purely client-local
// (never synced to other players, see hooks/useMapPresence.ts's header for
// contrast) and live entirely in this component's own state, same pattern
// as dustPuffs below.
const SCROLL_POOL_SIZE = 5;
const SCROLL_RESPAWN_DELAY_MS = 2500;

// Random unoccupied 'grass'-type tile — same eligibility the old random
// quiz roll used (never 'path'/'town'/'wall'). Returns null if none fit
// (e.g. a small elemental-region map with fewer than SCROLL_POOL_SIZE grass
// tiles once occupied ones are excluded) — callers should just spawn as
// many as fit rather than treating null as an error.
function pickEligibleTile(
  map: MapTile[][], mapWidth: number, mapHeight: number,
  occupied: { x: number; y: number }[], foliage: boolean[][] | null,
): { x: number; y: number } | null {
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      if (map[y]?.[x]?.type !== 'grass') continue;
      if (foliage?.[y]?.[x]) continue; // under tree canopy — see lib/tiledArtMap.ts
      if (occupied.some(o => o.x === x && o.y === y)) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// A curio spawns on an open tile next to the player (not the scroll's own
// tile, not a random far-off one) so the "you answered here, it appeared
// here" link stays obvious. Widens the search radius outward if the
// player's immediate neighbors are all blocked/occupied, so a boxed-in
// player doesn't silently eat a successful roll.
function pickAdjacentOpenTile(
  map: MapTile[][], mapWidth: number, mapHeight: number,
  playerX: number, playerY: number, occupied: { x: number; y: number }[], foliage: boolean[][] | null,
): { x: number; y: number } | null {
  for (let radius = 1; radius <= 3; radius++) {
    const candidates: { x: number; y: number }[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue; // this radius's ring only
        const x = playerX + dx, y = playerY + dy;
        if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) continue;
        if (map[y]?.[x]?.type === 'wall') continue;
        if (foliage?.[y]?.[x]) continue; // under tree canopy — see lib/tiledArtMap.ts
        if (occupied.some(o => o.x === x && o.y === y)) continue;
        candidates.push({ x, y });
      }
    }
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
  }
  return null;
}

// After "Not yet" the curio steps a few tiles away instead of staying next to
// the player, where every step back bumped into it and reopened the prompt
// (one player dismissed it 13 times in a week). Walking distance, not a
// straight line, so it never lands behind a wall the player can't get around.
function pickNearbyReachableTile(
  map: MapTile[][], mapWidth: number, mapHeight: number,
  playerX: number, playerY: number, occupied: { x: number; y: number }[], foliage: boolean[][] | null,
  minSteps = 2, maxSteps = 4,
): { x: number; y: number } | null {
  const dist = new Map<number, number>([[playerY * mapWidth + playerX, 0]]);
  const queue: { x: number; y: number }[] = [{ x: playerX, y: playerY }];
  const candidates: { x: number; y: number }[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = dist.get(cur.y * mapWidth + cur.x)!;
    if (d >= minSteps && !foliage?.[cur.y]?.[cur.x] && !occupied.some(o => o.x === cur.x && o.y === cur.y)) {
      candidates.push(cur);
    }
    if (d === maxSteps) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cur.x + dx, y = cur.y + dy;
      if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) continue;
      if (map[y]?.[x]?.type === 'wall' || dist.has(y * mapWidth + x)) continue;
      dist.set(y * mapWidth + x, d + 1);
      queue.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const GUILD_LABEL = Object.fromEntries(GUILDS.map(g => [g.key, g.label])) as Record<GuildKey, string>;

interface TrainingMapProps {
  userId: string;
  battleState: BattleState;
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  questions: BattleQuestion[];
  gradingUserId: string;
  onBattleStateChange: (state: BattleState) => void;
  onMonsterExpGained: (monsterId: string, exp: number) => void;
  onHeal: () => void;
  onQuestionsAnswered?: (questions: BattleQuestion[]) => void;
  // pity: forced by the guaranteed-spawn counter rather than the 5% roll.
  onWildEncounterRoll?: (pity: boolean) => void;
  // The curio MonsterGuild picked (species/level/question) once a scroll
  // roll succeeds — TrainingMap only owns WHERE it renders (curioPos,
  // picked adjacent to the player); MonsterGuild owns WHAT it is and the
  // actual battle-entry flow (WildEncounterModal). Walking onto curioPos's
  // tile calls onEnterCurio, which is what actually opens that modal.
  activeCurio?: { id: number; monsterId: string; quality: QualityTier; attemptsLeft: number } | null;
  onEnterCurio?: () => void;
  onChallengePlayer?: (targetId: string, name: string) => void;
  onTradePlayer?: (targetId: string, name: string) => void;
  // Set while the player is an unlinked child: tapping another student or
  // bot on the map shows the parent-link gate instead of their stats card.
  onGatedPlayerClick?: () => void;
  /** Called when the player walks within 1 tile of a trainer NPC on the map. */
  onTrainerEncounter?: (trainer: NpcTrainer) => void;
  /** Called with gold earned when the player trades trash at the Recycler NPC. */
  onTrashTraded?: (gold: number) => void;
  /** The account's totals after a sale the server already paid (veggies at the Recycler). */
  onGoldSynced?: (stats: { gold: number; xp: number; level: number }) => void;
  liveBattleInbox?: ReturnType<typeof useLiveBattleInbox>;
  mapPresence: ReturnType<typeof useMapPresence>;
  movementLocked?: boolean;
  walkLockActive?: boolean;
  monsterDisplay: Record<string, MonsterDef>;
  // World Map region — 'ledgers_heart' (or omitted) is the original single
  // map: unfiltered encounters, position persisted to user_battle_state.
  // Any other region id uses its own hand-authored layout/background and a
  // fixed spawn point tracked in local state only (never written to the DB).
  regionId?: string;
  onExitRegion?: () => void;
  // Needed to gate the portal tiles placed in Ledger's Heart (see
  // public/maps-tiled-art/README.md) against each region's unlockLevel.
  playerLevel: number;
  onEnterRegion?: (regionId: string, at?: { x: number; y: number }) => void;
  /** Opens a guild's quests (a guild master in town, walked up to). */
  onPlayGuild?: (guild: GuildKey) => void;
  /** Opens a page (the Shopkeeper's Shop, the Curio Expert's Curios...), a town NPC walked up to. */
  onOpenPage?: (page: TownPage) => void;
  /** Pass through to MapStage — renders the map as a fixed full-viewport layer. */
  fullscreen?: boolean;
  /** Where the kid appears on a map that doesn't save its spot (the town's fountain square). */
  spawnAt?: { x: number; y: number };
  /** The map is the game's home (new nav): Baylan's "!" for today's Main Quest, the guild
   *  masters' "?" grey until it's done, and a gold arrow toward Baylan meanwhile. */
  mapHome?: { questDone: boolean };
  /** A page is open over the map (map as home): the map sleeps and the kid can't walk. */
  paused?: boolean;
  // Bag contents, for the map item slots (Tracking Scrolls).
  inventory: InventoryMap;
  // Merges fields into MonsterGuild's battleState without spreading a stale copy.
  onBattleStatePatch: (patch: Partial<BattleState>) => void;
  // A full Tracking Scroll summoned its curio (already saved as the pending wild curio).
  onTrackedCurioSummoned: (curio: PendingWildCurio) => void;
  /** The kid's gold, for the Hideout signpost. */
  gold?: number;
  /** After curio missions change (the Hideout's Curio Camp). */
  onLoadoutChange?: () => Promise<void> | void;
}

// The Curio Camp's missions panel wants these; the map has nothing to do with either.
const ignoreMissionIds = () => {};
const ignoreLoadout = () => {};

export default function TrainingMap({
  userId, battleState, userMonsters, caughtMonsters, questions, gradingUserId,
  onBattleStateChange, onMonsterExpGained, onHeal, onQuestionsAnswered, onWildEncounterRoll,
  activeCurio, onEnterCurio, onChallengePlayer, onTradePlayer, onGatedPlayerClick, onTrainerEncounter, onTrashTraded, onGoldSynced,
  liveBattleInbox, mapPresence, movementLocked: movementLockedProp, walkLockActive, monsterDisplay,
  regionId, onExitRegion, playerLevel, onEnterRegion, onPlayGuild, onOpenPage, fullscreen, spawnAt, mapHome, paused,
  inventory, onBattleStatePatch, onTrackedCurioSummoned, gold, onLoadoutChange,
}: TrainingMapProps) {
  const offline = useIsOffline();
  // A page open over the map locks walking like any panel on the map does.
  const movementLocked = movementLockedProp || !!paused;
  // Wild veggies and trees (garden switch): plants to pick, trees to chop, and their stacks in the bag.
  const gardenRegion = regionId ?? 'ledgers_heart';
  // Trees on today's map (lib/mapNature.ts), once it has loaded.
  const [mapTrees, setMapTrees] = useState<WildTreeNode[]>([]);
  // Tools (lib/gearConfig.ts): each one owned takes a bag square, and has to sit in an item slot
  // to chop, mine or dig. Bag upgrades make the bag bigger.
  const { gear } = useGear(userId, { fetch: !offline });
  const toolKeys = useMemo(() => TOOL_ORDER.filter(t => (gear[t] ?? 0) > 0).map(toolKey), [gear]);
  const gardenOn = useFeatureFlag(userId, 'garden');
  const garden = useGarden({
    userId, regionId: gardenRegion, enabled: gardenOn, offlineMap: playingMapOffline(userId), mapTrees, gear,
    bagAnyway: gardenRegion === HIDEOUT_REGION,
  });
  // The Hideout (garden switch): the signpost in town, and the plots on the kid's own island.
  const [places, setPlaces] = useState<Record<string, { x: number; y: number }>>({});
  const hideout = useHideoutMap({
    userId, regionId: gardenRegion, enabled: gardenOn, online: !offline, places, bag: garden.bag, onBag: garden.setBag,
  });
  const [hideoutPanel, setHideoutPanel] = useState<{ mode: HideoutPanelMode; spot: HideoutSpot } | null>(null);
  const [campOpen, setCampOpen] = useState(false);
  const itemBar = useItemBar({
    userId, battleState, inventory, offline, regionId: regionId ?? null, onBattleStatePatch, onTrackedCurioSummoned,
    gardenSquares: garden.squares, toolKeys, bagSize: bagSizeFor(gear.bag ?? 0),
  });
  const itemBarRef = useRef(itemBar);
  useEffect(() => { itemBarRef.current = itemBar; });
  // A tool goes into a free item slot the first time the map sees it (just bought, or handed
  // out for free), so it works straight away. Taken out later, it stays out.
  useEffect(() => {
    const seenKey = `lh_tools_seen_${userId}`;
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(seenKey) ?? '[]'); } catch { /* storage blocked */ }
    const fresh = toolKeys.filter(k => !seen.includes(k));
    if (fresh.length === 0) return;
    for (const k of fresh) itemBarRef.current.equip({ item: k });
    try { localStorage.setItem(seenKey, JSON.stringify([...seen, ...fresh])); } catch { /* best-effort */ }
  }, [toolKeys, userId]);
  const trashInventory = itemBar.trash;
  const canTrade = (Object.keys(TRASH_DEFS) as (keyof typeof TRASH_DEFS)[]).some(t => trashInventory[t] >= TRASH_DEFS[t].bundleSize);
  // Short message over the map for the item slots (full slots, tracking progress).
  const [barMessage, setBarMessage] = useState<string | null>(null);
  const barMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showBarMessage = useCallback((text: string) => {
    if (barMessageTimer.current) clearTimeout(barMessageTimer.current);
    setBarMessage(text);
    barMessageTimer.current = setTimeout(() => setBarMessage(null), 2800);
  }, []);
  useEffect(() => () => { if (barMessageTimer.current) clearTimeout(barMessageTimer.current); }, []);
  const [scrolls, setScrolls] = useState<{ id: number; x: number; y: number }[]>([]);
  const [activeScroll, setActiveScroll] = useState<{ id: number; x: number; y: number } | null>(null);
  // How each answered scroll ended: its wisps fly to the sky (right) or it crumbles (wrong).
  const [scrollFates, setScrollFates] = useState<Record<number, 'right' | 'wrong'>>({});
  // The ripe veggie plant whose question is up.
  const [activePlant, setActivePlant] = useState<PlantView | null>(null);
  // The tree being chopped, and the latest swing that landed (for the shake).
  const [activeTree, setActiveTree] = useState<TreeView | null>(null);
  const [treeSwing, setTreeSwing] = useState<{ id: string; n: number; kind: SwingKind } | null>(null);
  // The latest pickaxe or shovel swing at a find (the kid mines or digs it up on the map).
  const [toolStrike, setToolStrike] = useState<ToolStrike | null>(null);
  // The find being swung at stays on the map until the tool lands.
  const [strikingId, setStrikingId] = useState<string | null>(null);
  // How long the latest swing plays: the chop panel stays out of the way for it.
  const [swingMs, setSwingMs] = useState(0);
  const [swingAway, setSwingAway] = useState(false);
  const [sellingVeggies, setSellingVeggies] = useState(false);
  // Tagged with the curio it was picked for, so a new curio never flashes
  // at the previous one's tile before its own spot is picked.
  const [pickedCurioPos, setPickedCurioPos] = useState<{ curioId: number; pos: { x: number; y: number } | null } | null>(null);
  const curioPos = activeCurio && pickedCurioPos?.curioId === activeCurio.id ? pickedCurioPos.pos : null;
  // Trainer NPC that has spawned on the map — null when none is present.
  // Spawns on a correct scroll answer; cleared when the player walks within
  // 1 tile (dialogue triggered) or when the region changes.
  const [activeMapTrainer, setActiveMapTrainer] = useState<(NpcTrainer & { x: number; y: number }) | null>(null);
  // Set when the player enters the trainer's 3×3 proximity zone — shows the
  // dialogue overlay with Accept/Run Away buttons before starting the battle.
  const [pendingTrainerChallenge, setPendingTrainerChallenge] = useState<NpcTrainer | null>(null);
  // Set when the player steps onto the curio tile — shows a confirmation
  // dialogue before entering the wild encounter.
  const [pendingCurioChallenge, setPendingCurioChallenge] = useState(false);
  // Recycler NPC trade panel — shown when the player steps within 1 tile.
  const [pendingRecyclerTrade, setPendingRecyclerTrade] = useState(false);
  // Gold amount flash shown after a successful trash trade.
  const [goldEarnedFlash, setGoldEarnedFlash] = useState<number | null>(null);
  // Trash items currently mid-pickup animation (lifted + fading).
  const [collectingTrashIds, setCollectingTrashIds] = useState<Set<string>>(new Set());
  const scrollIdRef = useRef(0);
  // Ledger's Heart persists map_x/map_y on every tile crossed — was firing an
  // unthrottled DB write per step. Collapsed to at most one every 200ms (a
  // plain Postgres write, unrelated to Realtime presence — see
  // useMapPresence.ts's header for why that one no longer syncs live
  // position at all) while still guaranteeing the latest tile is always
  // eventually persisted.
  // Recreated naturally on remount (component remounts on regionId change, see below).
  const positionWriteThrottleRef = useRef(
    createTrailingThrottle((newX: number, newY: number) => {
      // Offline (lib/offlineMap.ts) the tile is kept on the device and sent on reconnect.
      if (playingMapOffline(userId)) {
        queuePosition(userId, newX, newY);
        return;
      }
      // A Supabase query only runs once something awaits or .then()s it.
      supabase.from('user_battle_state')
        .update({ map_x: newX, map_y: newY, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('save map position error:', error); });
    }, 200)
  );
  // Flush on unmount only (empty deps — see useMapPresence.ts's identical
  // pattern) so leaving the map mid-throttle-window doesn't strand a stale
  // saved position behind the player's actual last tile.
  useEffect(() => () => positionWriteThrottleRef.current.flush(), []);
  const [statsTargetId, setStatsTargetId] = useState<string | null>(null);
  const [infoTab, setInfoTab] = useState<InfoTab>('team');
  const [friendData, setFriendData] = useState<FriendData>({ friends: [], incoming: [], outgoing: [] });
  const refreshFriendData = useCallback(() => {
    fetchMyFriendData(userId).then(setFriendData);
  }, [userId]);
  // Initial load, plus a light poll so an incoming request shows up (and its
  // badge count updates) without the player having to leave and reopen the
  // drawer — friend_requests has no realtime channel of its own, unlike the
  // live-battle invite inbox (see useLiveBattleInbox.ts), so this is the
  // simplest way to keep it current while the map is open.
  useEffect(() => {
    refreshFriendData();
    const interval = setInterval(refreshFriendData, 20000);
    return () => clearInterval(interval);
  }, [refreshFriendData]);

  const handleRespondFriendRequest = async (requestId: string, accept: boolean) => {
    await respondToFriendRequest(requestId, accept);
    refreshFriendData();
  };
  const handleCancelFriendRequest = async (requestId: string) => {
    await cancelFriendRequest(requestId);
    refreshFriendData();
  };
  const handleRemoveFriend = async (friendId: string) => {
    await removeFriend(friendId);
    refreshFriendData();
  };
  const [stepping, setStepping] = useState(false);
  const [bumping, setBumping] = useState(false);
  const [dustPuffs, setDustPuffs] = useState<{ id: number; x: number; y: number }[]>([]);
  const dustIdRef = useRef(0);
  const isLedgersHeart = !regionId || regionId === 'ledgers_heart';
  const region = !isLedgersHeart ? REGIONS[regionId!] : null;
  const activeRegion = region ?? REGIONS.ledgers_heart;
  const [regionMap, setRegionMap] = useState<MapTile[][]>(blankLoadingMap);
  // blankLoadingMap is an all-'grass' placeholder shown for one frame while
  // the real map loads — scroll spawning must wait for the REAL map (it'd
  // otherwise happily scatter scrolls across the fake grid), so this tracks
  // "has a real map ever landed in regionMap" separately from regionMap's
  // own reference (which can't be diffed against blankLoadingMap — it's a
  // lazy useState initializer, called once, so regionMap only ever holds
  // its return VALUE, never the function itself).
  const [mapReady, setMapReady] = useState(false);
  // Start as null when a tileArtPath region is pending — avoids the one-frame
  // flash of the old painted image before the real tilemap finishes loading.
  // Painted-background regions (no tileArtPath) still init to the image
  // immediately because their async step (tiledMapPath) only produces a
  // collision map, not a new background, so there's nothing to wait for.
  const [background, setBackground] = useState<MapBackground | null>(
    activeRegion.tileArtPath ? null : { type: 'image', src: activeRegion.mapImage }
  );
  const [portals, setPortals] = useState<TiledArtPortal[]>([]);
  const [edgeExits, setEdgeExits] = useState<TiledArtExit[]>([]);
  // Tree-canopy exclusion zone for scroll/curio spawning (real-tile-art maps
  // only — see lib/tiledArtMap.ts). null for painted-background elemental
  // regions, which have no such layer to derive this from.
  const [mapFoliage, setFoliage] = useState<boolean[][] | null>(null);
  // The map's little animals (lib/wildlife.ts), set when a tile-art map loads.
  const [wildlife, setWildlife] = useState<ComponentProps<typeof MapCanvas>['wildlife']>(null);
  // Plant tiles count as taken too, so no scroll, trash or curio lands on a plant (the map's
  // foliage already covers its trees).
  const foliage = useMemo(() => {
    const taken = garden.on ? WILD_PLANTS[gardenRegion] ?? [] : [];
    if (!mapFoliage || taken.length === 0) return mapFoliage;
    const f = mapFoliage.map(row => [...row]);
    for (const p of taken) if (f[p.y]?.[p.x] !== undefined) f[p.y][p.x] = true;
    return f;
  }, [mapFoliage, garden.on, gardenRegion]);
  const [lockedPortalMsg, setLockedPortalMsg] = useState<string | null>(null);

  const [mapRecycler, setMapRecycler] = useState<{ x: number; y: number } | null>(null);
  const recyclerTile = mapRecycler ?? RECYCLER_TILES[activeRegion.id] ?? null;
  const map = regionMap;

  // Walkable (grass) tiles excluding foliage canopy — same eligibility rules
  // as scroll/curio spawning so trash never lands on trees or fences.
  const walkableTiles = useMemo(() => {
    const tiles: { x: number; y: number }[] = [];
    if (!mapReady) return tiles;
    for (let y = 0; y < activeRegion.mapHeight; y++) {
      for (let x = 0; x < activeRegion.mapWidth; x++) {
        if (map[y]?.[x]?.type !== 'grass') continue;
        if (foliage?.[y]?.[x]) continue;
        tiles.push({ x, y });
      }
    }
    return tiles;
  }, [map, mapReady, foliage, activeRegion.mapWidth, activeRegion.mapHeight]);

  // Tiles that trash must not spawn on — exact tiles plus a 3-tile buffer
  // around each portal so trash never appears directly next to an exit.
  const trashOccupied = useMemo(() => {
    const PORTAL_BUFFER = 3;
    const blocked: { x: number; y: number }[] = [
      activeRegion.spawn,
      activeRegion.townCenter,
    ];
    for (const p of portals) {
      for (let dy = -PORTAL_BUFFER; dy <= PORTAL_BUFFER; dy++) {
        for (let dx = -PORTAL_BUFFER; dx <= PORTAL_BUFFER; dx++) {
          blocked.push({ x: p.x + dx, y: p.y + dy });
        }
      }
    }
    return blocked;
  }, [activeRegion, portals]);

  const {
    items: trashItems,
    collectTrash,
    respawnSecsLeft,
  } = useTrashItems(walkableTiles, activeRegion.id, trashOccupied);

  // Elemental regions always start at their fixed spawn point and never
  // persist position — this local state naturally resets on region re-entry
  // since TrainingMap remounts when regionId changes.
  const [localPos, setLocalPos] = useState(() => spawnAt ?? region?.spawn ?? { x: 1, y: 1 });
  const posX = isLedgersHeart ? battleState.map_x : localPos.x;
  const posY = isLedgersHeart ? battleState.map_y : localPos.y;
  const activeMonster = userMonsters.find(m => m.slot === battleState.active_monster_slot);
  const { onlinePlayers: presencePlayers, waves, sendWave } = mapPresence;
  // Other players and bots only ever stand where a player could on this map: they wander on its
  // open tiles (lib/wander.ts), and one whose spot is a cliff, lava or a tree here is shown on
  // the nearest open tile.
  const standable = useCallback((x: number, y: number) => map[y]?.[x] !== undefined && map[y][x].type !== 'wall', [map]);
  useEffect(() => {
    if (!mapReady) return;
    setWanderMap(standable);
    return () => setWanderMap(null);
  }, [mapReady, standable]);
  const onlinePlayers = useMemo(() => {
    // Nobody else comes to a kid's own Hideout.
    if (activeRegion.id === HIDEOUT_REGION) return {};
    if (!mapReady) return presencePlayers;
    const out: typeof presencePlayers = {};
    for (const [id, p] of Object.entries(presencePlayers)) out[id] = standable(p.x, p.y) ? p : { ...p, ...nearestOpen(p.x, p.y, standable) };
    return out;
  }, [presencePlayers, mapReady, standable, activeRegion.id]);

  // Fills the scroll pool up to SCROLL_POOL_SIZE once the map has actually
  // loaded (mapReady — regionMap starts as an all-'grass' loading
  // placeholder, which would otherwise get scrolls scattered across it).
  // Excludes the player's own spawn tile so the pool never instant-triggers
  // the moment the map appears.
  useEffect(() => {
    if (!mapReady || scrolls.length > 0) return;
    const spawned: { id: number; x: number; y: number }[] = [];
    for (let i = 0; i < SCROLL_POOL_SIZE; i++) {
      const occupied = [...spawned, { x: posX, y: posY }];
      const tile = pickEligibleTile(map, activeRegion.mapWidth, activeRegion.mapHeight, occupied, foliage);
      if (!tile) break; // fewer than SCROLL_POOL_SIZE grass tiles fit — spawn as many as we can
      spawned.push({ id: scrollIdRef.current++, x: tile.x, y: tile.y });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random placement can't run during render; triggered by the map finishing loading
    if (spawned.length > 0) setScrolls(spawned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // curioPos tracks activeCurio's lifecycle exactly: picked the moment a
  // curio identity arrives from MonsterGuild (or, since a found curio follows
  // the player, once a newly entered map has loaded), cleared the moment
  // it's gone (caught or fled) — single source of truth, no MonsterGuild-side
  // position bookkeeping needed.
  useEffect(() => {
    if (!activeCurio || !mapReady) return;
    const occupied = [...scrolls, { x: posX, y: posY }];
    const tile = pickAdjacentOpenTile(map, activeRegion.mapWidth, activeRegion.mapHeight, posX, posY, occupied, foliage);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random placement can't run during render; triggered by the curio arriving
    setPickedCurioPos({ curioId: activeCurio.id, pos: tile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCurio?.id, mapReady]);

  // Restarts a CSS keyframe animation on repeat triggers (toggling the same
  // boolean twice in a row wouldn't otherwise re-fire the animation).
  const pulse = (setter: (v: boolean) => void) => {
    setter(false);
    requestAnimationFrame(() => setter(true));
  };

  // Fires once per tile the player newly enters (continuous movement crosses
  // tile boundaries instead of "completing a move()") — same side effects,
  // same odds/timing, as the old discrete move() used to run synchronously.
  // viaExit: the kid chose to go through an edge exit (goThroughExit), not just walked onto it.
  const handleTileEnter = useCallback((tile: { x: number; y: number }, _prev?: unknown, viaExit = false) => {
    const { x: newX, y: newY } = tile;
    const tileData = map[newY]?.[newX];
    if (!tileData) return;

    const portal = portals.find(p => p.x === newX && p.y === newY);

    if (tileData.type === 'town') {
      playFootstepTown();
    } else {
      playFootstepGrass();
      const puffId = dustIdRef.current++;
      setDustPuffs(prev => [...prev, { id: puffId, x: newX, y: newY }]);
      setTimeout(() => setDustPuffs(prev => prev.filter(p => p.id !== puffId)), 450);
    }
    pulse(setStepping);

    if (isLedgersHeart) {
      const newState = { ...battleState, map_x: newX, map_y: newY };
      onBattleStateChange(newState); // local state stays instant, unthrottled
      positionWriteThrottleRef.current.call(newX, newY);
    } else {
      setLocalPos({ x: newX, y: newY });
      rememberSpot(userId, regionId, newX, newY);
    }

    // A portal only takes the kid through when they choose to (E, tap): see goThroughExit.
    if (portal && viaExit) {
      const targetRegion = REGIONS[portal.regionId];
      if (targetRegion && !isLedgersHeart && portal.regionId === 'ledgers_heart' && targetRegion.tileArtPath) {
        // Back home: the kid comes out at the end of the road that leads here, so the walk
        // carries on from one map to the next.
        const here = activeRegion.id;
        loadTiledArtMap(targetRegion.tileArtPath).then(lh => {
          // A wide road has a door on each of its tiles: come out on the same lane.
          const lane = (p: { x: number; y: number }) => Math.min(Math.abs(p.x - portal.x), Math.abs(p.y - portal.y));
          const door = lh.portals.filter(p => p.regionId === here).sort((a, b) => lane(a) - lane(b))[0];
          if (door) {
            const at = stepInside(door, lh.mapWidth, lh.mapHeight);
            onBattleStateChange({ ...battleState, map_x: at.x, map_y: at.y });
            positionWriteThrottleRef.current.call(at.x, at.y);
          }
        }).catch(() => {}).finally(() => onEnterRegion?.('ledgers_heart'));
      } else if (targetRegion && playerLevel >= targetRegion.unlockLevel) {
        // Back over the Hideout's bridge: the kid comes out by its signpost in town.
        const home = activeRegion.id === HIDEOUT_REGION && portal.regionId === SIGNPOST.region;
        onEnterRegion?.(portal.regionId, home ? SIGNPOST_ARRIVE : undefined);
      } else {
        setLockedPortalMsg(`${targetRegion?.name ?? 'This region'} unlocks at Player Level ${targetRegion?.unlockLevel ?? '?'}`);
        setTimeout(() => setLockedPortalMsg(null), 2500);
      }
      return;
    }

    // Trainer NPC detection — when the player steps into the 3×3 zone around
    // the trainer, show the dialogue bubble (intro text + Accept/Run Away).
    // Movement is disabled while the dialogue is up (see contMove below),
    // so this won't fire a second time until the player dismisses it.
    if (activeMapTrainer &&
        !pendingTrainerChallenge &&
        Math.abs(newX - activeMapTrainer.x) <= 1 &&
        Math.abs(newY - activeMapTrainer.y) <= 1) {
      setPendingTrainerChallenge(activeMapTrainer);
      return;
    }

    // The curio is a walked-into map entity. Scrolls are not: the kid reads one by choice, like
    // using a tree or talking to someone (openScroll below).
    if (curioPos && curioPos.x === newX && curioPos.y === newY) {
      setPendingCurioChallenge(true);
      if (activeCurio) logWildEncounterEvent(userId, 'approached', { region: regionId, monsterId: activeCurio.monsterId, quality: activeCurio.quality });
      return;
    }

    // Trash pickup — play coin sound + start lift animation, then remove from map
    // Trash goes into the bag; with no room it stays on the map.
    const trashHere = trashItems.find(t => t.x === newX && t.y === newY);
    if (trashHere && !collectingTrashIds.has(trashHere.id) && !itemBarRef.current.canPickUp(trashHere.type)) {
      showBarMessage('Your bag is full! Trade or throw away some trash.');
    } else if (trashHere && !collectingTrashIds.has(trashHere.id)) {
      playCoins();
      setCollectingTrashIds(prev => new Set([...prev, trashHere.id]));
      flyToBag([`/trash/${trashHere.type}.png`], { smooth: true });
      setTimeout(() => {
        setCollectingTrashIds(prev => { const n = new Set(prev); n.delete(trashHere.id); return n; });
        // Another pickup may have filled the bag meanwhile.
        if (!itemBarRef.current.pickUpTrash(trashHere.type)) {
          showBarMessage('Your bag is full! Trade or throw away some trash.');
          return;
        }
        collectTrash(trashHere.id);
        // Persist to player_progress for achievement tracking; skip for bots.
        if (!BOT_IDS.has(userId)) {
          if (playingMapOffline(userId)) queueTrash(userId, 1, 0);
          // .then() is what sends it: an un-awaited Supabase call never runs.
          else supabase.rpc('add_trash_stats', { p_user_id: userId, p_collected: 1, p_gold: 0 })
            .then(({ error }) => { if (error) console.error('add_trash_stats error:', error); });
        }
      }, 450);
    }

    // Recycler NPC proximity — show trade panel when within 1 tile
    if (recyclerTile &&
        !pendingRecyclerTrade &&
        Math.abs(newX - recyclerTile.x) === 0 &&
        Math.abs(newY - recyclerTile.y) === 0) {
      setPendingRecyclerTrade(true);
      return;
    }

    if (tileData.type === 'town') {
      onHeal();
    }
  }, [map, userId, onBattleStateChange, onHeal, isLedgersHeart, battleState, portals, playerLevel, onEnterRegion, curioPos, activeCurio, activeMapTrainer, pendingTrainerChallenge, trashItems, collectingTrashIds, collectTrash, recyclerTile, pendingRecyclerTrade, regionId, activeRegion.id, showBarMessage]);

  // Why a tool can't be used right now (null = it can): the kid doesn't own one yet, or it isn't
  // in an item slot.
  const toolProblem = useCallback((tool: ToolId, doing: string): string | null => {
    const tier = gear[tool] ?? 0;
    const noun = GEAR[tool].tiers[0].name.replace(/^Stone /, '');
    if (tier <= 0) return `You need ${withA(noun)} to ${doing}! Buy one at the Shop.`;
    if (!itemBarRef.current.bar.some(s => isItemSlot(s) && s.item === toolKey(tool))) {
      return `Put your ${toolName(tool, tier)} in an item slot to ${doing}!`;
    }
    return null;
  }, [gear]);

  // Plants and trees open their question only when the kid asks (E, a tap on it, or the
  // Pick/Chop button), never just by walking past. The one close enough gets a gold outline.
  const openPlant = useCallback((plant: PlantView) => {
    const now = Date.now();
    const tool = toolForVeggie(plant.veggie);
    const problem = tool ? toolProblem(tool, `${toolVerb(tool)!.toLowerCase()} ${VEGGIES[plant.veggie].found?.noun ?? 'it'}s`) : null;
    if (problem) {
      showBarMessage(problem);
    } else if (!plant.ripe) {
      showBarMessage(regrowWords(plant.veggie, Math.max(1, Math.ceil(((plant.readyAt ?? now) - now) / 60000))));
    } else if (plant.restUntil && now < plant.restUntil) {
      showBarMessage(`This ${VEGGIES[plant.veggie].found?.noun ?? 'plant'} needs a short rest. Try again in a minute!`);
    } else if (itemBarRef.current.bagUsed + garden.squaresForPick(plant.veggie) > itemBarRef.current.bagSize) {
      showBarMessage('Your bag is full! Sell veggies or trade trash at the Recycler.');
    } else if (playingMapOffline(userId) && offlineScrollQuestions(userId, questions).length === 0) {
      showBarMessage("No internet, and this week's questions aren't saved here yet.");
    } else {
      playMonsterAppear();
      setActivePlant(plant);
    }
  }, [garden, showBarMessage, userId, questions, toolProblem]);

  const openTree = useCallback((tree: TreeView) => {
    const now = Date.now();
    const problem = toolProblem('axe', 'chop trees');
    if (problem) {
      showBarMessage(problem);
    } else if (!tree.ready) {
      showBarMessage('You chopped this tree today. A new forest grows tomorrow!');
    } else if (garden.felledToday >= garden.dailyTreeLimit) {
      showBarMessage(`Your arms are tired after ${garden.dailyTreeLimit} trees. Chop more tomorrow!`);
    } else if (tree.restUntil && now < tree.restUntil) {
      showBarMessage('This tree needs a short rest. Try again in a minute!');
    } else if (itemBarRef.current.bagUsed + garden.squaresForChop(tree.tree) > itemBarRef.current.bagSize) {
      showBarMessage('Your bag is full! Sell wood and veggies or trade trash at the Recycler.');
    } else if (playingMapOffline(userId) && offlineScrollQuestions(userId, questions).length === 0) {
      showBarMessage("No internet, and this week's questions aren't saved here yet.");
    } else {
      playMonsterAppear();
      setSwingAway(false);
      setActiveTree(tree);
    }
  }, [garden, showBarMessage, userId, questions, toolProblem]);

  // The Hideout: go there from the signpost (or buy it), or use a plot on the island.
  const goToHideout = useCallback(() => { playPageFlip(); onEnterRegion?.(HIDEOUT_REGION); }, [onEnterRegion]);
  const applySpot = useCallback(async (spot: HideoutSpot) => {
    if (spot.kind === 'signpost') {
      if (hideout.api.state.owned) goToHideout();
      else { playPageFlip(); setHideoutPanel({ mode: 'deed', spot }); }
      return;
    }
    const open = (mode: HideoutPanelMode) => { playPageFlip(); setHideoutPanel({ mode, spot }); };
    switch (spot.phase) {
      case 'unbuilt': return open('build');
      case 'soon': case 'collected': return open('info');
      case 'empty': return open('plant');
      case 'camp': playPageFlip(); setCampOpen(true); return;
      case 'growing': {
        if (spot.watered) return open('info');
        const problem = toolProblem('can', 'water plants');
        if (problem) { showBarMessage(problem.replace('Buy one at the Shop.', 'It comes with your Hideout.')); return; }
        return open('water');
      }
      case 'ripe': {
        if (offline) { showBarMessage('Your Hideout needs internet right now.'); return; }
        if (itemBarRef.current.bagUsed + hideout.squaresForHarvest(spot) > itemBarRef.current.bagSize) {
          showBarMessage('Your bag is full! Sell some veggies or wood first.');
          return;
        }
        const res = await hideout.api.harvest(spot.id);
        if (res.status === 'harvested' && spot.item) {
          playChime();
          const veg = gardenItemIcon(veggieKey(spot.item as VeggieId));
          flyToBag([...Array(Math.min(res.veggies, 6)).fill(veg), ...Array(res.seeds).fill(gardenItemIcon(seedsKey(spot.item as VeggieId)))]);
          const name = pluralVeggie(VEGGIES[spot.item as VeggieId]?.label ?? 'veggie');
          showBarMessage(res.double ? `Double harvest! ${res.veggies} ${name} and seeds!` : `You harvested ${res.veggies} ${name} and ${res.seeds > 1 ? `${res.seeds} seed packets` : 'a seed packet'}!`);
        } else if (res.status === 'collected') {
          playChime();
          flyToBag(Array(res.wood).fill(gardenItemIcon(WOOD_KEY)));
          showBarMessage(`You collected ${res.wood} wood! Your tree drops more tomorrow.`);
        } else if (res.status === 'collected_today') {
          showBarMessage('This tree gave its wood today. Come back tomorrow!');
        } else {
          showBarMessage("That didn't work. Try again!");
        }
        return;
      }
    }
  }, [hideout, goToHideout, toolProblem, showBarMessage, offline]);

  // Reading a scroll: the kid chooses to, like using a tree (it no longer opens by walking onto it).
  const openScroll = useCallback((scroll: { id: number; x: number; y: number }) => {
    // Offline, scrolls can only ask what the downloaded answer key covers.
    if (playingMapOffline(userId) && offlineScrollQuestions(userId, questions).length === 0) {
      showBarMessage("No internet, and this week's questions aren't saved here yet.");
      return;
    }
    playMonsterAppear();
    setActiveScroll(scroll);
  }, [userId, questions, showBarMessage]);

  // Scrolls, plants and trees within reach (on or next to the player's tile; the trunk for a
  // tree), nearest first; at the same distance scrolls, then plants, then trees.
  const inReach = useMemo(() => {
    const dist = (o: { x: number; y: number }) => Math.max(Math.abs(o.x - posX), Math.abs(o.y - posY));
    const found = [
      ...scrolls.map(scroll => ({ kind: 'scroll' as const, scroll, usable: true, d: dist(scroll), x: scroll.x, y: scroll.y })),
      ...(garden.on ? garden.plants : []).map(plant => ({ kind: 'plant' as const, plant, usable: plant.ripe, d: dist(plant), x: plant.x, y: plant.y })),
      ...(garden.on ? garden.trees : []).map(tree => ({ kind: 'tree' as const, tree, usable: tree.ready, d: dist(tree), x: tree.x, y: tree.y })),
    ].filter(o => o.d <= 1);
    const order = { scroll: 0, plant: 1, tree: 2 };
    return found.sort((a, b) => a.d - b.d || order[a.kind] - order[b.kind]);
  }, [scrolls, garden.on, garden.plants, garden.trees, posX, posY]);
  const nearby = inReach.find(o => o.usable) ?? null;
  // The Hideout signpost or plot right next to the player, if any (plants and trees come first).
  const nearSpot = useMemo(() => {
    if (nearby) return null;
    // Nearest of its tiles (a garden bed takes six).
    const d = (o: HideoutSpot) => Math.min(...o.tiles.map(t => Math.max(Math.abs(t.x - posX), Math.abs(t.y - posY))));
    return hideout.spots.filter(o => d(o) <= 1).sort((a, b) => d(a) - d(b))[0] ?? null;
  }, [nearby, hideout.spots, posX, posY]);

  // The sky over this map: its biome's clouds, drifting bits and sunset, new clouds each day.
  const ambience = useMemo(
    () => ({ key: `${activeRegion.id}:${natureDay()}`, sky: AMBIENCE[activeRegion.element] }),
    [activeRegion.id, activeRegion.element],
  );
  type Reachable = (typeof inReach)[number];

  const interact = useCallback((target: Reachable) => {
    if (target.kind === 'scroll') openScroll(target.scroll);
    else if (target.kind === 'plant') openPlant(target.plant);
    else openTree(target.tree);
  }, [openScroll, openPlant, openTree]);

  const handleBlocked = useCallback(() => {
    playWallBump();
    pulse(setBumping);
  }, []);

  // E uses what's in reach: the outlined one, or else says why the nearest can't be used.
  const panelOpen = !!(activeScroll || activePlant || activeTree || hideoutPanel || campOpen || movementLocked || pendingTrainerChallenge || pendingCurioChallenge || pendingRecyclerTrade);
  useEffect(() => {
    const target = nearby ?? inReach[0];
    if (panelOpen || !target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'e' && e.key !== 'E')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      interact(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearby, inReach, panelOpen, interact]);

  const contMove = useContinuousMovement({
    map,
    mapWidth: activeRegion.mapWidth,
    mapHeight: activeRegion.mapHeight,
    enabled: !activeScroll && !activePlant && !activeTree && !hideoutPanel && !campOpen && !movementLocked && !pendingTrainerChallenge && !pendingCurioChallenge && !pendingRecyclerTrade,
    initialTile: { x: posX, y: posY },
    onTileCrossed: handleTileEnter,
    onBlocked: handleBlocked,
    extraBlockedTiles: recyclerTile || hideout.blocked.length ? [...(recyclerTile ? [recyclerTile] : []), ...hideout.blocked] : undefined,
  });

  // Loads this region's map (declared after contMove, which it resets).
  useEffect(() => {
    let cancelled = false;
    // Each kid's Hideout is one of five island shapes (lib/hideoutConfig.ts).
    const artPath = activeRegion.id === HIDEOUT_REGION ? hideoutMapPath(userId) : activeRegion.tileArtPath;
    if (artPath) {
      // The Hideout signpost's spot in town stays clear too.
      const reserved = [...(WILD_PLANTS[activeRegion.id] ?? []), ...(activeRegion.id === SIGNPOST.region ? [SIGNPOST] : [])];
      const nature = activeRegion.dailyNature ? { regionId: activeRegion.id, reserved } : undefined;
      loadTiledArtMap(artPath, nature).then(parsed => {
        if (cancelled) return;
        setMapTrees(parsed.trees);
        setRegionMap(parsed.layout);
        setMapReady(true);
        setBackground({
          type: 'tilemap',
          key: artPath,
          region: activeRegion.id,
          mapJson: parsed.mapJson,
          tilesetImages: parsed.tilesetImages,
          tileSize: parsed.tileSize,
          belowPlayerLayers: parsed.belowPlayerLayers,
          abovePlayerLayers: parsed.abovePlayerLayers,
          layerOpacity: parsed.layerOpacity,
          animatedTiles: parsed.animatedTiles,
          lights: parsed.lights,
          windows: NIGHT_WINDOWS[activeRegion.id],
          ysortBase: parsed.ysortBase,
          ysortLayers: parsed.ysortLayers,
        });
        setPortals(parsed.portals);
        setEdgeExits(parsed.exits);
        setMapRecycler(parsed.recycler);
        setPlaces(parsed.places);
        setFoliage(parsed.foliage);
        setWildlife(WILDLIFE[activeRegion.id] || GROUND_FX[activeRegion.id] || TOWN_NPCS[activeRegion.id] ? {
          key: `${artPath}:${natureDay()}`,
          groups: WILDLIFE[activeRegion.id] ?? [],
          habitat: { width: parsed.mapWidth, height: parsed.mapHeight, open: parsed.layout.map(r => r.map(t => t.type !== 'wall')), liquid: parsed.liquid, sand: parsed.sand.some(r => r.some(Boolean)) ? parsed.sand : undefined, flowers: parsed.flowers },
          fx: GROUND_FX[activeRegion.id],
          sand: parsed.sand,
          npcs: TOWN_NPCS[activeRegion.id],
          puddle: parsed.puddle,
        } : null);
        // Ledger's Heart persists position to the DB, so a player whose saved
        // spot no longer exists on a re-authored map (out of bounds, or now
        // sitting inside a fence/tree) needs to be nudged back to the map's
        // own spawn point rather than getting stuck or rendering off-map.
        if (isLedgersHeart) {
          const { x, y } = { x: battleState.map_x, y: battleState.map_y };
          const outOfBounds = x < 0 || x >= parsed.mapWidth || y < 0 || y >= parsed.mapHeight;
          const blocked = !outOfBounds && parsed.layout[y][x].type === 'wall';
          if (outOfBounds || blocked) {
            const newState = { ...battleState, map_x: parsed.spawn.x, map_y: parsed.spawn.y };
            onBattleStateChange(newState);
            if (playingMapOffline(userId)) {
              queuePosition(userId, parsed.spawn.x, parsed.spawn.y);
            } else {
              supabase.from('user_battle_state')
                .update({ map_x: parsed.spawn.x, map_y: parsed.spawn.y, updated_at: new Date().toISOString() })
                .eq('user_id', userId)
                .then(({ error }) => { if (error) console.error('save map position error:', error); });
            }
            contMove.resetTo({ x: parsed.spawn.x, y: parsed.spawn.y });
          }
        }
      });
    } else {
      loadTiledMap(activeRegion.tiledMapPath).then(parsed => {
        if (cancelled) return;
        setRegionMap(parsed.layout);
        setMapReady(true);
        setBackground({ type: 'image', src: activeRegion.mapImage });
      });
    }
    return () => { cancelled = true; };
    // Component remounts when regionId changes (see the localPos comment
    // below), so this only ever needs to run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Offline the scroll is graded on the device (lib/offlineMap.ts) and the answer queued right
  // away for the server to re-grade on reconnect.
  const scrollGradeOverride = playingMapOffline(userId)
    ? (question: BattleQuestion, selected: string) => {
        const result = gradeScrollOffline(userId, question, selected);
        queueScrollAnswer(userId, activeMonster?.id ?? null, question.id, selected, result.correct);
        return result;
      }
    : undefined;

  // A pick attempt at a veggie plant is over (useGarden already saved it).
  const handleGatherAnswer = (_correctCount: number, answeredQuestions: BattleQuestion[]) => {
    const plant = activePlant;
    setActivePlant(null);
    onQuestionsAnswered?.(answeredQuestions);
    const r = garden.lastResult.current;
    if (!plant || !r) return;
    const name = VEGGIES[plant.veggie].label;
    const thing = VEGGIES[plant.veggie].found?.noun ?? 'plant';
    if (r.status === 'picked') {
      // A crystal or a shell: the kid swings their own pickaxe or shovel at it first, and it
      // pops into the bag when the tool lands.
      const tool = toolForVeggie(plant.veggie);
      const swung = !!tool && (gear[tool] ?? 0) > 0;
      if (swung) {
        setToolStrike(s => ({ n: (s?.n ?? 0) + 1, id: plant.id, tool: tool!, x: plant.x, y: plant.y }));
        setStrikingId(plant.id);
      }
      const land = () => {
        setStrikingId(null);
        playChime();
        flyToBag([
          ...Array(Math.max(1, r.count)).fill(gardenItemIcon(veggieKey(plant.veggie))),
          ...(r.seeds > 0 ? [gardenItemIcon(seedsKey(plant.veggie))] : []),
          ...(r.rare ? [gardenItemIcon(r.rare)] : []),
        ]);
        const rareName = r.rare ? gardenItemLabel(r.rare) : null;
        const found = r.count > 1 ? `2 ${name}s` : withA(name);
        showBarMessage(rareName ? `WOW! You found ${withA(rareName)}! It's rare!`
          : r.seeds > 0 ? `You picked ${withA(name)} and found ${name} Seeds too!`
          : VEGGIES[plant.veggie].found ? `You found ${found}! ${r.count > 1 ? "They're" : "It's"} in your bag.` : `You picked ${withA(name)}! It's in your bag.`);
      };
      if (swung) setTimeout(land, strikeImpactMs()); else land();
    } else if (r.status === 'no_tool') {
      const tool = toolForVeggie(plant.veggie);
      showBarMessage(tool ? `You need ${withA(GEAR[tool].tiers[0].name.replace(/^Stone /, ''))} for this! Buy one at the Shop.` : 'Try again later!');
    } else if (r.status === 'wrong') {
      playClash();
      showBarMessage(r.restUntil ? `Oops! The ${thing} needs a short rest. Try again in a minute.` : 'Not quite! Try again for another question.');
    } else if (r.status === 'growing') {
      showBarMessage(regrowWords(plant.veggie, Math.max(1, Math.ceil(((r.readyAt ?? Date.now()) - Date.now()) / 60000))));
    } else {
      showBarMessage(`This ${thing} needs a short rest. Try again in a minute!`);
    }
  };

  // One swing at a tree, graded by useGarden. Once the right/wrong reveal has shown, the chop panel
  // steps aside and the kid swings on the map (lib/phaserMap/chopSwing.ts): it lands with a woody
  // chop on a right answer and whiffs past on a wrong one. The sounds follow the swing.
  const gradeSwing = async (tree: TreeView, q: BattleQuestion, selected: string) => {
    const res = await garden.chop(tree, q, selected);
    if (garden.refused.current) {
      setActiveTree(null);
      showBarMessage("This tree can't be chopped right now. Try again later!");
      return res;
    }
    const r = garden.lastChop.current;
    const kind: SwingKind | null = r?.status === 'felled' ? 'felled' : r?.status === 'hit' ? 'hit' : r?.status === 'wrong' ? 'miss' : null;
    setSwingMs(kind ? swingTiming(kind).total : 0);
    if (kind) {
      const t = swingTiming(kind);
      setTimeout(() => setTreeSwing(s => ({ id: tree.id, n: (s?.n ?? 0) + 1, kind })), SWING_REVEAL_MS);
      setTimeout(() => (kind === 'miss' ? playMiss() : playAttackWhoosh()), SWING_REVEAL_MS + t.windUp);
      if (kind !== 'miss') setTimeout(() => playChop(kind === 'felled'), SWING_REVEAL_MS + t.impact);
    }
    return res;
  };

  // A swing at a tree is over: ask the next question, or close and say what came of it.
  const handleSwingAnswered = (answeredQuestions: BattleQuestion[]): boolean => {
    const tree = activeTree;
    onQuestionsAnswered?.(answeredQuestions);
    const r = garden.lastChop.current;
    if (!tree || !r) { setActiveTree(null); return false; }
    if (r.status === 'hit' || (r.status === 'wrong' && !r.restUntil)) return true;
    setActiveTree(null);
    const label = TREES[tree.tree].label;
    if (r.status === 'felled') {
      playChime();
      const sapling = r.saplings > 0 ? gardenItemIcon(saplingKey(tree.tree)) : null;
      flyToBag([...Array(r.wood).fill(gardenItemIcon(WOOD_KEY)), ...(sapling ? [sapling] : [])]);
      const got = `${r.wood} wood${r.saplings > 0 ? ` and ${/^[AEIOU]/.test(label) ? 'an' : 'a'} ${label} Sapling` : ''}`;
      showBarMessage(r.wood > 3 ? `Double wood! You got ${got}!` : r.clean ? `Clean chop! You got ${got}!` : `Timber! You got ${got}!`);
    } else if (r.status === 'wrong') {
      playClash();
      showBarMessage('Oops! The tree needs a short rest. Try again in a minute.');
    } else if (r.status === 'stump') {
      showBarMessage('You chopped this tree today. A new forest grows tomorrow!');
    } else if (r.status === 'tired') {
      showBarMessage(`Your arms are tired after ${garden.dailyTreeLimit} trees. Chop more tomorrow!`);
    } else if (r.status === 'no_tool') {
      showBarMessage('You need an Axe to chop trees! Buy one at the Shop.');
    } else {
      showBarMessage('This tree needs a short rest. Try again in a minute!');
    }
    return false;
  };

  const handleScrollAnswer = async (correctCount: number, answeredQuestions: BattleQuestion[]) => {
    const answered = activeScroll!;
    setActiveScroll(null);
    if (correctCount > 0) playChime(); else playClash();
    onQuestionsAnswered?.(answeredQuestions);
    // Offline: EXP shows now, everything else is queued for sync_offline_map, and no
    // trainer or wild curio appears (those battles need the server).
    const offlineMap = playingMapOffline(userId);
    // Map scroll answers get their own funnel record: their completed-question
    // rows share quest_type 'monster_arena' with arena battle questions.
    if (!offlineMap) logWildEncounterEvent(userId, 'scroll_answered', { region: regionId, correct: correctCount > 0 });
    if (correctCount > 0 && activeMonster) {
      const expGain = BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER;
      onMonsterExpGained(activeMonster.id, expGain);
      const newExp = activeMonster.monster_exp + expGain;
      if (!offlineMap) {
        await supabase.from('user_monsters')
          .update({ monster_exp: newExp, monster_level: getMonsterLevel(newExp) })
          .eq('id', activeMonster.id);
      }
    }
    // Daily checklist's "training map" item is satisfied by any correct grass
    // question — it no longer requires actually winning a wild encounter battle.
    const stateUpdates: Partial<BattleState> = {};
    if (correctCount > 0) {
      stateUpdates.last_wild_encounter_win = new Date().toISOString().split('T')[0];
    }

    // Consume the answered scroll and schedule its replacement, keeping the
    // pool at SCROLL_POOL_SIZE — same shape as dustPuffs' setTimeout cleanup.
    setScrollFates(prev => ({ ...prev, [answered.id]: correctCount > 0 ? 'right' : 'wrong' }));
    setScrolls(prev => prev.filter(s => s.id !== answered.id));
    setTimeout(() => {
      setScrolls(prev => {
        if (prev.length >= SCROLL_POOL_SIZE) return prev;
        const occupied = [...prev, { x: posX, y: posY }, ...(curioPos ? [curioPos] : [])];
        const tile = pickEligibleTile(map, activeRegion.mapWidth, activeRegion.mapHeight, occupied, foliage);
        if (!tile) return prev;
        return [...prev, { id: scrollIdRef.current++, x: tile.x, y: tile.y }];
      });
    }, SCROLL_RESPAWN_DELAY_MS);

    // Trainer NPC spawn — one trainer appears on the map on every correct
    // answer if no trainer is already present. Eligible trainers are those
    // whose levelRequirement the player has met. Spawned on a random grass
    // tile far enough from the player that the battle isn't instant.
    if (correctCount > 0 && !offlineMap && !activeMapTrainer && mapReady) {
      const eligibleTrainers = NPC_TRAINERS.filter(t => playerLevel >= t.levelRequirement);
      if (eligibleTrainers.length > 0) {
        const trainer = eligibleTrainers[Math.floor(Math.random() * eligibleTrainers.length)];
        // Exclude current player tile + all current scrolls (incl. the one
        // just consumed, still in scrolls state here) + curio tile.
        const occupied = [...scrolls, { x: posX, y: posY }, ...(curioPos ? [curioPos] : [])];
        const tile = pickEligibleTile(map, activeRegion.mapWidth, activeRegion.mapHeight, occupied, foliage);
        if (tile) setActiveMapTrainer({ ...trainer, x: tile.x, y: tile.y });
      }
    }

    // Wild-monster (curio) encounter roll — gated on a CORRECT scroll answer
    // (previously rolled once per answered question regardless of
    // correctness) and capped at one active curio at a time: a successful
    // roll while one's already on the map is just a miss, not queued or
    // refunded. Flat rate, no scaling by trainers defeated or monsters
    // owned (see getWildEncounterChance's header comment).
    const wildEncounterChance = getWildEncounterChance();
    let encountered = !offlineMap && correctCount > 0 && !activeCurio && Math.random() < wildEncounterChance;
    let pity = false;

    // Pity timer: always active (see WILD_ENCOUNTER_PITY_THRESHOLD's header
    // comment) — forces an encounter once this many correct answers pass
    // without one occurring naturally. The counter itself still accrues on
    // every correct answer even while capped by an already-active curio —
    // only the encounter is suppressed then, not the progress toward pity.
    let questionsSinceEncounter = battleState.questions_since_wild_encounter + correctCount;
    if (!offlineMap && !encountered && !activeCurio && questionsSinceEncounter >= WILD_ENCOUNTER_PITY_THRESHOLD) {
      encountered = true;
      pity = true;
    }
    questionsSinceEncounter = encountered ? 0 : questionsSinceEncounter;
    stateUpdates.questions_since_wild_encounter = questionsSinceEncounter;

    if (!offlineMap) await supabase.from('user_battle_state').update(stateUpdates).eq('user_id', userId);
    onBattleStateChange({ ...battleState, ...stateUpdates });

    if (encountered) onWildEncounterRoll?.(pity);

    // An active Tracking Scroll's meter fills with each right answer.
    const answeredId = answeredQuestions[0]?.id;
    if (!offlineMap && correctCount > 0 && answeredId && itemBar.activeTracking) {
      const tracked = await itemBar.onRightAnswer(String(answeredId));
      if (tracked) {
        const name = ALL_MONSTERS[tracked.monsterId]?.name ?? 'curio';
        if (tracked.filled) playLevelUp();
        showBarMessage(tracked.filled
          ? `📜 Meter full! Tap your scroll to summon ${name}!`
          : `📜 ${name} meter: ${tracked.progress}/${TRACKING_GOAL}`);
      }
    }
  };

  const leftTag = (
    <span className="flex items-center gap-1.5">
      {onExitRegion && (
        <button onClick={() => { playPageFlip(); onExitRegion(); }} className="hover:text-amber-400" title="Back to World Map">←</button>
      )}
      {isLedgersHeart ? REGIONS.ledgers_heart.name : region!.name}
    </span>
  );

  // Map — Phaser canvas for the world layer (background, sprites, dust,
  // bump shake) with a thin DOM overlay for name tags/badges/bubbles/marker;
  // see components/monster/map/MapCanvas.tsx for the split rationale.
  // Ledger's Heart's tile-art map has no dedicated healing tile (see
  // lib/tiledArtMap.ts's header comment) — so no marker to show there.
  // Flat (tile-art) region maps have no healing tile either; their only marker is the way home.
  const townMarkerTile = isLedgersHeart || activeRegion.tileArtPath ? null : region!.townCenter;
  // Exits on the map's edge (the portals near it, lib/tiledArtMap.ts exits, Rowil 2026-10-23/24):
  // the scene draws a glow in the next map's element color (the Ledger's Heart's and the town's:
  // leaf green, like Rootbound's) stuck to the map's edge across exactly the road's width, sparks
  // and an arrow; here they get one name label, a little inside the gap.
  const mapW = regionMap[0]?.length ?? 0, mapH = regionMap.length;
  const exitGroups = useMemo(() => edgeExits.map(e => ({ regionId: e.regionId, side: e.side, tiles: e.portals, exit: e })), [edgeExits]);
  const exits = useMemo<MapExit[]>(() => exitGroups.map(({ regionId, side, exit: e }) => {
    const dest = REGIONS[regionId];
    const el = dest && dest.element !== 'all' ? dest.element : 'leaf';
    const at = e.from + e.fromInset, len = e.to + 1 - e.toInset - at;
    const rect = side === 'n' || side === 's'
      ? { x: at, y: side === 'n' ? 0 : mapH - 1, w: len, h: 1 }
      : { x: side === 'w' ? 0 : mapW - 1, y: at, w: 1, h: len };
    return { ...rect, side, locked: playerLevel < (dest?.unlockLevel ?? 0), color: parseInt(ELEMENT_COLOR[el].text.slice(1), 16) };
  }), [exitGroups, playerLevel, mapW, mapH]);
  const sceneBackground = useMemo<MapBackground | null>(
    () => (background?.type === 'tilemap' && exits.length ? { ...background, exits } : background),
    [background, exits],
  );
  // An exit on the edge works like a tree (Rowil 2026-10-23): walk up to it, then press E, tap
  // the "Go to …" button or tap its name. Walking onto it alone doesn't leave the map.
  // Near: on the road (or a tile beside it) within a tile of its portals' line.
  const nearExit = useMemo(() => {
    const d = (g: (typeof exitGroups)[number]) => {
      const e = g.exit;
      const along = e.side === 'n' || e.side === 's' ? posX : posY;
      const fromEdge = e.side === 'n' ? posY : e.side === 's' ? mapH - 1 - posY : e.side === 'w' ? posX : mapW - 1 - posX;
      if (along < e.from - 1 || along > e.to + 1) return Infinity;
      return Math.max(0, fromEdge - e.depth);
    };
    const g = exitGroups.filter(q => d(q) <= 1).sort((a, b) => d(a) - d(b))[0];
    if (!g) return null;
    const tile = g.tiles.reduce((best, t) => Math.hypot(t.x - posX, t.y - posY) < Math.hypot(best.x - posX, best.y - posY) ? t : best);
    return { regionId: g.regionId, tile };
  }, [exitGroups, posX, posY, mapW, mapH]);
  // The map as home, today's Main Quest not done yet: a gold arrow at the edge of the screen points
  // to Baylan in town, or elsewhere to the road toward town. It hides once he's close by.
  const guide = useMemo(() => {
    if (!mapHome || mapHome.questDone) return null;
    let target: { x: number; y: number } | null = null;
    if (activeRegion.id === 'town') {
      target = TOWN_NPCS.town?.find(n => n.id === BAYLAN_ID)?.home ?? null;
    } else {
      const g = exitGroups.find(q => q.regionId === 'town') ?? exitGroups.find(q => q.regionId === 'ledgers_heart');
      if (g?.tiles.length) target = { x: g.tiles.reduce((t, p) => t + p.x, 0) / g.tiles.length, y: g.tiles.reduce((t, p) => t + p.y, 0) / g.tiles.length };
    }
    if (!target || Math.hypot(target.x - posX, target.y - posY) < 5) return null;
    return { angle: Math.atan2(target.y - posY, target.x - posX) };
  }, [mapHome, activeRegion.id, exitGroups, posX, posY]);
  const goThroughExit = useCallback(() => {
    if (nearExit) handleTileEnter(nearExit.tile, undefined, true);
  }, [nearExit, handleTileEnter]);
  // Tap-to-walk (Rowil 2026-10-28): a tap on the map walks the kid there around walls (the
  // nearest open spot when the tap lands on a wall); a tap on a tree, plant, exit, guild master
  // or the Recycler walks up to it and uses it. The route is hooks/useContinuousMovement.ts's.
  const canWalk = useCallback((x: number, y: number) => {
    const t = map[y]?.[x];
    return !!t && t.type !== 'wall' && !(recyclerTile && recyclerTile.x === x && recyclerTile.y === y)
      && !hideout.blocked.some(b => b.x === x && b.y === y);
  }, [map, recyclerTile, hideout.blocked]);
  const walkToExit = useCallback((g: (typeof exitGroups)[number]) => {
    const goals = g.tiles.filter(t => canWalk(t.x, t.y));
    contMove.walkTo(goals, () => {
      const at = contMove.getFloatPos();
      const tile = g.tiles.reduce((best, t) => Math.hypot(t.x + 0.5 - at.x, t.y + 0.5 - at.y) < Math.hypot(best.x + 0.5 - at.x, best.y + 0.5 - at.y) ? t : best);
      handleTileEnter(tile, undefined, true);
    });
  }, [canWalk, contMove, handleTileEnter]);
  const onExitLabelClick = useCallback((regionId: string) => {
    if (nearExit?.regionId === regionId) { goThroughExit(); return; }
    const groups = exitGroups.filter(g => g.regionId === regionId);
    const far = (g: (typeof exitGroups)[number]) => Math.min(...g.tiles.map(t => Math.hypot(t.x - posX, t.y - posY)));
    const g = groups.sort((a, b) => far(a) - far(b))[0];
    if (g) walkToExit(g);
  }, [nearExit, goThroughExit, exitGroups, posX, posY, walkToExit]);
  // Guild masters in town (lib/townNpcs.ts): walk up, then E, the button or a tap on the name
  // opens their guild. One whose guild isn't played yet today shows a "?". The Shopkeeper and
  // the Curio Expert open their page the same way (no "?").
  const townNpcs = TOWN_NPCS[activeRegion.id];
  const [nearNpcId, setNearNpcId] = useState<string | null>(null);
  const nearNpc = townNpcs?.find(n => n.id === nearNpcId && ((n.guild && onPlayGuild) || (n.opens && onOpenPage) || (!n.guild && !n.opens && canTalk(n.id)))) || null;
  const [guildsPlayed, setGuildsPlayed] = useState<GuildKey[] | null>(null);
  useEffect(() => {
    if (!townNpcs || offline) return;
    let cancelled = false;
    fetchChecklistBattleFlags(userId, manilaToday())
      .then(f => { if (!cancelled) setGuildsPlayed(f.guilds_played_today); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [townNpcs, userId, offline]);
  // A guild master whose guild isn't played yet today shows a "?". With the map as home, Baylan
  // shows a gold "!" until today's Main Quest is done, and the "?"s wait (small and grey) till then.
  const questWaiting = !!mapHome && !mapHome.questDone;
  const npcMarks = useMemo(() => {
    if (!townNpcs) return undefined;
    const marks: Record<string, NpcMark> = {};
    if (questWaiting) marks[BAYLAN_ID] = 'bang';
    for (const n of townNpcs) {
      if (n.guild && guildsPlayed && !guildsPlayed.includes(n.guild)) marks[n.id] = questWaiting ? 'quiet' : 'quest';
    }
    return marks;
  }, [townNpcs, guildsPlayed, questWaiting]);
  // Talking town people (lib/npcTalk.ts): a bubble with a line that fits the kid right now, when
  // they walk up (now and then) or tap one who has no page to open. The first hello of the day
  // comes with a little hop. The Knight Commander chats with his squad and the guards too.
  const [npcSay, setNpcSay] = useState<Record<string, NpcSay>>({});
  const sayTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastSaidAt = useRef<Map<string, number>>(new Map());
  const sayKey = useRef(0);
  useEffect(() => { const timers = sayTimers.current; return () => timers.forEach(clearTimeout); }, []);
  // Coming back from a wild map: town people may ask about it.
  useEffect(() => { if (activeRegion.id !== 'town') noteWildMap(activeRegion.id); }, [activeRegion.id]);
  const kidName = (USERS[userId]?.name ?? '').split(' ')[0];
  const say = useCallback((id: string, text: string, wave = false) => {
    const prev = sayTimers.current.get(id);
    if (prev) clearTimeout(prev);
    lastSaidAt.current.set(id, Date.now());
    setNpcSay(s => ({ ...s, [id]: { text, wave, key: ++sayKey.current } }));
    sayTimers.current.set(id, setTimeout(() => setNpcSay(s => { const next = { ...s }; delete next[id]; return next; }), bubbleMs(text)));
  }, []);
  const talkFacts = useCallback((npcId: string) => {
    const f = new Set<string>();
    const now = Date.now();
    if (mapHome) f.add(mapHome.questDone ? 'quest_done' : 'quest_waiting');
    const guild = townNpcs?.find(n => n.id === npcId)?.guild;
    if (guild && guildsPlayed) f.add(guildsPlayed.includes(guild) ? 'guild_done' : 'guild_waiting');
    const hour = ((now / 3600_000 + 8) % 24 + 24) % 24;
    if (nightStrength(now) > 0.5) f.add('night');
    else if (sunsetStrength(now) > 0.3) f.add('sunset');
    else f.add(hour >= 5 && hour < 11 ? 'morning' : 'noon');
    for (const r of Object.values(REGIONS)) {
      if (isRaining(AMBIENCE[r.element], `${r.id}:${natureDay()}`, now)) f.add(`rain:${r.id}`);
    }
    if (f.has(`rain:${activeRegion.id}`)) f.add('rain_here');
    const from = cameFrom();
    if (from && activeRegion.id === 'town') f.add(`from:${from}`);
    f.add(`here:${activeRegion.id}`);
    const trash = Object.values(trashInventory).some(n => (n ?? 0) > 0);
    if (trash) f.add('has_trash');
    if (canTrade) f.add('can_trade');
    for (const [key, n] of Object.entries(garden.bag)) {
      if (!n) continue;
      const g = parseGardenKey(key);
      if (key === WOOD_KEY) f.add('has_wood');
      else if (g?.kind === 'veggie') f.add(g.veggie.id === 'seashell' ? 'has_shells' : 'has_veggies');
    }
    if (!trash && !['has_wood', 'has_veggies', 'has_shells'].some(k => f.has(k))) f.add('bag_empty');
    if (!userMonsters.length) f.add('no_team');
    else if (userMonsters.length >= 4) f.add('big_team');
    const day = new Date(now + 8 * 3600_000).getUTCDay();
    if (day === 1) f.add('monday');
    if (day === 5) f.add('friday');
    if (day === 0 || day === 6) f.add('weekend');
    if (playerLevel < 5) f.add('new_kid');
    if (playerLevel >= 20) f.add('veteran');
    return f;
  }, [mapHome, townNpcs, guildsPlayed, activeRegion.id, trashInventory, canTrade, garden.bag, userMonsters.length, playerLevel]);
  const talk = useCallback((id: string) => {
    const facts = talkFacts(id);
    const first = !lastSaidAt.current.has(id) && firstGreetToday(id);
    if (first) facts.add('first_today');
    const line = pickLine(id, facts, kidName);
    if (line) say(id, line, first);
  }, [talkFacts, kidName, say]);
  // Walking up: a hello now and then (not every time, or it gets noisy).
  const onNpcApproach = useCallback((id: string) => {
    if (!canTalk(id) || panelOpen) return;
    if (Date.now() - (lastSaidAt.current.get(id) ?? 0) < 90_000) return;
    talk(id);
  }, [talk, panelOpen]);
  // The Recycler, out on the wild maps, says hi the same way.
  const nearRecycler = !!recyclerTile && Math.hypot(recyclerTile.x - posX, recyclerTile.y - posY) <= 3;
  useEffect(() => { if (nearRecycler) onNpcApproach('recycler'); }, [nearRecycler, onNpcApproach]);
  // The squad halts at the fountain: the Knight Commander talks with a soldier, or calls over to a
  // guard close enough to hear, when the kid is near enough to see it.
  const onSquadHalt = useCallback((at: { x: number; y: number }, spots: { id: string; x: number; y: number }[]) => {
    if (Math.hypot(at.x - posX, at.y - posY) > 9) return;
    const guards = spots.filter(n => n.id.startsWith('guard_') && Math.hypot(n.x - at.x, n.y - at.y) < 14);
    const withId = guards.length && Math.random() < 0.5 ? guards[Math.floor(Math.random() * guards.length)].id : 'squad';
    const ex = pickExchange(withId, talkFacts('knight_commander'), kidName);
    if (!ex) return;
    const soldier = withId === 'squad' ? `squad_${1 + Math.floor(Math.random() * 4)}` : withId;
    let wait = 0;
    for (const [who, text] of ex.lines) {
      const id = who === 'knight' ? 'knight_commander' : soldier;
      sayTimers.current.set(`chat:${wait}`, setTimeout(() => say(id, text), wait));
      wait += Math.min(2600, 900 + text.length * 40);
    }
  }, [posX, posY, talkFacts, kidName, say]);
  const talkToNpc = useCallback(() => {
    if (nearNpc?.guild && onPlayGuild) { playPageFlip(); onPlayGuild(nearNpc.guild); }
    else if (nearNpc?.opens && onOpenPage) { playPageFlip(); onOpenPage(nearNpc.opens); }
    else if (nearNpc) talk(nearNpc.id);
  }, [nearNpc, onPlayGuild, onOpenPage, talk]);
  const onNpcClick = useCallback((id: string, at?: { x: number; y: number }) => {
    const npc = townNpcs?.find(n => n.id === id);
    if (npc && !npc.guild && !npc.opens) { if (canTalk(id)) talk(id); return; }
    const guild = onPlayGuild ? npc?.guild : undefined;
    const opens = onOpenPage ? npc?.opens : undefined;
    if (!guild && !opens) return;
    if (nearNpc?.id === id) { talkToNpc(); return; }
    if (!at) return;
    contMove.walkTo(tilesAround(Math.floor(at.x), Math.floor(at.y), canWalk), () => {
      playPageFlip();
      if (guild) onPlayGuild!(guild);
      else if (opens) onOpenPage!(opens);
    });
  }, [nearNpc, onPlayGuild, onOpenPage, talkToNpc, townNpcs, talk, contMove, canWalk]);
  useEffect(() => {
    if (!nearNpc || nearby || inReach.length || nearSpot || panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'e' && e.key !== 'E')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      talkToNpc();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearNpc, nearby, inReach.length, nearSpot, panelOpen, talkToNpc]);
  useEffect(() => {
    if (!nearSpot || nearby || inReach.length || panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'e' && e.key !== 'E')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      void applySpot(nearSpot);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearSpot, nearby, inReach.length, panelOpen, applySpot]);
  useEffect(() => {
    if (!nearExit || nearby || inReach.length || panelOpen || nearNpc || nearSpot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'e' && e.key !== 'E')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      goThroughExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearExit, nearby, inReach.length, panelOpen, nearNpc, nearSpot, goThroughExit]);
  const handleMapTap = useCallback((tx: number, ty: number) => {
    if (panelOpen || movementLocked) return;
    // A scroll: read it when it's in reach, else walk up to it and read it.
    const scroll = scrolls.find(s => s.x === tx && s.y === ty);
    if (scroll) {
      if (inReach.some(o => o.kind === 'scroll' && o.scroll.id === scroll.id)) { openScroll(scroll); return; }
      const goals = [{ x: scroll.x, y: scroll.y }, ...tilesAround(scroll.x, scroll.y, canWalk)].filter(t => canWalk(t.x, t.y));
      contMove.walkTo(goals, () => openScroll(scroll));
      return;
    }
    if (garden.on) {
      const plantCovers = (p: { x: number; y: number; veggie: PlantView['veggie'] }) =>
        p.x === tx && (p.y === ty || (VEGGIES[p.veggie].tall && p.y - 1 === ty));
      // A tree's art spans about three tiles across and four up from its trunk.
      const treeCovers = (t: { x: number; y: number }) => Math.abs(t.x - tx) <= 1 && ty <= t.y && ty >= t.y - 4;
      const hit = inReach.find(o => (o.kind === 'plant' ? plantCovers(o.plant) : o.kind === 'tree' && o.tree.ready && treeCovers(o.tree)));
      if (hit) { interact(hit); return; }
      const plant = garden.plants.find(plantCovers);
      if (plant) {
        // Not ready yet: just say so, no walk.
        if (!plant.ripe) { openPlant(plant); return; }
        const goals = [{ x: plant.x, y: plant.y }, ...tilesAround(plant.x, plant.y, canWalk)].filter(t => canWalk(t.x, t.y));
        contMove.walkTo(goals, () => openPlant(plant));
        return;
      }
      // Stumps don't count: a tap on one is a tap on the ground.
      const tree = garden.trees.filter(t => t.ready && treeCovers(t))
        .sort((a, b) => Math.abs(a.x - tx) + Math.abs(a.y - ty) - Math.abs(b.x - tx) - Math.abs(b.y - ty))[0];
      if (tree) {
        contMove.walkTo(tilesAround(tree.x, tree.y, canWalk), () => openTree(tree));
        return;
      }
    }
    // A Hideout plot or the signpost (its art reaches a tile or two above it): walk up and use it.
    const reach = (o: HideoutSpot) => (o.plot?.kind === 'grove' || o.plot?.kind === 'camp' || o.kind === 'signpost' ? 2 : 1);
    const spot = hideout.spots.find(o => o.tiles.some(t => t.x === tx && ty <= t.y && ty >= t.y - reach(o)));
    if (spot) {
      if (nearSpot?.id === spot.id) { void applySpot(spot); return; }
      contMove.walkTo(tilesAround(spot.x, spot.y, canWalk), () => { void applySpot(spot); });
      return;
    }
    // The Recycler (two tiles tall on screen).
    if (recyclerTile && tx === recyclerTile.x && (ty === recyclerTile.y || ty === recyclerTile.y - 1)) {
      contMove.walkTo(tilesAround(recyclerTile.x, recyclerTile.y, canWalk), () => setPendingRecyclerTrade(true));
      return;
    }
    // An exit's glow on the map's edge, or the road just inside it.
    const exitHit = exitGroups.find(g => {
      const e = exits[exitGroups.indexOf(g)];
      return e && tx >= e.x - 1 && tx < e.x + e.w + 1 && ty >= e.y - 1 && ty < e.y + e.h + 1;
    });
    if (exitHit) {
      if (nearExit?.regionId === exitHit.regionId) goThroughExit();
      else walkToExit(exitHit);
      return;
    }
    const to = nearestOpen(tx, ty, canWalk);
    contMove.walkTo([to]);
  }, [panelOpen, movementLocked, scrolls, openScroll, garden.on, garden.plants, garden.trees, inReach, interact, openPlant, openTree, canWalk, contMove, recyclerTile, exitGroups, exits, nearExit, goThroughExit, walkToExit, hideout.spots, nearSpot, applySpot]);
  const portalMarkers = portals.length
    ? [
        ...portals.filter(p => !exitGroups.some(g => g.tiles.includes(p)))
          .map(p => ({ x: p.x, y: p.y, regionId: p.regionId, locked: playerLevel < (REGIONS[p.regionId]?.unlockLevel ?? 0) })),
        ...exits.map((e, i) => {
          const IN = { n: [0, 3], s: [0, -2], w: [2, 0], e: [-2, 0] }[e.side];
          return {
            x: e.x + (e.w - 1) / 2 + IN[0], y: e.y + (e.h - 1) / 2 + IN[1],
            regionId: exitGroups[i].regionId, locked: e.locked, labelOnly: true,
          };
        }),
      ]
    : undefined;
  // Hoisted to avoid an IIFE allocation on every render inside the scroll panel JSX.
  const activeMonsterExpToNext = activeMonster
    ? BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - (activeMonster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL)
    : null;

  // Gates both the floating joystick's press-and-drag and (previously) the
  // static dpad — matches the keyboard-movement path in useContinuousMovement.
  const controlsDisabled = movementLocked || !!activeScroll || !!activePlant || !!activeTree || !!hideoutPanel || campOpen;

  const frameContent = (
    <div className="relative w-full h-full">
      {/* Taps on the map walk there; on a phone, a press-and-drag anywhere on the map shows a
          joystick under the finger (hidden otherwise). See FloatingJoystick.tsx. */}
      <FloatingJoystick disabled={controlsDisabled} setStick={contMove.setStick} />
      {sceneBackground && <MapCanvas
        mapWidth={activeRegion.mapWidth}
        mapHeight={activeRegion.mapHeight}
        background={sceneBackground}
        bumping={bumping}
        stepping={stepping}
        posX={posX}
        posY={posY}
        movement={contMove}
        userId={userId}
        waves={waves}
        dustPuffs={dustPuffs}
        onlinePlayers={onlinePlayers}
        inBattle={id => liveBattleInbox?.playersInBattle.has(id) ?? false}
        resultWon={id => liveBattleInbox?.battleResultFlashes[id]}
        townMarkerTile={townMarkerTile}
        portalMarkers={portalMarkers}
        onExitLabelClick={onExitLabelClick}
        scrollMarkers={scrolls}
        scrollFates={scrollFates}
        curioMarker={activeCurio && curioPos ? { ...curioPos, monsterDef: monsterDisplay[activeCurio.monsterId], quality: activeCurio.quality } : null}
        trainerMarker={activeMapTrainer ? { id: activeMapTrainer.id, x: activeMapTrainer.x, y: activeMapTrainer.y, emoji: activeMapTrainer.emoji, name: activeMapTrainer.name, spriteOverride: activeMapTrainer.spriteOverride } : null}
        trashItems={trashItems}
        collectingTrashIds={collectingTrashIds}
        recyclerTile={recyclerTile}
        // The plant being asked about stays ripe until the panel closes, so its dust pop
        // (lib/phaserMap/gardenPlants.ts) plays where the player can see it.
        gardenPlants={garden.on ? [...garden.sprites.map(p => (p.id === activePlant?.id || p.id === strikingId ? { ...p, stage: 'ripe' as const } : p)), ...hideout.crops] : undefined}
        // Same for a tree: it stands until the panel closes, then falls where the player can see.
        wildTrees={[...garden.treeSprites.map(t => (t.id === activeTree?.id ? { ...t, stage: 'ready' as const } : t)), ...hideout.trees]}
        props={hideout.props}
        treeSwing={treeSwing}
        chopTree={activeTree?.id ?? null}
        tools={gear}
        toolStrike={toolStrike}
        highlight={controlsDisabled ? null
          : nearby ? { kind: nearby.kind, id: nearby.kind === 'scroll' ? String(nearby.scroll.id) : nearby.kind === 'plant' ? nearby.plant.id : nearby.tree.id }
          : nearSpot ? { kind: hideout.trees.some(t => t.id === nearSpot.id) ? 'tree' : 'prop', id: nearSpot.id }
          : nearNpc ? { kind: 'npc', id: nearNpc.id } : null}
        npcMarks={npcMarks}
        paused={paused}
        onNpcNear={setNearNpcId}
        onNpcClick={onNpcClick}
        npcSay={npcSay}
        onNpcApproach={onNpcApproach}
        onSquadHalt={onSquadHalt}
        onMapTap={handleMapTap}
        ambience={ambience}
        wildlife={wildlife}
        soundRegion={activeRegion.id}
        onPlayerClick={(id: string) => { playPageFlip(); if (onGatedPlayerClick) onGatedPlayerClick(); else setStatsTargetId(id); }}
      />}
      {guide && !controlsDisabled && <GuideArrow angle={guide.angle} />}
      {!nearby && nearSpot && !controlsDisabled && (
        <button
          type="button"
          data-testid="hideout-button"
          onClick={() => { void applySpot(nearSpot); }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#0a0807]/90 border-2 border-[#d4a017] text-[#fde68a] text-xs font-bold pl-1.5 pr-2.5 py-1 rounded-full shadow-lg whitespace-nowrap active:scale-95"
        >
          <img src={nearSpot.icon} alt="" className="w-5 h-5 object-contain" style={{ imageRendering: 'pixelated' }} />
          {nearSpot.label}
          <span className="hidden [@media(pointer:fine)]:inline-block ml-1 px-1.5 rounded border border-[#d4a017] text-[11px] leading-5">E</span>
        </button>
      )}
      {!nearby && !nearSpot && nearNpc && !controlsDisabled && (
        <button
          type="button"
          data-testid="npc-button"
          onClick={talkToNpc}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#0a0807]/90 border-2 border-[#d4a017] text-[#fde68a] text-xs font-bold pl-2.5 pr-2.5 py-1 rounded-full shadow-lg whitespace-nowrap active:scale-95"
        >
          {npcMarks?.[nearNpc.id] === 'quest' && <span className="text-[#ffd23f]">?</span>}
          {npcMarks?.[nearNpc.id] === 'bang' && <span className="text-[#ffd23f]">!</span>}
          {nearNpc.guild ? `Play ${GUILD_LABEL[nearNpc.guild]}` : nearNpc.opensLabel ?? 'Talk'}
          <span className="hidden [@media(pointer:fine)]:inline-block ml-1 px-1.5 rounded border border-[#d4a017] text-[11px] leading-5">E</span>
        </button>
      )}
      {!nearby && !nearSpot && !nearNpc && nearExit && !controlsDisabled && REGIONS[nearExit.regionId] && (
        <button
          type="button"
          data-testid="exit-button"
          onClick={goThroughExit}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#0a0807]/90 border-2 border-[#d4a017] text-[#fde68a] text-xs font-bold pl-2.5 pr-2.5 py-1 rounded-full shadow-lg whitespace-nowrap active:scale-95"
        >
          Go to {REGIONS[nearExit.regionId].name}
          <span className="hidden [@media(pointer:fine)]:inline-block ml-1 px-1.5 rounded border border-[#d4a017] text-[11px] leading-5">E</span>
        </button>
      )}
      {nearby && !controlsDisabled && (
        <button
          type="button"
          data-testid="interact-button"
          onClick={() => interact(nearby)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#0a0807]/90 border-2 border-[#d4a017] text-[#fde68a] text-xs font-bold pl-1.5 pr-2.5 py-1 rounded-full shadow-lg whitespace-nowrap active:scale-95"
        >
          {nearby.kind === 'scroll' ? <img src="/sprite/question-scroll.png" alt="" className="w-5 h-5 object-contain" style={{ imageRendering: 'pixelated' }} /> : (() => {
            // The tool it needs, when the kid has one; otherwise what they'd get.
            const tool = nearby.kind === 'plant' ? toolForVeggie(nearby.plant.veggie) : 'axe';
            const tier = tool ? gear[tool] ?? 0 : 0;
            const src = tool && tier > 0 ? toolIcon(tool, tier)
              : nearby.kind === 'plant' ? gardenItemIcon(veggieKey(nearby.plant.veggie)) : gardenItemIcon(WOOD_KEY);
            return <img src={src} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />;
          })()}
          {nearby.kind === 'scroll' ? 'Read Scroll'
            : nearby.kind === 'plant'
            ? `${toolVerb(toolForVeggie(nearby.plant.veggie)) ?? pickVerb(nearby.plant.veggie)} ${VEGGIES[nearby.plant.veggie].label}`
            : `Chop ${TREES[nearby.tree.tree].name}`}
          <span className="hidden [@media(pointer:fine)]:inline-block ml-1 px-1.5 rounded border border-[#d4a017] text-[11px] leading-5">E</span>
        </button>
      )}
      {lockedPortalMsg && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 border border-amber-600 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap z-20">
          🔒 {lockedPortalMsg}
        </div>
      )}
      {/* Walk-lock cooldown banner — used to sit under the old fixed
          joystick; now a top-center toast since the joystick has no fixed
          screen position to attach to (2026-09-05). */}
      {walkLockActive && !lockedPortalMsg && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 border border-amber-600 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap z-20">
          ⏳ wait...
        </div>
      )}

      {/* Gold earned flash — floats up from screen centre after a trash trade */}
      {goldEarnedFlash !== null && (
        <div
          key={goldEarnedFlash}
          className="gold-earn-float absolute left-1/2 top-1/3 z-30 pointer-events-none select-none flex items-center gap-1"
        >
          +{goldEarnedFlash}g
          <img src="/icons/rewards/gold_coin.svg" alt="gold" className="w-6 h-6 object-contain" />
        </div>
      )}
    </div>
  );


  // Info drawer — Team/Online/Bag; see components/monster/map/MapInfoDrawer.tsx.
  const drawer = (
    <MapInfoDrawer
      viewerId={userId}
      infoTab={infoTab}
      onTabChange={setInfoTab}
      userMonsters={userMonsters}
      activeMonsterSlot={battleState.active_monster_slot}
      monsterDisplay={monsterDisplay}
      onlinePlayers={onlinePlayers}
      onStatsTarget={setStatsTargetId}
      trashInventory={trashInventory}
      trashItemsOnMap={trashItems.length}
      respawnSecsLeft={respawnSecsLeft}
      friendData={friendData}
      onAcceptFriendRequest={id => handleRespondFriendRequest(id, true)}
      onDeclineFriendRequest={id => handleRespondFriendRequest(id, false)}
      onCancelFriendRequest={handleCancelFriendRequest}
      onRemoveFriend={handleRemoveFriend}
    />
  );

  const curioDef = activeCurio ? monsterDisplay[activeCurio.monsterId] : null;

  // Gold the player will earn if they trade all complete bundles right now.
  const pendingTradeGold = (Object.keys(TRASH_DEFS) as (keyof typeof TRASH_DEFS)[]).reduce(
    (sum, t) => sum + Math.floor(trashInventory[t] / TRASH_DEFS[t].bundleSize), 0,
  );

  const overlay = hideoutPanel ? (
    <HideoutPanel
      key={`${hideoutPanel.spot.id}:${hideoutPanel.mode}`}
      mode={hideoutPanel.mode}
      spot={hideoutPanel.spot}
      api={hideout.api}
      bag={garden.bag}
      gold={gold ?? 0}
      canTier={gear.can ?? 0}
      offline={offline}
      questions={questions}
      gradingUserId={gradingUserId}
      onAnswered={answered => onQuestionsAnswered?.(answered)}
      onBought={res => {
        playCoins();
        if (res.progress) onGoldSynced?.(res.progress);
        void refreshGear(userId);
      }}
      onTravel={() => { setHideoutPanel(null); goToHideout(); }}
      onDone={(say, fly) => {
        setHideoutPanel(null);
        if (fly?.length) flyToBag(fly);
        if (say) showBarMessage(say);
      }}
    />
  ) : campOpen ? (
    <div className="w-full max-w-xl bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-2xl p-4 max-h-full overflow-y-auto battle-panel-in" data-testid="camp-panel">
      <div className="flex items-center gap-3 mb-3 bg-[#e8d0a0]/60 border border-[#c9a87a] rounded-xl px-3 py-2">
        <img src="/hideout/curio_camp.png" alt="" className="w-10 h-10 flex-shrink-0 object-contain" style={{ imageRendering: 'pixelated' }} />
        <div className="min-w-0">
          <p className="text-[#2a1505] font-bold text-sm leading-tight">Curio Camp</p>
          <p className="text-xs text-[#6b4820] leading-tight">Curios on your bench can go on missions here and come back stronger.</p>
        </div>
      </div>
      <MissionsPanel
        playerLevel={playerLevel}
        userId={userId}
        benchedMonsters={userMonsters.filter(m => m.slot === null)}
        caughtMonsters={caughtMonsters}
        monsterDisplay={monsterDisplay}
        onMissionLockedIdsChange={ignoreMissionIds}
        onLoadoutChange={onLoadoutChange ?? ignoreLoadout}
      />
      <GameButton variant="quest" color="#57534e" onClick={() => setCampOpen(false)} className="w-full mt-3" style={{ fontSize: 13 }} data-testid="camp-leave">
        Close
      </GameButton>
    </div>
  ) : pendingRecyclerTrade ? (
    <RecyclerTradePanel
      trashInventory={trashInventory}
      canTrade={canTrade}
      pendingTradeGold={pendingTradeGold}
      onTradeAll={() => {
        const gold = itemBar.tradeAllTrash();
        if (gold > 0) {
          onTrashTraded?.(gold);
          setGoldEarnedFlash(gold);
          setTimeout(() => setGoldEarnedFlash(null), 1800);
          // Persist gold-from-recycling counter for achievements; skip for bots.
          if (!BOT_IDS.has(userId)) {
            if (playingMapOffline(userId)) queueTrash(userId, 0, gold);
            else supabase.rpc('add_trash_stats', { p_user_id: userId, p_collected: 0, p_gold: gold })
              .then(({ error }) => { if (error) console.error('add_trash_stats error:', error); });
          }
        }
        setPendingRecyclerTrade(false);
      }}
      onDismiss={() => setPendingRecyclerTrade(false)}
      gardenBag={garden.on ? garden.bag : undefined}
      offline={playingMapOffline(userId)}
      sellingVeggies={sellingVeggies}
      onSellVeggies={garden.on ? async () => {
        setSellingVeggies(true);
        const sold = await garden.sell(null);
        setSellingVeggies(false);
        if (!sold) { showBarMessage("That didn't work. Try again!"); return; }
        if (sold.gold > 0) {
          playCoins();
          setGoldEarnedFlash(sold.gold);
          setTimeout(() => setGoldEarnedFlash(null), 1800);
        }
        if (sold.progress) onGoldSynced?.(sold.progress);
      } : undefined}
    />
  ) : pendingCurioChallenge && activeCurio && curioDef ? (
    <CurioEncounterPanel
      curioDef={curioDef}
      quality={activeCurio.quality}
      attemptsLeft={activeCurio.attemptsLeft}
      onBattle={() => { setPendingCurioChallenge(false); onEnterCurio?.(); }}
      onRunAway={() => {
        setPendingCurioChallenge(false);
        const occupied = [...scrolls, ...trashItems, ...portals, ...(activeMapTrainer ? [activeMapTrainer] : []), ...(recyclerTile ? [recyclerTile] : [])];
        const hop = pickNearbyReachableTile(map, activeRegion.mapWidth, activeRegion.mapHeight, posX, posY, occupied, foliage);
        if (hop) setPickedCurioPos({ curioId: activeCurio.id, pos: hop });
        logWildEncounterEvent(userId, 'walked_away', { region: regionId, monsterId: activeCurio.monsterId, quality: activeCurio.quality });
      }}
    />
  ) : pendingTrainerChallenge ? (
    <TrainerChallengePanel
      trainer={pendingTrainerChallenge}
      onAccept={() => {
        const trainer = pendingTrainerChallenge;
        setPendingTrainerChallenge(null);
        setActiveMapTrainer(null);
        onTrainerEncounter?.(trainer);
      }}
      onRunAway={() => {
        setPendingTrainerChallenge(null);
        setActiveMapTrainer(null);
      }}
    />
  ) : activePlant ? (
    <GatherQuestionPanel
      veggie={activePlant.veggie}
      questions={scrollGradeOverride ? offlineScrollQuestions(userId, questions) : questions}
      gradingUserId={gradingUserId}
      grade={async (q, selected) => {
        const res = await garden.grade(activePlant, q, selected);
        if (garden.refused.current) {
          setActivePlant(null);
          showBarMessage("This plant can't be picked right now. Try again later!");
        }
        return res;
      }}
      onComplete={handleGatherAnswer}
      onLeave={() => setActivePlant(null)}
    />
  ) : activeTree ? (
    <ChopTreePanel
      tree={activeTree.tree}
      swings={garden.swings}
      axeTier={gear.axe ?? 0}
      hits={garden.trees.find(t => t.id === activeTree.id)?.hits ?? 0}
      questions={scrollGradeOverride ? offlineScrollQuestions(userId, questions) : questions}
      gradingUserId={gradingUserId}
      grade={(q, selected) => gradeSwing(activeTree, q, selected)}
      swingMs={swingMs}
      onAway={setSwingAway}
      onAnswered={handleSwingAnswered}
      onLeave={() => setActiveTree(null)}
    />
  ) : activeScroll ? (
    <ScrollQuestionPanel
      activeMonsterDef={activeMonster ? monsterDisplay[activeMonster.monster_id] : undefined}
      activeMonsterExpToNext={activeMonsterExpToNext}
      questions={scrollGradeOverride ? offlineScrollQuestions(userId, questions) : questions}
      gradingUserId={gradingUserId}
      gradeOverride={scrollGradeOverride}
      onComplete={handleScrollAnswer}
    />
  ) : null;

  return (
    <>
      <MapStage
        leftTag={leftTag}
        rightTag={`🟢 ${Object.keys(onlinePlayers).length}`}
        frame={frameContent}
        drawerLabel="Info"
        drawer={drawer}
        overlay={overlay}
        overlayClear={swingAway && !!activeTree}
        hotbar={<MapItemBar api={itemBar} offline={offline} message={barMessage} onMessage={showBarMessage} gardenBag={garden.on ? garden.bag : undefined} gear={gear} />}
        fullscreen={fullscreen}
      />

      {statsTargetId && (
        <PlayerStatsPopup
          viewerId={userId}
          targetId={statsTargetId}
          onClose={() => { setStatsTargetId(null); refreshFriendData(); }}
          onWave={sendWave}
          onChallenge={onChallengePlayer}
          onTrade={onTradePlayer}
          targetInBattle={liveBattleInbox?.playersInBattle.has(statsTargetId) ?? false}
        />
      )}
    </>
  );
}

// The gold arrow toward Baylan (map as home). It sits inside the map's scaled frame, so its
// distance from the middle is the screen's, divided by the frame's scale.
function GuideArrow({ angle }: { angle: number }) {
  const scale = useContext(MapScaleContext) || 1;
  const r = `min(26vw, 24vh) / ${scale.toFixed(3)}`;
  return (
    <div
      data-testid="guide-arrow"
      aria-hidden
      className="pointer-events-none absolute z-20 flex flex-col items-center"
      style={{
        left: `calc(50% + ${Math.cos(angle).toFixed(3)} * ${r})`,
        top: `calc(50% + ${Math.sin(angle).toFixed(3)} * ${r})`,
        transform: `translate(-50%, -50%) scale(${(1 / scale).toFixed(3)})`,
      }}
    >
      <div style={{ transform: `rotate(${angle}rad)` }}>
        <svg className="map-guide-arrow" width="38" height="30" viewBox="0 0 38 30" style={{ filter: 'drop-shadow(0 0 6px #ffd23f)' }}>
          <path d="M3 11 H20 V4 L35 15 L20 26 V19 H3 Z" fill="#ffd23f" stroke="#3a2208" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="mt-0.5 text-[11px] text-[#ffd23f] whitespace-nowrap" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>Baylan</span>
    </div>
  );
}
