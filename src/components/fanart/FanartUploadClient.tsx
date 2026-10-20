"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Check, Crop, Upload, X } from "lucide-react";

import { useAvatarCrop } from "@/components/upload/useAvatarCrop";
import {
  FanartUploadError,
  precheckFanartFile,
  prepareFanartFile,
  uploadToSignedUrl,
} from "@/lib/fanart-client-prepare";
import {
  FANART_AVATAR_LIMITS,
  FANART_CONSENT,
  FANART_IMAGE_SIZES,
  FANART_LIMITS,
  FANART_TEXT_LIMITS,
  checkContactHandle,
  checkDisplayName,
  type FanartContactChannel,
} from "@/lib/fanart-upload";
import { cn } from "@/lib/utils";

const DISPLAY = "font-[family-name:var(--font-display)]";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#f3b8c4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140a0d]";
const CARD = "rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 sm:p-6";
const INPUT =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#f7d7de] outline-none placeholder:text-[#f3b8c4]/40 focus:border-[#e85a7a]/60 aria-[invalid=true]:border-[#ff8fa6]";
const BTN = cn(
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#e85a7a] px-4 text-[15px] font-semibold text-[#140a0d] transition-colors hover:bg-[#f3b8c4] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#e85a7a]",
  FOCUS
);
const BTN_OUTLINE = cn(
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-4 text-[15px] text-[#f7d7de] transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-45",
  FOCUS
);
const HINT = "text-xs text-[#f3b8c4]/60";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

type Phase = "form" | "preview" | "sending" | "done";
type SendState = "waiting" | "uploading" | "saving" | "done" | "failed";

type Item = {
  key: string;
  /** The picked file until it is prepared, then the file that gets uploaded. */
  file: File;
  previewUrl: string;
  preparing: boolean;
  send: SendState;
  /** Upload progress, 0–1. */
  progress: number;
  sendError?: string;
  /** False when trying again cannot help (the server could not read the picture). */
  retryable?: boolean;
};

type Session = {
  ticket: string;
  uploads: { path: string; signedUrl: string }[];
  /** Item keys in upload order; the index is what /api/fanart/submit expects. */
  keys: string[];
};

let keySeed = 0;
function nextKey() {
  keySeed += 1;
  return `art-${Date.now()}-${keySeed}`;
}

function uploadErrorText(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof FanartUploadError) {
    if (error.status === 0) return { message: "เชื่อมต่อไม่ได้ กรุณากด ลองใหม่", retryable: true };
    if (error.status === 413) return { message: "ไฟล์ใหญ่เกินไป", retryable: false };
  }
  return { message: "อัปโหลดไม่สำเร็จ กรุณากด ลองใหม่", retryable: true };
}

function Label({ htmlFor, children, required = true }: { htmlFor?: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-[#f7d7de]/90">
      {children}
      {required ? <span className="text-[#e85a7a]"> *</span> : null}
    </label>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-[#f3b8c4]/30 border-t-[#e85a7a]",
        className
      )}
    />
  );
}

type FanartUploadClientProps = {
  /** /upload/fanart: the standalone page without the site header. */
  standalone?: boolean;
};

