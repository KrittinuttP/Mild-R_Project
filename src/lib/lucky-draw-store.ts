import { createAdminClient } from "@/lib/supabase/admin";
import type { LuckyDrawCampaign, LuckyDrawContact } from "@/lib/lucky-draw";

/** Server-only: writes with the service role. Never import from the browser. */

export type CreateLuckyDrawEntryInput = LuckyDrawContact & {
  campaign: LuckyDrawCampaign;
  sourceRef?: string | null;
  meta?: Record<string, unknown>;
};

/** `already` = this account entered this campaign before; no new row. */
export type LuckyDrawEntryOutcome = "entered" | "already";

/** Postgres unique_violation — raised by lucky_draw_entries_one_per_contact. */
const UNIQUE_VIOLATION = "23505";

export async function createLuckyDrawEntry(
  input: CreateLuckyDrawEntryInput
): Promise<LuckyDrawEntryOutcome> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("mild_r_lucky_draw_entries").insert({
    campaign: input.campaign,
    contact_name: input.contactName,
    contact_channel: input.contactChannel,
    contact_handle: input.contactHandle,
    source_ref: input.sourceRef ?? null,
    meta: input.meta ?? {},
  });

  if (!error) return "entered";
  if (error.code === UNIQUE_VIOLATION) return "already";
  throw new Error(error.message);
}
