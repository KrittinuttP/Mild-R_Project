import { NextResponse } from "next/server";

import { isCafeSettingsUnlocked } from "@/lib/cafe-settings-auth";
import {
  isPageMode,
  isPhaseMode,
  nextSwitch,
  readGateEnv,
  resolveGate,
  type CafeGateConfig,
  type GateKey,
} from "@/lib/cafe-gate";
import { loadGateFresh, saveGate, type GateLoad } from "@/lib/cafe-gate-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the settings page shows: the stored values and what visitors get now. */
export type CafeGateResponse = {
  config: CafeGateConfig;
  stored: boolean;
  error?: string;
  serverNow: number;
  state: ReturnType<typeof resolveGate>;
  next: ReturnType<typeof nextSwitch>;
  /** Test switches active on this deployment (never on production). */
  env: ReturnType<typeof readGateEnv>;
};

function body(load: GateLoad): CafeGateResponse {
  const now = Date.now();
  const env = readGateEnv(process.env);
  return {
    config: load.config,
    stored: load.stored,
    error: load.error,
    serverNow: now,
    state: resolveGate(load.config, env, now),
    next: env.phase ? null : nextSwitch(load.config, now),
    env,
  };
}

export async function GET() {
  if (!(await isCafeSettingsUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(body(await loadGateFresh()));
}

export async function PUT(request: Request) {
  if (!(await isCafeSettingsUnlocked())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = (await loadGateFresh()).config;
  const updates: Partial<Record<GateKey, string>> = {};

  if (input.phase !== undefined) {
    if (!isPhaseMode(input.phase)) {
      return NextResponse.json({ error: "phase ไม่ถูกต้อง" }, { status: 400 });
    }
    updates.phase = input.phase;
  }
  if (input.hunt !== undefined) {
    if (!isPageMode(input.hunt)) {
      return NextResponse.json({ error: "hunt ไม่ถูกต้อง" }, { status: 400 });
    }
    updates.hunt = input.hunt;
  }

  let teaserAt = current.teaserAt;
  let openAt = current.openAt;
  for (const [field, key] of [
    ["teaserAt", "teaser_at"],
    ["openAt", "open_at"],
  ] as const) {
    const value = input[field];
    if (value === undefined) continue;
    const ms = typeof value === "number" ? value : Number.NaN;
    if (!Number.isFinite(ms)) {
      return NextResponse.json({ error: `${field} ไม่ถูกต้อง` }, { status: 400 });
    }
    if (field === "teaserAt") teaserAt = ms;
    else openAt = ms;
    updates[key] = new Date(ms).toISOString();
  }
  if (teaserAt >= openAt) {
    return NextResponse.json(
      { error: "เวลาเปิด CD2 ต้องมาก่อนเวลาเปิดคาเฟ่" },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(body(await saveGate(updates)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
