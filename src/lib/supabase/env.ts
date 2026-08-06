function missingPublicEnv(name: string): never {
  throw new Error(
    `Missing ${name}. Copy .env.example to .env.local and fill Supabase keys.`
  );
}

/**
 * Must read NEXT_PUBLIC_* with static property access so Next.js can inline
 * them into the browser bundle (dynamic process.env[name] is undefined client-side).
 */
export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url) missingPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missingPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
