'use client';
import { useState, useEffect, useCallback, useRef, useMemo, type ComponentProps } from 'react';
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
import MapStage from '@/components/MapStage';
import MapCanvas from '@/components/monster/map/MapCanvas';
import FloatingJoystick from '@/components/monster/map/FloatingJoystick';
import MapInfoDrawer, { type InfoTab } from '@/components/monster/map/MapInfoDrawer';
import RecyclerTradePanel from '@/components/monster/map/panels/RecyclerTradePanel';
import CurioEncounterPanel from '@/components/monster/map/panels/CurioEncounterPanel';
import TrainerChallengePanel from '@/components/monster/map/panels/TrainerChallengePanel';
import ScrollQuestionPanel from '@/components/monster/map/panels/ScrollQuestionPanel';
import GatherQuestionPanel from '@/components/monster/map/panels/GatherQuestionPanel';
import ChopTreePanel from '@/components/monster/map/panels/ChopTreePanel';
import { REGIONS, ELEMENT_COLOR, type MapTile } from '@/lib/regions';
import { loadTiledMap, blankLoadingMap } from '@/lib/tiledMap';
import { loadTiledArtMap, stepInside, type TiledArtPortal } from '@/lib/tiledArtMap';
import { nearestOpen, setWanderMap } from '@/lib/wander';
import type { MapBackground, MapExit } from '@/lib/phaserMap/TrainingMapScene';
import { CaughtMonster, BattleState, PendingWildCurio } from '@/components/monster/types';
import type { QualityTier } from '@/lib/curioQuality';
import { logWildEncounterEvent } from '@/lib/wildEncounterLog';
import { useTrashItems } from '@/hooks/useTrashItems';
import { useItemBar } from '@/hooks/useItemBar';
import { useGarden, type PlantView, type TreeView } from '@/hooks/useGarden';
import { useFeatureFlag } from '@/lib/featureFlags';
import {
  DAILY_TREE_LIMIT, SWING_REVEAL_MS, TREES, VEGGIES, WILD_PLANTS, withA, WOOD_KEY, WOOD_PER_TREE, gardenItemIcon, pickVerb, regrowWords, saplingKey, seedsKey, veggieKey,
  swingTiming, type SwingKind, type WildTreeNode,
} from '@/lib/gardenConfig';
import { flyToBag } from '@/components/monster/map/flyToBag';
import { useIsOffline } from '@/hooks/useIsOffline';
import MapItemBar from '@/components/monster/map/MapItemBar';
import { AMBIENCE } from '@/lib/ambience';
import { WILDLIFE, GROUND_FX } from '@/lib/wildlife';
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
  onEnterRegion?: (regionId: string) => void;
  /** Pass through to MapStage — renders the map as a fixed full-viewport layer. */
  fullscreen?: boolean;
  // Bag contents, for the map item slots (Tracking Scrolls).
  inventory: InventoryMap;
  // Merges fields into MonsterGuild's battleState without spreading a stale copy.
  onBattleStatePatch: (patch: Partial<BattleState>) => void;
  // A full Tracking Scroll summoned its curio (already saved as the pending wild curio).
  onTrackedCurioSummoned: (curio: PendingWildCurio) => void;
}

