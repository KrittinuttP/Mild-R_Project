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
import Link from "next/link";
import { ArrowLeft, Cake, Check, Coffee, Crop, Link2, Pencil, Shield, Upload, X } from "lucide-react";

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
import {
  R_CARD_CLASS,
  R_CTA_OUTLINE_CLASS,
  R_CTA_PRIMARY_CLASS,
  R_EYEBROW_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

const DISPLAY = "font-[family-name:var(--font-display)]";
const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc";
const CARD = cn(R_CARD_CLASS, "p-5 sm:p-[22px]");
const INPUT =
  "h-12 w-full rounded-[14px] bg-white/[0.04] px-4 text-[15px] text-r-text ring-1 ring-white/10 outline-none ring-inset placeholder:text-r-text-2/45 focus:ring-r-pri/60 aria-[invalid=true]:ring-[#ff8fb0]";
const BTN = cn(R_CTA_PRIMARY_CLASS, "w-full");
const BTN_OUTLINE = cn(R_CTA_OUTLINE_CLASS, "w-full");
const BTN_SMALL = cn(
  "inline-flex min-h-9 flex-none items-center justify-center gap-1.5 rounded-full px-4 text-[13px] transition-colors",
  FOCUS
);
const LINK_BTN = cn(
  "min-h-8 rounded-md text-[13px] text-r-text-2 underline decoration-r-pri/70 underline-offset-4 hover:text-r-text",
  FOCUS
);
const HINT = "text-xs text-r-text-3";
const LABEL = "block text-[0.90625rem] text-r-text";
const ERROR_TEXT = "text-[#ff8fb0]";
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

/** Credit being typed for one picture (its key); `all` = use it for every picture. */
type Draft = { target: string; type: FanartCreditType; value: string; all?: boolean; error?: string };

/** Where the picture is used, shown beside the form on wide screens. */
export type FanartUsage = { cafeTitle: string; birthdayLabel: string };

let keySeed = 0;
function nextKey() {
  keySeed += 1;
  return `art-${Date.now()}-${keySeed}`;
}

function uploadErrorText(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof FanartUploadError) {
    if (error.status === 0) return { message: "เชื่อมต่อไม่ได้ กรุณากด ลองใหม่", retryable: true };
    if (error.status === 413) return { message: "ไฟล์ใหญ่เกินไป (รูปละไม่เกิน 40 MB)", retryable: false };
  }
  return { message: "อัปโหลดไม่สำเร็จ กรุณากด ลองใหม่", retryable: true };
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-r-text-2/30 border-t-r-pri",
        className
      )}
    />
  );
}

