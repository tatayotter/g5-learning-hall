// Ensures an analytics session id exists as early as possible, before any
// component needs one. Does not fire session_start here — identity
// (getActiveUser()) isn't resolved yet at this point; that happens in the
// app/page.tsx hydration effect once the active user is known.
import { getOrCreateSessionId } from '@/lib/analytics';

getOrCreateSessionId();
