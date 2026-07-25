import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { error } = await supabase.rpc('cleanup_expired_demo_accounts');

  if (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
