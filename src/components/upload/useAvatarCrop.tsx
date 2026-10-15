"use client";

import { useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";

import { AvatarCropDialog } from "@/components/upload/AvatarCropDialog";
import { cropAvatarFile } from "@/lib/hbd-client-resize";

type Source = { file: File; url: string };

type UseAvatarCropOptions = {
  maxEdge: number;
  maxBytes: number;
  /** Square, cropped image ready to upload. */
  onCropped: (file: File) => void;
};

/**
 * Pick → crop → upload flow for profile pictures. Keeps the original photo
 * of the current avatar so it can be cropped again without picking it anew.
 */
export function useAvatarCrop({ maxEdge, maxBytes, onCropped }: UseAvatarCropOptions) {
  /** Original of the avatar in use. */
  const [committed, setCommitted] = useState<Source | null>(null);
  /** Photo in the open dialog (a new pick, or `committed` when cropping again). */
  const [pending, setPending] = useState<Source | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urls = useRef(new Set<string>());
  useEffect(() => {
    const owned = urls.current;
    return () => owned.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function release(source: Source | null, keep: Source | null) {
    if (!source || source.url === keep?.url) return;
    URL.revokeObjectURL(source.url);
    urls.current.delete(source.url);
  }

  /** A photo was picked: open the cropper on it. */
  function start(file: File) {
    release(pending, committed);
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    setError(null);
    setPending({ file, url });
  }

  function recrop() {
    if (!committed) return;
    setError(null);
    setPending(committed);
  }

  function cancel() {
    release(pending, committed);
    setPending(null);
    setError(null);
  }

  async function confirm(area: Area) {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const cropped = await cropAvatarFile(pending.file, area, { maxEdge, maxBytes });
      if (pending.url !== committed?.url) release(committed, null);
      setCommitted(pending);
      setPending(null);
      onCropped(cropped);
    } catch {
      setError("ครอบรูปไม่สำเร็จ ลองใช้รูปอื่น");
    } finally {
      setBusy(false);
    }
  }

  /** The avatar was removed: forget its original too. */
  function clear() {
    release(pending, null);
    if (committed?.url !== pending?.url) release(committed, null);
    setPending(null);
    setCommitted(null);
    setError(null);
  }

  return {
    start,
    recrop,
    clear,
    canRecrop: committed !== null,
    dialog: (
      <AvatarCropDialog
        src={pending?.url ?? null}
        busy={busy}
        error={error}
        onConfirm={confirm}
        onCancel={cancel}
      />
    ),
  };
}
