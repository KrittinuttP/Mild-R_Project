"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ImagePlus, Trash2, Upload, X } from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";
import { ADMIN_MOMENTS_LOGIN } from "@/lib/admin-next";
import { feedDate } from "@/lib/cafe-feeds";
import { FanartUploadError, uploadToSignedUrl } from "@/lib/fanart-client-prepare";
import {
  MOMENT_PHOTO_DEFAULT_CREDIT,
  MOMENT_PHOTO_LIMITS,
  isMomentPhotoType,
  type MomentPhotoAdmin,
} from "@/lib/moment-photos-shared";
import { R_EYEBROW_CLASS, R_PILL_ACTIVE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const MAX_MB = Math.round(MOMENT_PHOTO_LIMITS.maxBytes / 1024 / 1024);

type Tab = "all" | "shown" | "hidden";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "shown", label: "แสดงอยู่" },
  { key: "hidden", label: "ซ่อนไว้" },
];

const EMPTY_TEXT: Record<Tab, string> = {
  all: "ยังไม่มีรูปที่อัปโหลด",
  shown: "ไม่มีรูปที่แสดงอยู่",
  hidden: "ไม่มีรูปที่ซ่อนไว้",
};

type Draft = {
  key: string;
  file: File;
  preview: string;
  alt: string;
  /** null = waiting, 0–100 = uploading, "saving" = processing on the server. */
  progress: number | "saving" | null;
  error: string | null;
};

type Props = {
  photos: MomentPhotoAdmin[];
  /** False until migration 20261117150000_moment_photos.sql has run. */
  ready: boolean;
};

class Unauthorized extends Error {}

async function postJson<T>(url: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Unauthorized();
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "ทำรายการไม่สำเร็จ");
  return data;
}