export function FanartUploadClient({ standalone = false }: FanartUploadClientProps) {
  const ids = useId();
  const artInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<File | null>(null);
  const prepQueue = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef<Session | null>(null);
  const doneKeys = useRef(new Set<string>());
  const itemsRef = useRef<Item[]>([]);
  /** Tiles removed while still waiting to be prepared. */
  const removedKeys = useRef(new Set<string>());

  const [phase, setPhase] = useState<Phase>("form");
  const [items, setItems] = useState<Item[]>([]);
  const [prepErrors, setPrepErrors] = useState<string[]>([]);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [contactChannel, setContactChannel] = useState<FanartContactChannel>("x");
  const [contactHandle, setContactHandle] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const avatarCrop = useAvatarCrop({
    maxEdge: FANART_IMAGE_SIZES.avatarClientMaxEdge,
    maxBytes: FANART_AVATAR_LIMITS.maxBytes,
    onCropped: (file) => setAvatar(file, URL.createObjectURL(file)),
  });

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Free the preview images when the page goes away.
  useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), []);

  // Leaving mid-send would lose the pictures still in the queue.
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  function patchItem(key: string, patch: Partial<Item>) {
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function setAvatar(file: File | null, previewUrl?: string) {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    avatarFileRef.current = file;
    setAvatarPreviewUrl(previewUrl ?? null);
  }

  function clearAvatar() {
    setAvatar(null);
    avatarCrop.clear();
  }

  function onArtChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!picked.length) return;

    const problems: string[] = [];
    const usable = picked.filter((file) => {
      const problem = precheckFanartFile(file);
      if (problem) problems.push(`${file.name}: ${problem}`);
      return !problem;
    });

    const slots = FANART_LIMITS.maxFiles - itemsRef.current.length;
    if (usable.length > slots) {
      problems.push(
        slots > 0
          ? `ส่งได้ครั้งละไม่เกิน ${FANART_LIMITS.maxFiles} รูป — เพิ่มให้ ${slots} รูปแรก`
          : `ครบ ${FANART_LIMITS.maxFiles} รูปแล้ว`
      );
    }
    setPrepErrors(problems);
    setFormError(null);

    const added: Item[] = usable.slice(0, Math.max(0, slots)).map((file) => ({
      key: nextKey(),
      file,
      previewUrl: URL.createObjectURL(file),
      preparing: true,
      send: "waiting",
      progress: 0,
    }));
    if (!added.length) return;
    setItems((list) => [...list, ...added]);

    // One at a time: re-encoding big files needs a lot of memory on phones.
    for (const item of added) {
      prepQueue.current = prepQueue.current.then(async () => {
        if (removedKeys.current.has(item.key)) return;
        try {
          const file = await prepareFanartFile(item.file);
          patchItem(item.key, { file, preparing: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : "อ่านไฟล์รูปนี้ไม่ได้";
          setPrepErrors((list) => [...list, `${item.file.name}: ${message}`]);
          removeItem(item.key);
        }
      });
    }
  }

  function removeItem(key: string) {
    removedKeys.current.add(key);
    setItems((list) => {
      const gone = list.find((item) => item.key === key);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return list.filter((item) => item.key !== key);
    });
  }

  function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > FANART_AVATAR_LIMITS.maxSourceBytes) {
      setFormError("ไฟล์รูปโปรไฟล์ใหญ่เกิน 10 MB");
      return;
    }
    setFormError(null);
    // The cropper makes the square, upload-sized image.
    avatarCrop.start(file);
  }

  function validate(): string | null {
    if (!items.length) return "กรุณาเลือกรูปแฟนอาร์ตอย่างน้อย 1 รูป";
    if (items.some((item) => item.preparing)) return "รอเตรียมรูปให้เสร็จก่อน";
    const name = checkDisplayName(displayName);
    if ("error" in name) return name.error;
    const handle = checkContactHandle(contactChannel, contactHandle);
    if ("error" in handle) return handle.error;
    if (!consent) {
      setConsentError(true);
      return "ยังส่งไม่ได้ — กรุณาติ๊กยินยอมการนำผลงานไปใช้";
    }
    return null;
  }

  function onSubmitForm(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    setFormError(problem);
    if (problem) return;
    setPhase("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function sendOne(session: Session, index: number): Promise<boolean> {
    const key = session.keys[index];
    const item = itemsRef.current.find((current) => current.key === key);
    if (!item) return false;

    patchItem(key, { send: "uploading", progress: 0, sendError: undefined, retryable: undefined });
    try {
      await uploadToSignedUrl(
        session.uploads[index].signedUrl,
        item.file,
        (loaded, total) => patchItem(key, { progress: total ? loaded / total : 0 }),
        ANON_KEY
      );
    } catch (error) {
      const { message, retryable } = uploadErrorText(error);
      patchItem(key, { send: "failed", sendError: message, retryable });
      return false;
    }

    patchItem(key, { send: "saving", progress: 1 });
    try {
      const response = await fetch("/api/fanart/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: session.ticket, index }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; code?: string } | null;
      if (!response.ok) {
        patchItem(key, {
          send: "failed",
          sendError: data?.error ?? "บันทึกรูปไม่สำเร็จ กรุณากด ลองใหม่",
          retryable: data?.code !== "unreadable" && data?.code !== "expired" && data?.code !== "invalid",
        });
        return false;
      }
    } catch {
      patchItem(key, { send: "failed", sendError: "เชื่อมต่อไม่ได้ กรุณากด ลองใหม่", retryable: true });
      return false;
    }

    patchItem(key, { send: "done" });
    doneKeys.current.add(key);
    return true;
  }

  function finishIfComplete(session: Session) {
    if (doneKeys.current.size === session.keys.length) {
      setSentCount(session.keys.length);
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function onConfirm() {
    const list = itemsRef.current;
    if (!list.length) return;
    setFormError(null);
    setRunning(true);

    const body = new FormData();
    body.set("displayName", displayName);
    body.set("contactChannel", contactChannel);
    body.set("contactHandle", contactHandle);
    body.set("consent", consent ? "yes" : "no");
    body.set("files", JSON.stringify(list.map((item) => ({ size: item.file.size, type: item.file.type }))));
    if (avatarFileRef.current) body.set("avatar", avatarFileRef.current);

    let session: Session;
    try {
      const response = await fetch("/api/fanart/upload-url", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as
        | { ticket?: string; uploads?: Session["uploads"]; error?: string }
        | null;
      if (!response.ok || !data?.ticket || data.uploads?.length !== list.length) {
        setFormError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่");
        setRunning(false);
        return;
      }
      session = { ticket: data.ticket, uploads: data.uploads, keys: list.map((item) => item.key) };
    } catch {
      setFormError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่");
      setRunning(false);
      return;
    }

    sessionRef.current = session;
    doneKeys.current = new Set();
    setItems((current) => current.map((item) => ({ ...item, send: "waiting", progress: 0, sendError: undefined })));
    setPhase("sending");
    window.scrollTo({ top: 0, behavior: "smooth" });

    for (let index = 0; index < session.keys.length; index += 1) {
      await sendOne(session, index);
    }
    setRunning(false);
    finishIfComplete(session);
  }

  async function retry(keys: string[]) {
    const session = sessionRef.current;
    if (!session || running) return;
    setRunning(true);
    for (const key of keys) {
      const index = session.keys.indexOf(key);
      if (index >= 0) await sendOne(session, index);
    }
    setRunning(false);
    finishIfComplete(session);
  }

  /** From the sending screen: keep only the pictures that did not go through. */
  function backToEdit() {
    setItems((list) => {
      list.filter((item) => item.send === "done").forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return list
        .filter((item) => item.send !== "done")
        .map((item) => ({ ...item, send: "waiting", progress: 0, sendError: undefined, retryable: undefined }));
    });
    sessionRef.current = null;
    setPhase("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** After a successful send: same name and contact, fresh pictures and consent. */
  function sendMore() {
    itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setPrepErrors([]);
    setConsent(false);
    setConsentError(false);
    setFormError(null);
    sessionRef.current = null;
    setPhase("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const preparing = items.some((item) => item.preparing);
  const handleLabel = contactChannel === "x" ? "ชื่อบัญชี X" : "ชื่อผู้ใช้ Discord";
  const contactLine = `${contactChannel === "x" ? "X" : "Discord"} · ${contactChannel === "x" ? "@" : ""}${contactHandle.trim().replace(/^@+/, "")}`;
  const errorBox = formError ? (
    <p
      role="alert"
      className="rounded-2xl bg-[#e85a7a]/12 px-4 py-3 text-sm text-[#f7d7de] ring-1 ring-[#e85a7a]/30"
    >
      {formError}
    </p>
  ) : null;

  const header = (sub: string) => (
    <header className="text-center">
      <p className="inline-flex rounded-full bg-[#e85a7a]/15 px-3 py-1 text-[0.7rem] tracking-[0.2em] text-[#f3b8c4] uppercase">
        Fan art
      </p>
      <h1 className={cn(DISPLAY, "mt-4 text-3xl font-normal tracking-tight text-[#fff5f7] sm:text-4xl")}>
        ส่งแฟนอาร์ต
      </h1>
      {sub ? (
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#f3b8c4]/80 sm:text-base">{sub}</p>
      ) : null}
    </header>
  );

  const artSection = (
    <section className={CARD} aria-labelledby={`${ids}-art`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#e85a7a]">
          <Upload className="size-4" aria-hidden />
          <h2 id={`${ids}-art`} className="text-sm font-normal text-[#f7d7de]/90">
            อัปโหลดรูปแฟนอาร์ต<span className="text-[#e85a7a]"> *</span>
          </h2>
        </div>
        <span className="text-xs text-[#f3b8c4]" aria-live="polite">
          {items.length ? `${items.length} / ${FANART_LIMITS.maxFiles} รูป` : "ยังไม่ได้เลือกรูป"}
        </span>
      </div>
      <p className={cn(HINT, "mt-1")}>
        JPEG, PNG หรือ WebP · สูงสุด {FANART_LIMITS.maxFiles} รูป · รูปละไม่เกิน 40 MB
      </p>
      <input
        ref={artInputRef}
        id={`${ids}-art-input`}
        type="file"
        accept={FANART_LIMITS.accept}
        multiple
        onChange={onArtChange}
        className="sr-only"
        tabIndex={-1}
      />
      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => artInputRef.current?.click()}
          className={cn(
            BTN_OUTLINE,
            "mt-4 min-h-32 flex-col border-dashed border-[#e85a7a]/45 text-[#f3b8c4] hover:border-[#e85a7a]/80"
          )}
        >
          <Upload className="size-5" aria-hidden />
          เลือกรูป (เลือกได้หลายรูป)
        </button>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-2.5">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="relative aspect-square overflow-hidden rounded-[14px] bg-white/[0.04] ring-1 ring-white/12"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt={`แฟนอาร์ตรูปที่ ${index + 1}`} className="size-full object-cover" />
              {item.preparing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#140a0d]/75">
                  <Spinner />
                  <span className="text-[10.5px] text-[#f3b8c4]">กำลังเตรียมรูป…</span>
                </div>
              ) : null}
              <span className="absolute top-1.5 left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#140a0d]/80 px-1 text-[11px] text-[#fff5f7]">
                {index + 1}
              </span>
              <button
                type="button"
                aria-label={`ลบรูปที่ ${index + 1}`}
                onClick={() => removeItem(item.key)}
                className={cn(
                  "absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-[#140a0d]/80 text-[#fff5f7] hover:bg-[#140a0d]",
                  FOCUS
                )}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
          {items.length < FANART_LIMITS.maxFiles ? (
            <li>
              <button
                type="button"
                onClick={() => artInputRef.current?.click()}
                className={cn(
                  "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-[#e85a7a]/50 bg-[#e85a7a]/[0.06] text-[#f3b8c4] hover:border-[#e85a7a]/80",
                  FOCUS
                )}
              >
                <span className="text-[26px] leading-none" aria-hidden>
                  +
                </span>
                <span className="text-xs">เพิ่มรูป</span>
              </button>
            </li>
          ) : null}
        </ul>
      )}
      {prepErrors.length ? (
        <ul role="alert" className="mt-3 space-y-1 text-[12.5px] text-[#ff8fa6]">
          {prepErrors.map((message, index) => (
            <li key={`${index}-${message}`} className="break-words">
              {message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );

  const nameLength = [...displayName].length;
  const profileSection = (
    <section className={CARD}>
      <Label htmlFor={`${ids}-name`}>ชื่อที่แสดง</Label>
      <p id={`${ids}-name-hint`} className={cn(HINT, "mt-1")}>
        ใช้เป็นเครดิตเมื่อนำผลงานไปใช้
      </p>
      <div className="relative mt-2.5">
        <input
          id={`${ids}-name`}
          value={displayName}
          maxLength={FANART_TEXT_LIMITS.displayName}
          autoComplete="nickname"
          aria-describedby={`${ids}-name-hint`}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="เช่น ฮันนี่"
          className={cn(INPUT, "pr-14")}
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[11px] text-[#f3b8c4]/55">
          {nameLength}/{FANART_TEXT_LIMITS.displayName}
        </span>
      </div>

      <p className="mt-5 text-sm text-[#f7d7de]/90">
        รูปโปรไฟล์ <span className={HINT}>· ไม่บังคับ · ไม่เกิน 10 MB</span>
      </p>
      <input
        ref={avatarInputRef}
        type="file"
        accept={FANART_AVATAR_LIMITS.accept}
        onChange={onAvatarChange}
        className="sr-only"
        tabIndex={-1}
      />
      {avatarPreviewUrl ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarPreviewUrl} alt="รูปโปรไฟล์" className="size-14 rounded-full object-cover" />
          {avatarCrop.canRecrop ? (
            <button
              type="button"
              onClick={avatarCrop.recrop}
              className={cn("inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-xs text-[#f3b8c4]", FOCUS)}
            >
              <Crop className="size-3.5" aria-hidden />
              ครอปใหม่
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className={cn("min-h-9 rounded-lg px-1 text-xs text-[#f3b8c4]", FOCUS)}
          >
            เปลี่ยนรูป
          </button>
          <button
            type="button"
            onClick={clearAvatar}
            className={cn("min-h-9 rounded-lg px-1 text-xs text-[#f3b8c4]", FOCUS)}
          >
            ล้างรูปโปรไฟล์
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className={cn(
            BTN_OUTLINE,
            "mt-2.5 border-[#e85a7a]/40 bg-[#e85a7a]/10 text-[#f3b8c4] hover:border-[#e85a7a]/70 hover:text-[#fff5f7]"
          )}
        >
          เลือกรูปโปรไฟล์
        </button>
      )}
    </section>
  );

  const contactSection = (
    <section className={CARD} aria-labelledby={`${ids}-contact`}>
      <h2 id={`${ids}-contact`} className="text-sm font-normal text-[#f7d7de]/90">
        ช่องทางติดต่อ<span className="text-[#e85a7a]"> *</span>
      </h2>
      <p className={cn(HINT, "mt-1")}>ไม่แสดงบนเว็บ ใช้ติดต่อเมื่อมีปัญหา</p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="เลือกช่องทางติดต่อ">
        {(["x", "discord"] as const).map((channel) => (
          <button
            key={channel}
            type="button"
            aria-pressed={contactChannel === channel}
            onClick={() => setContactChannel(channel)}
            className={cn(
              "min-h-11 rounded-2xl border text-sm transition-colors",
              FOCUS,
              contactChannel === channel
                ? "border-[#e85a7a] bg-[#e85a7a]/15 text-[#fff5f7]"
                : "border-white/15 text-[#f3b8c4] hover:border-white/30"
            )}
          >
            {channel === "x" ? "X" : "Discord"}
          </button>
        ))}
      </div>
      <label htmlFor={`${ids}-handle`} className="mt-4 block text-xs text-[#f3b8c4]/75">
        {handleLabel}
      </label>
      <div className="relative mt-2">
        {contactChannel === "x" ? (
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#f3b8c4]/60">
            @
          </span>
        ) : null}
        <input
          id={`${ids}-handle`}
          value={contactHandle}
          maxLength={FANART_TEXT_LIMITS.handle}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setContactHandle(event.target.value.replace(/^@+/, ""))}
          placeholder={contactChannel === "x" ? "honeybee" : "honeybee_01"}
          className={cn(INPUT, contactChannel === "x" && "pl-8")}
        />
      </div>
    </section>
  );

  const consentSection = (
    <section
      className={cn(
        "rounded-3xl bg-[#e85a7a]/[0.08] p-5 ring-[1.5px] sm:p-6",
        consentError && !consent ? "ring-[#ff8fa6]" : "ring-[#e85a7a]/35"
      )}
    >
      <h2 className="text-[13px] font-medium text-[#f3b8c4]">การนำผลงานไปใช้</h2>
      <p id={`${ids}-consent-text`} className="mt-2 text-[14.5px] leading-[1.7] text-[#fff5f7]">
        {FANART_CONSENT.text}
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-white/10 pt-3.5">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            if (event.target.checked) {
              setConsentError(false);
              setFormError(null);
            }
          }}
          aria-describedby={`${ids}-consent-text`}
          aria-invalid={consentError && !consent}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-[7px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#f3b8c4] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#140a0d]",
            consent
              ? "bg-[#e85a7a] text-[#140a0d]"
              : cn("border-2", consentError ? "border-[#ff8fa6]" : "border-[#f3b8c4]/55")
          )}
        >
          {consent ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
        <span className="text-sm leading-relaxed text-[#f7d7de]">
          {FANART_CONSENT.label} <span className="text-[#e85a7a]">*</span>
        </span>
      </label>
      {consentError && !consent ? (
        <p className="mt-2.5 ml-[34px] text-[12.5px] text-[#ff8fa6]">กรุณาติ๊กยินยอมก่อนส่ง</p>
      ) : null}
    </section>
  );

  const submitBlock = (
    <div className="space-y-3">
      {errorBox}
      <button type="submit" disabled={!items.length || preparing} className={BTN}>
        ดูตัวอย่าง{items.length ? ` (${items.length} รูป)` : ""}
      </button>
      {preparing ? (
        <p className="text-center text-xs text-[#f3b8c4]/70" aria-live="polite">
          รอเตรียมรูปให้เสร็จก่อน จึงจะกดได้
        </p>
      ) : null}
    </div>
  );

  const total = items.length;
  const done = items.filter((item) => item.send === "done").length;
  const failed = items.filter((item) => item.send === "failed").length;
  const inFlight = items.reduce(
    (sum, item) => sum + (item.send === "uploading" ? item.progress * 0.9 : item.send === "saving" ? 0.95 : 0),
    0
  );
  const retryableKeys = items.filter((item) => item.send === "failed" && item.retryable).map((item) => item.key);

  return (
    <div
      className={cn(
        "mx-auto px-5",
        phase === "form" ? "max-w-lg lg:max-w-5xl lg:px-10" : "max-w-lg",
        // The site header is fixed on the regular page; the standalone page has none.
        standalone ? "pt-12 pb-16 sm:pt-16 sm:pb-20" : "py-16 sm:py-20"
      )}
    >
      {avatarCrop.dialog}

      {phase === "form" ? (
        <form
          onSubmit={onSubmitForm}
          noValidate
          className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-7"
        >
          <div className="space-y-6 lg:sticky lg:top-6">
            {header("ส่งได้ครั้งละสูงสุด 5 รูป · ทีมงานจะตรวจก่อนนำไปใช้")}
            {artSection}
          </div>
          <div className="space-y-6 lg:pt-2">
            {profileSection}
            {contactSection}
            {consentSection}
            {submitBlock}
          </div>
        </form>
      ) : null}

      {phase === "preview" ? (
        <div className="space-y-6">
          {header("ตรวจข้อมูลอีกครั้งก่อนส่ง")}
          <section className={CARD}>
            <h2 className="text-sm font-normal text-[#f7d7de]/90">ตรวจก่อนส่ง · {total} รูป</h2>
            <ul className="mt-3.5 grid grid-cols-3 gap-2">
              {items.map((item, index) => (
                <li key={item.key} className="aspect-square overflow-hidden rounded-[14px] ring-1 ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt={`แฟนอาร์ตรูปที่ ${index + 1}`} className="size-full object-cover" />
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-3 border-t border-white/[0.08] pt-4">
              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreviewUrl} alt="" className="size-11 rounded-full object-cover" />
              ) : (
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#e85a7a] to-[#f3b8c4] text-lg text-[#140a0d]"
                >
                  {[...displayName.trim()][0] ?? ""}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[#fff5f7]">{checkDisplayNameText(displayName)}</p>
                <p className="truncate text-[13px] text-[#f3b8c4]/80">{contactLine}</p>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-[14px] bg-[#e85a7a]/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#f3b8c4]">
              <Check className="mt-0.5 size-3.5 flex-none text-[#e85a7a]" strokeWidth={3} aria-hidden />
              ยินยอมให้นำไปใช้ตกแต่งคาเฟ่ และในโปรเจกต์วันเกิดของ Mild-R เท่านั้น
            </p>
            <div className="mt-5 space-y-2">
              {errorBox}
              <button type="button" onClick={onConfirm} disabled={running} className={BTN}>
                {running ? <Spinner className="size-4" /> : <Check className="size-4" aria-hidden />}
                {running ? "กำลังเริ่มส่ง…" : `ยืนยันส่ง ${total} รูป`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setPhase("form");
                }}
                disabled={running}
                className={BTN_OUTLINE}
              >
                แก้ไข
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {phase === "sending" ? (
        <div className="space-y-6">
          {header("กำลังส่งแฟนอาร์ต")}
          <section className={CARD}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-[#f7d7de]/90" aria-live="polite">
                ส่งแล้ว {done} / {total} รูป
              </p>
              {failed ? <span className="text-xs text-[#ff8fa6]">พลาด {failed} รูป</span> : null}
            </div>
            <div
              className="mt-3.5 flex h-2 overflow-hidden rounded-full bg-white/[0.08]"
              role="progressbar"
              aria-label="ความคืบหน้าการส่ง"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
            >
              <div
                className="h-full bg-[#e85a7a] transition-[width] duration-300"
                style={{ width: `${((done + inFlight) / Math.max(1, total)) * 100}%` }}
              />
              {!running && failed ? (
                <div className="ml-auto h-full bg-[#ff8fa6]" style={{ width: `${(failed / total) * 100}%` }} />
              ) : null}
            </div>
            <ul className="mt-3.5">
              {items.map((item, index) => (
                <li
                  key={item.key}
                  className={cn("flex items-center gap-3 py-2.5", index > 0 && "border-t border-white/[0.07]")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" className="size-12 flex-none rounded-[10px] object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-[#fff5f7]">รูปที่ {index + 1}</p>
                    <p
                      className={cn(
                        "mt-0.5 flex items-center gap-1.5 text-[12.5px]",
                        item.send === "failed" ? "text-[#ff8fa6]" : "text-[#f3b8c4]/80"
                      )}
                    >
                      {item.send === "done" ? (
                        <Check className="size-4 flex-none text-[#7ad6a0]" strokeWidth={3} aria-hidden />
                      ) : item.send === "failed" ? (
                        <X className="size-4 flex-none" strokeWidth={2.5} aria-hidden />
                      ) : item.send === "waiting" ? null : (
                        <Spinner className="size-3.5 flex-none" />
                      )}
                      <span className="min-w-0">
                        {item.send === "done"
                          ? "ส่งแล้ว"
                          : item.send === "failed"
                            ? `ส่งไม่สำเร็จ — ${item.sendError ?? ""}`
                            : item.send === "uploading"
                              ? `กำลังอัปโหลด ${Math.round(item.progress * 100)}%`
                              : item.send === "saving"
                                ? "กำลังบันทึก…"
                                : "รอคิว"}
                      </span>
                    </p>
                  </div>
                  {item.send === "failed" && item.retryable ? (
                    <button
                      type="button"
                      onClick={() => retry([item.key])}
                      disabled={running}
                      className={cn(
                        "min-h-9 flex-none rounded-xl border border-[#e85a7a]/60 px-3 text-[13px] text-[#f3b8c4] hover:border-[#e85a7a] disabled:opacity-45",
                        FOCUS
                      )}
                    >
                      ลองใหม่
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-[#f3b8c4]/65">
              รูปที่ส่งแล้วไม่ต้องส่งซ้ำ กด &quot;ลองใหม่&quot; เฉพาะรูปที่พลาด · อย่าปิดหน้านี้จนกว่าจะส่งครบ
            </p>
            {!running && failed ? (
              <div className="mt-5 space-y-2">
                {retryableKeys.length > 1 ? (
                  <button type="button" onClick={() => retry(retryableKeys)} className={BTN}>
                    ลองใหม่ทุกรูปที่พลาด
                  </button>
                ) : null}
                <button type="button" onClick={backToEdit} className={BTN_OUTLINE}>
                  กลับไปแก้ไขรูปที่พลาด
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {phase === "done" ? (
        <div className="space-y-6">
          {header("")}
          <section className={cn(CARD, "px-5 py-8 text-center")}>
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#7ad6a0]/15 text-[#7ad6a0]">
              <Check className="size-6" strokeWidth={3} aria-hidden />
            </span>
            <p role="status" className={cn(DISPLAY, "mt-4 text-xl text-[#fff5f7]")}>
              ส่งแล้ว {sentCount} รูป
            </p>
            <p className="mt-2 text-sm leading-[1.7] text-[#f3b8c4]/85">
              ทีมงานจะตรวจก่อนนำไปใช้ตกแต่งคาเฟ่
              <br />
              และในโปรเจกต์วันเกิดของ Mild-R
            </p>
            <button type="button" onClick={sendMore} className={cn(BTN, "mt-6")}>
              <Upload className="size-4" aria-hidden />
              ส่งรูปเพิ่ม
            </button>
            <p className="mt-2.5 text-xs text-[#f3b8c4]/60">ชื่อและช่องทางติดต่อจะยังอยู่ ไม่ต้องกรอกใหม่</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function checkDisplayNameText(raw: string) {
  const result = checkDisplayName(raw);
  return "name" in result ? result.name : raw.trim();
}
