'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { USERS } from '@/lib/userSession';
import { ALL_MONSTERS, GUILD_MONSTERS, MonsterDef, getGuildMonsterDisplay, getOwnedMonsterDisplay, getScaledStats } from '@/lib/monsterConfig';
import { fetchSubclassProfile, guildLevelForKey, SubclassProfile } from '@/lib/guildEngine';
import { GMBadge } from '@/components/battle/shared';
import { MonsterImage } from '@/components/battle/shared';
import { BOT_IDS } from '@/lib/botProfiles';
import { fetchFriendRelation, sendFriendRequest, respondToFriendRequest, FriendRequestRow } from '@/lib/friends';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

interface TeamMonster {
  slot: number;
  monster_id: string;
  nickname: string | null;
  monster_level: number;
  graduation_tier: number;
}

interface PlayerStatsPopupProps {
  // The viewer's own id — needed to look up (and act on) the friend
  // relationship between viewer and targetId. Every real call site has this
  // on hand already (it's the map's own userId).
  viewerId: string;
  targetId: string;
  onClose: () => void;
  onWave: (targetId: string) => void;
  onChallenge?: (targetId: string, name: string) => void;
  onTrade?: (targetId: string, name: string) => void;
  targetInBattle?: boolean;
}

export default function PlayerStatsPopup({ viewerId, targetId, onClose, onWave, onChallenge, onTrade, targetInBattle = false }: PlayerStatsPopupProps) {
  // Bots aren't real Supabase accounts — they have no tradeable inventory
  // the trade RPCs can see and no friend_requests row could ever reference
  // them meaningfully, so Trade and Add Friend both stay hidden for them
  // the same way Challenge disables for a target already mid-battle below.
  const isBot = BOT_IDS.has(targetId);
  const [friendRelation, setFriendRelation] = useState<FriendRequestRow | null>(null);
  const [friendBusy, setFriendBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamMonster[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [subclassProfile, setSubclassProfile] = useState<SubclassProfile | null>(null);

  const profile = USERS[targetId];
  const displayName = profile?.fullName || targetId;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [stateRes, monstersRes, weeklyRes, subProfile] = await Promise.all([
        supabase.from('user_battle_state').select('active_monster_slot').eq('user_id', targetId).single(),
        supabase.from('user_monsters').select('slot, monster_id, nickname, monster_level, graduation_tier').eq('user_id', targetId).not('slot', 'is', null).order('slot'),
        // One row per user (lifetime, not week-keyed) — see
        // docs/weekly-progress-redesign-plan.md Phase 4 Wave 2. The old query here had no
        // guard at all against a pre-staged future week shadowing the real latest week (see
        // the Tala level-9-vs-1 bug fixed 2026-08-11 for the trigger that had the same class
        // of "latest row" flaw) — player_progress sidesteps the whole problem, one row, no sort.
        supabase.from('player_progress').select('level').eq('user_id', targetId).maybeSingle(),
        fetchSubclassProfile(targetId),
      ]);
      if (cancelled) return;
      setActiveSlot(stateRes.data?.active_monster_slot ?? null);
      setTeam(monstersRes.data || []);
      setLevel(weeklyRes.data?.level ?? null);
      setSubclassProfile(subProfile);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [targetId]);

  // Separate effect (and separate loading flag — friend status shouldn't
  // block the stats above from appearing) since it's keyed on the pair, not
  // just targetId, and bots skip it entirely (see isBot above).
  useEffect(() => {
    if (isBot) return;
    let cancelled = false;
    fetchFriendRelation(viewerId, targetId).then(row => { if (!cancelled) setFriendRelation(row); });
    return () => { cancelled = true; };
  }, [viewerId, targetId, isBot]);

  const handleAddFriend = async () => {
    setFriendBusy(true);
    const { id, error } = await sendFriendRequest(targetId);
    if (!error && id) setFriendRelation(await fetchFriendRelation(viewerId, targetId));
    setFriendBusy(false);
  };

  const handleAcceptFriend = async () => {
    if (!friendRelation) return;
    setFriendBusy(true);
    const ok = await respondToFriendRequest(friendRelation.id, true);
    if (ok) setFriendRelation(await fetchFriendRelation(viewerId, targetId));
    setFriendBusy(false);
  };

  // ALL_MONSTERS, but guild companions show the name/emoji their owner's
  // (targetId's) guild level currently unlocks — see MonsterGuild.tsx for the
  // same pattern applied to the local player's own view.
  const displayMonsters: Record<string, MonsterDef> = { ...ALL_MONSTERS };
  for (const id of Object.keys(GUILD_MONSTERS)) {
    const def = GUILD_MONSTERS[id];
    const guildLevel = guildLevelForKey(subclassProfile, def.guildEvolution?.guildKey);
    const { name, emoji, isLegendary, spriteId } = getGuildMonsterDisplay(def, guildLevel);
    displayMonsters[id] = { ...def, name, emoji, isLegendary, spriteId };
  }
  // Graduation is NOT baked into this species-keyed map — it's purchased
  // per owned user_monsters instance, and since the egg mechanism this
  // target player can hold more than one instance of the same species at
  // different tiers (a graduated adult plus its own freshly hatched,
  // ungraduated egg-child). Layered on per-row below via getOwnedMonsterDisplay.

  return (
    // z-[95]: the training map renders fullscreen at z-[78] (see MapStage.tsx), with its own
    // joystick/drawers layered up to z-[81] on top of that — a plain z-50 here (this app's
    // default modal layer) sits BELOW all of that and would silently eat every click with no
    // visible popup (map painted right over it). 95 clears the map's whole stack but still
    // sits under a true full-screen takeover like BossCutscene/EventPanel (z-[100]).
    <div className="fixed inset-0 bg-black/80 z-[95] flex items-center justify-center p-4" onClick={onClose}>
      {/* Same wood-plank + gold trim + corner-nail frame as the battle screen's
          MonsterHpPanel/PostBattleSummary — this is a map-native "trainer card," the same
          category of floating game-art overlay as the HP panel, not a parchment quest panel
          (see docs/STYLE_GUIDE.md's "deliberately still dark" list). Reuses the exported style
          pieces rather than re-deriving them. */}
      <div
        className="relative border-2 border-[#4a2f18] rounded-2xl p-6 max-w-sm w-full"
        style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
        onClick={e => e.stopPropagation()}
      >
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <Nail className="bottom-2 left-2" />
        <Nail className="bottom-2 right-2" />

        <div className="flex items-center gap-3 mb-4">
          {profile?.avatar && !avatarFailed ? (
            <img
              src={profile.avatar}
              alt=""
              onError={() => setAvatarFailed(true)}
              className="w-10 h-10 rounded-full object-contain bg-[#0a0807] border-2 border-[#d4a017]"
            />
          ) : (
            <span className="text-3xl">{profile?.isFamily ? '⚔️' : '🎮'}</span>
          )}
          <div>
            <p
              className="flex items-center gap-1.5 leading-tight"
              style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 16 }}
            >
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span aria-hidden style={questTextShadowStyle}>{displayName}</span>
                <span style={questTextStyle}>{displayName}</span>
              </span>
              {profile?.isFamily && <GMBadge />}
            </p>
            <p className="text-xs text-[#e8d0a0]">{profile?.grade}{profile && !profile.isFamily && ' · Classmate'}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-[#e8d0a0] text-sm animate-pulse">Loading stats...</p>
        ) : (
          <>
            <div className="bg-[#0a0807]/70 border border-[#3a2610] rounded-lg px-4 py-3 mb-3">
              <p className="text-xs text-[#c9a87a] uppercase tracking-widest mb-1">Level</p>
              <p className="text-white font-bold">{level ?? '?'}</p>
            </div>

            {team.length > 0 && (
              <div className="bg-[#0a0807]/70 border border-[#3a2610] rounded-lg px-4 py-3 mb-4">
                <p className="text-xs text-[#c9a87a] uppercase tracking-widest mb-2">Team</p>
                <div className="space-y-2">
                  {team.map(m => {
                    const def = getOwnedMonsterDisplay(displayMonsters[m.monster_id], m.graduation_tier) as MonsterDef;
                    const scaled = getScaledStats(def, m.monster_level);
                    const isActive = m.slot === activeSlot;
                    return (
                      <div
                        key={m.slot}
                        className={`flex items-center gap-2 rounded-lg p-1.5 ${isActive ? 'border border-amber-600 bg-amber-900/20' : ''}`}
                      >
                        <div className="w-8 h-8 flex-shrink-0">
                          <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-2xl" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-bold">
                            {m.nickname || def?.name}
                            {isActive && <span className="ml-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wide">Active</span>}
                          </p>
                          <p className="text-xs text-[#c9a87a]">Lv{m.monster_level} · {def?.element}</p>
                        </div>
                        <div className="text-[10px] text-[#e8d0a0] space-y-0.5 flex-shrink-0">
                          <p className="flex items-center gap-1"><img src="/icons/stats/hp.svg" alt="" className="w-3 h-3 object-contain" /> {scaled.hp}</p>
                          <p className="flex items-center gap-1"><img src="/icons/stats/atk.svg" alt="" className="w-3 h-3 object-contain" /> {scaled.attack}</p>
                          <p className="flex items-center gap-1"><img src="/icons/stats/def.svg" alt="" className="w-3 h-3 object-contain" /> {scaled.defense}</p>
                          <p className="flex items-center gap-1"><img src="/icons/stats/spd.svg" alt="" className="w-3 h-3 object-contain" /> {scaled.speed}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {targetInBattle && (
          <p className="text-xs text-amber-400 text-center mb-3">⚔️ {profile?.name || targetId} is in a battle — you can't challenge them right now.</p>
        )}

        {/* Same GameButton `quest` variant used for every other primary CTA in the
            game (battle actions, quest starts, post-battle Continue) rather than a
            one-off flat button style — see components/GameButton.tsx. */}
        <div className="flex flex-wrap gap-2">
          <GameButton
            variant="quest"
            onClick={() => { onWave(targetId); onClose(); }}
            className="flex-1 min-w-[5rem]"
            style={{ fontSize: 13 }}
          >
            👋 Wave
          </GameButton>
          {onTrade && !isBot && (
            <GameButton
              variant="quest"
              color="#16a34a"
              onClick={() => { onTrade(targetId, profile?.name || targetId); onClose(); }}
              className="flex-1 min-w-[5rem]"
              style={{ fontSize: 13 }}
            >
              🔁 Trade
            </GameButton>
          )}
          {!isBot && (
            friendRelation?.status === 'accepted' ? (
              <GameButton variant="quest" color="#16a34a" disabled className="flex-1 min-w-[5rem]" style={{ fontSize: 13 }}>
                ✅ Friends
              </GameButton>
            ) : friendRelation?.status === 'pending' && friendRelation.requester_id === targetId ? (
              <GameButton
                variant="quest"
                color="#0e7490"
                onClick={handleAcceptFriend}
                disabled={friendBusy}
                className="flex-1 min-w-[5rem]"
                style={{ fontSize: 13 }}
              >
                ✔️ Accept
              </GameButton>
            ) : friendRelation?.status === 'pending' && friendRelation.requester_id === viewerId ? (
              <GameButton variant="quest" color="#57534e" disabled className="flex-1 min-w-[5rem]" style={{ fontSize: 13 }}>
                ⏳ Sent
              </GameButton>
            ) : (
              <GameButton
                variant="quest"
                color="#db2777"
                onClick={handleAddFriend}
                disabled={friendBusy}
                className="flex-1 min-w-[5rem]"
                style={{ fontSize: 13 }}
              >
                ➕ Add Friend
              </GameButton>
            )
          )}
          {onChallenge && (
            <GameButton
              variant="quest"
              color="#2563eb"
              onClick={() => { onChallenge(targetId, profile?.name || targetId); onClose(); }}
              disabled={targetInBattle}
              className="flex-1 min-w-[5rem]"
              style={{ fontSize: 13 }}
            >
              ⚔️ Challenge
            </GameButton>
          )}
          <GameButton variant="quest" color="#57534e" onClick={onClose} style={{ fontSize: 13 }}>
            Close
          </GameButton>
        </div>
      </div>
    </div>
  );
}
