'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { createTrailingThrottle } from '@/lib/throttle';
import { playMonsterAppear, playChime, playClash, playFootstepGrass, playFootstepTown, playWallBump, playCoins } from '@/lib/sounds';
import { USERS } from '@/lib/userSession';
import { useMapPresence } from '@/hooks/useMapPresence';
import { useContinuousMovement } from '@/hooks/useContinuousMovement';
import PlayerStatsPopup from '@/components/PlayerStatsPopup';
import {
  MonsterDef, BATTLE_CONSTANTS, getScaledStats, getMonsterLevel,
  getWildEncounterChance, WILD_ENCOUNTER_PITY_THRESHOLD,
  NpcTrainer, NPC_TRAINERS,
} from '@/lib/monsterConfig';
import { MonsterImage, BattleQuestionModal, GMBadge, UserMonster } from '@/components/battle/shared';
import { useLiveBattleInbox } from '@/hooks/useLiveBattleInbox';
import MapStage from '@/components/MapStage';
import MapCanvas from '@/components/monster/map/MapCanvas';
import Joystick from '@/components/monster/map/Joystick';
import { REGIONS, type MapTile } from '@/lib/regions';
import { loadTiledMap, blankLoadingMap } from '@/lib/tiledMap';
import { loadTiledArtMap, type TiledArtPortal } from '@/lib/tiledArtMap';
import type { MapBackground } from '@/lib/phaserMap/TrainingMapScene';
import { CaughtMonster, BattleState } from '@/components/monster/types';
import type { QualityTier } from '@/lib/curioQuality';
import { useTrashItems } from '@/hooks/useTrashItems';
import { TRASH_DEFS, TRASH_ORDER, RECYCLER_TILES } from '@/lib/trashConfig';
import { BOT_IDS } from '@/lib/botProfiles';

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

interface TrainingMapProps {
  userId: string;
  battleState: BattleState;
  userMonsters: UserMonster[];
  caughtMonsters: CaughtMonster[];
  questions: any[];
  gradingUserId: string;
  onBattleStateChange: (state: BattleState) => void;
  onMonsterExpGained: (monsterId: string, exp: number) => void;
  onHeal: () => void;
  onQuestionsAnswered?: (questions: any[]) => void;
  onWildEncounterRoll?: () => void;
  // The curio MonsterGuild picked (species/level/question) once a scroll
  // roll succeeds — TrainingMap only owns WHERE it renders (curioPos,
  // picked adjacent to the player); MonsterGuild owns WHAT it is and the
  // actual battle-entry flow (WildEncounterModal). Walking onto curioPos's
  // tile calls onEnterCurio, which is what actually opens that modal.
  activeCurio?: { id: number; monsterId: string; quality: QualityTier } | null;
  onEnterCurio?: () => void;
  onChallengePlayer?: (targetId: string, name: string) => void;
  /** Called when the player walks within 1 tile of a trainer NPC on the map. */
  onTrainerEncounter?: (trainer: NpcTrainer) => void;
  /** Called with gold earned when the player trades trash at the Recycler NPC. */
  onTrashTraded?: (gold: number) => void;
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
}

