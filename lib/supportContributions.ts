import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Server-only reads for app/support/page.tsx (a public marketing page — safe
// to use the service-role client here since both queries only ever return
// data that's already meant to be public: get_support_wall/get_support_total
// are the same SECURITY DEFINER functions anon/authenticated can call
// directly, we just don't need a browser round-trip for a server component).

export interface SupportWallEntry {
  display_name: string | null;
  message: string | null;
  amount_php: number;
  paid_at: string;
}

export interface SupportTotals {
  totalPhp: number;
  supporterCount: number;
}

export async function getSupportWall(limit = 100): Promise<SupportWallEntry[]> {
  const { data, error } = await supabaseAdmin.rpc('get_support_wall', { p_limit: limit });
  if (error) {
    console.error('getSupportWall failed', error);
    return [];
  }
  return data ?? [];
}

export async function getSupportTotals(): Promise<SupportTotals> {
  const { data, error } = await supabaseAdmin.rpc('get_support_total');
  if (error || !data?.[0]) {
    console.error('getSupportTotals failed', error);
    return { totalPhp: 0, supporterCount: 0 };
  }
  return { totalPhp: Number(data[0].total_php), supporterCount: Number(data[0].supporter_count) };
}
