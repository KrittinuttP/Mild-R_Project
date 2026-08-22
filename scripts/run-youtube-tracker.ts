/**
 * Invoke youtube-tracker Edge Function (main | search | refresh).
 *   npx tsx --env-file=.env.local scripts/run-youtube-tracker.ts refresh
 */
const action = (process.argv[2] ?? "refresh").trim();

async function main() {
  if (!["main", "search", "refresh"].includes(action)) {
    console.error('Usage: run-youtube-tracker.ts <main|search|refresh>');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRole) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/youtube-tracker`;
  console.log(`POST ${url}  action=${action}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRole}`,
    },
    body: JSON.stringify({ action }),
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
