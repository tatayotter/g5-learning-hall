-- One journal entry per child per day.
--
-- GuildJournal's submit handler had no double-submit guard, so a double tap
-- archived the same entry two (once four) times within milliseconds. Parents
-- saw each of those days repeated in the dashboard journal. Found
-- 2026-10-06: 2 children, 16 child-days, 18 extra rows. The app now blocks
-- the double tap and saves with ON CONFLICT DO NOTHING against the index
-- below.
--
-- Cleanup keeps the most recent entry for each (user_id, entry_date): most
-- duplicates are identical, and the one real resubmission found (hours apart,
-- small edit) is better represented by the later text. Rows with a NULL
-- user_id predate the column, aren't shown anywhere, and are left alone; the
-- unique index treats NULLs as distinct, so they don't block it.

delete from public.journal_entries je
using public.journal_entries newer
where je.user_id is not null
  and newer.user_id = je.user_id
  and newer.entry_date = je.entry_date
  and (newer.created_at, newer.id) > (je.created_at, je.id);

create unique index if not exists journal_entries_user_day_key
  on public.journal_entries (user_id, entry_date);
