import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

/** Cookie-free anon client for public server reads (ISR / revalidate). */
export function createPublicClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
