import { Capacitor } from '@capacitor/core';

// Google Play policy requires Play Billing for unlocking in-app digital
// content; routing to an external checkout (PayMongo) from inside the
// wrapped Android app is not allowed. Gate purchase entry points on this
// until native Play Billing is implemented.
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
