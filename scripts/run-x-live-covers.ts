/**
 * Cache HD live covers from every stored X post (no twitterapi.io calls).
 *   npx tsx --env-file=.env.local scripts/run-x-live-covers.ts
 */
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRole) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/x-feed-sync`;
  console.log(`POST ${url}  action=live-covers`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRole}`,
    },
    body: JSON.stringify({ action: "live-covers" }),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  console.log("HTTP", res.status);
  console.log(JSON.stringify(json, null, 2));

  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
