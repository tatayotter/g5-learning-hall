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
import { friendPartnerId, type FriendData } from '@/lib/friends';

export type InfoTab = 'team' | 'online' | 'bag' | 'friends';

interface MapInfoDrawerProps {
  viewerId: string;
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
  friendData: FriendData;
  onAcceptFriendRequest: (requestId: string) => void;
  onDeclineFriendRequest: (requestId: string) => void;
  onCancelFriendRequest: (requestId: string) => void;
  onRemoveFriend: (friendId: string) => void;
}

export default function MapInfoDrawer({
  viewerId, infoTab, onTabChange, userMonsters, activeMonsterSlot, monsterDisplay,
  onlinePlayers, onStatsTarget, trashInventory, trashItemsOnMap, respawnSecsLeft,
  friendData, onAcceptFriendRequest, onDeclineFriendRequest, onCancelFriendRequest, onRemoveFriend,
}: MapInfoDrawerProps) {
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {([
          { id: 'team' as const, label: 'Team' },
          { id: 'online' as const, label: `Online (${Object.keys(onlinePlayers).length})` },
          { id: 'friends' as const, label: `Friends${friendData.incoming.length > 0 ? ` (${friendData.incoming.length})` : ''}` },
          { id: 'bag' as const, label: '🎒 Bag' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 text-[15px] font-bold uppercase tracking-wide rounded px-1.5 py-1.5 transition-colors ${
              infoTab === tab.id
                ? 'bg-[#c9781a]/20 text-[#c9781a] border border-[#c9781a]'
                : tab.id === 'friends' && friendData.incoming.length > 0
                ? 'bg-pink-100 text-pink-600 border border-pink-400'
                : 'bg-white text-[#6b4820] border border-[#c9a87a] hover:border-[#c9781a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content chips are solid white/opaque — same "readable as crisp" idea as
          MonsterHpPanel's status pills (STATUS_PILL_COLORS): light, opaque fills
          for content sitting ON a dark wood-framed card, even though the frame
          itself stays dark on purpose (see docs/STYLE_GUIDE.md's "deliberately
          still dark" list — that's about the frame, not what floats on it). */}
      {infoTab === 'team' && (
        userMonsters.filter(m => m.slot !== null).length === 0 ? (
          <p className="text-[#e8d0a0] text-sm">No curios on your team</p>
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
                    className={`rounded-lg p-2 bg-white ${isActive ? 'border-2 border-amber-500' : 'border border-[#c9a87a]'}`}
                  >
                    <div className="flex items-center gap-2">
                      <MonsterImage monster={def} className="w-9 h-9 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#2a1505] text-sm truncate">
                          {def?.name}
                          {isActive && <span className="ml-1.5 text-[11px] text-amber-600 font-bold uppercase tracking-wide">Active</span>}
                        </p>
                        <p className="text-[12px] text-[#6b4820] capitalize">Lv.{monster.monster_level} · {def?.element}</p>
                        <div className="w-full bg-[#e8d0a0] rounded-full h-1 mt-1">
                          <div className="h-1 rounded-full bg-amber-500" style={{ width: `${(expIntoLevel / BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL) * 100}%` }} />
                        </div>
                      </div>
                      <div className="text-[11px] text-[#6b4820] space-y-0.5 flex-shrink-0">
                        <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.hp}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.attack}</p>
                        <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-2.5 h-2.5 object-contain" /> {scaled.speed}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#8b5e2a] mt-0.5">{expToNext} EXP to next level</p>
                  </div>
                );
              })}
          </div>
        )
      )}

      {infoTab === 'online' && (
        Object.keys(onlinePlayers).length === 0 ? (
          <p className="text-[#e8d0a0] text-sm">No one else is on the map right now.</p>
        ) : (
          <div className="space-y-1.5">
            {Object.values(onlinePlayers)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => (
                <button
                  key={p.userId}
                  onClick={() => onStatsTarget(p.userId)}
                  className="w-full flex items-center gap-2 bg-white border border-[#c9a87a] hover:border-amber-500 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-[#2a1505] text-sm font-medium truncate">
                    {USERS[p.userId]?.name || p.name}
                  </span>
                  {USERS[p.userId]?.isFamily && <GMBadge />}
                  <span className="text-[12px] text-[#6b4820] ml-auto">{USERS[p.userId]?.grade}</span>
                </button>
              ))}
          </div>
        )
      )}

      {infoTab === 'friends' && (
        <div className="space-y-3">
          {friendData.incoming.length > 0 && (
            <div>
              <p className="text-[12px] text-[#f0ddb8] uppercase tracking-widest font-bold mb-1">Requests</p>
              <div className="space-y-1.5">
                {friendData.incoming.map(r => (
                  <div key={r.id} className="flex items-center gap-2 bg-white border border-pink-400 rounded-lg px-2.5 py-1.5">
                    <span className="text-[#2a1505] text-sm font-medium truncate flex-1">
                      {USERS[r.requester_id]?.name || r.requester_id}
                    </span>
                    <button
                      onClick={() => onAcceptFriendRequest(r.id)}
                      className="text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded px-2 py-1 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onDeclineFriendRequest(r.id)}
                      className="text-[12px] font-bold text-[#6b4820] bg-[#f0ddb8] hover:bg-[#e8c88a] rounded px-2 py-1 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[12px] text-[#f0ddb8] uppercase tracking-widest font-bold mb-1">
              My Friends {friendData.friends.length > 0 && `(${friendData.friends.length})`}
            </p>
            {friendData.friends.length === 0 ? (
              <p className="text-[#e8d0a0] text-sm">No friends yet — add one from their Trainer Card on the map.</p>
            ) : (
              <div className="space-y-1.5">
                {friendData.friends.map(f => {
                  const friendId = friendPartnerId(f, viewerId);
                  const isOnline = !!onlinePlayers[friendId];
                  return (
                    <div
                      key={f.id}
                      className="w-full flex items-center gap-2 bg-white border border-[#c9a87a] rounded-lg px-2.5 py-1.5"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-[#c9a87a]'}`} />
                      <button
                        onClick={() => onStatsTarget(friendId)}
                        className="text-[#2a1505] text-sm font-medium truncate flex-1 text-left hover:text-[#c9781a] transition-colors"
                      >
                        {USERS[friendId]?.name || friendId}
                        {USERS[friendId]?.isFamily && <GMBadge />}
                      </button>
                      <button
                        onClick={() => onRemoveFriend(friendId)}
                        title="Remove friend"
                        className="text-[12px] font-bold text-[#8b5e2a] hover:text-red-600 px-1 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {friendData.outgoing.length > 0 && (
            <div>
              <p className="text-[12px] text-[#f0ddb8] uppercase tracking-widest font-bold mb-1">Sent</p>
              <div className="space-y-1.5">
                {friendData.outgoing.map(r => (
                  <div key={r.id} className="flex items-center gap-2 bg-white border border-[#c9a87a] rounded-lg px-2.5 py-1.5">
                    <span className="text-[#3a2610] text-sm font-medium truncate flex-1">
                      {USERS[r.recipient_id]?.name || r.recipient_id}
                    </span>
                    <span className="text-[12px] text-[#6b4820]">Pending…</span>
                    <button
                      onClick={() => onCancelFriendRequest(r.id)}
                      className="text-[12px] font-bold text-[#6b4820] bg-[#f0ddb8] hover:bg-[#e8c88a] rounded px-2 py-1 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
                  className="flex items-center gap-2 rounded-md border border-[#c9a87a] bg-white px-2 py-1"
                  title={`${def.bundleSize} pcs = 1g`}
                >
                  <img
                    src={`/trash/${type}.png`}
                    alt={def.label}
                    className="w-6 h-6 object-contain flex-shrink-0"
                    style={{ imageRendering: 'auto' }}
                  />
                  <span className="flex-1 text-[12px] text-[#3a2610] leading-none">{def.label}</span>
                  <span className="text-[12px] text-[#6b4820] leading-none">{def.bundleSize}=1g</span>
                  <span className={`text-[13px] font-bold leading-none w-5 text-right ${count > 0 ? 'text-[#2a1505]' : 'text-[#c9a87a]'}`}>
                    {count}
                  </span>
                </div>
              );
            })}
            {/* 6th slot empty */}
            <div className="rounded-md border border-[#c9a87a] bg-white/40 h-8" />
          </div>

          {respawnSecsLeft !== null && (
            <p className="text-[12px] text-amber-300 text-center font-medium">
              Trash respawns in {Math.floor(respawnSecsLeft / 60)}:{String(respawnSecsLeft % 60).padStart(2, '0')}…
            </p>
          )}
          {respawnSecsLeft === null && (
            <p className="text-[12px] text-[#e8d0a0] text-center">
              {trashItemsOnMap} trash items on the map
            </p>
          )}
        </div>
      )}

    </div>
  );
}
