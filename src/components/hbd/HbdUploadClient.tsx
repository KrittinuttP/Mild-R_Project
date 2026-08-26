"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { Download, Eraser, Loader2, Pencil, Sparkles, Upload, X } from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";

import { buttonVariants } from "@/components/ui/button";
import {
  HBD_AVATAR_DEFAULT,
  HBD_AVATAR_LIMITS,
  HBD_CARD_TEMPLATE,
  type HbdContactChannel,
  type HbdUploadDraft,
} from "@/lib/hbd-upload";
import { cn } from "@/lib/utils";

const DISPLAY = "font-[family-name:var(--font-display)]";

const HBD_FORM_CACHE_KEY = "mild-r-hbd-upload-draft";

type Phase = "form" | "preview" | "done";

type CachedFormFields = {
  displayName: string;
  message: string;
  contactChannel: HbdContactChannel;
  contactHandle: string;
};

function readFormCache(): CachedFormFields | null {
  try {
    const raw = localStorage.getItem(HBD_FORM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedFormFields>;
    const channel =
      parsed.contactChannel === "discord" || parsed.contactChannel === "x"
        ? parsed.contactChannel
        : "x";
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      message: typeof parsed.message === "string" ? parsed.message : "",
      contactChannel: channel,
      contactHandle:
        typeof parsed.contactHandle === "string" ? parsed.contactHandle : "",
    };
  } catch {
    return null;
  }
}

function writeFormCache(fields: CachedFormFields) {
  try {
    localStorage.setItem(HBD_FORM_CACHE_KEY, JSON.stringify(fields));
  } catch {
    /* ignore quota / private mode */
  }
}

