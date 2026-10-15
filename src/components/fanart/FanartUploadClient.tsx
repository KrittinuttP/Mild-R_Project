"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Crop, Upload, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useAvatarCrop } from "@/components/upload/useAvatarCrop";
import { shrinkImageFile } from "@/lib/hbd-client-resize";
import {
  FANART_AVATAR_LIMITS,
  FANART_IMAGE_SIZES,
  FANART_LIMITS,
  type FanartContactChannel,
} from "@/lib/fanart-upload";
import { cn } from "@/lib/utils";

const DISPLAY = "font-[family-name:var(--font-display)]";

type Phase = "form" | "preview" | "done";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm tracking-wide text-[#f7d7de]/90">{children}</h2>;
}

type FanartUploadClientProps = {
  /** /upload/fanart: the standalone page without the site header. */
  standalone?: boolean;
};

export function FanartUploadClient({ standalone = false }: FanartUploadClientProps) {
  const artInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const artFileRef = useRef<File | null>(null);
  const avatarFileRef = useRef<File | null>(null);

  const [phase, setPhase] = useState<Phase>("form");
  const [artFile, setArtFile] = useState<File | null>(null);
  const [artPreviewUrl, setArtPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [contactChannel, setContactChannel] = useState<FanartContactChannel>("x");
  const [contactHandle, setContactHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const avatarCrop = useAvatarCrop({
    maxEdge: FANART_IMAGE_SIZES.avatarClientMaxEdge,
    maxBytes: FANART_AVATAR_LIMITS.maxBytes,
    onCropped: (file) => setAvatar(file, URL.createObjectURL(file)),
  });

  function setArt(file: File | null, previewUrl?: string) {
    if (artPreviewUrl) URL.revokeObjectURL(artPreviewUrl);
    artFileRef.current = file;
    setArtFile(file);
    setArtPreviewUrl(previewUrl ?? null);
  }

  function setAvatar(file: File | null, previewUrl?: string) {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    avatarFileRef.current = file;
    setAvatarFile(file);
    setAvatarPreviewUrl(previewUrl ?? null);
  }

  async function onArtChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > FANART_LIMITS.maxSourceBytes) {
      setError("ไฟล์รูปใหญ่เกิน 20 MB");
      return;
    }
    setError(null);
    const shrunk = await shrinkImageFile(file, {
      maxEdge: FANART_IMAGE_SIZES.artMaxEdge,
      maxBytes: FANART_LIMITS.maxBytes,
    });
    setArt(shrunk, URL.createObjectURL(shrunk));
  }

  async function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > FANART_AVATAR_LIMITS.maxSourceBytes) {
      setError("ไฟล์รูปโปรไฟล์ใหญ่เกิน 10 MB");
      return;
    }
    setError(null);
    // The cropper makes the square, upload-sized image.
    avatarCrop.start(file);
  }

  function clearAvatar() {
    setAvatar(null);
    avatarCrop.clear();
  }

  /** After a successful send: empty form for the next picture. */
  function resetForm() {
    setArt(null);
    clearAvatar();
    setDisplayName("");
    setContactChannel("x");
    setContactHandle("");
    setError(null);
    setPhase("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validate(): string | null {
    if (!artFileRef.current && !artFile) return "กรุณาอัปโหลดรูปแฟนอาร์ต";
    if (!displayName.trim()) return "กรุณากรอกชื่อที่แสดง";
    if (!contactHandle.replace(/^@+/, "").trim()) return "กรุณากรอกชื่อช่องทางติดต่อ";
    return null;
  }

  function onSubmitForm(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPhase("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onConfirm() {
    const file = artFileRef.current ?? artFile;
    if (!file) {
      setError("ไม่พบไฟล์รูป — กรุณาอัปโหลดใหม่");
      setPhase("form");
      return;
    }
    setSending(true);
    setError(null);
    const body = new FormData();
    body.set("displayName", displayName.trim());
    body.set("contactChannel", contactChannel);
    body.set("contactHandle", contactHandle.trim());
    body.set("art", file);
    const avatar = avatarFileRef.current ?? avatarFile;
    if (avatar) body.set("avatar", avatar);

    try {
      const response = await fetch("/api/fanart/submit", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "ส่งไม่สำเร็จ");
        setSending(false);
        return;
      }
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("ส่งไม่สำเร็จ — ลองอีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  const handleLabel = contactChannel === "x" ? "ชื่อบัญชี X" : "ชื่อผู้ใช้ Discord";

  return (
    <div
      className={cn(
        "mx-auto max-w-lg px-5",
        // The site header is fixed on the regular page; the standalone page has none.
        standalone ? "pt-12 pb-16 sm:pt-16 sm:pb-20" : "py-16 sm:py-20"
      )}
    >
      {avatarCrop.dialog}
      <header className="text-center">
        <p className="inline-flex rounded-full bg-[#e85a7a]/15 px-3 py-1 text-[0.7rem] tracking-[0.2em] text-[#f3b8c4] uppercase">
          Fan art
        </p>
        <h1 className={cn(DISPLAY, "mt-4 text-3xl font-normal tracking-tight text-[#fff5f7] sm:text-4xl")}>
          ส่งแฟนอาร์ต
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#f3b8c4]/80 sm:text-base">
          ส่งรูปให้ทีมงานตรวจก่อน จึงจะถูกเก็บในคลัง
        </p>
      </header>

      {error ? (
        <p className="mt-6 rounded-2xl bg-[#e85a7a]/12 px-4 py-3 text-sm text-[#f7d7de] ring-1 ring-[#e85a7a]/25" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "done" ? (
        <div className="mt-10 rounded-3xl bg-white/[0.04] px-5 py-8 text-center text-[#f7d7de] ring-1 ring-white/10">
          <p role="status">ส่งแล้ว ทีมงานจะตรวจก่อนเก็บเข้าคลัง</p>
          <button
            type="button"
            onClick={resetForm}
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 rounded-2xl bg-[#e85a7a] text-[#140a0d] hover:bg-[#f3b8c4]"
            )}
          >
            <Upload className="size-4" />
            ส่งแฟนอาร์ตอีกรูป
          </button>
        </div>
      ) : null}

      {phase === "preview" && artPreviewUrl ? (
        <section className="mt-10 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10">
          <h2 className="text-sm text-[#f7d7de]/90">ตรวจก่อนส่ง</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artPreviewUrl}
            alt="พรีวิวแฟนอาร์ต"
            className="mx-auto mt-4 max-h-[28rem] w-auto max-w-full rounded-2xl object-contain ring-1 ring-white/10"
          />
          <div className="mt-4 flex items-center gap-3">
            {avatarPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreviewUrl} alt="" className="size-12 rounded-full object-cover" />
            ) : null}
            <div>
              <p className="text-[#fff5f7]">{displayName.trim()}</p>
              <p className="text-sm text-[#f3b8c4]/80">
                {contactChannel === "x" ? "X" : "Discord"} · {contactHandle.trim()}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onConfirm}
              disabled={sending}
              className={cn(
                buttonVariants({ size: "lg" }),
                "flex-1 rounded-2xl bg-[#e85a7a] text-[#140a0d] hover:bg-[#f3b8c4]"
              )}
            >
              <Check className="size-4" />
              {sending ? "กำลังส่ง…" : "ยืนยันส่ง"}
            </button>
            <button
              type="button"
              onClick={() => setPhase("form")}
              disabled={sending}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1 rounded-2xl border-white/15 text-[#f7d7de]")}
            >
              แก้ไข
            </button>
          </div>
        </section>
      ) : null}

      {phase === "form" ? (
        <form onSubmit={onSubmitForm} className="mt-10 space-y-7">
          <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 sm:p-6">
            <div className="flex items-center gap-2">
              <Upload className="size-4 text-[#e85a7a]" />
              <FieldLabel>อัปโหลดรูปแฟนอาร์ต *</FieldLabel>
            </div>
            <p className="mt-1 text-xs text-[#f3b8c4]/60">JPEG, PNG หรือ WebP · สูงสุด 20 MB</p>
            <input ref={artInputRef} type="file" accept={FANART_LIMITS.accept} onChange={onArtChange} className="sr-only" />
            <button
              type="button"
              onClick={() => artInputRef.current?.click()}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-4 w-full rounded-2xl border-white/15 bg-white/[0.03] text-[#f7d7de]")}
            >
              <Upload className="size-4" />
              เลือกไฟล์
            </button>
            <p className="mt-2 truncate text-xs text-[#f3b8c4]/60">{artFile ? artFile.name : "ยังไม่ได้เลือกไฟล์"}</p>
            {artPreviewUrl ? (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artPreviewUrl} alt="พรีวิวแฟนอาร์ต" className="max-h-64 w-auto max-w-full rounded-2xl object-contain ring-1 ring-white/10" />
                <button type="button" onClick={() => setArt(null)} className="mt-2 inline-flex items-center gap-1 text-xs text-[#f3b8c4]">
                  <X className="size-3.5" />
                  ล้างรูป
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 sm:p-6">
            <FieldLabel>ชื่อที่แสดง *</FieldLabel>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="เช่น ฮันนี่"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#f7d7de] outline-none focus:border-[#e85a7a]/55"
            />
            <p className="mt-5 text-sm text-[#f7d7de]/90">รูปโปรไฟล์</p>
            <p className="mt-1 text-xs text-[#f3b8c4]/60">ไม่บังคับ</p>
            <input ref={avatarInputRef} type="file" accept={FANART_AVATAR_LIMITS.accept} onChange={onAvatarChange} className="sr-only" />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "mt-3 w-full rounded-2xl border-[#e85a7a]/40 bg-[#e85a7a]/10 text-[#f3b8c4] hover:border-[#e85a7a]/70 hover:bg-[#e85a7a]/20 hover:text-[#fff5f7]"
              )}
            >
              เลือกรูปโปรไฟล์
            </button>
            {avatarPreviewUrl ? (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarPreviewUrl} alt="" className="size-14 rounded-full object-cover" />
                {avatarCrop.canRecrop ? (
                  <button
                    type="button"
                    onClick={avatarCrop.recrop}
                    className="inline-flex items-center gap-1 text-xs text-[#f3b8c4]"
                  >
                    <Crop className="size-3.5" />
                    ครอบใหม่
                  </button>
                ) : null}
                <button type="button" onClick={clearAvatar} className="text-xs text-[#f3b8c4]">
                  ล้างรูปโปรไฟล์
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 sm:p-6">
            <FieldLabel>ช่องทางติดต่อ *</FieldLabel>
            <p className="mt-1 text-xs text-[#f3b8c4]/60">ไม่แสดงบนเว็บ ใช้ติดต่อเมื่อมีปัญหา</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["x", "discord"] as const).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={contactChannel === channel}
                  onClick={() => setContactChannel(channel)}
                  className={cn(
                    "min-h-11 rounded-2xl border text-sm",
                    contactChannel === channel
                      ? "border-[#e85a7a] bg-[#e85a7a]/15 text-[#fff5f7]"
                      : "border-white/15 text-[#f3b8c4]"
                  )}
                >
                  {channel === "x" ? "X" : "Discord"}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-xs text-[#f3b8c4]/70">{handleLabel}</label>
            <input
              value={contactHandle}
              onChange={(event) => setContactHandle(event.target.value)}
              placeholder={contactChannel === "x" ? "@honeybee" : "honeybee_01"}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#f7d7de] outline-none focus:border-[#e85a7a]/55"
            />
          </section>

          <button
            type="submit"
            className={cn(buttonVariants({ size: "lg" }), "w-full rounded-2xl bg-[#e85a7a] text-[#140a0d] hover:bg-[#f3b8c4]")}
          >
            ดูตัวอย่าง
          </button>
        </form>
      ) : null}
    </div>
  );
}