export default function TrainingMap({
  userId, battleState, userMonsters, questions, gradingUserId,
  onBattleStateChange, onMonsterExpGained, onHeal, onQuestionsAnswered, onWildEncounterRoll,
  activeCurio, onEnterCurio, onChallengePlayer, onTradePlayer, onGatedPlayerClick, onTrainerEncounter, onTrashTraded, onGoldSynced,
  liveBattleInbox, mapPresence, movementLocked, walkLockActive, monsterDisplay,
  regionId, onExitRegion, playerLevel, onEnterRegion, fullscreen,
  inventory, onBattleStatePatch, onTrackedCurioSummoned,
}: TrainingMapProps) {
  const offline = useIsOffline();
  // Wild veggies and trees (garden switch): plants to pick, trees to chop, and their stacks in the bag.
  const gardenRegion = regionId ?? 'ledgers_heart';
  // Trees on today's map (lib/mapNature.ts), once it has loaded.
  const [mapTrees, setMapTrees] = useState<WildTreeNode[]>([]);
  const garden = useGarden({
    userId, regionId: gardenRegion, enabled: useFeatureFlag(userId, 'garden'), offlineMap: playingMapOffline(userId), mapTrees,
  });
  const itemBar = useItemBar({
    userId, battleState, inventory, offline, regionId: regionId ?? null, onBattleStatePatch, onTrackedCurioSummoned,
    gardenSquares: garden.squares,
  });
  const itemBarRef = useRef(itemBar);
  useEffect(() => { itemBarRef.current = itemBar; });
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
  // The ripe veggie plant whose question is up.
  const [activePlant, setActivePlant] = useState<PlantView | null>(null);
  // The tree being chopped, and the latest swing that landed (for the shake).
  const [activeTree, setActiveTree] = useState<TreeView | null>(null);
  const [treeSwing, setTreeSwing] = useState<{ id: string; n: number; kind: SwingKind } | null>(null);
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
  const [localPos, setLocalPos] = useState(() => region?.spawn ?? { x: 1, y: 1 });
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
    if (!mapReady) return presencePlayers;
    const out: typeof presencePlayers = {};
    for (const [id, p] of Object.entries(presencePlayers)) out[id] = standable(p.x, p.y) ? p : { ...p, ...nearestOpen(p.x, p.y, standable) };
    return out;
  }, [presencePlayers, mapReady, standable]);

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
    }

    // An exit on the map's edge only takes the kid through when they choose to (E, tap): see
    // goThroughExit.
    const onEdge = !!portal && (portal.y === 0 || portal.x === 0 || portal.y === map.length - 1 || portal.x === (map[0]?.length ?? 0) - 1);
    if (portal && (!onEdge || viaExit)) {
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
        onEnterRegion?.(portal.regionId);
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

    // Scroll/curio are visible, walked-into map entities — replaces the old
    // "40% chance while stepping on any grass tile" random roll entirely.
    const scrollHere = scrolls.find(s => s.x === newX && s.y === newY);
    if (scrollHere) {
      // Offline, scrolls can only ask what the downloaded answer key covers.
      if (playingMapOffline(userId) && offlineScrollQuestions(userId, questions).length === 0) {
        alert("📡 No internet, and this week's scroll questions aren't saved here yet. Open the map once with internet, and they'll work without it too.");
        return;
      }
      playMonsterAppear();
      setActiveScroll(scrollHere);
      return;
    }
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
  }, [map, userId, onBattleStateChange, onHeal, isLedgersHeart, battleState, portals, playerLevel, onEnterRegion, scrolls, curioPos, activeCurio, activeMapTrainer, pendingTrainerChallenge, trashItems, collectingTrashIds, collectTrash, recyclerTile, pendingRecyclerTrade, regionId, activeRegion.id, questions, showBarMessage]);

  // Plants and trees open their question only when the kid asks (E, a tap on it, or the
  // Pick/Chop button), never just by walking past. The one close enough gets a gold outline.
  const openPlant = useCallback((plant: PlantView) => {
    const now = Date.now();
    if (!plant.ripe) {
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
  }, [garden, showBarMessage, userId, questions]);

  const openTree = useCallback((tree: TreeView) => {
    const now = Date.now();
    if (!tree.ready) {
      showBarMessage('You chopped this tree today. A new forest grows tomorrow!');
    } else if (garden.felledToday >= DAILY_TREE_LIMIT) {
      showBarMessage(`Your arms are tired after ${DAILY_TREE_LIMIT} trees. Chop more tomorrow!`);
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
  }, [garden, showBarMessage, userId, questions]);

  // Plants and trees within reach (on or next to the player's tile; the trunk for a tree),
  // nearest first, plants before trees at the same distance.
  const inReach = useMemo(() => {
    if (!garden.on) return [];
    const dist = (o: { x: number; y: number }) => Math.max(Math.abs(o.x - posX), Math.abs(o.y - posY));
    const found = [
      ...garden.plants.map(plant => ({ kind: 'plant' as const, plant, usable: plant.ripe, d: dist(plant), x: plant.x, y: plant.y })),
      ...garden.trees.map(tree => ({ kind: 'tree' as const, tree, usable: tree.ready, d: dist(tree), x: tree.x, y: tree.y })),
    ].filter(o => o.d <= 1);
    return found.sort((a, b) => a.d - b.d || (a.kind === b.kind ? 0 : a.kind === 'plant' ? -1 : 1));
  }, [garden.on, garden.plants, garden.trees, posX, posY]);
  const nearby = inReach.find(o => o.usable) ?? null;

  // The sky over this map: its biome's clouds, drifting bits and sunset, new clouds each day.
  const ambience = useMemo(
    () => ({ key: `${activeRegion.id}:${natureDay()}`, sky: AMBIENCE[activeRegion.element] }),
    [activeRegion.id, activeRegion.element],
  );
  type Reachable = (typeof inReach)[number];

  const interact = useCallback((target: Reachable) => {
    if (target.kind === 'plant') openPlant(target.plant);
    else openTree(target.tree);
  }, [openPlant, openTree]);

  const handleBlocked = useCallback(() => {
    playWallBump();
    pulse(setBumping);
  }, []);

  // A tap on the map: on a plant or tree in reach, use it; on one further off, say to walk up.
  const handleMapTap = useCallback((tx: number, ty: number) => {
    if (!garden.on || activeScroll || activePlant || activeTree || movementLocked) return;
    const plantCovers = (p: { x: number; y: number; veggie: PlantView['veggie'] }) =>
      p.x === tx && (p.y === ty || (VEGGIES[p.veggie].tall && p.y - 1 === ty));
    // A tree's art spans about three tiles across and four up from its trunk.
    const treeCovers = (t: { x: number; y: number }) => Math.abs(t.x - tx) <= 1 && ty <= t.y && ty >= t.y - 4;
    const hit = inReach.find(o => (o.kind === 'plant' ? plantCovers(o.plant) : treeCovers(o.tree)));
    if (hit) { interact(hit); return; }
    if (garden.plants.some(plantCovers) || garden.trees.some(t => t.ready && treeCovers(t))) {
      showBarMessage('Walk up next to it first!');
    }
  }, [garden.on, garden.plants, garden.trees, inReach, interact, showBarMessage, activeScroll, activePlant, activeTree, movementLocked]);

  // E uses what's in reach: the outlined one, or else says why the nearest can't be used.
  const panelOpen = !!(activeScroll || activePlant || activeTree || movementLocked || pendingTrainerChallenge || pendingCurioChallenge || pendingRecyclerTrade);
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
    enabled: !activeScroll && !activePlant && !activeTree && !movementLocked && !pendingTrainerChallenge && !pendingCurioChallenge && !pendingRecyclerTrade,
    initialTile: { x: posX, y: posY },
    onTileCrossed: handleTileEnter,
    onBlocked: handleBlocked,
    extraBlockedTiles: recyclerTile ? [recyclerTile] : undefined,
  });

  // Loads this region's map (declared after contMove, which it resets).
  useEffect(() => {
    let cancelled = false;
    if (activeRegion.tileArtPath) {
      const nature = activeRegion.dailyNature ? { regionId: activeRegion.id, reserved: WILD_PLANTS[activeRegion.id] ?? [] } : undefined;
      loadTiledArtMap(activeRegion.tileArtPath, nature).then(parsed => {
        if (cancelled) return;
        setMapTrees(parsed.trees);
        setRegionMap(parsed.layout);
        setMapReady(true);
        setBackground({
          type: 'tilemap',
          key: activeRegion.tileArtPath!,
          mapJson: parsed.mapJson,
          tilesetImages: parsed.tilesetImages,
          tileSize: parsed.tileSize,
          belowPlayerLayers: parsed.belowPlayerLayers,
          abovePlayerLayers: parsed.abovePlayerLayers,
          layerOpacity: parsed.layerOpacity,
          animatedTiles: parsed.animatedTiles,
          lights: parsed.lights,
          ysortBase: parsed.ysortBase,
          ysortLayers: parsed.ysortLayers,
        });
        setPortals(parsed.portals);
        setMapRecycler(parsed.recycler);
        setFoliage(parsed.foliage);
        setWildlife(WILDLIFE[activeRegion.id] || GROUND_FX[activeRegion.id] ? {
          key: `${activeRegion.tileArtPath}:${natureDay()}`,
          groups: WILDLIFE[activeRegion.id] ?? [],
          habitat: { width: parsed.mapWidth, height: parsed.mapHeight, open: parsed.layout.map(r => r.map(t => t.type !== 'wall')), liquid: parsed.liquid, sand: parsed.sand.some(r => r.some(Boolean)) ? parsed.sand : undefined, flowers: parsed.flowers },
          fx: GROUND_FX[activeRegion.id],
          sand: parsed.sand,
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
      playChime();
      flyToBag([gardenItemIcon(veggieKey(plant.veggie)), ...(r.seeds > 0 ? [gardenItemIcon(seedsKey(plant.veggie))] : [])]);
      showBarMessage(r.seeds > 0 ? `You picked ${withA(name)} and found ${name} Seeds too!`
        : VEGGIES[plant.veggie].found ? `You found ${withA(name)}! It's in your bag.` : `You picked ${withA(name)}! It's in your bag.`);
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
      flyToBag([...Array(WOOD_PER_TREE).fill(gardenItemIcon(WOOD_KEY)), ...(sapling ? [sapling] : [])]);
      const got = `${WOOD_PER_TREE} wood${r.saplings > 0 ? ` and ${/^[AEIOU]/.test(label) ? 'an' : 'a'} ${label} Sapling` : ''}`;
      showBarMessage(r.clean ? `Clean chop! You got ${got}!` : `Timber! You got ${got}!`);
    } else if (r.status === 'wrong') {
      playClash();
      showBarMessage('Oops! The tree needs a short rest. Try again in a minute.');
    } else if (r.status === 'stump') {
      showBarMessage('You chopped this tree today. A new forest grows tomorrow!');
    } else if (r.status === 'tired') {
      showBarMessage(`Your arms are tired after ${DAILY_TREE_LIMIT} trees. Chop more tomorrow!`);
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
  // Exits on the map's edge (a run of portal tiles to one map, Rowil 2026-10-23): the scene draws
  // a glow in the next map's element color (the Ledger's Heart's and the town's: leaf green, like
  // Rootbound's), sparks and an arrow; here they get one name label, a little inside the gap.
  // Portals inside the map keep their spinning sprite.
  const mapW = regionMap[0]?.length ?? 0, mapH = regionMap.length;
  const exitGroups = useMemo(() => {
    const sideOf = (p: { x: number; y: number }): MapExit['side'] | null =>
      p.y === 0 ? 'n' : p.y === mapH - 1 ? 's' : p.x === 0 ? 'w' : p.x === mapW - 1 ? 'e' : null;
    const groups: { regionId: string; side: MapExit['side']; tiles: { x: number; y: number }[] }[] = [];
    for (const p of [...portals].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const side = sideOf(p);
      if (!side) continue;
      const g = groups.find(q => q.regionId === p.regionId && q.side === side &&
        q.tiles.some(t => Math.abs(t.x - p.x) + Math.abs(t.y - p.y) === 1));
      if (g) g.tiles.push(p); else groups.push({ regionId: p.regionId, side, tiles: [p] });
    }
    return groups;
  }, [portals, mapW, mapH]);
  const exits = useMemo<MapExit[]>(() => exitGroups.map(g => {
    const xs = g.tiles.map(t => t.x), ys = g.tiles.map(t => t.y);
    const dest = REGIONS[g.regionId];
    const el = dest && dest.element !== 'all' ? dest.element : 'leaf';
    return {
      x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1,
      side: g.side, locked: playerLevel < (dest?.unlockLevel ?? 0), color: parseInt(ELEMENT_COLOR[el].text.slice(1), 16),
    };
  }), [exitGroups, playerLevel]);
  const sceneBackground = useMemo<MapBackground | null>(
    () => (background?.type === 'tilemap' && exits.length ? { ...background, exits } : background),
    [background, exits],
  );
  // An exit on the edge works like a tree (Rowil 2026-10-23): walk up to it, then press E, tap
  // the "Go to …" button or tap its name. Walking onto it alone doesn't leave the map.
  const nearExit = useMemo(() => {
    const d = (g: (typeof exitGroups)[number]) => Math.min(...g.tiles.map(t => Math.max(Math.abs(t.x - posX), Math.abs(t.y - posY))));
    const g = exitGroups.filter(q => d(q) <= 1).sort((a, b) => d(a) - d(b))[0];
    if (!g) return null;
    const tile = g.tiles.reduce((best, t) => Math.hypot(t.x - posX, t.y - posY) < Math.hypot(best.x - posX, best.y - posY) ? t : best);
    return { regionId: g.regionId, tile };
  }, [exitGroups, posX, posY]);
  const goThroughExit = useCallback(() => {
    if (nearExit) handleTileEnter(nearExit.tile, undefined, true);
  }, [nearExit, handleTileEnter]);
  const onExitLabelClick = useCallback((regionId: string) => {
    if (nearExit?.regionId === regionId) goThroughExit();
    else showBarMessage('Walk up to the exit first!');
  }, [nearExit, goThroughExit, showBarMessage]);
  useEffect(() => {
    if (!nearExit || nearby || inReach.length || panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'e' && e.key !== 'E')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      goThroughExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearExit, nearby, inReach.length, panelOpen, goThroughExit]);
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
  const controlsDisabled = movementLocked || !!activeScroll || !!activePlant || !!activeTree;

  const frameContent = (
    <div className="relative w-full h-full">
      {/* MOBA-style floating joystick — invisible until pressed, appears
          centered on the finger, left half of the frame only (see
          FloatingJoystick.tsx for why). Replaces the old always-visible
          bottom-left Joystick (2026-09-05). */}
      <FloatingJoystick disabled={controlsDisabled} setDirectionPressed={contMove.setDirectionPressed} />
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
        curioMarker={activeCurio && curioPos ? { ...curioPos, monsterDef: monsterDisplay[activeCurio.monsterId], quality: activeCurio.quality } : null}
        trainerMarker={activeMapTrainer ? { id: activeMapTrainer.id, x: activeMapTrainer.x, y: activeMapTrainer.y, emoji: activeMapTrainer.emoji, name: activeMapTrainer.name, spriteOverride: activeMapTrainer.spriteOverride } : null}
        trashItems={trashItems}
        collectingTrashIds={collectingTrashIds}
        recyclerTile={recyclerTile}
        // The plant being asked about stays ripe until the panel closes, so its dust pop
        // (lib/phaserMap/gardenPlants.ts) plays where the player can see it.
        gardenPlants={garden.on ? garden.sprites.map(p => (p.id === activePlant?.id ? { ...p, stage: 'ripe' as const } : p)) : undefined}
        // Same for a tree: it stands until the panel closes, then falls where the player can see.
        wildTrees={garden.treeSprites.map(t => (t.id === activeTree?.id ? { ...t, stage: 'ready' as const } : t))}
        treeSwing={treeSwing}
        chopTree={activeTree?.id ?? null}
        highlight={nearby && !controlsDisabled ? { kind: nearby.kind, id: nearby.kind === 'plant' ? nearby.plant.id : nearby.tree.id } : null}
        onMapTap={handleMapTap}
        ambience={ambience}
        wildlife={wildlife}
        soundRegion={activeRegion.id}
        onPlayerClick={(id: string) => { playPageFlip(); if (onGatedPlayerClick) onGatedPlayerClick(); else setStatsTargetId(id); }}
      />}
      {!nearby && nearExit && !controlsDisabled && REGIONS[nearExit.regionId] && (
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
          <img
            src={nearby.kind === 'plant' ? gardenItemIcon(veggieKey(nearby.plant.veggie)) : gardenItemIcon(WOOD_KEY)}
            alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }}
          />
          {nearby.kind === 'plant' ? `${pickVerb(nearby.plant.veggie)} ${VEGGIES[nearby.plant.veggie].label}` : `Chop ${TREES[nearby.tree.tree].name}`}
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

  const overlay = pendingRecyclerTrade ? (
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
        hotbar={<MapItemBar api={itemBar} offline={offline} message={barMessage} onMessage={showBarMessage} gardenBag={garden.on ? garden.bag : undefined} />}
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
