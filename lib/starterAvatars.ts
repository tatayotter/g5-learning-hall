// Avatar selection was removed from account creation — the child's starter
// avatar is now auto-assigned from gender (ssb3 for boys, ssg3 for girls).
// See lib/userSession.ts (loadClassmates / loadChildren) and
// components/ChildAccountForm.tsx (defaultAvatarForGender).
// This file is kept as a tombstone so existing imports surface a compile error
// rather than silently serving stale data.

export const STARTER_AVATARS: string[] = [];
export const DEFAULT_STARTER_AVATAR = '';
