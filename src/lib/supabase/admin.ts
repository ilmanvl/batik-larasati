import { createClient } from '@supabase/supabase-js';

// Instance Supabase Service Role Admin Client untuk operasi sistem/privilese
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
