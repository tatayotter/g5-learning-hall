'use client';
// Info drawer — Team/Online/Bag tabs. Used to be three permanent side cards;
// tabbed here since the drawer (like the battle log) is deliberately compact
// and hidden by default. Split out of TrainingMap.tsx, which still owns all
// the underlying state (userMonsters, mapPresence, trash inventory) and just
// passes it down — this component is pure display + the tab switch.
import { MonsterImage, GMBadge, type UserMonster } from '@/components/battle/shared';
import { USERS } from '@/lib/userSession';
import { BATTLE_CONSTANTS, getScaledStats, type MonsterDef } from '@/lib/monsterConfig';
import { TRASH_DEFS, TRASH_ORDER } from '@/lib/trashConfig';
import type { TrashInventory } from '@/hooks/useTrashItems';
import type { OnlinePlayer } from '@/hooks/useMapPresence';

export type InfoTab = 'team' | 'online' | 'bag';

interface MapInfoDrawerProps {
  infoTab: InfoTab;
  onTabChange: (tab: InfoTab) => void;
  userMonsters: UserMonster[];
  activeMonsterSlot: number | null;
  monsterDisplay: Record<string, MonsterDef>;
  onlinePlayers: Record<string, OnlinePlayer>;
  onStatsTarget: (userId: string) => void;
  trashInventory: TrashInventory;
  trashItemsOnMap: number;
  respawnSecsLeft: number | null;
}

export default function MapInfoDrawer({
  infoTab, onTabChange, userMonsters, activeMonsterSlot, monsterDisplay,
  onlinePlayers, onStatsTarget, trashInventory, trashItemsOnMap, respawnSecsLeft,
}: MapInfoDrawerProps) {
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {([
          { id: 'team' as const, label: 'Team' },
          { id: 'online' as const, label: `Online (${Object.keys(onlinePlayers).length})` },
          { id: 'bag' as const, label: '🎒 Bag' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
                const isActive = monster.slot === activeMonsterSlot;
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
                  onClick={() => onStatsTarget(p.userId)}
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
              {trashItemsOnMap} trash items on the map
            </p>
          )}
        </div>
      )}

    </div>
  );
}