function clearFormCache() {
  try {
    localStorage.removeItem(HBD_FORM_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

const fieldClass =
  "mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-normal text-[#f7d7de] outline-none transition placeholder:text-[#f3b8c4]/35 focus:border-[#e85a7a]/55 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#e85a7a]/20";

const labelClass = "text-sm font-normal tracking-wide text-[#f7d7de]/90";

const hintClass = "mt-1.5 text-xs leading-relaxed text-[#f3b8c4]/55";

const softBtnClass =
  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#f3b8c4]/80 ring-1 ring-white/15 transition hover:bg-white/5 hover:text-[#f7d7de]";

function revokeUrl(url?: string) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function HbdUploadClient() {
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [contactChannel, setContactChannel] =
    useState<HbdContactChannel>("x");
  const [contactHandle, setContactHandle] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>();
  const [cacheReady, setCacheReady] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const cardInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  /** Live blob URLs — revoke only on replace / explicit clear / unmount (not Strict Mode re-run). */
  const cardUrlRef = useRef<string | undefined>(undefined);
  const avatarUrlRef = useRef<string | undefined>(undefined);
  const cardFileRef = useRef<File | null>(null);
  const avatarFileRef = useRef<File | null>(null);

  useEffect(() => {
    const cached = readFormCache();
    if (cached) {
      setDisplayName(cached.displayName);
      setMessage(cached.message);
      setContactChannel(cached.contactChannel);
      setContactHandle(cached.contactHandle);
    }
    setCacheReady(true);
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    writeFormCache({
      displayName,
      message,
      contactChannel,
      contactHandle,
    });
  }, [displayName, message, contactChannel, contactHandle, cacheReady]);

  useEffect(() => {
    return () => {
      revokeUrl(cardUrlRef.current);
      revokeUrl(avatarUrlRef.current);
    };
  }, []);

  function setCardMedia(file: File | null, previewUrl?: string) {
    if (cardUrlRef.current && cardUrlRef.current !== previewUrl) {
      revokeUrl(cardUrlRef.current);
    }
    cardUrlRef.current = previewUrl;
    cardFileRef.current = file;
    setCardFile(file);
    setCardPreviewUrl(previewUrl);
  }

  function setAvatarMedia(file: File | null, previewUrl?: string) {
    if (avatarUrlRef.current && avatarUrlRef.current !== previewUrl) {
      revokeUrl(avatarUrlRef.current);
    }
    avatarUrlRef.current = previewUrl;
    avatarFileRef.current = file;
    setAvatarFile(file);
    setAvatarPreviewUrl(previewUrl);
  }

  function clearMedia() {
    setCardMedia(null, undefined);
    setAvatarMedia(null, undefined);
    if (cardInputRef.current) cardInputRef.current.value = "";
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function draft(): HbdUploadDraft {
    return {
      displayName: displayName.trim(),
      message: message.trim(),
      contactChannel,
      contactHandle: contactHandle.trim(),
      cardFileName: cardFile?.name,
      cardPreviewUrl,
      avatarFileName: avatarFile?.name,
      avatarPreviewUrl: avatarPreviewUrl ?? HBD_AVATAR_DEFAULT,
    };
  }

  function onCardChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    if (!file) return;

    if (file.size > HBD_CARD_TEMPLATE.maxBytes) {
      setError("ไฟล์การ์ดใหญ่เกินไป (สูงสุด 5 MB)");
      event.target.value = "";
      return;
    }

    setCardMedia(file, URL.createObjectURL(file));
  }

  function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    if (!file) return;

    if (file.size > HBD_AVATAR_LIMITS.maxBytes) {
      setError("ไฟล์ avatar ใหญ่เกินไป (สูงสุด 2 MB)");
      event.target.value = "";
      return;
    }

    setAvatarMedia(file, URL.createObjectURL(file));
  }

  function clearCard() {
    setError(null);
    setCardMedia(null, undefined);
    if (cardInputRef.current) cardInputRef.current.value = "";
  }

  function clearAvatar() {
    setError(null);
    setAvatarMedia(null, undefined);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function validateForm(): string | null {
    const file = cardFileRef.current ?? cardFile;
    const url = cardUrlRef.current ?? cardPreviewUrl;
    if (!file || !url) {
      return "กรุณาอัปโหลดรูปการ์ดจาก template";
    }
    if (!displayName.trim()) return "กรุณากรอกชื่อที่จะแสดงบนเว็บ";
    if (!contactHandle.trim()) return "กรุณากรอกชื่อช่องทางติดต่อ";
    return null;
  }

  async function onSubmitForm(event: FormEvent) {
    event.preventDefault();
    const problem = validateForm();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 450));
    setLoading(false);
    setPhase("preview");
    setNotify("พรีวิวพร้อมแล้ว — ตรวจก่อนกดตกลง");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onConfirm() {
    const file = cardFileRef.current ?? cardFile;
    if (!file) {
      setError("ไม่พบไฟล์การ์ด — กรุณาแก้ไขแล้วอัปโหลดใหม่");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body = new FormData();
      body.set("displayName", displayName.trim());
      body.set("message", message.trim());
      body.set("contactChannel", contactChannel);
      body.set("contactHandle", contactHandle.trim());
      body.set("card", file);
      const avatar = avatarFileRef.current ?? avatarFile;
      if (avatar) body.set("avatar", avatar);

      const res = await fetch("/api/hbd/submit", {
        method: "POST",
        body,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        ok?: boolean;
      } | null;

      if (!res.ok) {
        setError(data?.error ?? "ส่งไม่สำเร็จ");
        setLoading(false);
        return;
      }

      clearFormCache();
      setDisplayName("");
      setMessage("");
      setContactHandle("");
      setContactChannel("x");
      clearMedia();

      setPhase("done");
      setNotify("ส่งเข้าคิวอนุมัติแล้ว — ทีมจะตรวจก่อนขึ้นหน้า HBD");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("เครือข่ายมีปัญหา — ลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    clearFormCache();
    setPhase("form");
    setNotify(null);
    setError(null);
    setDisplayName("");
    setMessage("");
    setContactHandle("");
    setContactChannel("x");
    clearMedia();
  }

  function clearFormData() {
    resetForm();
    setClearConfirmOpen(false);
    setNotify("ล้างข้อมูลฟอร์มแล้ว");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const preview = draft();
  const avatarSrc = preview.avatarPreviewUrl ?? HBD_AVATAR_DEFAULT;
  const showFormChrome = phase === "form";
  const showFormFields = phase === "form" || phase === "preview";

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(232,90,122,0.28),transparent_55%),radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(243,184,196,0.08),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-10 sm:pt-32 lg:px-16">
        {clearConfirmOpen ? (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#140a0d]/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hbd-clear-title"
          >
            <div className="w-full max-w-sm rounded-3xl bg-[#1a0c12] p-6 ring-1 ring-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <h2
                id="hbd-clear-title"
                className={cn(DISPLAY, "text-xl font-normal text-[#fff5f7]")}
              >
                ล้างข้อมูลฟอร์ม?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#f3b8c4]/80">
                ข้อความที่กรอก แคช และรูปที่อัปโหลดจะถูกลบ และกู้คืนไม่ได้
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={clearFormData}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "flex-1 rounded-2xl border-transparent bg-[#e85a7a] font-normal text-[#140a0d] hover:bg-[#f3b8c4]"
                  )}
                >
                  ยืนยันล้าง
                </button>
                <button
                  type="button"
                  onClick={() => setClearConfirmOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "flex-1 rounded-2xl border-white/15 text-[#f7d7de] hover:bg-white/5"
                  )}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <BackLink href="/HBD/2026" className="mb-8">
          กลับไปดูคำอวยพร
        </BackLink>

        <div className="mx-auto max-w-lg">
        {/* 1. Hero */}
        <header className="text-center">
          <p className="inline-flex rounded-full bg-[#e85a7a]/15 px-3 py-1 text-[0.7rem] tracking-[0.2em] text-[#f3b8c4] uppercase">
            Birthday · 12.12.2026
          </p>
          <h1
            className={cn(
              DISPLAY,
              "mt-4 text-3xl font-normal tracking-tight text-[#fff5f7] sm:text-4xl"
            )}
          >
            ส่งการ์ดอวยพร
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#f3b8c4]/80 sm:text-base">
            เชิญชวนฮันนี่มาอวยพรวันเกิดให้ mutant สาวของเราในปี 2026
          </p>
        </header>

        {/* 2. Template + download — keep mounted while preview so uploads stay */}
        <section
          className={cn(
            "mt-10 flex flex-col items-center",
            !showFormChrome && "hidden"
          )}
          aria-hidden={!showFormChrome}
        >
          <p className="mb-3 text-xs tracking-[0.18em] text-[#f3b8c4]/60 uppercase">
            ตัวอย่างการ์ด
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HBD_CARD_TEMPLATE.path}
            alt="ตัวอย่างเทมเพลตการ์ดอวยพร"
            className="h-auto w-full max-w-[13rem] rounded-2xl object-contain shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/10 sm:max-w-[14.5rem]"
          />
          <a
            href={HBD_CARD_TEMPLATE.path}
            download={HBD_CARD_TEMPLATE.filename}
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-5 w-full max-w-xs rounded-2xl border-transparent bg-[#e85a7a] text-sm font-normal text-[#140a0d] shadow-[0_8px_24px_rgba(232,90,122,0.35)] hover:bg-[#f3b8c4]"
            )}
            tabIndex={showFormChrome ? undefined : -1}
          >
            <Download className="size-4" />
            โหลดเทมเพลต
          </a>
        </section>

        {notify ? (
          <p
            className="mt-6 rounded-2xl bg-[#e85a7a]/12 px-4 py-3 text-sm text-[#f7d7de] ring-1 ring-[#e85a7a]/25"
            role="status"
          >
            {notify}
          </p>
        ) : null}

        {showFormFields ? (
          <form
            onSubmit={onSubmitForm}
            className={cn("mt-10 space-y-7", !showFormChrome && "hidden")}
            aria-hidden={!showFormChrome}
            inert={!showFormChrome ? true : undefined}
          >
            {/* 3. Card upload */}
            <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 sm:p-6">
              <div className="flex items-center gap-2">
                <Upload className="size-4 shrink-0 text-[#e85a7a]" />
                <h2 className={labelClass}>อัปโหลดการ์ด *</h2>
              </div>
              <p className={hintClass}>
                ใช้ไฟล์ที่แก้จากเทมเพลต · สูงสุด 5 MB
              </p>
              <input
                ref={cardInputRef}
                type="file"
                accept={HBD_CARD_TEMPLATE.accept}
                onChange={onCardChange}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => cardInputRef.current?.click()}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "mt-4 w-full rounded-2xl border-white/15 bg-white/[0.03] text-sm text-[#f7d7de] hover:border-[#e85a7a]/40 hover:bg-[#e85a7a]/10 hover:text-[#fff5f7]"
                )}
              >
                <Upload className="size-4" />
                เลือกไฟล์การ์ด
              </button>
              <p className="mt-2 truncate text-xs text-[#f3b8c4]/60">
                {cardFile ? cardFile.name : "ยังไม่ได้เลือกไฟล์"}
              </p>
              {cardPreviewUrl ? (
                <div className="mt-4 flex flex-col items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cardPreviewUrl}
                    alt="พรีวิวการ์ดที่อัปโหลด"
                    className="h-auto w-full max-w-[12rem] rounded-2xl object-contain ring-1 ring-white/10"
                  />
                  <button type="button" onClick={clearCard} className={softBtnClass}>
                    <X className="size-3.5" />
                    ล้างรูปการ์ด
                  </button>
                </div>
              ) : null}
            </section>

            {/* 4. Name + avatar */}
            <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 sm:p-6">
              <h2 className={labelClass}>ชื่อและรูปโปรไฟล์</h2>
              <div className="mt-4 flex items-start gap-4">
                <div className="shrink-0 text-center">
                  <label className="cursor-pointer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarSrc}
                      alt="รูปโปรไฟล์"
                      className="size-[4.5rem] rounded-full object-cover ring-2 ring-[#e85a7a]/35"
                    />
                    <span className="mt-2 block text-xs text-[#e85a7a]">
                      เปลี่ยนรูป
                    </span>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept={HBD_AVATAR_LIMITS.accept}
                      onChange={onAvatarChange}
                      className="sr-only"
                    />
                  </label>
                  {avatarFile || avatarPreviewUrl ? (
                    <button
                      type="button"
                      onClick={clearAvatar}
                      className={cn(softBtnClass, "mt-2")}
                    >
                      <X className="size-3.5" />
                      ล้าง
                    </button>
                  ) : null}
                </div>
                <label className="min-w-0 flex-1">
                  <span className={labelClass}>ชื่อที่แสดง *</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={fieldClass}
                    placeholder="ฮันนี่ของมายด์"
                    required
                  />
                  <p className={hintClass}>
                    รูปโปรไฟล์ไม่บังคับ · ไม่ใส่ใช้รูปเริ่มต้น · สูงสุด 2 MB
                  </p>
                </label>
              </div>
            </section>

            {/* 5. Message */}
            <label className="block rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 sm:p-6">
              <span className={labelClass}>ข้อความอวยพร</span>
              <span className="ml-2 text-xs text-[#f3b8c4]/50">ไม่บังคับ</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className={cn(fieldClass, "resize-y")}
                placeholder="สุขสันต์วันเกิดนะมายด์อาร์…"
              />
            </label>

            {/* 6. Contact last */}
            <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 sm:p-6">
              <h2 className={labelClass}>ช่องทางติดต่อ *</h2>
              <p className={hintClass}>
                ไม่แสดงบนเว็บ — ใช้ติดต่อเมื่อมีปัญหาเท่านั้น
              </p>
              <div className="mt-3 flex rounded-2xl bg-black/25 p-1 ring-1 ring-white/10">
                {(["x", "discord"] as const).map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setContactChannel(channel)}
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2.5 text-sm font-normal transition",
                      contactChannel === channel
                        ? "bg-[#e85a7a] text-[#140a0d] shadow-sm"
                        : "text-[#f3b8c4]/70 hover:text-[#f7d7de]"
                    )}
                  >
                    {channel === "x" ? "X" : "Discord"}
                  </button>
                ))}
              </div>
              <label className="mt-1 block">
                <span className="sr-only">
                  {contactChannel === "x" ? "X handle" : "Discord"}
                </span>
                <input
                  value={contactHandle}
                  onChange={(e) => setContactHandle(e.target.value)}
                  className={fieldClass}
                  placeholder={
                    contactChannel === "x"
                      ? "@handle"
                      : "username หรือ user#0000"
                  }
                  required
                />
              </label>
            </section>

            {error ? (
              <p
                className="rounded-2xl bg-[#e85a7a]/15 px-4 py-3 text-sm text-[#f3b8c4] ring-1 ring-[#e85a7a]/30"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 w-full rounded-2xl border-transparent bg-[#e85a7a] text-sm font-normal text-[#140a0d] shadow-[0_8px_24px_rgba(232,90,122,0.3)] hover:bg-[#f3b8c4]"
                )}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                ดูตัวอย่าง
              </button>
              <button
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                disabled={loading}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 w-full rounded-2xl border-white/15 bg-transparent text-sm text-[#f3b8c4] hover:bg-white/5 hover:text-[#f7d7de]"
                )}
              >
                <Eraser className="size-4" />
                ล้างข้อมูลฟอร์ม
              </button>
            </div>
          </form>
        ) : null}

        {phase === "preview" ? (
          <div className="mt-10 space-y-5">
            <article className="rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10 sm:p-5">
              {preview.cardPreviewUrl ? (
                <div className="flex justify-center bg-black/20 px-2 py-3 sm:px-4 sm:py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.cardPreviewUrl}
                    alt="การ์ดอวยพร"
                    className="h-auto max-h-[min(70vh,36rem)] w-auto max-w-full object-contain"
                  />
                </div>
              ) : null}
              <div className="mt-4 px-1 sm:px-2">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarSrc}
                    alt=""
                    className="size-12 rounded-full object-cover ring-2 ring-[#e85a7a]/30"
                  />
                  <div>
                    <p
                      className={cn(
                        DISPLAY,
                        "text-lg font-normal text-[#fff5f7]"
                      )}
                    >
                      จาก {preview.displayName}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#f3b8c4]/55">
                      ช่องทางติดต่อเก็บไว้กับทีม · ไม่แสดงบนเว็บ
                    </p>
                  </div>
                </div>
                {preview.message ? (
                  <p className="mt-4 text-sm leading-relaxed text-[#f7d7de]/90">
                    {preview.message}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-[#f3b8c4]/45">
                    ไม่มีข้อความอวยพร
                  </p>
                )}
              </div>
            </article>

            {error ? (
              <p className="text-sm text-[#e85a7a]" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setPhase("form");
                  setNotify(null);
                  setError(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-2xl border-white/15 bg-transparent text-[#f7d7de] hover:bg-white/5"
                )}
              >
                <Pencil className="size-4" />
                แก้ไข
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "flex-1 rounded-2xl border-transparent bg-[#e85a7a] font-normal text-[#140a0d] hover:bg-[#f3b8c4] sm:flex-none"
                )}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                ตกลง · ส่งเข้าคิว
              </button>
            </div>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="mt-10 rounded-3xl bg-white/[0.04] px-6 py-12 text-center ring-1 ring-white/10">
            <p className={cn(DISPLAY, "text-2xl font-normal text-[#fff5f7]")}>
              ขอบคุณนะฮันนี่
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#f3b8c4]/80">
              การ์ดจะขึ้นในหน้าคำอวยพรหลังทีมอนุมัติ
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/HBD/2026"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-2xl border-transparent bg-[#e85a7a] font-normal text-[#140a0d] hover:bg-[#f3b8c4]"
                )}
              >
                ไปดูคำอวยพร
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-2xl border-white/15 text-[#f7d7de] hover:bg-white/5"
                )}
              >
                ส่งอีกใบ
              </button>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
