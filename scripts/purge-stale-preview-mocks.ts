/**
 * Delete manual preview mocks that already have a matching real YouTube live
 * (same Bangkok date + channel + |Δscheduled| ≤ 3h).
 *
 *   npx tsx --env-file=.env.local scripts/purge-stale-preview-mocks.ts
 *   npx tsx --env-file=.env.local scripts/purge-stale-preview-mocks.ts --dry-run
 */
import { createClient } from "@supabase/supabase-js";

import { purgeStalePreviewMocks } from "./lib/remove-matching-previews";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const result = await purgeStalePreviewMocks(supabase, { dryRun: DRY_RUN });
  console.log({
    dryRun: DRY_RUN,
    mocks: result.mockCount,
    reals: result.realCount,
    wouldOrDidDelete: result.deleted.length,
    ids: result.deleted,
  });

  if (!DRY_RUN && result.deleted.length > 0) {
    console.log(`OK purged ${result.deleted.length} matching mocks`);
  } else if (result.deleted.length === 0) {
    console.log("No matching mocks to delete");
  } else {
    console.log("[dry-run] no DB changes");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
