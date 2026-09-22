// Display-only "what day is it" helper for the Philippine calendar day (Asia/Manila).
//
// This is NOT the source of truth for anything that grants a reward — the server derives its
// own day independently (see public.app_today()) and every RPC that matters (claiming the
// checklist bonus, recording a guild session) ignores whatever date the client sends. This
// helper only decides what the UI *shows* (e.g. "which guilds has the player already played
// today?"), so a wrong answer here is a cosmetic one-day mismatch, never a security issue.
//
// Uses Intl's timezone conversion rather than the device's local timezone setting, so it's
// correct even on a device whose clock is set to a different zone.

const MANILA = 'Asia/Manila';

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** yyyy-MM-dd for the current Manila calendar day. Display purposes only — see header. */
export function manilaToday(now: Date = new Date()): string {
  return dateFmt.format(now); // en-CA formats as yyyy-MM-dd
}