/** /admin/moments · upload photos to the Moments gallery, hide or delete them. */
export function AdminMomentsClient({ photos: initialPhotos, ready }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [credit, setCredit] = useState(MOMENT_PHOTO_DEFAULT_CREDIT);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Free the preview URLs when the page goes away.
  const draftsRef = useRef<Draft[]>([]);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);
  useEffect(() => () => draftsRef.current.forEach((d) => URL.revokeObjectURL(d.preview)), []);

  const counts = useMemo(() => {
    const hidden = photos.filter((p) => p.hidden).length;
    return { all: photos.length, shown: photos.length - hidden, hidden };
  }, [photos]);

  const visible = useMemo(
    () => photos.filter((p) => (tab === "all" ? true : tab === "hidden" ? p.hidden : !p.hidden)),
    [photos, tab]
  );

  function handleUnauthorized(err: unknown) {
    if (err instanceof Unauthorized) {
      router.replace(ADMIN_MOMENTS_LOGIN);
      return true;
    }
    return false;
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    setNotice(null);
    const room = MOMENT_PHOTO_LIMITS.maxFiles - drafts.length;
    const picked = Array.from(list);
    const accepted: Draft[] = [];
    const skipped: string[] = [];
    for (const file of picked) {
      if (!isMomentPhotoType(file.type)) skipped.push(`${file.name} (ต้องเป็น JPEG · PNG · WebP)`);
      else if (file.size > MOMENT_PHOTO_LIMITS.maxBytes) skipped.push(`${file.name} (เกิน ${MAX_MB} MB)`);
      else if (accepted.length >= room) skipped.push(`${file.name} (เลือกได้ครั้งละ ${MOMENT_PHOTO_LIMITS.maxFiles} รูป)`);
      else
        accepted.push({
          key: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          alt: "",
          progress: null,
          error: null,
        });
    }
    if (accepted.length) setDrafts((list) => [...list, ...accepted]);
    if (skipped.length) setError(`ข้ามไฟล์: ${skipped.join(" · ")}`);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removeDraft(key: string) {
    setDrafts((list) => {
      const found = list.find((d) => d.key === key);
      if (found) URL.revokeObjectURL(found.preview);
      return list.filter((d) => d.key !== key);
    });
  }

  async function uploadAll() {
    const queue = drafts;
    if (queue.length === 0 || uploading) return;
    setError(null);
    setNotice(null);
    setUploading(true);
    let saved = 0;
    try {
      const { uploads } = await postJson<{ uploads: { path: string; signedUrl: string }[] }>(
        "/api/admin/moments/upload-url",
        "POST",
        { files: queue.map((d) => ({ type: d.file.type, size: d.file.size })) }
      );
      for (const [index, draft] of queue.entries()) {
        const target = uploads[index];
        updateDraft(draft.key, { progress: 0, error: null });
        try {
          await uploadToSignedUrl(
            target.signedUrl,
            draft.file,
            (loaded, total) =>
              updateDraft(draft.key, { progress: total ? Math.round((loaded / total) * 100) : 0 }),
            ANON_KEY
          );
          updateDraft(draft.key, { progress: "saving" });
          const { photo } = await postJson<{ photo: MomentPhotoAdmin }>("/api/admin/moments", "POST", {
            path: target.path,
            alt: draft.alt,
            credit,
          });
          setPhotos((list) => [photo, ...list]);
          removeDraft(draft.key);
          saved += 1;
        } catch (err) {
          if (handleUnauthorized(err)) return;
          updateDraft(draft.key, {
            progress: null,
            error:
              err instanceof FanartUploadError
                ? "ส่งไฟล์ไม่สำเร็จ ลองเลือกรูปใหม่หรือเช็กอินเทอร์เน็ต"
                : err instanceof Error && err.message
                  ? err.message
                  : "อัปโหลดไม่สำเร็จ",
          });
        }
      }
      if (saved > 0) {
        setNotice(`เพิ่มเข้า Moments แล้ว ${saved} รูป`);
        router.refresh();
      }
      if (saved < queue.length) setError("บางรูปอัปโหลดไม่สำเร็จ กด อัปโหลด อีกครั้งเพื่อลองใหม่");
    } catch (err) {
      if (handleUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : "เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
  }

  async function toggle(photo: MomentPhotoAdmin) {
    setError(null);
    setBusy(photo.id);
    try {
      await postJson("/api/admin/moments", "PATCH", { id: photo.id, hidden: !photo.hidden });
      setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, hidden: !p.hidden } : p)));
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function remove(photo: MomentPhotoAdmin) {
    if (confirmDelete !== photo.id) {
      setConfirmDelete(photo.id);
      return;
    }
    setError(null);
    setBusy(photo.id);
    try {
      await postJson("/api/admin/moments", "DELETE", { id: photo.id });
      setPhotos((list) => list.filter((p) => p.id !== photo.id));
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl">
      <header>
        <BackLink href="/admin" className="mb-6">
          Control desk
        </BackLink>
        <p className={R_EYEBROW_CLASS}>Moments upload</p>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl text-r-text sm:text-4xl">
          อัปโหลดรูปเข้า Moments
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-r-text-2/75">
          รูปที่อัปโหลดจะขึ้นในแกลเลอรี Moments ทันที เรียงตามวันที่อัปโหลดรวมกับรูปจาก X
          (ใหม่สุดขึ้นก่อน) ซ่อนหรือลบได้ทีละรูป
        </p>
      </header>

      {!ready ? (
        <p className="mt-4 rounded-2xl bg-r-pri/15 px-4 py-3 text-sm" role="status">
          ยังอัปโหลดไม่ได้ ต้องรัน <code>npm run db:migrate:moment-photos</code> ก่อน
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl bg-r-pri/15 px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-2xl bg-r-acc/15 px-4 py-3 text-sm" role="status">
          {notice}
        </p>
      ) : null}

      <section
        aria-label="เลือกรูปเพื่ออัปโหลด"
        className="mt-6 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10 sm:p-6"
      >
        <div className="flex flex-wrap items-end gap-3">
          <input
            ref={inputRef}
            id="moment-files"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={!ready || uploading}
            onChange={(event) => addFiles(event.target.files)}
            className="sr-only"
          />
          <label
            htmlFor="moment-files"
            aria-disabled={!ready || uploading}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white/5 px-4 text-sm text-r-text ring-1 ring-white/15 hover:bg-white/10",
              (!ready || uploading) && "pointer-events-none opacity-50"
            )}
          >
            <ImagePlus className="size-4" aria-hidden />
            เลือกรูป
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-r-text-3 sm:max-w-xs">
            เครดิต (ใช้กับทุกรูปในรอบนี้)
            <input
              type="text"
              value={credit}
              maxLength={MOMENT_PHOTO_LIMITS.creditMax}
              onChange={(event) => setCredit(event.target.value)}
              disabled={uploading}
              className="min-h-11 rounded-xl bg-r-bg/60 px-3 text-sm text-r-text ring-1 ring-white/15 focus:ring-r-pri/60 focus:outline-none"
            />
          </label>
          <button
            type="button"
            disabled={!ready || uploading || drafts.length === 0}
            onClick={() => void uploadAll()}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm disabled:opacity-50",
              R_PILL_ACTIVE_CLASS
            )}
          >
            <Upload className="size-4" aria-hidden />
            {uploading ? "กำลังอัปโหลด…" : drafts.length ? `อัปโหลด ${drafts.length} รูป` : "อัปโหลด"}
          </button>
        </div>
        <p className="mt-2 text-xs text-r-text-3">
          JPEG · PNG · WebP ไม่เกิน {MAX_MB} MB ต่อรูป เลือกได้ครั้งละ {MOMENT_PHOTO_LIMITS.maxFiles} รูป
          ระบบย่อเป็น WebP ให้เอง
        </p>

        {drafts.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {drafts.map((draft) => (
              <li
                key={draft.key}
                className="flex flex-col overflow-hidden rounded-2xl bg-r-bg/50 ring-1 ring-white/10"
              >
                <div className="relative aspect-square bg-white/[0.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.preview} alt="" className="size-full object-cover" />
                  {draft.progress !== null ? (
                    <span className="absolute inset-x-2 bottom-2 rounded-full bg-r-bg/85 px-2 py-0.5 text-center text-xs text-r-text">
                      {draft.progress === "saving" ? "กำลังบันทึก…" : `${draft.progress}%`}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => removeDraft(draft.key)}
                    aria-label={`เอา ${draft.file.name} ออก`}
                    className="absolute top-1.5 right-1.5 inline-flex size-9 items-center justify-center rounded-full bg-r-bg/80 text-r-text ring-1 ring-white/15 disabled:opacity-50"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 p-2.5">
                  <input
                    type="text"
                    value={draft.alt}
                    maxLength={MOMENT_PHOTO_LIMITS.altMax}
                    placeholder="คำอธิบายรูป (ไม่ใส่ก็ได้)"
                    disabled={uploading}
                    onChange={(event) => updateDraft(draft.key, { alt: event.target.value })}
                    className="min-h-10 rounded-lg bg-r-bg/60 px-2.5 text-[13px] text-r-text ring-1 ring-white/10 placeholder:text-r-text-3 focus:ring-r-pri/60 focus:outline-none"
                  />
                  {draft.error ? <p className="text-xs text-r-pri">{draft.error}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm",
              tab === item.key ? R_PILL_ACTIVE_CLASS : "bg-white/5 text-r-text-2"
            )}
          >
            {item.label} · {counts[item.key]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-sm text-r-text-3">{EMPTY_TEXT[tab]}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((photo) => (
            <li
              key={photo.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10",
                photo.hidden && "opacity-60"
              )}
            >
              <div className="relative aspect-square bg-white/[0.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumb} alt="" loading="lazy" className="size-full object-cover" />
                {photo.hidden ? (
                  <span className="absolute top-2 left-2 rounded-full bg-r-bg/80 px-2 py-0.5 text-xs text-r-text-2">
                    ซ่อนอยู่
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <p className="text-xs text-r-text-3">{feedDate(photo.createdAt)}</p>
                <p className="line-clamp-2 text-[13px] leading-snug text-r-text-2">
                  {photo.alt || "—"}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void remove(photo)}
                    onBlur={() => setConfirmDelete((id) => (id === photo.id ? null : id))}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-xs disabled:opacity-50",
                      confirmDelete === photo.id
                        ? "bg-r-pri/25 text-r-text ring-1 ring-r-pri/50"
                        : "text-r-text-2 hover:text-r-text"
                    )}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {confirmDelete === photo.id ? "ยืนยันลบ" : "ลบ"}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void toggle(photo)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/5 px-3 text-xs text-r-text ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                  >
                    {photo.hidden ? (
                      <Eye className="size-3.5" aria-hidden />
                    ) : (
                      <EyeOff className="size-3.5" aria-hidden />
                    )}
                    {busy === photo.id ? "กำลังบันทึก…" : photo.hidden ? "แสดง" : "ซ่อน"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