/** Section title; the number turns mint once the section is complete. */
function StepTitle({
  n,
  id,
  done,
  children,
  aside,
}: {
  n: number;
  id: string;
  done: boolean;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className={cn(DISPLAY, "flex items-center gap-2.5 text-lg font-normal text-r-text")}>
        <span
          aria-hidden
          className={cn(
            "flex size-[26px] flex-none items-center justify-center rounded-full font-sans text-[13px] font-bold transition-colors",
            done ? "bg-r-acc text-r-on-acc" : "bg-r-pri text-r-on-pri"
          )}
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
  usage: FanartUsage;
};

const SECTION_KEYS = ["about", "art", "consent"] as const;

export function FanartUploadClient({ standalone = false, usage }: FanartUploadClientProps) {
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
  const [contactDiscord, setContactDiscord] = useState("");
  /** After "ส่งรูปเพิ่ม": section ① shows one line until the fan taps "แก้ไข". */
  const [aboutCollapsed, setAboutCollapsed] = useState(false);
  /** Form section in view, for the step list beside the form (wide screens). */
  const [activeSection, setActiveSection] = useState(0);
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

  // Highlight the section being read: the last one whose top passed 40% of the screen.
  useEffect(() => {
    if (phase !== "form") return;
    const update = () => {
      const line = window.innerHeight * 0.4;
      let current = 0;
      SECTION_KEYS.forEach((key, index) => {
        const el = document.getElementById(`${ids}-${key}-section`);
        if (el && el.getBoundingClientRect().top <= line) current = index;
      });
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActiveSection(atBottom ? SECTION_KEYS.length - 1 : current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [phase, ids]);

  function goToSection(index: number) {
    document
      .getElementById(`${ids}-${SECTION_KEYS[index]}-section`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
  const discordText = contactDiscord.trim();
  const discordCheck = discordText ? checkContactHandle("discord", discordText) : null;
  const discordHandle = discordCheck && "handle" in discordCheck ? discordCheck.handle : "";

  /** Credit shown for a picture and where it comes from. */
  function creditOf(item: Item): { credit: FanartCredit | null; source: "mine" | "artist" | "none" } {
    const credit = item.credit ?? baseCredit;
    if (!credit) return { credit: null, source: "none" };
    const own =
      ownCredit !== null &&
      credit.type === "x" &&
      credit.value.toLowerCase() === ownCredit.value.toLowerCase();
    return { credit, source: own ? "mine" : "artist" };
  }

  function openDraft(target: string) {
    const current = target === "all" ? baseCredit : (itemsRef.current.find((item) => item.key === target)?.credit ?? baseCredit);
    setDraft({ target, type: current?.type ?? "x", value: current?.value ?? "" });
  }

  /** Saves the open credit editor. False when what was typed is not valid. */
  function commitDraft(): boolean {
    if (!draft) return true;
    const clearOwnCredits = () =>
      setItems((list) => list.map((item) => (item.credit ? { ...item, credit: undefined } : item)));
    if (!draft.value.trim()) {
      // Empty = go back to the default.
      if (draft.all) {
        setAllCredit(null);
        clearOwnCredits();
      } else {
        patchItem(draft.target, { credit: undefined });
      }
      setDraft(null);
      return true;
    }
    const checked = checkCredit(draft.type, draft.value);
    if ("error" in checked) {
      setDraft({ ...draft, error: checked.error.replace(/^เครดิต: /, "") });
      return false;
    }
    if (draft.all) {
      const same = ownCredit && checked.credit.type === "x" && checked.credit.value.toLowerCase() === ownCredit.value.toLowerCase();
      setAllCredit(same ? null : checked.credit);
      clearOwnCredits();
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
    if (discordCheck && "error" in discordCheck) return discordCheck.error;
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
    body.set("contactDiscord", discordHandle);
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
    setAboutCollapsed(true);
    sessionRef.current = null;
    setPhase("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const preparing = items.some((item) => item.preparing);
  const errorBox = formError ? (
    <p role="alert" className="rounded-2xl bg-r-pri/12 px-4 py-3 text-sm text-r-text ring-1 ring-r-pri/35 ring-inset">
      {formError}
    </p>
  ) : null;

  const header = (sub: string, align: "left" | "center" = "center") => (
    <header className={align === "center" ? "text-center" : undefined}>
      <p className={R_EYEBROW_CLASS}>Fan art</p>
      <h1 className={cn(DISPLAY, "mt-2.5 text-[1.875rem] leading-tight font-normal text-r-text sm:text-[2.125rem]")}>
        ส่งแฟนอาร์ต
      </h1>
      {sub ? (
        <p className={cn("mt-3 text-[0.9375rem] leading-relaxed text-r-text-2", align === "center" && "mx-auto max-w-md")}>
          {sub}
        </p>
      ) : null}
    </header>
  );

  const aboutDone = "name" in nameCheck && "handle" in handleCheck && !(discordCheck && "error" in discordCheck);
  const artDone = items.length > 0 && !preparing;
  const steps = [
    {
      title: "เกี่ยวกับคุณ",
      sub: "name" in nameCheck && "handle" in handleCheck ? `${shownName} · @${handleCheck.handle}` : "ยังไม่ได้กรอก",
      done: aboutDone,
    },
    { title: "แฟนอาร์ต", sub: `${items.length} / ${FANART_LIMITS.maxFiles} รูป`, done: artDone },
    { title: "การนำผลงานไปใช้", sub: consent ? "ยินยอมแล้ว" : "ยังไม่ได้ติ๊ก", done: consent },
  ];

  /** Credit editor for one picture, opened from its "แก้เครดิต" link. */
  const creditEditor = (current: Draft, index: number, item: Item) => {
    const resetLabel = item.credit ? "ใช้เครดิตเดียวกับรูปอื่น" : allCredit ? "ใช้บัญชี X ของฉัน" : null;
    return (
      <div className="mt-3 space-y-2.5 rounded-2xl bg-r-pri/[0.06] p-3.5 ring-1 ring-r-pri/30 ring-inset">
        <div>
          <p className="text-sm text-r-text">เครดิตเฉพาะรูปที่ {index + 1}</p>
          <p className={cn(HINT, "mt-0.5")}>ชื่อหรือลิงก์ที่จะแสดงคู่กับรูป</p>
        </div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="ชนิดเครดิต">
          {(["x", "url"] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={current.type === type}
              onClick={() => setDraft({ ...current, type, value: type === current.type ? current.value : "", error: undefined })}
              className={cn(
                "flex min-h-9 items-center justify-center gap-1.5 rounded-full text-[13px] ring-1 transition-colors ring-inset",
                FOCUS,
                current.type === type
                  ? "bg-r-pri/15 text-r-text ring-r-pri"
                  : "text-r-text-2 ring-white/15 hover:ring-white/30"
              )}
            >
              {type === "x" ? (
                "@ บัญชี X"
              ) : (
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
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-r-text-3">@</span>
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
        {current.error ? <p className={cn("text-xs", ERROR_TEXT)}>{current.error}</p> : null}
        {items.length > 1 ? (
          <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-[13px] text-r-text-2">
            <input
              type="checkbox"
              checked={Boolean(current.all)}
              onChange={(event) => setDraft({ ...current, all: event.target.checked })}
              className="size-4 flex-none accent-r-pri"
            />
            ใช้เครดิตนี้กับทุกรูป
          </label>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          {resetLabel ? (
            <button
              type="button"
              onClick={() => {
                if (item.credit) patchItem(item.key, { credit: undefined });
                else setAllCredit(null);
                setDraft(null);
              }}
              className={LINK_BTN}
            >
              {resetLabel}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => commitDraft()}
            className={cn(BTN_SMALL, "bg-r-pri font-semibold text-r-on-pri hover:bg-r-pri-hover")}
          >
            เสร็จ
          </button>
        </div>
      </div>
    );
  };

  const nameLength = [...displayName].length;
  const handleInput = (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-r-text-3">@</span>
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
  );
  const aboutCompact = (
    <section
      id={`${ids}-about-section`}
      className={cn(CARD, "flex scroll-mt-24 items-center gap-3 py-4 sm:py-4")}
      aria-labelledby={`${ids}-about`}
    >
      <span
        aria-hidden
        className="flex size-[26px] flex-none items-center justify-center rounded-full bg-r-acc text-[13px] font-bold text-r-on-acc"
      >
        1
      </span>
      {avatarPreviewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarPreviewUrl} alt="" className="size-9 flex-none rounded-full object-cover" />
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 id={`${ids}-about`} className="truncate text-[15px] text-r-text">
          <span className="sr-only">เกี่ยวกับคุณ: </span>
          {shownName}
        </h2>
        <p className="truncate text-[12.5px] text-r-text-3">
          @{"handle" in handleCheck ? handleCheck.handle : contactHandle}
          {discordHandle ? ` · Discord · ${discordHandle}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setAboutCollapsed(false)}
        className={cn("min-h-9 flex-none rounded-full px-2 text-sm text-r-pri hover:text-r-pri-hover", FOCUS)}
      >
        แก้ไข
      </button>
    </section>
  );
  const aboutSection = (
    <section id={`${ids}-about-section`} className={cn(CARD, "scroll-mt-24")} aria-labelledby={`${ids}-about`}>
      <StepTitle n={1} id={`${ids}-about`} done={aboutDone}>
        เกี่ยวกับคุณ
      </StepTitle>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-3">
        <div>
          <div className="lg:min-h-[2.625rem]">
            <label htmlFor={`${ids}-name`} className={LABEL}>
              ชื่อที่แสดง<span className="text-r-pri"> *</span>
            </label>
          </div>
          <div className="relative mt-1.5">
            <input
              id={`${ids}-name`}
              value={displayName}
              maxLength={FANART_TEXT_LIMITS.displayName}
              autoComplete="nickname"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="เช่น ฮันนี่"
              className={cn(INPUT, "pr-14")}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[11px] text-r-text-2/45">
              {nameLength}/{FANART_TEXT_LIMITS.displayName}
            </span>
          </div>
        </div>
        <div>
          <div className="lg:min-h-[2.625rem]">
            <label htmlFor={`${ids}-handle`} className={LABEL}>
              บัญชี X<span className="text-r-pri"> *</span>
            </label>
            <p id={`${ids}-handle-hint`} className={cn(HINT, "mt-0.5")}>
              ใช้เป็นเครดิตผลงาน
            </p>
          </div>
          <div className="mt-1.5">{handleInput}</div>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor={`${ids}-discord`} className={LABEL}>
          Discord
        </label>
        <p id={`${ids}-discord-hint`} className={cn(HINT, "mt-0.5")}>
          ช่องทางติดต่อสำรอง · ไม่บังคับ
        </p>
        <input
          id={`${ids}-discord`}
          value={contactDiscord}
          maxLength={33}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={`${ids}-discord-hint`}
          aria-invalid={Boolean(discordCheck && "error" in discordCheck && formError)}
          onChange={(event) => setContactDiscord(event.target.value.replace(/^@+/, ""))}
          placeholder="ชื่อผู้ใช้ Discord"
          className={cn(INPUT, "mt-1.5")}
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
          <img src={avatarPreviewUrl} alt="รูปโปรไฟล์" className="size-12 flex-none rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="flex size-12 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-r-pri/50 text-lg text-r-text-2"
          >
            +
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[0.90625rem] text-r-text">รูปโปรไฟล์</p>
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
          className={cn(BTN_SMALL, "min-h-[38px] px-5 text-[15px] text-r-text ring-1 ring-r-text-2/35 ring-inset hover:ring-r-pri/60")}
        >
          {avatarPreviewUrl ? "เปลี่ยนรูป" : "เลือกรูป"}
        </button>
      </div>
    </section>
  );

  const full = items.length >= FANART_LIMITS.maxFiles;
  const artSection = (
    <section id={`${ids}-art-section`} className={cn(CARD, "scroll-mt-24")} aria-labelledby={`${ids}-art`}>
      <StepTitle
        n={2}
        id={`${ids}-art`}
        done={artDone}
        aside={
          <span className={cn("text-[13px]", full ? "text-r-acc" : "text-r-text-2")} aria-live="polite">
            {items.length} / {FANART_LIMITS.maxFiles} รูป
          </span>
        }
      >
        แฟนอาร์ต<span className="text-r-pri"> *</span>
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
        <ul className="mt-4 space-y-2.5">
          {items.map((item, index) => {
            const rowDraft = draft?.target === item.key ? draft : null;
            const { credit, source } = creditOf(item);
            return (
              <li
                key={item.key}
                className={cn(
                  "rounded-[18px] bg-white/[0.03] p-3 ring-1 ring-inset",
                  rowDraft ? "ring-r-pri/30" : "ring-white/[0.06]"
                )}
              >
                <div className="flex gap-3.5">
                  <div className="relative size-[72px] flex-none overflow-hidden rounded-[14px] bg-black/35">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={`แฟนอาร์ตรูปที่ ${index + 1}`} className="size-full object-contain" />
                    {item.preparing ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-r-bg/65">
                        <Spinner className="size-[22px]" />
                      </span>
                    ) : null}
                    <span className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-white/10 ring-inset" />
                    <span
                      aria-hidden
                      className="absolute bottom-1.5 left-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-r-bg/85 px-1.5 text-[11px] font-semibold text-r-text"
                    >
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    {item.preparing ? (
                      <>
                        <p className="text-[15px] text-r-text-3">รูปที่ {index + 1}</p>
                        <p className={cn(HINT, "mt-0.5")}>กำลังเตรียมรูป…</p>
                      </>
                    ) : (
                      <>
                        <p className="min-w-0 text-[15px] text-r-text">
                          {credit ? (
                            <CreditLine credit={credit} />
                          ) : (
                            <span className="block truncate">{shownName || `รูปที่ ${index + 1}`}</span>
                          )}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-xs",
                            rowDraft
                              ? "text-r-text-2"
                              : source === "artist"
                                ? "text-r-acc"
                                : source === "none"
                                  ? ERROR_TEXT
                                  : "text-r-text-3"
                          )}
                        >
                          {rowDraft
                            ? "กำลังแก้เครดิต"
                            : source === "artist"
                              ? "เครดิตคนวาด"
                              : source === "none"
                                ? "ยังไม่ได้กรอกบัญชี X"
                                : "บัญชี X ของคุณ"}
                        </p>
                        {rowDraft ? null : (
                          <button
                            type="button"
                            onClick={() => openDraft(item.key)}
                            aria-label={`แก้เครดิตรูปที่ ${index + 1}`}
                            className={cn(LINK_BTN, "mt-0.5 inline-flex items-center gap-1.5 self-start")}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            แก้เครดิต
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`ลบรูปที่ ${index + 1}`}
                    onClick={() => removeItem(item.key)}
                    className={cn(
                      "-mt-1 -mr-1 flex size-9 flex-none items-center justify-center self-start rounded-full text-r-text-3 hover:bg-white/5 hover:text-r-text",
                      FOCUS
                    )}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                {rowDraft ? creditEditor(rowDraft, index, item) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => artInputRef.current?.click()}
          className={cn(
            "mt-4 flex min-h-44 w-full flex-col items-center justify-center gap-2.5 rounded-[18px] border-[1.5px] border-dashed border-r-pri/45 bg-r-pri/[0.04] text-[15px] text-r-text transition-colors hover:border-r-pri/75 sm:min-h-[200px]",
            FOCUS
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-r-pri/14 text-r-pri">
            <Upload className="size-[22px]" aria-hidden />
          </span>
          เลือกรูป (เลือกได้หลายรูป)
        </button>
      ) : !full ? (
        <button
          type="button"
          onClick={() => artInputRef.current?.click()}
          className={cn(
            "mt-2.5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-r-pri/45 text-sm text-r-text-2 transition-colors hover:border-r-pri/75 hover:text-r-text",
            FOCUS
          )}
        >
          <span className="text-lg leading-none text-r-pri" aria-hidden>
            +
          </span>
          เพิ่มรูป
          <span className="text-[12.5px] text-r-text-3">(เหลืออีก {FANART_LIMITS.maxFiles - items.length})</span>
        </button>
      ) : (
        <p className={cn(HINT, "mt-3 text-center text-[12.5px]")}>ครบ {FANART_LIMITS.maxFiles} รูปแล้ว</p>
      )}

      {prepErrors.length ? (
        <ul role="alert" className={cn("mt-3 space-y-1 text-[12.5px]", ERROR_TEXT)}>
          {prepErrors.map((message, index) => (
            <li key={`${index}-${message}`} className="break-words">
              {message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );

  const consentInvalid = consentError && !consent;
  const consentSection = (
    <section id={`${ids}-consent-section`} aria-labelledby={`${ids}-consent`} className={cn(CARD, "scroll-mt-24")}>
      <StepTitle n={3} id={`${ids}-consent`} done={consent}>
        การนำผลงานไปใช้
      </StepTitle>
      <p id={`${ids}-consent-text`} className="mt-4 text-sm leading-relaxed text-r-text-2">
        {FANART_CONSENT.text}
      </p>
      <label
        className={cn(
          "mt-3.5 flex cursor-pointer items-start gap-3 rounded-[14px] bg-white/[0.03] p-3.5 ring-1 transition-colors ring-inset",
          consentInvalid ? "ring-[#ff8fb0]" : consent ? "ring-r-pri/40" : "ring-white/[0.08] hover:ring-white/20"
        )}
      >
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
          aria-invalid={consentInvalid}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-[7px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-r-acc peer-focus-visible:outline-solid",
            consent
              ? "bg-r-pri text-r-on-pri"
              : cn("ring-[1.5px] ring-inset", consentInvalid ? "ring-[#ff8fb0]" : "ring-r-text-2/50")
          )}
        >
          {consent ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
        <span className="text-sm leading-relaxed text-r-text">
          {FANART_CONSENT.label} <span className="text-r-pri">*</span>
        </span>
      </label>
      <p id={`${ids}-consent-hint`} className={cn(HINT, "mt-2.5 leading-relaxed")}>
        {FANART_CONSENT.hint}
      </p>
      {consentInvalid ? <p className={cn("mt-2 text-[12.5px]", ERROR_TEXT)}>กรุณาติ๊กยินยอมก่อนส่ง</p> : null}
    </section>
  );

  const submitBlock = (
    <div className="space-y-2.5">
      {errorBox}
      <button type="submit" disabled={!items.length || preparing} className={BTN}>
        ตรวจสอบก่อนส่ง{items.length ? ` (${items.length} รูป)` : ""}
      </button>
      {preparing ? (
        <p className="text-center text-[12.5px] text-r-text-3" aria-live="polite">
          รอเตรียมรูปให้เสร็จก่อน จึงจะกดได้
        </p>
      ) : null}
    </div>
  );

  const usagePlaces = [
    { icon: Coffee, title: "ตกแต่งคาเฟ่", sub: usage.cafeTitle },
    { icon: Cake, title: "โปรเจกต์วันเกิดของ Mild-R", sub: usage.birthdayLabel },
  ];
  const aside = (
    <aside className={cn("space-y-6 lg:sticky lg:space-y-4", standalone ? "lg:top-[88px]" : "lg:top-24")}>
      {standalone ? null : (
        <Link
          href="/gallery"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-r-text-2 ring-1 ring-r-text-2/20 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
            FOCUS
          )}
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          แกลเลอรี
        </Link>
      )}
      {header("ส่งได้ครั้งละสูงสุด 5 รูป · ทีมงานจะตรวจก่อนนำไปใช้", "left")}
      <nav aria-label="ขั้นตอนการกรอก" className="-ml-3 hidden space-y-1 lg:block">
        {steps.map((step, index) => {
          const current = activeSection === index;
          return (
            <button
              key={step.title}
              type="button"
              onClick={() => goToSection(index)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                FOCUS,
                current ? "bg-r-pri/[0.09] shadow-[inset_2px_0_0_var(--r-pri)]" : "hover:bg-white/[0.03]"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-[26px] flex-none items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                  step.done ? "bg-r-acc text-r-on-acc" : "text-r-text-2 ring-[1.5px] ring-r-text-2/40 ring-inset"
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[15px]", current ? "text-r-text" : "text-r-text/85")}>{step.title}</span>
                <span className="block truncate text-xs text-r-text-3">{step.sub}</span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className={cn(R_CARD_CLASS, "hidden p-5 lg:block")}>
        <p className="text-sm text-r-text">รูปจะถูกนำไปใช้ที่</p>
        <ul className="mt-2">
          {usagePlaces.map(({ icon: Icon, title, sub }) => (
            <li key={title} className="flex items-center gap-3 py-2">
              <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-r-pri/12 text-r-pri">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-r-text">{title}</span>
                <span className="block truncate text-xs text-r-text-3">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );

  const total = items.length;
  const done = items.filter((item) => item.send === "done").length;
  const failed = items.filter((item) => item.send === "failed").length;
  const inFlight = items.reduce(
    (sum, item) => sum + (item.send === "uploading" ? item.progress * 0.9 : item.send === "saving" ? 0.95 : 0),
    0
  );
  const retryableKeys = items.filter((item) => item.send === "failed" && item.retryable).map((item) => item.key);
  const thumb = (item: Item, index: number, size: string) => (
    <span className={cn("relative flex-none overflow-hidden rounded-xl bg-black/35", size)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.previewUrl} alt={`แฟนอาร์ตรูปที่ ${index + 1}`} className="size-full object-contain" />
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10 ring-inset" />
    </span>
  );

  return (
    <div
      className={cn(
        "mx-auto px-4 sm:px-5",
        phase === "form" ? "max-w-lg lg:max-w-[1160px] lg:px-10" : "max-w-lg",
        // The site header is fixed on the regular page; the standalone page has its own sticky bar.
        standalone ? "pt-8 pb-16 sm:pt-12 sm:pb-20" : "py-16 sm:py-20"
      )}
    >
      {avatarCrop.dialog}

      {phase === "form" ? (
        <form
          onSubmit={onSubmitForm}
          noValidate
          className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-14"
        >
          {aside}
          <div className="space-y-3.5 lg:space-y-4">
            {aboutCollapsed && aboutDone ? aboutCompact : aboutSection}
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
            <div className="flex items-center gap-3">
              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreviewUrl} alt="" className="size-11 flex-none rounded-full object-cover" />
              ) : (
                <span
                  aria-hidden
                  className="flex size-11 flex-none items-center justify-center rounded-full bg-r-pri/15 text-lg text-r-text"
                >
                  {[...shownName][0] ?? ""}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-r-text">{shownName}</p>
                <p className="truncate text-[13px] text-r-text-3">
                  ติดต่อ: X · @{"handle" in handleCheck ? handleCheck.handle : contactHandle}
                  {discordHandle ? ` · Discord · ${discordHandle}` : ""}
                </p>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.08]">
              {items.map((item, index) => {
                const { credit, source } = creditOf(item);
                return (
                  <li key={item.key} className="flex items-center gap-3 py-2.5">
                    {thumb(item, index, "size-14")}
                    <div className="min-w-0">
                      <p className="text-sm text-r-text">รูปที่ {index + 1}</p>
                      {credit ? (
                        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-r-text-3">
                          <span className="flex-none">เครดิต:</span>
                          <CreditLine credit={credit} />
                          {source === "artist" ? <span className="flex-none">(คนวาด)</span> : null}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-white/[0.03] px-3 py-2.5 text-[12.5px] leading-relaxed text-r-text-2 ring-1 ring-white/[0.06] ring-inset">
              <Shield className="mt-0.5 size-3.5 flex-none text-r-acc" aria-hidden />
              ยินยอมให้นำไปใช้ตกแต่งคาเฟ่ และในโปรเจกต์วันเกิดของ Mild-R เท่านั้น
            </p>
            <div className="mt-5 space-y-2">
              {errorBox}
              <button type="button" onClick={onConfirm} disabled={running} className={BTN}>
                {running ? <Spinner className="size-4" /> : null}
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
              <p className="text-sm text-r-text" aria-live="polite">
                ส่งแล้ว {done} / {total} รูป
              </p>
              {failed ? <span className={cn("text-xs", ERROR_TEXT)}>พลาด {failed} รูป</span> : null}
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
                className="h-full bg-r-pri transition-[width] duration-300"
                style={{ width: `${((done + inFlight) / Math.max(1, total)) * 100}%` }}
              />
              {!running && failed ? (
                <div className="ml-auto h-full bg-[#ff8fb0]" style={{ width: `${(failed / total) * 100}%` }} />
              ) : null}
            </div>
            <ul className="mt-3.5 divide-y divide-white/[0.06]">
              {items.map((item, index) => (
                <li key={item.key} className="flex items-center gap-3 py-2.5">
                  {thumb(item, index, "size-12")}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-r-text">รูปที่ {index + 1}</p>
                    <p
                      className={cn(
                        "mt-0.5 flex items-center gap-1.5 text-[12.5px]",
                        item.send === "failed" ? ERROR_TEXT : "text-r-text-3"
                      )}
                    >
                      {item.send === "done" ? (
                        <Check className="size-4 flex-none text-r-acc" strokeWidth={3} aria-hidden />
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
                      className={cn(BTN_SMALL, "text-r-text-2 ring-1 ring-r-pri/60 ring-inset hover:ring-r-pri disabled:opacity-45")}
                    >
                      ลองใหม่
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-r-text-3">
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
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-r-acc/15 text-r-acc">
              <Check className="size-6" strokeWidth={3} aria-hidden />
            </span>
            <p role="status" className={cn(DISPLAY, "mt-4 text-xl text-r-text")}>
              ส่งแฟนอาร์ตแล้ว · {sentCount} รูป
            </p>
            <p className="mt-2 text-sm leading-[1.7] text-r-text-2">
              ทีมงานจะตรวจก่อนนำไปใช้ตกแต่งคาเฟ่
              <br />
              และในโปรเจกต์วันเกิดของ Mild-R
            </p>
            <div className="mt-6 space-y-2">
              <button type="button" onClick={sendMore} className={BTN}>
                <Upload className="size-4" aria-hidden />
                ส่งรูปเพิ่ม
              </button>
              {standalone ? null : (
                <Link href="/" className={BTN_OUTLINE}>
                  กลับหน้าแรก
                </Link>
              )}
            </div>
            <p className="mt-2.5 text-xs text-r-text-3">ชื่อ บัญชี X และเครดิตจะยังอยู่ ไม่ต้องกรอกใหม่</p>
          </section>
        </div>
      ) : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        {undo && phase === "form" ? (
          <div className="pointer-events-auto flex items-center gap-3.5 rounded-full bg-[#2a1820] py-2 pr-2 pl-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/12">
            <span className="text-[13.5px] whitespace-nowrap text-r-text">ลบรูปที่ {undo.index + 1} แล้ว</span>
            <button
              type="button"
              onClick={undoRemove}
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
    </div>
  );
}
