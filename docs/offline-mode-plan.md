# Offline mode plan

Worked out with Rowil on 2026-10-06 (planning session, nothing built there) and saved here so it
outlives that chat. **Goal, in Rowil's words:** "offline mode should look, feel and perform like
online mode, as if the user can't tell the difference aside from multiplayer and buying features
that require internet." Anything that lowers gold is online-only; using items is fine offline.

## What's built so far

| Piece | Where |
|---|---|
| App opens offline (shell, scripts, art, this week's content cached) | `public/sw.js` |
| Last-loaded profile and progress kept on the device; no sign-out offline | `lib/offlineSnapshot.ts`, `components/Dashboard.tsx` |
| Main quests offline: instant grading from a downloaded answer key, queued answers, server re-grade and one-time reward on reconnect | `lib/offlineQuests.ts`, `supabase/migrations/20261006070000_offline_play.sql` |
| Side quest guilds offline: each guild's last question batch and the subclass profile kept on the device, finished sessions queued, reward clamped and applied once on reconnect (gold, guild level, completed questions, the level-5 companion) | `lib/offlineGuilds.ts`, `lib/guildEngine.ts`, same migration |
| Hidden rollout flag (`feature_flags`, off / allowlist / everyone), one key `offline_play` for all of the above | same migration, `lib/featureFlags.ts` |

Turn offline play on for chosen kids:

```sql
update feature_flags set mode = 'allowlist', allowlist = '{<child id>,<child id>}'
where key = 'offline_play';
```

## Decisions (Rowil's answers)

| Area | Decision |
|---|---|
| Where | Installed forms only: the APK and the installed web app (`display-mode: standalone`), phone and PC. Plain browser tabs stay online-only (no download, no outbox kept between visits). |
| Scope | Everything except multiplayer and anything that lowers gold (shop, tome shop, skip-for-gold, Tutor reroll, egg purchases, trades, PvP show "Needs internet"). Items can be used offline. |
| Answer key | Downloaded to the device through a login-required RPC keyed by content week (`get_answer_key`), never through the public `/api/content`. Leaking it to the device is accepted. |
| Sync contents | Changes ("+40 gold, -1 potion") through the existing change RPCs, every outbox entry carrying an id; the server keeps applied ids so a retry can't double-pay. Answers go up as events and the server re-grades them; a score is never trusted. |
| Time | The phone's claimed time counts if it's after the account was last online, not after server time, and after the previous entry; otherwise the entry applies at server time (never dropped). Server time at sync was rejected: multi-day offline play would hit the daily caps. |
| Shared phones | Salted PIN hash per profile saved at online sign-in for offline switching; one outbox per kid, synced only after that kid signs in online. |
| Conflicts | Server wins quietly and logs the correction; fresh server data replaces the phone's copy after every sync. Item counts never go below 0. |
| Updates | New code switches at the next screen change after a battle or quest, never mid-battle. Entries record app version and format; the server keeps accepting old formats. |
| Outbox safety | `navigator.storage.persist()`, confirm before signing out with unsynced progress, a calm "not saved yet" indicator, sync on launch, on reconnect and every few minutes. |
| Parents | "Last synced" per child; reports say "No recent sync" rather than "No activity"; synced progress lands on the day it was played. |
| Downloads | Everything, automatically, on any connection: essentials and the first-run story first, then the rest of the art and sound in the background. All terms' content and answers. |
| Data layer | `lib/data/*` modules with `useSyncExternalStore` stores loaded from IndexedDB, one PR per game loop (battles, stories, main quests, guild, map, Gauntlet and events, checklist and missions, hatching), and a lint rule against direct Supabase calls in gameplay code. |
| Rollout | Behind a hidden flag: family early access first (at least 2 weeks, zero lost progress, measures within thresholds), then everyone. |
| Testing | Playwright offline tests and pgTAP tests (duplicate ids, time window, gold gate, re-grading, old formats), then family early access. |

## Build order from the plan

1. Gold-spend parent-link gate (notice banner first, server check from a cutoff date).
2. First-run story speed track.
3. Instant battle grading (`lib/answerKey.ts`, `record_battle_attempts` re-graded server-side).
4. The `lib/data/*` migration, one game loop per PR, with the shared outbox and `apply_outbox`.
5. Offline mode behind the flag.

## Launch measures (2 weeks of family early access, zero lost progress)

- Entries rejected or failing after 3+ retries: under 0.5%.
- Claimed time rejected: under 1%.
- Server corrections: under 1% of syncs.
- Informational: duplicate ids ignored, sync wait (median, p95), sign-outs confirmed with unsynced progress.

## Accepted tradeoffs

- Battle rewards stay calculated on the phone, so devtools can still create gold within the daily caps. Gold can't become spending power, because every spend is online and parent-link checked.
- Offline PIN hashes are only safe on personal devices.
- Guild sessions played offline replay the device's last batch of questions (fresh ones first), so a long offline stretch repeats questions; online play moves on to new ones and to the next grade stage.
- The level-5 guild companion and companion evolutions earned offline arrive on sync (the toast says so), not on the result screen.
- If a guild is opened online before an offline session has synced, its online save writes the level it saw, which can drop that session's guild xp. Same race as two devices today; the sync runs on load, so the window is short.

## Not decided yet

- How flags are managed long-term (the `feature_flags` table exists; there's no admin screen yet).
