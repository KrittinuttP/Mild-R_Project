"use client";

import type { ReactNode } from "react";

import { HuntNotice } from "@/components/cafe/hunt/HuntNotice";
import { HuntSplash } from "@/components/cafe/hunt/HuntSplash";
import { useHuntState } from "@/components/cafe/hunt/useHuntState";
import { updateHuntState } from "@/lib/cafe-hunt-storage";

type HuntShellProps = {
  title: string;
  cafeTitle: string;
  caseNo?: string;
  count: number;
  children: ReactNode;
};

function acceptNotice() {
  updateHuntState((state) => ({
    ...state,
    noticeAcceptedAt: new Date().toISOString(),
  }));
}

function finishSplash() {
  updateHuntState((state) => ({
    ...state,
    splashSeenAt: new Date().toISOString(),
  }));
}

/**
 * Entry gate shared by the stamp book and the QR page:
 * first visit → preload → storage notice → page. Later visits go straight in.
 */
export function HuntShell({
  title,
  cafeTitle,
  caseNo,
  count,
  children,
}: HuntShellProps) {
  const { state } = useHuntState();

  const loading = state === null;
  const showSplash = !loading && !state.splashSeenAt;
  const showNotice = !loading && !showSplash && !state.noticeAcceptedAt;

  return (
    <>
      <div inert={loading || showSplash || showNotice}>{children}</div>
      {/* Covers the page until this browser's progress has been read. */}
      {loading ? (
        <div className="fixed inset-0 z-[100] bg-cafe-ground" aria-hidden />
      ) : null}
      {showSplash ? (
        <HuntSplash
          title={title}
          cafeTitle={cafeTitle}
          caseNo={caseNo}
          count={count}
          onFinished={finishSplash}
        />
      ) : null}
      {showNotice ? <HuntNotice required onClose={acceptNotice} /> : null}
    </>
  );
}
