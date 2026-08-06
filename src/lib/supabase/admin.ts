import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Service-role client — server-only (API routes / server actions).
 * Never import this from Client Components.
 */
export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local for server admin access."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
