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
import { Check, Crop, Link2, Upload, X } from "lucide-react";

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
  checkCredit,
  checkDisplayName,
  creditLabel,
  type FanartCredit,
  type FanartCreditType,
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
const BTN_SMALL = cn(
  "inline-flex min-h-9 flex-none items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] transition-colors",
  FOCUS
);
const LINK_BTN = cn(
  "min-h-8 rounded-md text-[12.5px] text-[#f3b8c4] underline underline-offset-[3px] hover:text-[#fff5f7]",
  FOCUS
);
const HINT = "text-xs text-[#f3b8c4]/60";
const LABEL = "block text-sm text-[#f7d7de]/90";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const UNDO_MS = 6000;

type Phase = "form" | "preview" | "sending" | "done";
type SendState = "waiting" | "uploading" | "saving" | "done" | "failed";

type Item = {
  key: string;
  /** The picked file until it is prepared, then the file that gets uploaded. */
  file: File;
  previewUrl: string;
  preparing: boolean;
  /** Set when this picture's credit differs from the one for all pictures. */
  credit?: FanartCredit;
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

/** Credit being typed: for all pictures ("all") or one picture (its key). */
type Draft = { target: string; type: FanartCreditType; value: string; error?: string };

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

function StepTitle({ n, id, children, aside }: { n: number; id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className={cn(DISPLAY, "flex items-center gap-2.5 text-[17px] font-medium text-[#fff5f7]")}>
        <span
          aria-hidden
          className="flex size-[26px] flex-none items-center justify-center rounded-full bg-[#e85a7a] font-sans text-[13px] font-semibold text-[#140a0d]"
        >
          {n}
        </span>
        {children}
      </h2>
      {aside}
    </div>
  );
}

function CreditLine({ credit, className }: { credit: FanartCredit; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      {credit.type === "url" ? <Link2 className="size-3 flex-none" aria-hidden /> : null}
      <span className="truncate">{creditLabel(credit)}</span>
    </span>
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
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("form");
  const [items, setItems] = useState<Item[]>([]);
  const [prepErrors, setPrepErrors] = useState<string[]>([]);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [contactHandle, setContactHandle] = useState("");
  /** Credit for every picture; null = the fan's own X account. */
  const [allCredit, setAllCredit] = useState<FanartCredit | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [undo, setUndo] = useState<{ item: Item; index: number } | null>(null);
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
  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    []
  );

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

  /** One at a time: re-encoding big files needs a lot of memory on phones. */
  function enqueuePrepare(item: Item) {
    prepQueue.current = prepQueue.current.then(async () => {
      if (removedKeys.current.has(item.key)) return;
      try {
        const file = await prepareFanartFile(item.file);
        patchItem(item.key, { file, preparing: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : "อ่านไฟล์รูปนี้ไม่ได้";
        setPrepErrors((list) => [...list, `${item.file.name}: ${message}`]);
        dropItem(item.key);
      }
    });
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
    added.forEach(enqueuePrepare);
  }

  /** Removes a tile for good (a file that could not be prepared). */
  function dropItem(key: string) {
    removedKeys.current.add(key);
    setItems((list) => {
      const gone = list.find((item) => item.key === key);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return list.filter((item) => item.key !== key);
    });
  }

  function finishUndo() {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndo((current) => {
      if (current) URL.revokeObjectURL(current.item.previewUrl);
      return null;
    });
  }

  /** The ✕ on a picture: removed now, can be put back for a few seconds. */
  function removeItem(key: string) {
    const index = itemsRef.current.findIndex((item) => item.key === key);
    const item = itemsRef.current[index];
    if (!item) return;
    finishUndo();
    removedKeys.current.add(key);
    if (draft?.target === key) setDraft(null);
    setItems((list) => list.filter((entry) => entry.key !== key));
    setUndo({ item, index });
    undoTimer.current = setTimeout(finishUndo, UNDO_MS);
  }

  function undoRemove() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    const { item, index } = undo;
    setUndo(null);
    if (itemsRef.current.length >= FANART_LIMITS.maxFiles) {
      URL.revokeObjectURL(item.previewUrl);
      return;
    }
    removedKeys.current.delete(item.key);
    setItems((list) => {
      const next = [...list];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
    if (item.preparing) enqueuePrepare(item);
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

  const handleCheck = checkContactHandle("x", contactHandle);
  const ownCredit: FanartCredit | null = "handle" in handleCheck ? { type: "x", value: handleCheck.handle } : null;
  const nameCheck = checkDisplayName(displayName);
  const shownName = "name" in nameCheck ? nameCheck.name : "";
  /** Credit used by pictures without their own. */
  const baseCredit = allCredit ?? ownCredit;

  function openDraft(target: string) {
    const current = target === "all" ? baseCredit : (itemsRef.current.find((item) => item.key === target)?.credit ?? baseCredit);
    setDraft({ target, type: current?.type ?? "x", value: current?.value ?? "" });
  }

  /** Saves the open credit editor. False when what was typed is not valid. */
  function commitDraft(): boolean {
    if (!draft) return true;
    if (!draft.value.trim()) {
      // Empty = go back to the default.
      if (draft.target === "all") setAllCredit(null);
      else patchItem(draft.target, { credit: undefined });
      setDraft(null);
      return true;
    }
    const checked = checkCredit(draft.type, draft.value);
    if ("error" in checked) {
      setDraft({ ...draft, error: checked.error.replace(/^เครดิต: /, "") });
      return false;
    }
    if (draft.target === "all") {
      const same = ownCredit && checked.credit.type === "x" && checked.credit.value.toLowerCase() === ownCredit.value.toLowerCase();
      setAllCredit(same ? null : checked.credit);
    } else {
      patchItem(draft.target, { credit: checked.credit });
    }
    setDraft(null);
    return true;
  }

  function validate(): string | null {
    if (!commitDraft()) return "เครดิตที่กำลังแก้ยังไม่ถูกต้อง";
    if ("error" in nameCheck) return nameCheck.error;
    if ("error" in handleCheck) return handleCheck.error;
    if (!items.length) return "กรุณาเลือกรูปแฟนอาร์ตอย่างน้อย 1 รูป";
    if (items.some((item) => item.preparing)) return "รอเตรียมรูปให้เสร็จก่อน";
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
    finishUndo();
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
    body.set("contactHandle", contactHandle);
    body.set("consent", consent ? "yes" : "no");
    body.set("files", JSON.stringify(list.map((item) => ({ size: item.file.size, type: item.file.type }))));
    // null = the fan's own X account (decided on the server).
    body.set("credits", JSON.stringify(list.map((item) => item.credit ?? allCredit ?? null)));
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

  /** After a successful send: same name, account and credit; fresh pictures and consent. */
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
  const errorBox = formError ? (
    <p role="alert" className="rounded-2xl bg-[#e85a7a]/12 px-4 py-3 text-sm text-[#f7d7de] ring-1 ring-[#e85a7a]/30">
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

  /** Two-way switch + input for a credit, used for "all pictures" and for one picture. */
  const creditEditor = (current: Draft, title: string, resetLabel: string, onReset: () => void) => (
    <div className="space-y-2">
      <p className={HINT}>{title}</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="ชนิดเครดิต">
        {(["x", "url"] as const).map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={current.type === type}
            onClick={() => setDraft({ ...current, type, value: type === current.type ? current.value : "", error: undefined })}
            className={cn(
              "flex min-h-9 items-center justify-center gap-1.5 rounded-[14px] border text-[13px] transition-colors",
              FOCUS,
              current.type === type
                ? "border-[#e85a7a] bg-[#e85a7a]/15 text-[#fff5f7]"
                : "border-white/15 text-[#f3b8c4] hover:border-white/30"
            )}
          >
            {type === "x" ? "@ บัญชี X" : (
              <>
                <Link2 className="size-3.5" aria-hidden />
                ลิงก์เว็บ
              </>
            )}
          </button>
        ))}
      </div>
      <div className="relative">
        {current.type === "x" ? (
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#f3b8c4]/60">@</span>
        ) : null}
        <input
          value={current.value}
          aria-label={current.type === "x" ? "บัญชี X ของคนวาด" : "ลิงก์ผลงาน"}
          aria-invalid={Boolean(current.error)}
          inputMode={current.type === "url" ? "url" : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={current.type === "x" ? FANART_TEXT_LIMITS.handle : FANART_TEXT_LIMITS.creditUrl}
          placeholder={current.type === "x" ? "honeyartist" : "https://www.pixiv.net/artworks/…"}
          onChange={(event) =>
            setDraft({
              ...current,
              value: current.type === "x" ? event.target.value.replace(/^@+/, "") : event.target.value,
              error: undefined,
            })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
            }
          }}
          className={cn(INPUT, current.type === "x" && "pl-8")}
        />
      </div>
      {current.error ? <p className="text-xs text-[#ff8fa6]">{current.error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onReset} className={LINK_BTN}>
          {resetLabel}
        </button>
        <button
          type="button"
          onClick={() => commitDraft()}
          className={cn(BTN_SMALL, "bg-[#e85a7a] px-4 font-semibold text-[#140a0d] hover:bg-[#f3b8c4]")}
        >
          เสร็จ
        </button>
      </div>
    </div>
  );

  const nameLength = [...displayName].length;
  const aboutSection = (
    <section className={CARD} aria-labelledby={`${ids}-about`}>
      <StepTitle n={1} id={`${ids}-about`}>
        เกี่ยวกับคุณ
      </StepTitle>
      <label htmlFor={`${ids}-name`} className={cn(LABEL, "mt-[18px]")}>
        ชื่อที่แสดง<span className="text-[#e85a7a]"> *</span>
      </label>
      <div className="relative mt-2">
        <input
          id={`${ids}-name`}
          value={displayName}
          maxLength={FANART_TEXT_LIMITS.displayName}
          autoComplete="nickname"
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="เช่น ฮันนี่"
          className={cn(INPUT, "pr-14")}
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[11px] text-[#f3b8c4]/55">
          {nameLength}/{FANART_TEXT_LIMITS.displayName}
        </span>
      </div>

      <label htmlFor={`${ids}-handle`} className={cn(LABEL, "mt-4")}>
        บัญชี X<span className="text-[#e85a7a]"> *</span>
      </label>
      <p id={`${ids}-handle-hint`} className={cn(HINT, "mt-1")}>
        ใช้ติดต่อเมื่อมีปัญหา และใช้เป็นเครดิตผลงาน
      </p>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#f3b8c4]/60">@</span>
        <input
          id={`${ids}-handle`}
          value={contactHandle}
          maxLength={FANART_TEXT_LIMITS.handle + 1}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={`${ids}-handle-hint`}
          onChange={(event) => setContactHandle(event.target.value.replace(/^@+/, ""))}
          placeholder="honeyartist"
          className={cn(INPUT, "pl-8")}
        />
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept={FANART_AVATAR_LIMITS.accept}
        onChange={onAvatarChange}
        className="sr-only"
        tabIndex={-1}
      />
      <div className="mt-4 flex items-center gap-3">
        {avatarPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarPreviewUrl} alt="รูปโปรไฟล์" className="size-11 flex-none rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="flex size-11 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#e85a7a]/50 bg-[#e85a7a]/[0.06] text-lg text-[#f3b8c4]"
          >
            +
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] text-[#f7d7de]">รูปโปรไฟล์</p>
          {avatarPreviewUrl ? (
            <div className="flex flex-wrap gap-x-3">
              {avatarCrop.canRecrop ? (
                <button type="button" onClick={avatarCrop.recrop} className={cn(LINK_BTN, "inline-flex items-center gap-1")}>
                  <Crop className="size-3" aria-hidden />
                  ครอปใหม่
                </button>
              ) : null}
              <button type="button" onClick={clearAvatar} className={LINK_BTN}>
                เอาออก
              </button>
            </div>
          ) : (
            <p className={HINT}>ไม่บังคับ · ไม่เกิน 10 MB</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className={cn(BTN_SMALL, "border border-[#e85a7a]/45 bg-[#e85a7a]/10 text-[#f3b8c4] hover:border-[#e85a7a]/70")}
        >
          {avatarPreviewUrl ? "เปลี่ยนรูป" : "เลือกรูป"}
        </button>
      </div>
    </section>
  );

  const allDraft = draft?.target === "all" ? draft : null;
  const artSection = (
    <section className={CARD} aria-labelledby={`${ids}-art`}>
      <StepTitle
        n={2}
        id={`${ids}-art`}
        aside={
          <span className="text-xs text-[#f3b8c4]" aria-live="polite">
            {items.length} / {FANART_LIMITS.maxFiles} รูป
          </span>
        }
      >
        แฟนอาร์ต<span className="text-[#e85a7a]">*</span>
      </StepTitle>
      <p className={cn(HINT, "mt-1.5 ml-9")}>JPEG, PNG หรือ WebP · รูปละไม่เกิน 40 MB</p>
      <input
        ref={artInputRef}
        type="file"
        accept={FANART_LIMITS.accept}
        multiple
        onChange={onArtChange}
        className="sr-only"
        tabIndex={-1}
      />

      {items.length ? (
        <ul className="mt-1.5">
          {items.map((item, index) => {
            const rowDraft = draft?.target === item.key ? draft : null;
            const credit = item.credit ?? baseCredit;
            return (
              <li
                key={item.key}
                className={cn(
                  rowDraft
                    ? "-mx-3 my-1 rounded-2xl bg-[#e85a7a]/[0.07] p-3 ring-1 ring-[#e85a7a]/30"
                    : cn("py-2.5", index > 0 && "border-t border-white/[0.07]")
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative size-16 flex-none overflow-hidden rounded-xl ring-1 ring-white/12">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={`แฟนอาร์ตรูปที่ ${index + 1}`} className="size-full object-cover" />
                    {item.preparing ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-[#140a0d]/70">
                        <Spinner className="size-[18px]" />
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-[#fff5f7]">รูปที่ {index + 1}</p>
                    {item.preparing ? (
                      <p className={cn(HINT, "mt-0.5")}>กำลังเตรียมรูป…</p>
                    ) : rowDraft ? (
                      <p className="mt-0.5 text-[12.5px] text-[#f3b8c4]">กำลังแก้เครดิต</p>
                    ) : (
                      <>
                        <p
                          className={cn(
                            "mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px]",
                            item.credit ? "text-[#f7d7de]" : "text-[#f3b8c4]/60"
                          )}
                        >
                          {credit ? <CreditLine credit={credit} /> : <span className="truncate">{shownName || "ยังไม่ได้กรอกบัญชี X"}</span>}
                          {item.credit ? (
                            <span className="flex-none rounded-full bg-[#e85a7a]/18 px-1.5 text-[10.5px] text-[#f3b8c4]">
                              แยกรูปนี้
                            </span>
                          ) : null}
                        </p>
                        <button type="button" onClick={() => openDraft(item.key)} className={LINK_BTN}>
                          แก้เครดิต
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`ลบรูปที่ ${index + 1}`}
                    onClick={() => removeItem(item.key)}
                    className={cn(
                      "flex size-10 flex-none items-center justify-center rounded-xl text-[#f3b8c4]/70 hover:bg-white/5 hover:text-[#fff5f7]",
                      FOCUS
                    )}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                {rowDraft ? (
                  <div className="mt-3">
                    {creditEditor(rowDraft, `เครดิตเฉพาะรูปที่ ${index + 1}`, "ใช้เครดิตเดียวกับรูปอื่น", () => {
                      patchItem(item.key, { credit: undefined });
                      setDraft(null);
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {items.length < FANART_LIMITS.maxFiles ? (
        <button
          type="button"
          onClick={() => artInputRef.current?.click()}
          className={cn(
            BTN_OUTLINE,
            "mt-2 border-dashed border-[#e85a7a]/50 bg-[#e85a7a]/[0.06] text-[#f3b8c4] hover:border-[#e85a7a]/80",
            items.length === 0 ? "mt-4 min-h-28 flex-col" : "min-h-[52px]"
          )}
        >
          {items.length === 0 ? (
            <>
              <Upload className="size-5" aria-hidden />
              เลือกรูป (เลือกได้หลายรูป)
            </>
          ) : (
            <>
              + เพิ่มรูป
              <span className="text-[#f3b8c4]/60">(เหลืออีก {FANART_LIMITS.maxFiles - items.length})</span>
            </>
          )}
        </button>
      ) : null}

      {prepErrors.length ? (
        <ul role="alert" className="mt-3 space-y-1 text-[12.5px] text-[#ff8fa6]">
          {prepErrors.map((message, index) => (
            <li key={`${index}-${message}`} className="break-words">
              {message}
            </li>
          ))}
        </ul>
      ) : null}

      {allDraft ? (
        <div className="mt-3 rounded-2xl bg-[#e85a7a]/[0.07] p-3.5 ring-1 ring-[#e85a7a]/30">
          <p className="text-sm text-[#f7d7de]/90">เครดิตทุกรูป</p>
          <div className="mt-1">
            {creditEditor(allDraft, "ชื่อหรือลิงก์ที่จะแสดงคู่กับรูปบนเว็บและในคาเฟ่", "ใช้บัญชี X ของฉัน", () => {
              setAllCredit(null);
              setDraft(null);
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-white/[0.04] px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className={HINT}>เครดิตทุกรูป</p>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-[#fff5f7]">
              {baseCredit ? <CreditLine credit={baseCredit} /> : <span className="truncate">{shownName || "—"}</span>}
              <span className="flex-none text-xs text-[#f3b8c4]/60">
                · {allCredit ? "ตั้งเอง" : ownCredit ? "จากบัญชี X" : "ใช้ชื่อไปก่อน จนกว่าจะกรอกบัญชี X"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => openDraft("all")}
            className={cn(BTN_SMALL, "border border-white/15 text-[#f3b8c4] hover:border-white/30")}
          >
            เปลี่ยน
          </button>
        </div>
      )}
    </section>
  );

  const consentSection = (
    <section
      aria-labelledby={`${ids}-consent`}
      className={cn(
        "rounded-3xl bg-[#e85a7a]/[0.08] p-5 ring-[1.5px] sm:p-6",
        consentError && !consent ? "ring-[#ff8fa6]" : "ring-[#e85a7a]/35"
      )}
    >
      <StepTitle n={3} id={`${ids}-consent`}>
        การนำผลงานไปใช้
      </StepTitle>
      <p id={`${ids}-consent-text`} className="mt-3 text-[14.5px] leading-[1.7] text-[#fff5f7]">
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
          aria-describedby={`${ids}-consent-text ${ids}-consent-hint`}
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
      <p id={`${ids}-consent-hint`} className="mt-2.5 ml-[34px] text-xs leading-relaxed text-[#f3b8c4]/60">
        {FANART_CONSENT.hint}
      </p>
      {consentError && !consent ? (
        <p className="mt-2 ml-[34px] text-[12.5px] text-[#ff8fa6]">กรุณาติ๊กยินยอมก่อนส่ง</p>
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
        <form onSubmit={onSubmitForm} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-7">
          <div className="space-y-6 lg:sticky lg:top-6">
            {header("ส่งได้ครั้งละสูงสุด 5 รูป · ทีมงานจะตรวจก่อนนำไปใช้")}
            {aboutSection}
          </div>
          <div className="space-y-6 lg:pt-2">
            {artSection}
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
            <ul className="mt-3.5 grid grid-cols-3 gap-2.5">
              {items.map((item, index) => {
                const credit = item.credit ?? baseCredit;
                return (
                  <li key={item.key} className="min-w-0">
                    <div className="aspect-square overflow-hidden rounded-[14px] ring-1 ring-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt={`แฟนอาร์ตรูปที่ ${index + 1}`} className="size-full object-cover" />
                    </div>
                    {credit ? <CreditLine credit={credit} className="mt-1.5 text-[11.5px] text-[#f3b8c4]" /> : null}
                  </li>
                );
              })}
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
                  {[...shownName][0] ?? ""}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[#fff5f7]">{shownName}</p>
                <p className="truncate text-[13px] text-[#f3b8c4]/80">
                  ติดต่อ: X · @{"handle" in handleCheck ? handleCheck.handle : contactHandle}
                </p>
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
            <p className="mt-2.5 text-xs text-[#f3b8c4]/60">ชื่อ บัญชี X และเครดิตจะยังอยู่ ไม่ต้องกรอกใหม่</p>
          </section>
        </div>
      ) : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        {undo && phase === "form" ? (
          <div className="pointer-events-auto flex items-center gap-3.5 rounded-full bg-[#2a1820] py-2 pr-2 pl-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/12">
            <span className="text-[13.5px] whitespace-nowrap text-[#f7d7de]">ลบรูปที่ {undo.index + 1} แล้ว</span>
            <button
              type="button"
              onClick={undoRemove}
              className={cn(
                "min-h-[34px] rounded-full bg-[#e85a7a] px-3.5 text-[13px] font-semibold text-[#140a0d] hover:bg-[#f3b8c4]",
                FOCUS
              )}
            >
              เลิกทำ
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
