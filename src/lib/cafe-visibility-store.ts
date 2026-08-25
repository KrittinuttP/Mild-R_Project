import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSiteAdminPassword } from "@/lib/site-admin-auth";
import {
  CAFE_SECTION_KEYS,
  CAFE_SECTION_META,
  defaultCafeVisibility,
  isCafeSectionKey,
  type CafeSectionKey,
  type CafeSectionVisibilityMap,
} from "@/lib/cafe-visibility";

type VisibilityRow = {
  section_key: string;
  visible: boolean;
  label: string | null;
  updated_at?: string;
};

function rowsToMap(rows: VisibilityRow[]): CafeSectionVisibilityMap {
  const map = defaultCafeVisibility();
  for (const row of rows) {
    if (isCafeSectionKey(row.section_key)) {
      map[row.section_key] = Boolean(row.visible);
    }
  }
  return map;
}

/** Public read — defaults open if Supabase missing / empty. */
export async function loadCafeVisibility(): Promise<CafeSectionVisibilityMap> {
  if (!isSupabaseConfigured()) return defaultCafeVisibility();

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("mild_r_cafe_section_visibility")
      .select("section_key, visible, label, updated_at");

    if (error) {
      console.error("[cafe_visibility]", error.message);
      return defaultCafeVisibility();
    }

    return rowsToMap((data ?? []) as VisibilityRow[]);
  } catch (error) {
    console.error("[cafe_visibility]", error);
    return defaultCafeVisibility();
  }
}

export async function loadCafeVisibilityRows(): Promise<
  Array<{
    key: CafeSectionKey;
    visible: boolean;
    label: string;
    labelLocal: string;
    updatedAt?: string;
  }>
> {
  const map = await loadCafeVisibility();
  let updatedByKey = new Map<string, string>();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("mild_r_cafe_section_visibility")
        .select("section_key, updated_at");
      for (const row of (data ?? []) as VisibilityRow[]) {
        if (row.updated_at) updatedByKey.set(row.section_key, row.updated_at);
      }
    } catch {
      /* ignore */
    }
  }

  return CAFE_SECTION_KEYS.map((key) => ({
    key,
    visible: map[key],
    label: CAFE_SECTION_META[key].label,
    labelLocal: CAFE_SECTION_META[key].labelLocal,
    updatedAt: updatedByKey.get(key),
  }));
}

/** Service-role upsert — server only. */
export async function saveCafeVisibility(
  updates: Partial<CafeSectionVisibilityMap>
): Promise<CafeSectionVisibilityMap> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const rows = Object.entries(updates)
    .filter(([key]) => isCafeSectionKey(key))
    .map(([key, visible]) => ({
      section_key: key,
      visible: Boolean(visible),
      label: CAFE_SECTION_META[key as CafeSectionKey].label,
      updated_at: now,
    }));

  if (rows.length === 0) return loadCafeVisibility();

  const { error } = await supabase
    .from("mild_r_cafe_section_visibility")
    .upsert(rows, { onConflict: "section_key" });

  if (error) throw new Error(error.message);
  return loadCafeVisibility();
}

export function getCafeSettingsPassword() {
  return getSiteAdminPassword();
}
