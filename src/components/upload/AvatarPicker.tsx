"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";

import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc";
const UNDO_MS = 6000;

type AvatarPickerProps = {
  /** Preview of the chosen picture; null = none yet. */
  src: string | null;
  /** Open the file picker (the crop dialog follows the pick). */
  onPick: () => void;
  /** Take the picture away; `onUndoRemove` brings it back within a few seconds. */
  onRemove: () => void;
  onUndoRemove: () => void;
  /** The undo window closed (or a new picture was picked): free what `onRemove` kept. */
  onRemoveSettled?: () => void;
  /** Size of the circle, as Tailwind classes. */
  sizeClass?: string;
  /** Sample picture shown (dimmed, with a + badge) while no picture is chosen. */
  placeholderSrc?: string;
};

/** Narrow screens get a bottom sheet; wide screens a small menu under the picture. */
function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

/**
 * Profile picture beside the name field (fan art + HBD card upload).
 * Empty: dashed circle, tap to pick. Picked: the photo with one ✎ badge;
 * tapping either opens "เปลี่ยนรูป / เอารูปออก". Cropping happens on every new pick.
 */
export function AvatarPicker({
  src,
  onPick,
  onRemove,
  onUndoRemove,
  onRemoveSettled,
  sizeClass = "size-16",
  placeholderSrc,
}: AvatarPickerProps) {
  const wide = useWide();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(onRemoveSettled);
  useEffect(() => {
    settledRef.current = onRemoveSettled;
  }, [onRemoveSettled]);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    []
  );

  function settleUndo() {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndoOpen(false);
    settledRef.current?.();
  }

  function pick() {
    setSheetOpen(false);
    if (undoOpen) settleUndo();
    onPick();
  }

  function remove() {
    setSheetOpen(false);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    onRemove();
    setUndoOpen(true);
    undoTimer.current = setTimeout(settleUndo, UNDO_MS);
  }

  function undo() {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndoOpen(false);
    onUndoRemove();
  }

  const circle = cn("relative flex flex-none items-center justify-center rounded-full", sizeClass);
  const badge = (
    <span
      aria-hidden
      className="absolute -right-1 -bottom-1 flex size-[26px] items-center justify-center rounded-full bg-[var(--r-raised)] text-r-text shadow-[0_0_0_2px_var(--r-bg),0_4px_10px_rgba(0,0,0,0.4)] transition-colors group-hover:bg-r-pri group-hover:text-r-on-pri group-data-[popup-open]:bg-r-pri group-data-[popup-open]:text-r-on-pri"
    >
      <Pencil className="size-3.5" />
    </span>
  );
  const photo = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="size-full rounded-full object-cover ring-2 ring-r-pri/45" />
  ) : null;

  const itemClass =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left outline-none data-[highlighted]:bg-white/[0.07]";

  let control;
  if (!src && placeholderSrc) {
    control = (
      <button
        type="button"
        onClick={pick}
        aria-label="เลือกรูปโปรไฟล์"
        className={cn(circle, "group cursor-pointer", FOCUS)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={placeholderSrc}
          alt=""
          className="size-full rounded-full object-cover opacity-60 ring-2 ring-r-pri/45 transition-opacity group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 flex size-[26px] items-center justify-center rounded-full bg-r-pri text-r-on-pri shadow-[0_0_0_2px_var(--r-bg),0_4px_10px_rgba(0,0,0,0.4)] transition-colors group-hover:bg-r-pri-hover"
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </span>
      </button>
    );
  } else if (!src) {
    control = (
      <button
        type="button"
        onClick={pick}
        aria-label="เลือกรูปโปรไฟล์"
        className={cn(
          circle,
          "border-[1.5px] border-dashed border-r-pri/55 bg-white/[0.02] text-r-text-2 transition-colors hover:border-r-pri hover:text-r-text",
          FOCUS
        )}
      >
        <span className="flex flex-col items-center leading-none">
          <span className="text-xl">+</span>
          <span className="mt-0.5 text-xs">รูป</span>
        </span>
      </button>
    );
  } else if (wide) {
    control = (
      <Menu.Root>
        <Menu.Trigger aria-label="รูปโปรไฟล์ · เปลี่ยนหรือเอาออก" className={cn(circle, "group cursor-pointer", FOCUS)}>
          {photo}
          {badge}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={10} className="z-50">
            <Menu.Popup className="w-44 rounded-xl bg-[var(--r-panel)] p-1.5 text-sm text-r-text shadow-[0_14px_34px_rgba(0,0,0,0.55)] ring-1 ring-white/10 outline-none ring-inset">
              <Menu.Item onClick={pick} className={cn(itemClass, "h-10")}>
                <ImageIcon className="size-[17px] text-r-text-2" aria-hidden />
                เปลี่ยนรูป
              </Menu.Item>
              <Menu.Item onClick={remove} className={cn(itemClass, "h-10 text-[#ffa062]")}>
                <Trash2 className="size-[17px]" aria-hidden />
                เอารูปออก
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    );
  } else {
    control = (
      <>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="รูปโปรไฟล์ · เปลี่ยนหรือเอาออก"
          aria-haspopup="dialog"
          className={cn(circle, "group", FOCUS)}
        >
          {photo}
          {badge}
        </button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent showCloseButton={false}>
            <SheetHeader className="pt-2 pb-1">
              <SheetTitle className="font-sans text-[13px] text-r-text-3">รูปโปรไฟล์</SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-0.5 px-4">
              <button type="button" onClick={pick} className={cn(itemClass, "h-[52px] text-[15px]", FOCUS)}>
                <ImageIcon className="size-[18px] text-r-text-2" aria-hidden />
                เปลี่ยนรูป
              </button>
              <button type="button" onClick={remove} className={cn(itemClass, "h-[52px] text-[15px] text-[#ffa062]", FOCUS)}>
                <Trash2 className="size-[18px]" aria-hidden />
                เอารูปออก
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className={cn(
                  "mt-2.5 flex h-12 w-full items-center justify-center rounded-full text-[15px] text-r-text ring-1 ring-r-text-2/35 ring-inset",
                  FOCUS
                )}
              >
                ยกเลิก
              </button>
            </SheetBody>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {control}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        {undoOpen ? (
          <div className="pointer-events-auto flex items-center gap-3.5 rounded-full bg-[var(--r-raised)] py-2 pr-2 pl-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/12">
            <span className="text-[13.5px] whitespace-nowrap text-r-text">เอารูปออกแล้ว</span>
            <button
              type="button"
              onClick={undo}
              className={cn(
                "min-h-[34px] rounded-full bg-r-pri px-3.5 text-[13px] font-semibold text-r-on-pri hover:bg-r-pri-hover",
                FOCUS
              )}
            >
              เลิกทำ
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
