// app/api/version/route.ts
//
// Which build the live site is running right now. The page has its own build baked in
// (NEXT_PUBLIC_BUILD_ID, next.config.mjs) and compares the two in lib/appVersion.ts, so a
// tablet left open all day learns a newer version is out and can offer a tap to refresh.
// Never cached: an old answer would hide the update.
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