export default function TrainingMap({
  userId, battleState, userMonsters, caughtMonsters, questions, gradingUserId,
  onBattleStateChange, onMonsterExpGained, onHeal, onQuestionsAnswered, onWildEncounterRoll,
  activeCurio, onEnterCurio, onChallengePlayer, onTrainerEncounter, onTrashTraded,
  liveBattleInbox, mapPresence, movementLocked, walkLockActive, monsterDisplay,
  regionId, onExitRegion, playerLevel, onEnterRegion, fullscreen,
}: TrainingMapProps) {
  const [scrolls, setScrolls] = useState<{ id: number; x: number; y: number }[]>([]);
  const [activeScroll, setActiveScroll] = useState<{ id: number; x: number; y: number } | null>(null);
  const [curioPos, setCurioPos] = useState<{ x: number; y: number } | null>(null);
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
  // unthrottled DB write per step. Collapsed to at most one every 200ms
  // (matches useMapPresence's PRESENCE_TRACK_THROTTLE_MS) while still
  // guaranteeing the latest tile is always eventually persisted. Recreated
  // naturally on remount (component remounts on regionId change, see below).
  const positionWriteThrottleRef = useRef(
    createTrailingThrottle((newX: number, newY: number) => {
      supabase.from('user_battle_state')
        .update({ map_x: newX, map_y: newY, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }, 200)
  );
  // Flush on unmount only (empty deps — see useMapPresence.ts's identical
  // pattern) so leaving the map mid-throttle-window doesn't strand a stale
  // saved position behind the player's actual last tile.
  useEffect(() => () => positionWriteThrottleRef.current.flush(), []);
  const [statsTargetId, setStatsTargetId] = useState<string | null>(null);
  const [infoTab, setInfoTab] = useState<'team' | 'online' | 'bag'>('team');
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
  const [foliage, setFoliage] = useState<boolean[][] | null>(null);
  const [lockedPortalMsg, setLockedPortalMsg] = useState<string | null>(null);

  const recyclerTile = RECYCLER_TILES[activeRegion.id] ?? null;
  useEffect(() => {
    let cancelled = false;
    if (activeRegion.tileArtPath) {
      loadTiledArtMap(activeRegion.tileArtPath).then(parsed => {
        if (cancelled) return;
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
        });
        setPortals(parsed.portals);
        setFoliage(parsed.foliage);
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
            supabase.from('user_battle_state')
              .update({ map_x: parsed.spawn.x, map_y: parsed.spawn.y, updated_at: new Date().toISOString() })
              .eq('user_id', userId);
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
  const map = regionMap;

  // Walkable (grass) tiles excluding foliage canopy — same eligibility rules
  // as scroll/curio spawning so trash never lands on trees or fences.
  const walkableTiles = useMemo(() => {
    const tiles: { x: number; y: number }[] = [];
    for (let y = 0; y < activeRegion.mapHeight; y++) {
      for (let x = 0; x < activeRegion.mapWidth; x++) {
        if (map[y]?.[x]?.type !== 'grass') continue;
        if (foliage?.[y]?.[x]) continue;
        tiles.push({ x, y });
      }
    }
    return tiles;
  }, [map, foliage, activeRegion.mapWidth, activeRegion.mapHeight]);

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
    inventory: trashInventory,
    collectTrash,
    tradeAll,
    canTrade,
    respawnSecsLeft,
  } = useTrashItems(walkableTiles, activeRegion.id, trashOccupied);

  // Elemental regions always start at their fixed spawn point and never
  // persist position — this local state naturally resets on region re-entry
  // since TrainingMap remounts when regionId changes.
  const [localPos, setLocalPos] = useState(() => region?.spawn ?? { x: 1, y: 1 });
  const posX = isLedgersHeart ? battleState.map_x : localPos.x;
  const posY = isLedgersHeart ? battleState.map_y : localPos.y;
  const activeMonster = userMonsters.find(m => m.slot === battleState.active_monster_slot);
  const { onlinePlayers, waves, sendWave } = mapPresence;

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
    if (spawned.length > 0) setScrolls(spawned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // Defensive reset if this TrainingMap instance ever persists across a
  // regionId change (e.g. a portal transition that doesn't force a full
  // remount) — without this, a stale scroll pool from the previous map
  // could linger at coordinates that no longer make sense on the new one.
  useEffect(() => {
    setScrolls([]);
    setActiveScroll(null);
    setCurioPos(null);
    setActiveMapTrainer(null);
    setPendingTrainerChallenge(null);
    setPendingCurioChallenge(false);
    setPendingRecyclerTrade(false);
    setCollectingTrashIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  // curioPos tracks activeCurio's lifecycle exactly: picked the moment a
  // curio identity arrives from MonsterGuild, cleared the moment it's gone
  // (caught, fled, or a region change) — single source of truth, no
  // MonsterGuild-side position bookkeeping needed.
  useEffect(() => {
    if (!activeCurio) {
      setCurioPos(null);
      return;
    }
    const occupied = [...scrolls, { x: posX, y: posY }];
    const tile = pickAdjacentOpenTile(map, activeRegion.mapWidth, activeRegion.mapHeight, posX, posY, occupied, foliage);
    setCurioPos(tile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCurio?.id]);

  // Restarts a CSS keyframe animation on repeat triggers (toggling the same
  // boolean twice in a row wouldn't otherwise re-fire the animation).
  const pulse = (setter: (v: boolean) => void) => {
    setter(false);
    requestAnimationFrame(() => setter(true));
  };

  // Fires once per tile the player newly enters (continuous movement crosses
  // tile boundaries instead of "completing a move()") — same side effects,
  // same odds/timing, as the old discrete move() used to run synchronously.
  const handleTileEnter = useCallback((tile: { x: number; y: number }) => {
    const { x: newX, y: newY } = tile;
    const tileData = map[newY]?.[newX];
    if (!tileData) return;

    const portal = isLedgersHeart ? portals.find(p => p.x === newX && p.y === newY) : undefined;

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

    if (portal) {
      const targetRegion = REGIONS[portal.regionId];
      if (targetRegion && playerLevel >= targetRegion.unlockLevel) {
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
      playMonsterAppear();
      setActiveScroll(scrollHere);
      return;
    }
    if (curioPos && curioPos.x === newX && curioPos.y === newY) {
      setPendingCurioChallenge(true);
      return;
    }

    // Trash pickup — play coin sound + start lift animation, then remove from map
    const trashHere = trashItems.find(t => t.x === newX && t.y === newY);
    if (trashHere && !collectingTrashIds.has(trashHere.id)) {
      playCoins();
      setCollectingTrashIds(prev => new Set([...prev, trashHere.id]));
      setTimeout(() => {
        collectTrash(trashHere.id);
        setCollectingTrashIds(prev => { const n = new Set(prev); n.delete(trashHere.id); return n; });
        // Persist to player_progress for achievement tracking; skip for bots.
        if (!BOT_IDS.has(userId)) {
          supabase.rpc('add_trash_stats', { p_user_id: userId, p_collected: 1, p_gold: 0 });
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
  }, [map, userId, onBattleStateChange, onHeal, isLedgersHeart, battleState, portals, playerLevel, onEnterRegion, scrolls, curioPos, onEnterCurio, activeMapTrainer, pendingTrainerChallenge, pendingCurioChallenge, onTrainerEncounter, trashItems, collectingTrashIds, collectTrash, recyclerTile, pendingRecyclerTrade]);

  const handleBlocked = useCallback(() => {
    playWallBump();
    pulse(setBumping);
  }, []);

  const contMove = useContinuousMovement({
    map,
    mapWidth: activeRegion.mapWidth,
    mapHeight: activeRegion.mapHeight,
    enabled: !activeScroll && !movementLocked && !pendingTrainerChallenge && !pendingCurioChallenge && !pendingRecyclerTrade,
    initialTile: { x: posX, y: posY },
    onTileCrossed: handleTileEnter,
    onBlocked: handleBlocked,
    extraBlockedTiles: recyclerTile ? [recyclerTile] : undefined,
  });

  const handleScrollAnswer = async (correctCount: number, answeredQuestions: any[]) => {
    const answered = activeScroll!;
    setActiveScroll(null);
    if (correctCount > 0) playChime(); else playClash();
    onQuestionsAnswered?.(answeredQuestions);
    if (correctCount > 0 && activeMonster) {
      const expGain = BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER;
      onMonsterExpGained(activeMonster.id, expGain);
      const newExp = activeMonster.monster_exp + expGain;
      await supabase.from('user_monsters')
        .update({ monster_exp: newExp, monster_level: getMonsterLevel(newExp) })
        .eq('id', activeMonster.id);
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
    if (correctCount > 0 && !activeMapTrainer && mapReady) {
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
    let encountered = correctCount > 0 && !activeCurio && Math.random() < wildEncounterChance;

    // Pity timer: always active (see WILD_ENCOUNTER_PITY_THRESHOLD's header
    // comment) — forces an encounter once this many correct answers pass
    // without one occurring naturally. The counter itself still accrues on
    // every correct answer even while capped by an already-active curio —
    // only the encounter is suppressed then, not the progress toward pity.
    let questionsSinceEncounter = battleState.questions_since_wild_encounter + correctCount;
    if (!encountered && !activeCurio && questionsSinceEncounter >= WILD_ENCOUNTER_PITY_THRESHOLD) {
      encountered = true;
    }
    questionsSinceEncounter = encountered ? 0 : questionsSinceEncounter;
    stateUpdates.questions_since_wild_encounter = questionsSinceEncounter;

    await supabase.from('user_battle_state').update(stateUpdates).eq('user_id', userId);
    onBattleStateChange({ ...battleState, ...stateUpdates });

    if (encountered) onWildEncounterRoll?.();
  };

  const leftTag = (
    <span className="flex items-center gap-1.5">
      {onExitRegion && (
        <button onClick={onExitRegion} className="hover:text-amber-400" title="Back to World Map">←</button>
      )}
      {isLedgersHeart ? REGIONS.ledgers_heart.name : region!.name}
    </span>
  );

  // Map — Phaser canvas for the world layer (background, sprites, dust,
  // bump shake) with a thin DOM overlay for name tags/badges/bubbles/marker;
  // see components/monster/map/MapCanvas.tsx for the split rationale.
  // Ledger's Heart's tile-art map has no dedicated healing tile (see
  // lib/tiledArtMap.ts's header comment) — so no marker to show there.
  const townMarkerTile = isLedgersHeart ? null : region!.townCenter;
  const portalMarkers = isLedgersHeart
    ? portals.map(p => ({ x: p.x, y: p.y, regionId: p.regionId, locked: playerLevel < (REGIONS[p.regionId]?.unlockLevel ?? 0) }))
    : undefined;
  // Hoisted to avoid an IIFE allocation on every render inside the scroll panel JSX.
  const activeMonsterExpToNext = activeMonster
    ? BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - (activeMonster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL)
    : null;

  const frameContent = (
    <div className="relative w-full h-full">
      {background && <MapCanvas
        mapWidth={activeRegion.mapWidth}
        mapHeight={activeRegion.mapHeight}
        background={background}
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
        scrollMarkers={scrolls}
        curioMarker={activeCurio && curioPos ? { ...curioPos, monsterDef: monsterDisplay[activeCurio.monsterId], quality: activeCurio.quality } : null}
        trainerMarker={activeMapTrainer ? { id: activeMapTrainer.id, x: activeMapTrainer.x, y: activeMapTrainer.y, emoji: activeMapTrainer.emoji, name: activeMapTrainer.name, spriteOverride: activeMapTrainer.spriteOverride } : null}
        trashItems={trashItems}
        collectingTrashIds={collectingTrashIds}
        recyclerTile={recyclerTile}
        onPlayerClick={setStatsTargetId}
      />}
      {lockedPortalMsg && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 border border-amber-600 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap z-20">
          🔒 {lockedPortalMsg}
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

  // Movement controls overlaid directly on the map (bottom-left corner of
  // the frame) instead of living outside it in a separate row. Shown on
  // every view type (desktop included) — desktop keyboard arrow-key support
  // still works unchanged via useContinuousMovement's own keydown/keyup
  // listeners, the joystick is just an always-available mouse alternative
  // now. Gated by both movementLocked and activeScroll, matching the
  // keyboard path.
  const controlsDisabled = movementLocked || !!activeScroll;
  const controls = (
    <div className="flex items-end gap-2">
      <div>
        <Joystick disabled={controlsDisabled} setDirectionPressed={contMove.setDirectionPressed} />
        {walkLockActive && <p className="text-[9px] text-amber-400 mt-0.5 text-center">⏳ wait...</p>}
      </div>
    </div>
  );

  // Info drawer — Team/Online/Legend/Tips used to be four permanent side
  // cards; tabbed here instead since the drawer (like the battle log) is
  // deliberately compact and hidden by default.
  const drawer = (
    <div>
      <div className="flex gap-1 mb-2">
        {([
          { id: 'team' as const, label: 'Team' },
          { id: 'online' as const, label: `Online (${Object.keys(onlinePlayers).length})` },
          { id: 'bag' as const, label: '🎒 Bag' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setInfoTab(tab.id)}
            className={`flex-1 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-1 transition-colors ${
              infoTab === tab.id
                ? 'bg-amber-900/30 text-amber-400 border border-amber-800'
                : 'bg-neutral-900 text-gray-500 border border-neutral-800 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {infoTab === 'team' && (
        userMonsters.filter(m => m.slot !== null).length === 0 ? (
          <p className="text-gray-500 text-xs">No curios on your team</p>
        ) : (
          <div className="space-y-2">
            {userMonsters
              .filter(m => m.slot !== null)
              .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
              .map(monster => {
                const def = monsterDisplay[monster.monster_id];
                const isActive = monster.slot === battleState.active_monster_slot;
                const expIntoLevel = monster.monster_exp % BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL;
                const expToNext = BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL - expIntoLevel;
                const scaled = getScaledStats(def, monster.monster_level, monster.quality);
                return (
                  <div
                    key={monster.id}
                    className={`rounded-lg p-2 ${isActive ? 'border border-amber-700 bg-amber-900/10' : 'border border-neutral-800 bg-neutral-900'}`}
                  >
                    <div className="flex items-center gap-2">
                      <MonsterImage monster={def} className="w-9 h-9 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs truncate">
                          {def?.name}
                          {isActive && <span className="ml-1.5 text-[9px] text-amber-400 font-bold uppercase tracking-wide">Active</span>}
                        </p>
                        <p className="text-[10px] text-gray-400 capitalize">Lv.{monster.monster_level} · {def?.element}</p>
                        <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                          <div className="h-1 rounded-full bg-amber-400" style={{ width: `${(expIntoLevel / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) * 100}%` }} />
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 space-y-0.5 flex-shrink-0">
                        <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.hp}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.attack}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.speed}</p>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-0.5">{expToNext} EXP to next level</p>
                  </div>
                );
              })}
          </div>
        )
      )}

      {infoTab === 'online' && (
        Object.keys(onlinePlayers).length === 0 ? (
          <p className="text-gray-600 text-xs">No one else is on the map right now.</p>
        ) : (
          <div className="space-y-1.5">
            {Object.values(onlinePlayers)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => (
                <button
                  key={p.userId}
                  onClick={() => setStatsTargetId(p.userId)}
                  className="w-full flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-amber-500 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-white text-xs font-medium truncate">
                    {USERS[p.userId]?.name || p.name}
                  </span>
                  {USERS[p.userId]?.isFamily && <GMBadge />}
                  <span className="text-[10px] text-gray-500 ml-auto">{USERS[p.userId]?.grade}</span>
                </button>
              ))}
          </div>
        )
      )}

      {infoTab === 'bag' && (
        <div>
          {/* 1×6 item list */}
          <div className="flex flex-col gap-1 mb-3">
            {TRASH_ORDER.map(type => {
              const def = TRASH_DEFS[type];
              const count = trashInventory[type];
              return (
                <div
                  key={type}
                  className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1"
                  title={`${def.bundleSize} pcs = 1g`}
                >
                  <img
                    src={`/trash/${type}.png`}
                    alt={def.label}
                    className="w-6 h-6 object-contain flex-shrink-0"
                    style={{ imageRendering: 'auto' }}
                  />
                  <span className="flex-1 text-[10px] text-gray-300 leading-none">{def.label}</span>
                  <span className="text-[10px] text-gray-500 leading-none">{def.bundleSize}=1g</span>
                  <span className={`text-[11px] font-bold leading-none w-5 text-right ${count > 0 ? 'text-white' : 'text-neutral-600'}`}>
                    {count}
                  </span>
                </div>
              );
            })}
            {/* 6th slot empty */}
            <div className="rounded-md border border-neutral-800 bg-neutral-900/40 h-8" />
          </div>

          {respawnSecsLeft !== null && (
            <p className="text-[10px] text-amber-500 text-center font-medium">
              Trash respawns in {Math.floor(respawnSecsLeft / 60)}:{String(respawnSecsLeft % 60).padStart(2, '0')}…
            </p>
          )}
          {respawnSecsLeft === null && (
            <p className="text-[10px] text-gray-500 text-center">
              {trashItems.length} trash items on the map
            </p>
          )}
        </div>
      )}

    </div>
  );

  const curioDef = activeCurio ? monsterDisplay[activeCurio.monsterId] : null;

  // Gold the player will earn if they trade all complete bundles right now.
  const pendingTradeGold = (Object.keys(TRASH_DEFS) as (keyof typeof TRASH_DEFS)[]).reduce(
    (sum, t) => sum + Math.floor(trashInventory[t] / TRASH_DEFS[t].bundleSize), 0,
  );

  const overlay = pendingRecyclerTrade ? (
    // Recycler NPC trade panel — player stepped within 1 tile of the recycler.
    <div className="w-full max-w-sm bg-neutral-900 border border-green-700 rounded-2xl p-4 battle-panel-in">
      <div className="flex items-start gap-3 mb-4">
        <img
          src="/npcs/recycler.png"
          alt="Recycler"
          className="w-14 h-14 flex-shrink-0 object-contain object-bottom rounded-lg bg-neutral-800"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="min-w-0">
          <p className="font-bold text-green-300 text-sm leading-tight">♻️ Recycler</p>
          <p className="text-gray-300 text-sm italic mt-1 leading-snug">
            "Got trash? I'll give you gold for it!"
          </p>
        </div>
      </div>

      {/* 1×6 inventory list */}
      <div className="flex flex-col gap-1 mb-4">
        {TRASH_ORDER.map(type => {
          const def = TRASH_DEFS[type];
          const count = trashInventory[type];
          const complete = count >= def.bundleSize;
          return (
            <div
              key={type}
              className={`flex items-center gap-2 rounded-md border px-2 py-1 ${
                complete ? 'bg-green-900/30 border-green-700' : 'bg-neutral-800 border-neutral-700'
              }`}
            >
              <img
                src={`/trash/${type}.png`}
                alt={def.label}
                className="w-6 h-6 object-contain flex-shrink-0"
                style={{ imageRendering: 'auto' }}
              />
              <span className="flex-1 text-[10px] text-gray-300 leading-none">{def.label}</span>
              <span className="text-[10px] text-gray-500 leading-none">{def.bundleSize}=1g</span>
              <span className={`text-[11px] font-bold leading-none w-5 text-right ${count > 0 ? 'text-white' : 'text-neutral-600'}`}>
                {count}
              </span>
            </div>
          );
        })}
        {/* 6th slot empty */}
        <div className="rounded-md border border-neutral-800 bg-neutral-900/40 h-8" />
      </div>

      {canTrade && (
        <p className="text-center text-xs text-green-400 font-bold mb-3">
          Ready to trade →{' '}
          <span className="text-amber-300 inline-flex items-center gap-0.5">
            +{pendingTradeGold}g
            <img src="/icons/rewards/gold_coin.svg" alt="gold" className="w-3.5 h-3.5 object-contain inline" />
          </span>
        </p>
      )}
      {!canTrade && (
        <p className="text-center text-xs text-gray-500 mb-3">
          Collect more trash to make a bundle.
        </p>
      )}

      <div className="flex gap-2">
        <button
          disabled={!canTrade}
          className="flex-1 bg-green-700 hover:bg-green-600 active:bg-green-800 disabled:opacity-40
                     text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          onClick={() => {
            const gold = tradeAll();
            if (gold > 0) {
              onTrashTraded?.(gold);
              setGoldEarnedFlash(gold);
              setTimeout(() => setGoldEarnedFlash(null), 1800);
              // Persist gold-from-recycling counter for achievements; skip for bots.
              if (!BOT_IDS.has(userId)) {
                supabase.rpc('add_trash_stats', { p_user_id: userId, p_collected: 0, p_gold: gold });
              }
            }
            setPendingRecyclerTrade(false);
          }}
        >
          ♻️ Trade All
        </button>
        <button
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900
                     text-gray-400 font-bold text-sm py-2.5 rounded-xl border border-neutral-700
                     transition-colors"
          onClick={() => setPendingRecyclerTrade(false)}
        >
          Maybe Later
        </button>
      </div>
    </div>
  ) : pendingCurioChallenge && activeCurio && curioDef ? (
    // Wild curio encounter dialogue — shown when the player steps onto the
    // curio tile. Battle! enters the encounter; Run Away lets the player
    // walk away (curio remains on the map).
    <div className="w-full max-w-sm bg-neutral-900 border border-emerald-700 rounded-2xl p-4 battle-panel-in">
      <div className="flex items-start gap-3 mb-4">
        <MonsterImage monster={curioDef} className="w-14 h-14 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-emerald-300 text-sm leading-tight">{curioDef.name} appeared!</p>
          <p className="text-gray-400 text-xs mt-0.5 capitalize">{activeCurio.quality} · {curioDef.element} type</p>
          <p className="text-gray-300 text-sm italic mt-1 leading-snug">
            "A wild curio is challenging you!"
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800
                     text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          onClick={() => { setPendingCurioChallenge(false); onEnterCurio?.(); }}
        >
          ⚔️ Battle!
        </button>
        <button
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900
                     text-gray-400 font-bold text-sm py-2.5 rounded-xl border border-neutral-700
                     transition-colors"
          onClick={() => setPendingCurioChallenge(false)}
        >
          🏃 Run Away!
        </button>
      </div>
    </div>
  ) : pendingTrainerChallenge ? (
    // Trainer challenge dialogue — shown when the player enters the trainer's
    // 3×3 detection zone. Accept launches the battle; Run Away dismisses.
    <div className="w-full max-w-sm bg-neutral-900 border border-amber-700 rounded-2xl p-4 battle-panel-in">
      <div className="flex items-start gap-3 mb-4">
        <img
          src={pendingTrainerChallenge.spriteOverride ?? `/trainers/${pendingTrainerChallenge.id}.png`}
          alt={pendingTrainerChallenge.name}
          className="w-14 h-14 flex-shrink-0 object-contain object-bottom rounded-lg bg-neutral-800"
          onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).alt = pendingTrainerChallenge?.emoji ?? ''; }}
        />
        <div className="min-w-0">
          <p className="font-bold text-amber-300 text-sm leading-tight">{pendingTrainerChallenge.name}</p>
          <p className="text-gray-300 text-sm italic mt-1 leading-snug">
            "{pendingTrainerChallenge.intro}"
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 bg-amber-600 hover:bg-amber-500 active:bg-amber-700
                     text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          onClick={() => {
            const trainer = pendingTrainerChallenge;
            setPendingTrainerChallenge(null);
            setActiveMapTrainer(null);
            onTrainerEncounter?.(trainer);
          }}
        >
          ⚔️ Accept!
        </button>
        <button
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900
                     text-gray-400 font-bold text-sm py-2.5 rounded-xl border border-neutral-700
                     transition-colors"
          onClick={() => {
            setPendingTrainerChallenge(null);
            setActiveMapTrainer(null);
          }}
        >
          🏃 Run Away!
        </button>
      </div>
    </div>
  ) : activeScroll ? (
    <div className="w-full max-w-xl bg-[#f5e8c8] border-2 border-[#8b5e2a] rounded-2xl p-4 max-h-full overflow-y-auto battle-panel-in">
      <div className="flex items-center gap-3 mb-3 bg-amber-100 border border-amber-300 rounded-xl px-3 py-2">
        {activeMonster && (
          <MonsterImage monster={monsterDisplay[activeMonster.monster_id]} className="w-10 h-10 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-stone-900 font-bold text-sm leading-tight">
            {activeMonster ? monsterDisplay[activeMonster.monster_id]?.name : 'Your monster'} is practicing!
          </p>
          <p className="text-xs text-stone-600 leading-tight">
            Answer correctly → <span className="text-amber-600 font-bold">+{BATTLE_CONSTANTS.MONSTER_EXP_PER_GRASS_ANSWER} EXP</span>
            {activeMonsterExpToNext !== null && (
              <span className="text-stone-400 text-[11px] ml-1">({activeMonsterExpToNext} to next level)</span>
            )}
          </p>
        </div>
      </div>
      <BattleQuestionModal
        questions={questions}
        count={1}
        embedded={true}
        gradingUserId={gradingUserId}
        onComplete={handleScrollAnswer}
      />
    </div>
  ) : null;

  return (
    <>
      <MapStage
        leftTag={leftTag}
        rightTag={`🟢 ${Object.keys(onlinePlayers).length}`}
        frame={frameContent}
        controls={controls}
        drawerLabel="Info"
        drawer={drawer}
        overlay={overlay}
        fullscreen={fullscreen}
      />

      {statsTargetId && (
        <PlayerStatsPopup
          targetId={statsTargetId}
          onClose={() => setStatsTargetId(null)}
          onWave={sendWave}
          onChallenge={onChallengePlayer}
          targetInBattle={liveBattleInbox?.playersInBattle.has(statsTargetId) ?? false}
        />
      )}
    </>
  );
}
