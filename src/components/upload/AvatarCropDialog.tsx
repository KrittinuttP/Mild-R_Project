"use client";

import { useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type AvatarCropDialogProps = {
  /** Object URL of the picked photo; the dialog is open while set. */
  src: string | null;
  busy: boolean;
  error: string | null;
  onConfirm: (area: Area) => void;
  onCancel: () => void;
};

/** Round avatar cropper: drag to move, pinch / wheel / slider to zoom. */
export function AvatarCropDialog({
  src,
  busy,
  error,
  onConfirm,
  onCancel,
}: AvatarCropDialogProps) {
  return (
    <Dialog
      open={src !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 bg-[#1c0f13] p-5 text-[#f7d7de] ring-white/10 sm:max-w-md"
        overlayClassName="bg-[#140a0d]/75"
      >
        <DialogTitle className="text-lg font-normal text-[#fff5f7]">
          ครอบรูปโปรไฟล์
        </DialogTitle>
        <DialogDescription className="mt-1.5 text-xs leading-relaxed text-[#f3b8c4]/70">
          ลากรูปเพื่อเลื่อน ถ่างนิ้ว เลื่อนลูกกลิ้งเมาส์ หรือใช้แถบด้านล่างเพื่อซูม
        </DialogDescription>
        {/* A new photo starts again from the centre at 1×. */}
        {src ? (
          <CropArea
            key={src}
            src={src}
            busy={busy}
            error={error}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CropArea({
  src,
  busy,
  error,
  onConfirm,
  onCancel,
}: Omit<AvatarCropDialogProps, "src"> & { src: string }) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area | null>(null);

  return (
    <>
      <div className="relative mt-4 h-72 overflow-hidden rounded-2xl bg-black sm:h-80">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
          cropperProps={{ "aria-label": "พื้นที่ครอบรูป ใช้ปุ่มลูกศรเพื่อเลื่อนได้" }}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ZoomOut className="size-4 shrink-0 text-[#f3b8c4]/70" aria-hidden />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label="ซูมรูป"
          className="h-2 w-full cursor-pointer accent-[#e85a7a]"
        />
        <ZoomIn className="size-4 shrink-0 text-[#f3b8c4]/70" aria-hidden />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-[#f3b8c4]">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "rounded-2xl border-white/15 text-[#f7d7de] hover:bg-white/5"
          )}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={() => area && onConfirm(area)}
          disabled={busy || !area}
          className={cn(
            buttonVariants({ size: "lg" }),
            "rounded-2xl border-transparent bg-[#e85a7a] font-normal text-[#140a0d] hover:bg-[#f3b8c4]"
          )}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          ใช้รูปนี้
        </button>
      </div>
    </>
  );
}
