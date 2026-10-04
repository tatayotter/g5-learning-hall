import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Google Play policy requires Play Billing for unlocking in-app digital
// content; routing to an external checkout (PayMongo) from inside the
// wrapped Android app is not allowed. Gate purchase entry points on this
// until native Play Billing is implemented.
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

// The Android app loads this web code live from Vercel, so every web deploy
// reaches every installed copy at once — including older installs whose
// native shell predates a plugin. Calling a plugin the installed shell lacks
// rejects (or never resolves), which is how old installs hung on the loading
// screen in Aug 2026. Check this before every native plugin call, and keep a
// web fallback for when it returns false.
export function hasNativePlugin(name: string): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable(name);
}

let appBuildPromise: Promise<string | null> | null = null;

// The installed shell's versionCode (android/app/build.gradle), or null on
// the web and on shells built before the App plugin was added.
export function getNativeAppBuild(): Promise<string | null> {
  if (!appBuildPromise) {
    appBuildPromise = hasNativePlugin('App')
      ? App.getInfo().then((info) => info.build).catch(() => null)
      : Promise.resolve(null);
  }
  return appBuildPromise;
}
