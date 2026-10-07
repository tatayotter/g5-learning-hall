# Android offline test (local emulator)

`run.cjs` plays offline in the real Android app on an emulator and checks the server afterwards:
two players log in online, one plays a main quest and a trainer battle (with a potion) offline,
the app cold-starts offline, the players switch accounts offline (a wrong PIN refused), and back
online each player's play saves to their own account. It prints PASS/FAIL per check and exits
non-zero if any fail; screenshots go to `e2e-android-shots/`.

Everything runs against a local Supabase and a local `next start`, so production is never touched.
The emulator reaches them on its own `localhost` through `adb reverse`.

No Docker or emulator on your machine? `.github/workflows/android-e2e.yml` does all of the steps
below on a GitHub runner; its screenshots and logs are uploaded as the run's artifacts.

## Steps

1. Local Supabase (Docker running):
   - Temporarily add the line `enable_anonymous_sign_ins = true` right under `[auth]` in
     `supabase/config.toml` (the file has no such line yet, so there's nothing to edit).
   - `npx supabase start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,realtime,storage-api,postgres-meta,supavisor`
   - `npx supabase db reset`
   - Load the fixture: `docker exec -i supabase_db_<project> psql -U postgres < e2e/android/seed.sql`
     (`docker ps` shows the db container's name).
2. The web app, pointed at it (values from `npx supabase status -o env`):
   - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>`,
     `SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>`, then `npx next build` and `npx next start -p 3000`.
3. A debug APK that loads it:
   - Temporarily, in `capacitor.config.ts`: `server.url: 'http://localhost:3000'`, `cleartext: true`;
     and in `android/app/src/main/AndroidManifest.xml` add `android:usesCleartextTraffic="true"` to
     `<application>`.
   - `npx cap sync android`, then in `android/`: `gradlew assembleDebug`.
4. The emulator: boot it, then
   - `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
   - `adb shell pm clear com.tatayotter.learninghall` (start from a fresh install)
   - `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:54321 tcp:54321`
5. Run: `npm i --no-save playwright`, set `DB_CONTAINER=<the db container name>`, then
   `node e2e/android/run.cjs`.
6. Undo the temporary edits in `supabase/config.toml`, `capacitor.config.ts` and the manifest.
