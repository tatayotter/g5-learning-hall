// lib/offlineSeed.ts
//
// Pre-warms the on-device SQLite cache for all 5 guild practice pools right
// after login, instead of waiting for the player to open each guild screen
// at least once — so a first cold-start offline session (see MainActivity's
// connectivity check) isn't limited to whichever guild was visited last.
// fetchQuestionPool already writes through to the cache as a side effect
// (lib/guildEngine.ts's cacheGuildPoolSafe) — this just calls it for every
// guild instead of relying on the player to trigger each one.
import { isOfflineStorageAvailable } from '@/lib/localDataSource';
import { fetchQuestionPool } from '@/lib/guildEngine';
import { gradeToNumber } from '@/lib/userSession';

const GUILD_TABLES: [tableName: string, questType: string][] = [
  ['sq_lorekeeper', 'lorekeeper'],
  ['sq_spellcaster', 'spellcaster'],
  ['sq_number_realm', 'number_realm'],
  ['sq_logic_labyrinth', 'logic_labyrinth'],
  ['sq_lexicon_arena', 'lexicon_arena'],
];

export async function seedOfflineCache(userId: string, grade: string | number | undefined) {
  if (!isOfflineStorageAvailable()) return;
  const gradeLevel = gradeToNumber(grade);
  await Promise.all(
    GUILD_TABLES.map(([tableName, questType]) =>
      fetchQuestionPool(userId, tableName, questType, gradeLevel).catch(e => {
        console.error(`Offline seed failed for ${questType} (non-fatal):`, e);
      })
    )
  );
}
