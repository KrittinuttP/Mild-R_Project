"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DISPLAY = "font-[family-name:var(--font-display)]";
const BUTTON = "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs transition disabled:opacity-50";
/** Pictures shown in the dialog; the rest become "+N". */
const MAX_THUMBS = 5;
/** Names listed in the dialog; the rest become "… อีก N คน". */
const MAX_NAMES = 4;

export type ConfirmTone = "approve" | "reject";

export type ConfirmItem = { id: string; name: string; imageUrl: string };

/**
 * "Approve / Reject N รายการ?" before an admin action runs.
 * Shows what will change (pictures + names), keeps itself open while the action
 * runs (progress text), and cannot be dismissed until it finishes.
 */
export function AdminConfirmDialog({
  open,
  tone,
  title,
  description,
  items,
  confirmLabel,
  busy,
  progress,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  tone: ConfirmTone;
  title: string;
  description: string;
  items: ConfirmItem[];
  confirmLabel: string;
  busy: boolean;
  /** e.g. "กำลัง Approve 3 / 12…" while running. */
  progress?: string | null;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const thumbs = items.slice(0, MAX_THUMBS);
  const moreThumbs = items.length - thumbs.length;
  const names = [...new Set(items.map((item) => item.name))];
  const shownNames = names.slice(0, MAX_NAMES).join(" · ");
  const moreNames = names.length - MAX_NAMES;
  const Icon = tone === "approve" ? CheckCircle2 : XCircle;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="border-r-text-2/15 bg-r-bg text-r-text"
      >
        <DialogHeader>
          <DialogTitle className={cn(DISPLAY, "text-lg font-normal")}>{title}</DialogTitle>
          <DialogDescription className="text-r-text-2/75">{description}</DialogDescription>
        </DialogHeader>

        {thumbs.length ? (
          <div className="flex flex-wrap gap-2">
            {thumbs.map((item) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={item.imageUrl}
                alt=""
                className="size-12 rounded-xl bg-black/40 object-contain ring-1 ring-white/10"
              />
            ))}
            {moreThumbs > 0 ? (
              <span className="flex size-12 items-center justify-center rounded-xl bg-white/5 text-sm text-r-text-2 ring-1 ring-white/10">
                +{moreThumbs}
              </span>
            ) : null}
          </div>
        ) : null}
        {shownNames ? (
          <p className="text-sm text-r-text-2/90">
            จาก {shownNames}
            {moreNames > 0 ? ` … อีก ${moreNames} คน` : ""}
          </p>
        ) : null}

        {progress ? (
          <p role="status" className="text-sm text-r-text-2">
            {progress}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-200 ring-1 ring-red-500/30">
            {error}
          </p>
        ) : null}

        <DialogFooter className="border-r-text-2/10 bg-white/[0.03]">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              BUTTON,
              "border-r-text-2/25 bg-transparent text-r-text-2 hover:bg-r-text-2/10"
            )}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              buttonVariants({ size: "sm" }),
              BUTTON,
              tone === "approve"
                ? "border border-emerald-500/60 bg-emerald-500/25 font-semibold text-emerald-100 hover:bg-emerald-500/40 hover:text-white"
                : "border border-red-500/60 bg-red-500/25 font-semibold text-red-100 hover:bg-red-500/40 hover:text-white"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {busy ? "กำลังทำงาน…" : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
