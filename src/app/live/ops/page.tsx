import type { Metadata } from "next";
import Link from "next/link";

import { SyncLogTable } from "@/components/events/SyncLogTable";
import { YoutubeLiveArchive } from "@/components/events/YoutubeLiveArchive";
import {
  loadLiveStreams,
  partitionLiveStreams,
} from "@/lib/live-streams";
import { loadSyncLogs } from "@/lib/sync-logs";

export const metadata: Metadata = {
  title: "Live Ops",
  robots: { index: false, follow: false, nocache: true },
};

export const revalidate = 60;

/** Hidden ops page — not linked from public nav. Open `/live/ops` directly. */
export default async function LiveOpsPage() {
  const [streams, logs] = await Promise.all([
    loadLiveStreams(48),
    loadSyncLogs(100),
  ]);
  const { live, upcoming, ended, cancelled } = partitionLiveStreams(streams);

  return (
    <main className="min-h-dvh bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="border-b border-[#f3b8c4]/12 pb-6">
          <p className="text-[0.65rem] tracking-[0.28em] text-[#f3b8c4]/60 uppercase">
            Internal · noindex
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              YouTube live ops
            </h1>
            <Link
              href="/live/ops/trends"
              className="border border-[#e85a7a]/45 bg-[#e85a7a]/10 px-3 py-1.5 text-[0.7rem] tracking-[0.16em] text-[#fff5f7] uppercase transition-colors hover:border-[#e85a7a]/7 hover:bg-[#e85a7a]/18"
            >
              View trends →
            </Link>
          </div>
          <p className="mt-2 max-w-xl text-sm text-[#f7d7de]/70">
            หน้าซ่อนสำหรับดูคลิปจาก Supabase และประวัติ sync — ไม่โชว์ในเมนูเว็บ
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-[0.7rem] tracking-[0.22em] text-[#e85a7a] uppercase">
            Sync logs
          </h2>
          <SyncLogTable logs={logs} />
        </section>

        <section className="space-y-4 border-t border-[#f3b8c4]/12 pt-10">
          <h2 className="text-[0.7rem] tracking-[0.22em] text-[#e85a7a] uppercase">
            YouTube streams
          </h2>
          <YoutubeLiveArchive
            live={live}
            upcoming={upcoming}
            ended={ended}
            cancelled={cancelled}
          />
        </section>
      </div>
    </main>
  );
}
