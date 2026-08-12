import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Base monster EXP awarded for a live-battle win (mirrors BATTLE_CONSTANTS.MONSTER_EXP_PER_BATTLE_WIN
// in lib/monsterConfig.ts — kept in sync manually since Edge Functions can't import client code).
const BASE_WIN_EXP = 25;
const SURRENDER_WIN_EXP = Math.round(BASE_WIN_EXP / 2);

// Mirrors lib/monsterConfig.ts's BATTLE_CONSTANTS.MONSTER_EXP_PER_LEVEL / getMonsterLevel —
// kept in sync manually since Edge Functions can't import client code.
const MONSTER_EXP_PER_LEVEL = 100;
function getMonsterLevel(exp: number): number {
  return Math.floor(exp / MONSTER_EXP_PER_LEVEL) + 1;
}

// Atomically resolves a finished live battle: whichever of the two racing
// clients calls this first performs the win/loss writes, monster EXP grant,
// and daily gold gate; the second caller's conditional update affects 0 rows
// and just reads the already-resolved row back. Keeps privileged writes
// (monster_battle_log for both participants, user_monsters EXP, the
// last_pvp_win gate) off the client entirely.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { battleId, winnerId, endReason, winnerMonsterId } = await req.json();
    if (!battleId || !endReason) {
      return new Response(JSON.stringify({ error: 'battleId and endReason are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Resolve who's calling from their own JWT (anonymous-auth session).
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await callerClient.auth.getUser();
    const authUid = userData?.user?.id;
    if (!authUid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: identity } = await admin
      .from('user_identity_map')
      .select('app_user_id')
      .eq('auth_uid', authUid)
      .single();
    const callerAppId = identity?.app_user_id;
    if (!callerAppId) {
      return new Response(JSON.stringify({ error: 'No linked identity for this session' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: battle } = await admin.from('live_battles').select('*').eq('id', battleId).single();
    if (!battle) {
      return new Response(JSON.stringify({ error: 'Battle not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (callerAppId !== battle.challenger_id && callerAppId !== battle.opponent_id) {
      return new Response(JSON.stringify({ error: 'Not a participant in this battle' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Atomic first-writer-wins: only succeeds while the battle hasn't already
    // been marked completed by the other client's race to call this function.
    const { data: updated, error: updateError } = await admin
      .from('live_battles')
      .update({
        status: 'completed',
        winner_id: winnerId,
        end_reason: endReason,
        result_written_by: callerAppId,
        ended_at: new Date().toISOString(),
      })
      .eq('id', battleId)
      .in('status', ['in_progress', 'accepted'])
      .select()
      .single();

    if (updateError || !updated) {
      const { data: finalRow } = await admin.from('live_battles').select('*').eq('id', battleId).single();
      return new Response(JSON.stringify({ alreadyResolved: true, battle: finalRow }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().split('T')[0];

    if (winnerId) {
      const loserId = updated.challenger_id === winnerId ? updated.opponent_id : updated.challenger_id;
      const isSurrender = endReason === 'surrender';
      const expReward = isSurrender ? SURRENDER_WIN_EXP : BASE_WIN_EXP;

      await admin.from('monster_battle_log').insert([
        { user_id: winnerId, opponent: loserId, result: 'win', monster_exp_earned: expReward },
        { user_id: loserId, opponent: winnerId, result: 'loss', monster_exp_earned: 0 },
      ]);

      if (winnerMonsterId) {
        const { data: monsterRow } = await admin
          .from('user_monsters')
          .select('monster_exp')
          .eq('id', winnerMonsterId)
          .single();
        if (monsterRow) {
          const newExp = monsterRow.monster_exp + expReward;
          await admin
            .from('user_monsters')
            .update({ monster_exp: newExp, monster_level: getMonsterLevel(newExp) })
            .eq('id', winnerMonsterId);
        }
      }

      let goldReward = 0;
      if (!isSurrender) {
        const { data: battleState } = await admin
          .from('user_battle_state')
          .select('last_pvp_win')
          .eq('user_id', winnerId)
          .single();
        const alreadyWonToday = battleState?.last_pvp_win === today;
        goldReward = alreadyWonToday ? 0 : 50;
        if (!alreadyWonToday) {
          await admin.from('user_battle_state').update({ last_pvp_win: today }).eq('user_id', winnerId);
        }
      }

      // Actually credit the gold to player_progress — previously this only
      // wrote a player_log entry claiming "+50 Gold" (an append-only activity
      // log, not a mutable balance) without ever touching the real balance,
      // so a live PvP win never actually paid out despite the toast/log
      // saying it did. apply_progress_deltas trusts p_user_id directly (no
      // auth.uid() check inside), which is safe here since winnerId is
      // already constrained to one of this battle's two validated
      // participants above.
      if (goldReward > 0) {
        await admin.rpc('apply_progress_deltas', { p_user_id: winnerId, p_xp_delta: 0, p_gold_delta: goldReward });
      }

      const winnerDesc = isSurrender
        ? `⚔️ Live Battle vs ${loserId} — Won by surrender! +${expReward} Monster EXP`
        : `⚔️ Live Battle vs ${loserId} — Victory! +${expReward} Monster EXP${goldReward > 0 ? ` +${goldReward} Gold` : ''}`;
      const loserDesc = isSurrender
        ? `🏳️ Live Battle vs ${winnerId} — Surrendered`
        : `💀 Live Battle vs ${winnerId} — Defeated`;

      await admin.from('player_log').insert({
        user_id: winnerId,
        week_starting_date: today,
        action_type: 'battle',
        description: winnerDesc,
        xp_change: 0,
        gold_change: goldReward,
      });
      await admin.from('player_log').insert({
        user_id: loserId,
        week_starting_date: today,
        action_type: 'battle',
        description: loserDesc,
        xp_change: 0,
        gold_change: 0,
      });
    }

    return new Response(JSON.stringify({ alreadyResolved: false, battle: updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
