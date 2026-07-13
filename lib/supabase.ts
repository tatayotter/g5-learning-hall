import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Notice the "export" keyword right here! This is what the error was looking for.
export const supabase = createClient(supabaseUrl, supabaseKey);