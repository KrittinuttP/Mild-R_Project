"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Download,
  Heart,
  ImageIcon,
  ListChecks,
  Pencil,
  PenLine,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { HbdCardCanvas } from "@/components/hbd/card-maker/HbdCardCanvas";
import { HbdCardDemo } from "@/components/hbd/card-maker/HbdCardDemo";
import type { HbdCardMakerResult } from "@/components/hbd/card-maker/HbdCardMaker";
import { AvatarPicker } from "@/components/upload/AvatarPicker";
import { UploadFormSkeleton } from "@/components/upload/UploadFormSkeleton";
import { useAvatarCrop } from "@/components/upload/useAvatarCrop";
import { checkImageFile, shrinkImageFile } from "@/lib/hbd-client-resize";
import {
  HBD_CARD_DEFAULT_STYLE,
  sanitizeStyle,
  styleLabel,
  type HbdCardContent,
  type HbdCardStyle,
} from "@/lib/hbd-card-maker";
import {
  formatHandleInput,
  handleForChannel,
  normalizeContactHandle,
} from "@/lib/lucky-draw";
import {
  HBD_AVATAR_DEFAULT,
  HBD_AVATAR_LIMITS,
  HBD_CARD_TEMPLATE,
  HBD_IMAGE_SIZES,
  HBD_TEXT_LIMITS,
  clampText,
  textLength,
  type HbdContactChannel,
} from "@/lib/hbd-upload";
import {
  R_CARD_CLASS,
  R_CTA_OUTLINE_CLASS,
  R_CTA_PRIMARY_CLASS,
  R_EYEBROW_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

/* Same look as the fan art upload page (CI A+). */
const DISPLAY = "font-[family-name:var(--font-display)]";
const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-r-acc";
const CARD = cn(R_CARD_CLASS, "p-5 sm:p-[22px]");
const INPUT =
  "h-12 w-full rounded-xl bg-white/[0.04] px-4 text-[15px] text-r-text ring-1 ring-white/[0.16] outline-none ring-inset placeholder:text-r-text-2/45 focus:ring-r-pri/60 aria-[invalid=true]:ring-[#ffa062]";
const BTN = cn(R_CTA_PRIMARY_CLASS, "w-full");
const BTN_OUTLINE = cn(R_CTA_OUTLINE_CLASS, "w-full");
const LINK_BTN = cn(
  "inline-flex min-h-8 items-center gap-1.5 rounded-md text-[13.5px] text-r-pri transition-colors hover:text-r-pri-hover",
  FOCUS
);
const HINT = "text-[13px] text-r-text-3";
const LABEL = "block text-[0.90625rem] text-r-text";
const ERROR_TEXT = "text-[#ffa062]";

const EYEBROW = "Birthday · 12 Dec 2026";
const MISSING_SUMMARY = "ยังส่งไม่ได้ — กรุณากรอกช่องที่มี * ให้ครบ";
/** นายท่านกำหนดประโยคนี้เอง — ห้ามเปลี่ยน (decisions.md) */
const CONTACT_HINT = "จะใช้ช่องทางนี้ติดต่อกลับ ในกรณีที่มีปัญหา";

/** The card editor (modal / full screen) loads only when someone opens it. */
const HbdCardMaker = dynamic(
  () => import("@/components/hbd/card-maker/HbdCardMaker").then((m) => m.HbdCardMaker),
  { ssr: false }
);

/** Sample text on the "ทำการ์ดบนเว็บ" panel before anything is typed. */
const CARD_SAMPLE_MESSAGE = "สุขสันต์วันเกิดนะมายด์ ขอให้มีความสุขมากๆ ฮันนี่อยู่ข้างๆ เสมอเลย";

type CardMode = "web" | "upload";

const HBD_FORM_CACHE_KEY = "mild-r-hbd-upload-draft";
/** Set once the "วิธีส่ง" screen was read → next visit opens the form directly. */
const HBD_INTRO_SEEN_KEY = "mild-r-hbd-upload-intro-seen";

/** "วิธีส่ง" screen · short steps; step 1 carries the template download. */
/** "วิธีส่ง": the two ways to make a card, shown side by side (same look: this is not a picker). */
const HOW_WEB_STEPS = ["พิมพ์คำอวยพรลงการ์ด", "เลือก Font · สี · ขนาด", "กด “ใช้การ์ดนี้” เสร็จเลย"] as const;
const HOW_UPLOAD_STEPS = [
  "Download template",
  "แต่งในแอปที่ถนัด (Canva, Ibis Paint …)",
  "Upload รูปการ์ดกลับมา (.jpg .png ไม่เกิน 20 MB)",
] as const;

const HOW_FAQ = [
  {
    q: "ต้องใช้ Template ของโปรเจกต์ไหม?",
    a: "ต้องใช้ค่ะ เลือก \"ทำการ์ดบนเว็บ\" แล้วพิมพ์ลง Template ได้เลย หรือ Download template ไปแต่งในแอปที่ถนัด แล้ว Upload รูปการ์ดกลับมา",
  },
  {
    q: "ต้องใส่รูปโปรไฟล์กับข้อความถึงมายด์ไหม?",
    a: "ไม่บังคับค่ะ ถ้าไม่ใส่รูปโปรไฟล์ จะใช้รูปเริ่มต้นแทน",
  },
  {
    q: "ส่งแล้วการ์ดขึ้นเว็บเลยไหม?",
    a: "ยังค่ะ ทีมงานจะตรวจการ์ดก่อน ผ่านแล้วการ์ดจะขึ้นในหน้าคำอวยพร",
  },
  {
    q: "ช่องทางติดต่อเอาไปใช้ทำอะไร?",
    a: "จะใช้ช่องทางนี้ติดต่อกลับ ในกรณีที่มีปัญหาค่ะ",
  },
] as const;

function readIntroSeen() {
  try {
    return localStorage.getItem(HBD_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeIntroSeen() {
  try {
    localStorage.setItem(HBD_INTRO_SEEN_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

const SECTION_KEYS = ["card", "about", "contact"] as const;

type Phase = "intro" | "form" | "preview" | "done";

type CachedFormFields = {
  displayName: string;
  message: string;
  contactChannel: HbdContactChannel;
  contactHandle: string;
  /** Card mode last picked; the next visit opens on it. */
  cardMode: CardMode;
  cardStyle: HbdCardStyle;
  /** Text on the web card (restored into the editor). */
  cardText: string;
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
        typeof parsed.contactHandle === "string" && parsed.contactHandle.trim() !== "@"
          ? parsed.contactHandle
          : "",
      cardMode: parsed.cardMode === "upload" ? "upload" : "web",
      cardStyle: sanitizeStyle(parsed.cardStyle),
      cardText: typeof parsed.cardText === "string" ? parsed.cardText : "",
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

function revokeUrl(url?: string) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function channelLabel(channel: HbdContactChannel) {
  return channel === "x" ? "X" : "Discord";
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
const HOW_NUM =
  "flex size-[22px] flex-none items-center justify-center rounded-full bg-r-pri text-xs font-bold text-r-on-pri";

/** One way to make a card on "วิธีส่ง". Rows line up across the two (grid subgrid on sm+). */
function HowMethod({
  icon,
  title,
  badge,
  frameLabel,
  preview,
  steps,
  tags,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
  frameLabel: string;
  preview: ReactNode;
  steps: ReadonlyArray<string>;
  tags: ReadonlyArray<string>;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[18px] bg-black/[0.22] p-4 ring-1 ring-white/10 ring-inset sm:row-span-4 sm:grid sm:grid-rows-subgrid sm:gap-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-r-pri/14 text-r-pri">{icon}</span>
        <h3 className="min-w-0 flex-1 text-[1.0625rem] font-normal text-r-text">{title}</h3>
        <span className="flex-none rounded-full bg-r-acc/15 px-2.5 py-0.5 text-[11.5px] text-r-acc">{badge}</span>
      </div>
      <div className="flex flex-col gap-2 rounded-xl bg-[#1a0d12] p-2.5 ring-1 ring-white/10 ring-inset">
        <span aria-hidden className="flex items-center gap-1.5 text-[11.5px] text-r-text-3">
          <span className="size-1.5 rounded-full bg-r-text-2/35" />
          <span className="size-1.5 rounded-full bg-r-text-2/35" />
          <span className="ml-1">{frameLabel}</span>
        </span>
        {preview}
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-r-text">
            <span
              aria-hidden
              className="flex size-5 flex-none items-center justify-center rounded-full text-[11px] font-bold text-r-pri ring-[1.5px] ring-r-pri ring-inset"
            >
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap content-end gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-[11.5px] text-r-text-2">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepTitle({
  n,
  id,
  done,
  required = false,
  children,
  aside,
}: {
  n: number;
  id: string;
  done: boolean;
  required?: boolean;
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
            done ? "bg-r-acc text-r-on-acc" : "text-r-text-2 ring-[1.5px] ring-r-text-2/40 ring-inset"
          )}
        >
          {n}
        </span>
        <span>
          {children}
          {required ? <span className="text-r-pri"> *</span> : null}
        </span>
      </h2>
      {aside}
    </div>
  );
}

function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className={cn("mt-2 flex items-start gap-1.5 text-[13px] leading-relaxed", ERROR_TEXT)}>
      <AlertCircle className="mt-0.5 size-[15px] flex-none" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Alert box above a primary button (missing fields, send errors). */
function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl bg-[#ffa062]/10 px-4 py-3 text-sm text-r-text ring-1 ring-[#ffa062]/35 ring-inset"
    >
      <AlertCircle className={cn("mt-0.5 size-4 flex-none", ERROR_TEXT)} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

type HbdUploadClientProps = {
  /** /upload/hbd/send: no way back to the site, only "send another card". */
  standalone?: boolean;
  /** Cards sent so far (pending + approved), shown on the sent-list button. */
  sentCount?: number;
};

/** Pill to the sent list (same look as the one on /upload/hbd). */
const SENT_PILL = cn(
  "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[13.5px] text-r-text-2 ring-1 ring-r-text-2/35 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
  FOCUS
);

export function HbdUploadClient({ standalone = false, sentCount = 0 }: HbdUploadClientProps) {
  // Standalone (/upload/hbd/send) links stay inside /upload/hbd: no way into the main site.
  const sentHref = standalone ? "/upload/hbd/sent" : "/hbd/2026/sent";
  const ids = useId();
  const [phase, setPhase] = useState<Phase>("intro");
  const [loading, setLoading] = useState(false);
  /** Set after "ตรวจสอบก่อนส่ง" with missing fields; each field error clears once it is filled. */
  const [showMissing, setShowMissing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [contactChannel, setContactChannel] = useState<HbdContactChannel>("x");
  const [contactHandle, setContactHandle] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardMode, setCardMode] = useState<CardMode>("web");
  const [cardStyle, setCardStyle] = useState<HbdCardStyle>(HBD_CARD_DEFAULT_STYLE);
  /** The card in the form was made with "ทำการ์ดบนเว็บ" (not a picked file). */
  const [cardFromWeb, setCardFromWeb] = useState(false);
  /**
   * Text typed on the web card. Kept apart from "ฝากข้อความถึงมายด์" (the note under
   * the card), so the same words never show twice; saved in the draft for "แก้ไขการ์ด".
   */
  const [cardText, setCardText] = useState("");
  const [makerOpen, setMakerOpen] = useState(false);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>();
  const [cacheReady, setCacheReady] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  /** FAQ on the "วิธีส่ง" screen: one answer open at a time. */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const cardInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  /** Live blob URLs — revoke only on replace / explicit clear / unmount (not Strict Mode re-run). */
  const cardUrlRef = useRef<string | undefined>(undefined);
  const avatarUrlRef = useRef<string | undefined>(undefined);
  const cardFileRef = useRef<File | null>(null);
  const avatarFileRef = useRef<File | null>(null);
  /** Avatar taken away a moment ago, kept while "เลิกทำ" is on screen. */
  const removedAvatarRef = useRef<{ file: File; url: string } | null>(null);
  const avatarCrop = useAvatarCrop({
    maxEdge: HBD_IMAGE_SIZES.avatarClientMaxEdge,
    maxBytes: HBD_AVATAR_LIMITS.maxBytes,
    onCropped: (file) => setAvatarMedia(file, URL.createObjectURL(file)),
  });

  useEffect(() => {
    const cached = readFormCache();
    if (cached) {
      setDisplayName(cached.displayName);
      setMessage(cached.message);
      setContactChannel(cached.contactChannel);
      setContactHandle(cached.contactHandle);
      setCardMode(cached.cardMode);
      setCardStyle(cached.cardStyle);
      setCardText(cached.cardText);
    }
    if (readIntroSeen()) setPhase("form");
    setCacheReady(true);
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    writeFormCache({ displayName, message, contactChannel, contactHandle, cardMode, cardStyle, cardText });
  }, [displayName, message, contactChannel, contactHandle, cardMode, cardStyle, cardText, cacheReady]);

  useEffect(() => {
    return () => {
      revokeUrl(cardUrlRef.current);
      revokeUrl(avatarUrlRef.current);
      revokeUrl(removedAvatarRef.current?.url);
    };
  }, []);

  // Leaving mid-send would lose the card.
  useEffect(() => {
    if (!loading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [loading]);

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
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
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
    setCardFromWeb(false);
    setCardText("");
    setAvatarMedia(null, undefined);
    dropRemovedAvatar();
    avatarCrop.clear();
    if (cardInputRef.current) cardInputRef.current.value = "";
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function scrollToSection(index: number, focusId?: string) {
    document
      .getElementById(`${ids}-${SECTION_KEYS[index]}-section`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }

  function showIntro() {
    if (loading) return;
    setSendError(null);
    setPhase("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startForm() {
    writeIntroSeen();
    setPhase("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Step list: from the review page or "วิธีส่ง" it goes back to the form first. */
  function goToSection(index: number) {
    if (phase === "preview" || phase === "intro") {
      if (loading) return;
      setSendError(null);
      setPhase("form");
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToSection(index)));
      return;
    }
    scrollToSection(index);
  }

  async function onCardChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    setCardError(null);
    if (!file) return;

    if (file.size > HBD_CARD_TEMPLATE.maxSourceBytes) {
      setCardError("ไฟล์การ์ดใหญ่เกินไป (ไม่เกิน 20 MB)");
      input.value = "";
      return;
    }
    // Wrong type or a file the browser cannot open: say so now, not after "ยืนยันส่ง".
    const problem = await checkImageFile(file, HBD_CARD_TEMPLATE.accept);
    if (problem) {
      setCardError(problem);
      input.value = "";
      return;
    }

    setCardFromWeb(false);
    setCardMedia(file, URL.createObjectURL(file));
  }

  function openMaker() {
    setMakerOpen(true);
  }

  /** "ใช้การ์ดนี้" in the card editor: the made card becomes the form's card file. */
  function onMakerDone(result: HbdCardMakerResult) {
    setCardError(null);
    setCardMedia(result.file, URL.createObjectURL(result.file));
    setCardFromWeb(true);
    setCardStyle(result.style);
    setMakerOpen(false);
    // The name fills step 2; the card text stays on the card only.
    if (result.name) setDisplayName(clampText(result.name, HBD_TEXT_LIMITS.nameMax));
    setCardText(result.message);
  }

  function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setAvatarError(null);
    if (!file) return;

    if (file.size > HBD_AVATAR_LIMITS.maxSourceBytes) {
      setAvatarError("ไฟล์รูปโปรไฟล์ใหญ่เกินไป (ไม่เกิน 10 MB)");
      event.target.value = "";
      return;
    }
    if (!HBD_AVATAR_LIMITS.accept.split(",").includes(file.type)) {
      setAvatarError("รูปโปรไฟล์รองรับเฉพาะ JPEG · PNG · WebP");
      event.target.value = "";
      return;
    }

    // Picking the same photo again must still open the cropper.
    event.target.value = "";
    avatarCrop.start(file);
  }

  function clearCard() {
    setCardError(null);
    setCardMedia(null, undefined);
    setCardFromWeb(false);
    if (cardInputRef.current) cardInputRef.current.value = "";
  }

  function dropRemovedAvatar() {
    revokeUrl(removedAvatarRef.current?.url);
    removedAvatarRef.current = null;
  }

  /** "เอารูปออก": keep the photo for a few seconds so "เลิกทำ" can bring it back. */
  function removeAvatar() {
    dropRemovedAvatar();
    const file = avatarFileRef.current;
    const url = avatarUrlRef.current;
    if (file && url) {
      removedAvatarRef.current = { file, url };
      avatarUrlRef.current = undefined; // not revoked by setAvatarMedia below
    }
    setAvatarError(null);
    setAvatarMedia(null, undefined);
    avatarCrop.clear();
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function undoRemoveAvatar() {
    const removed = removedAvatarRef.current;
    if (!removed) return;
    removedAvatarRef.current = null;
    setAvatarMedia(removed.file, removed.url);
  }

  const cardMissing = !cardFile || !cardPreviewUrl;
  const nameMissing = !displayName.trim();
  // "@" alone (added for X) counts as empty.
  const contactMissing = !normalizeContactHandle(contactHandle);
  const anyMissing = cardMissing || nameMissing || contactMissing;

  function onSubmitForm(event: FormEvent) {
    event.preventDefault();
    if (anyMissing) {
      setShowMissing(true);
      if (cardMissing) scrollToSection(0, `${ids}-card-pick`);
      else if (nameMissing) scrollToSection(1, `${ids}-name`);
      else scrollToSection(2, `${ids}-handle`);
      return;
    }
    setShowMissing(false);
    setSendError(null);
    setPhase("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onConfirm() {
    const file = cardFileRef.current ?? cardFile;
    if (!file) {
      setSendError("ไม่พบไฟล์การ์ด — กรุณาแก้ไขแล้วอัปโหลดใหม่");
      return;
    }

    setLoading(true);
    setSendError(null);

    try {
      const card = await shrinkImageFile(file, {
        maxEdge: HBD_IMAGE_SIZES.cardMaxEdge,
        maxBytes: HBD_CARD_TEMPLATE.maxBytes,
      });
      const avatarSource = avatarFileRef.current ?? avatarFile;
      const avatar = avatarSource
        ? await shrinkImageFile(avatarSource, {
            maxEdge: HBD_IMAGE_SIZES.avatarClientMaxEdge,
            maxBytes: HBD_AVATAR_LIMITS.maxBytes,
          })
        : null;

      if (card.size > HBD_CARD_TEMPLATE.maxBytes) {
        setSendError("ไฟล์การ์ดใหญ่เกินไปหลังย่อ — ลองบันทึกเป็น JPEG แล้วอัปใหม่");
        return;
      }
      if (avatar && avatar.size > HBD_AVATAR_LIMITS.maxBytes) {
        setSendError("ไฟล์รูปโปรไฟล์ใหญ่เกินไปหลังย่อ — ลองใช้รูปอื่น");
        return;
      }

      const body = new FormData();
      body.set("displayName", displayName.trim());
      body.set("message", message.trim());
      body.set("contactChannel", contactChannel);
      body.set("contactHandle", contactHandle.trim());
      body.set("card", card);
      if (avatar) body.set("avatar", avatar);

      const res = await fetch("/api/hbd/submit", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setSendError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่");
        return;
      }

      clearFormCache();
      setDisplayName("");
      setMessage("");
      setContactHandle("");
      setContactChannel("x");
      clearMedia();

      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSendError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    clearFormCache();
    setPhase("form");
    setShowMissing(false);
    setCardError(null);
    setAvatarError(null);
    setSendError(null);
    setDisplayName("");
    setMessage("");
    setContactHandle("");
    setContactChannel("x");
    clearMedia();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFormData() {
    resetForm();
    setClearConfirmOpen(false);
  }

  const avatarSrc = avatarPreviewUrl ?? HBD_AVATAR_DEFAULT;
  const handleShown = contactHandle.trim();
  const cardMessage =
    cardError ??
    (showMissing && cardMissing
      ? cardMode === "web"
        ? "กรุณาทำการ์ดก่อน กด เริ่มทำการ์ด"
        : "กรุณาอัปโหลดรูปการ์ดจากเทมเพลต"
      : null);
  const nameMessage = showMissing && nameMissing ? "กรุณากรอกชื่อที่แสดง" : null;
  const contactMessage = showMissing && contactMissing
      ? contactChannel === "x"
        ? "กรุณากรอกชื่อบัญชี X"
        : "กรุณากรอกชื่อผู้ใช้ Discord"
      : null;

  const steps = [
    {
      title: "การ์ดอวยพร",
      sub: cardFile
        ? cardFromWeb
          ? `ทำบนเว็บ · ${styleLabel(cardStyle)}`
          : cardFile.name
        : cardMode === "web"
          ? "ทำบนเว็บ"
          : "อัปโหลดเอง",
      done: !cardMissing,
    },
    { title: "ชื่อและข้อความ", sub: displayName.trim(), done: !nameMissing },
    {
      title: "ช่องทางติดต่อ",
      sub: contactMissing ? "" : `${channelLabel(contactChannel)} · ${handleShown}`,
      done: !contactMissing,
    },
  ];

  const header = (align: "left" | "center" = "left") => (
    <header className={align === "center" ? "text-center" : undefined}>
      <p className={cn(R_EYEBROW_CLASS, align === "center" && "mx-auto")}>{EYEBROW}</p>
      <h1 className={cn(DISPLAY, "mt-2.5 text-[1.875rem] leading-tight font-normal text-r-text sm:text-[2.125rem]")}>
        ส่งการ์ดอวยพร
      </h1>
      <p className={cn("mt-3 text-[0.9375rem] leading-relaxed text-r-text-2", align === "center" && "mx-auto max-w-md")}>
        เชิญชวนฮันนี่มาอวยพรวันเกิดให้ mutant สาวของเรา
      </p>
    </header>
  );

  const templateLink = (
    <a
      href={HBD_CARD_TEMPLATE.path}
      download={HBD_CARD_TEMPLATE.filename}
      className={cn(
        "inline-flex min-h-8 flex-none items-center gap-1.5 rounded-md text-[13.5px] text-r-text-2 hover:text-r-text lg:hidden",
        FOCUS
      )}
    >
      <Download className="size-[15px]" aria-hidden />
      เทมเพลต
    </a>
  );

  const aside = (
    <aside
      className={cn(
        // Below lg only the back link + header show; the hidden nav/template card would still add space-y margin.
        "space-y-6 max-lg:[&>header]:mb-0 lg:sticky lg:space-y-4",
        standalone ? "lg:top-[88px]" : "lg:top-24"
      )}
    >
      <Link
        href={standalone ? "/upload/hbd" : "/hbd/2026"}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-r-text-2 ring-1 ring-r-text-2/20 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
          FOCUS
        )}
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {standalone ? "หน้าแรก" : "คำอวยพร"}
      </Link>
      {header()}
      <nav aria-label="ขั้นตอนการกรอก" className="-ml-3 hidden space-y-1 lg:block">
        <button
          type="button"
          onClick={showIntro}
          aria-current={phase === "intro" ? "step" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
            FOCUS,
            phase === "intro" ? "bg-r-pri/[0.09] shadow-[inset_2px_0_0_var(--r-pri)]" : "hover:bg-white/[0.03]"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-[26px] flex-none items-center justify-center rounded-full transition-colors",
              phase === "intro" ? "bg-r-pri text-r-on-pri" : "text-r-text-2 ring-[1.5px] ring-r-text-2/40 ring-inset"
            )}
          >
            <BookOpen className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className={cn("block text-[15px]", phase === "intro" ? "text-r-text" : "text-r-text/85")}>
              วิธีส่ง
            </span>
            <span className="block truncate text-xs text-r-text-3">2 แบบ · เลือกที่ถนัด</span>
          </span>
        </button>
        {steps.map((step, index) => {
          const current = phase === "form" && activeSection === index;
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
                {step.sub ? <span className="block truncate text-xs text-r-text-3">{step.sub}</span> : null}
              </span>
            </button>
          );
        })}
      </nav>
      <Link href={sentHref} prefetch={false} className={cn(SENT_PILL, "max-lg:mt-4")}>
        <ListChecks className="size-4 flex-none" aria-hidden />
        <span>
          ฮันนี่ที่ส่งการ์ดแล้ว
          {sentCount > 0 ? (
            <>
              {" · "}
              <span className="font-semibold text-[#ff6b9a] tabular-nums">{sentCount}</span> คน
            </>
          ) : null}
        </span>
      </Link>
      {phase === "form" ? (
        <div className={cn(R_CARD_CLASS, "hidden p-4 lg:block")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HBD_CARD_TEMPLATE.path}
            alt="ตัวอย่างเทมเพลตการ์ดอวยพร"
            className="h-auto w-full rounded-xl shadow-[0_14px_34px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
          />
          <a
            href={HBD_CARD_TEMPLATE.path}
            download={HBD_CARD_TEMPLATE.filename}
            className={cn(BTN_OUTLINE, "mt-3.5 h-11")}
          >
            <Download className="size-4" aria-hidden />
            Download template
          </a>
        </div>
      ) : null}
    </aside>
  );

  const intro = (
    <div className="space-y-3.5 lg:space-y-4">
      <section className={CARD} aria-labelledby={`${ids}-how`}>
        <h2 id={`${ids}-how`} className={cn(DISPLAY, "text-xl font-normal text-r-text sm:text-[1.375rem]")}>
          ส่งการ์ดได้ 2 แบบ
        </h2>
        <p className={cn(HINT, "mt-1.5")}>เลือกแบบที่ถนัดได้ตอนกรอกฟอร์ม · ทุกการ์ดใช้ Template เดียวกัน</p>

        {/* Same frame for both: this explains the two ways, it is not a picker. */}
        <div className="mt-5 grid gap-3.5 sm:grid-cols-2 sm:grid-rows-[auto_auto_auto_1fr]">
          <HowMethod
            icon={<PenLine className="size-[18px]" aria-hidden />}
            title="ทำการ์ดบนเว็บ"
            badge="Easy"
            frameLabel="Live preview"
            preview={<HbdCardDemo />}
            steps={HOW_WEB_STEPS}
            tags={["ไม่ต้องใช้แอป", "ทำบนมือถือได้"]}
          />
          <HowMethod
            icon={<Upload className="size-[18px]" aria-hidden />}
            title="แต่งเองแล้ว Upload"
            badge="Custom"
            frameLabel="Card template"
            preview={
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HBD_CARD_TEMPLATE.path}
                  alt="Template การ์ดอวยพร"
                  className="h-auto w-full rounded-lg ring-1 ring-white/10"
                />
                <span className="flex h-8 items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 text-[12px] text-r-text-2">
                  <span className="min-w-0 flex-1 truncate">{HBD_CARD_TEMPLATE.filename}</span>
                  <span className="text-r-text-3">PNG</span>
                </span>
                <a
                  href={HBD_CARD_TEMPLATE.path}
                  download={HBD_CARD_TEMPLATE.filename}
                  className={cn(R_CTA_OUTLINE_CLASS, "mt-auto h-10 w-full px-4 text-sm whitespace-nowrap")}
                >
                  <Download className="size-4" aria-hidden />
                  Download template
                </a>
              </>
            }
            steps={HOW_UPLOAD_STEPS}
            tags={["แต่งได้เต็มที่", "ใช้แอปไหนก็ได้"]}
          />
        </div>

        <div className="mt-3.5 rounded-2xl bg-white/[0.03] px-4 py-3.5 ring-1 ring-white/[0.08] ring-inset">
          <p className="text-[12.5px] text-r-text-3">จากนั้นเหมือนกันทั้ง 2 แบบ</p>
          <ol className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <li className="flex items-center gap-2 text-[13.5px] text-r-text">
              <span aria-hidden className={HOW_NUM}>2</span>
              ใส่ชื่อ + ฝากข้อความถึงมายด์ <span className="text-r-text-3">(ไม่ใส่ก็ได้)</span>
            </li>
            <li aria-hidden className="hidden text-r-text-3 sm:block">→</li>
            <li className="flex items-center gap-2 text-[13.5px] text-r-text">
              <span aria-hidden className={HOW_NUM}>3</span>
              ใส่ X หรือ Discord แล้วกดส่ง
            </li>
          </ol>
        </div>
      </section>

      <section className={CARD} aria-labelledby={`${ids}-faq`}>
        <h2 id={`${ids}-faq`} className={cn(DISPLAY, "text-lg font-normal text-r-text")}>
          คำถามที่พบบ่อย
        </h2>
        <div className="mt-3 divide-y divide-white/[0.08]">
          {HOW_FAQ.map((item, index) => (
            <details key={item.q} open={openFaq === index} className="group py-3">
              <summary
                onClick={(event) => {
                  // Opening one answer closes the others.
                  event.preventDefault();
                  setOpenFaq((current) => (current === index ? null : index));
                }}
                className={cn(
                  "flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-[15px] text-r-text [&::-webkit-details-marker]:hidden",
                  FOCUS
                )}
              >
                {item.q}
                <span aria-hidden className="text-r-text-3 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-[1.7] text-r-text-2">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="pt-1.5">
        <button type="button" onClick={startForm} className={cn(R_CTA_PRIMARY_CLASS, "w-full sm:w-auto sm:px-8")}>
          เริ่มทำการ์ด
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  const cardSample = useMemo<HbdCardContent>(
    () => ({
      message: cardText.trim() || CARD_SAMPLE_MESSAGE,
      name: displayName.trim() || "ฮันนี่",
      style: cardStyle,
    }),
    [cardText, displayName, cardStyle]
  );

  const modeTabs: { id: CardMode; title: string; desc: string; icon: ReactNode; badge?: string }[] = [
    {
      id: "web",
      title: "ทำการ์ดบนเว็บ",
      desc: "พิมพ์คำอวยพรลง Template ได้เลย ไม่ต้องใช้แอป",
      icon: <PenLine className="size-[18px]" aria-hidden />,
      badge: "Easy",
    },
    {
      id: "upload",
      title: "แต่งเองแล้ว Upload",
      desc: "Download template ไปแต่ง แล้ว Upload รูปกลับมา",
      icon: <Upload className="size-[18px]" aria-hidden />,
    },
  ];

  const cardSection = (
    <section
      id={`${ids}-card-section`}
      className={cn(CARD, "scroll-mt-24")}
      aria-labelledby={`${ids}-card`}
    >
      <StepTitle
        n={1}
        id={`${ids}-card`}
        done={!cardMissing}
        required
        aside={(cardFile ? !cardFromWeb : cardMode === "upload") ? templateLink : undefined}
      >
        การ์ดอวยพร
      </StepTitle>
      <input
        ref={cardInputRef}
        type="file"
        accept={HBD_CARD_TEMPLATE.accept}
        onChange={(event) => void onCardChange(event)}
        className="sr-only"
        tabIndex={-1}
      />
      {cardPreviewUrl && cardFile ? (
        <div className="mt-4 rounded-2xl bg-black/20 p-3 ring-1 ring-white/[0.08] ring-inset">
          <div className="flex justify-center overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardPreviewUrl}
              alt="การ์ดอวยพรที่เลือก"
              className="h-auto max-h-[min(70vh,36rem)] w-auto max-w-full object-contain"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              {cardFromWeb ? (
                <PenLine className="size-[17px] flex-none text-r-acc" aria-hidden />
              ) : (
                <ImageIcon className="size-[17px] flex-none text-r-acc" aria-hidden />
              )}
              <span className="truncate text-[13.5px] text-r-text">
                {cardFromWeb ? `การ์ดจากเว็บ · ${styleLabel(cardStyle)}` : cardFile.name}
              </span>
            </span>
            <span className="flex gap-4 max-sm:w-full">
              {cardFromWeb ? (
                <button type="button" onClick={openMaker} className={LINK_BTN}>
                  <Pencil className="size-3.5" aria-hidden />
                  แก้ไขการ์ด
                </button>
              ) : (
                <button type="button" onClick={() => cardInputRef.current?.click()} className={LINK_BTN}>
                  <Upload className="size-3.5" aria-hidden />
                  เลือกไฟล์ใหม่
                </button>
              )}
              <button type="button" onClick={clearCard} className={cn(LINK_BTN, "text-r-text-2 hover:text-r-text")}>
                <X className="size-3.5" aria-hidden />
                {cardFromWeb ? "ล้างการ์ด" : "ล้างรูปการ์ด"}
              </button>
            </span>
          </div>
        </div>
      ) : (
        <>
          <p className={cn(HINT, "mt-1.5")}>เลือกได้ 2 แบบ · เปลี่ยนได้ตลอด</p>
          <div
            role="radiogroup"
            aria-label="วิธีทำการ์ด"
            className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          >
            {modeTabs.map((tab) => {
              const active = cardMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setCardMode(tab.id);
                    setCardError(null);
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors",
                    active
                      ? "bg-r-pri/[0.12] ring-[1.5px] ring-r-pri/70 ring-inset"
                      : "bg-black/[0.14] ring-1 ring-white/[0.08] ring-inset hover:bg-black/[0.22]",
                    FOCUS
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-[18px] flex-none items-center justify-center rounded-full ring-[1.5px] ring-inset",
                      active ? "ring-r-pri" : "ring-r-text-3/60"
                    )}
                  >
                    {active ? <span className="size-2 rounded-full bg-r-pri" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("flex-none", active ? "text-r-pri" : "text-r-text-2")}>{tab.icon}</span>
                      <span className="text-[15px] text-r-text">{tab.title}</span>
                      {tab.badge ? (
                        <span className="rounded-full bg-r-acc/15 px-2 py-0.5 text-[11.5px] text-r-acc">
                          {tab.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-r-text-3">{tab.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {cardMode === "web" ? (
            <div
              className={cn(
                "mt-3 grid gap-4 rounded-2xl bg-black/[0.22] p-3.5 ring-1 ring-inset sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:items-center sm:p-4",
                cardMessage ? "ring-[#ffa062]/70" : "ring-white/[0.08]"
              )}
            >
              <HbdCardCanvas
                content={cardSample}
                label="ตัวอย่างการ์ดที่ทำบนเว็บ"
                className="overflow-hidden rounded-xl"
              />
              <div className="flex flex-col gap-3">
                <ul className="flex flex-col gap-1.5 text-[13.5px] text-r-text-2">
                  {["พิมพ์คำอวยพร เลือก Font กับสี", "ตัวอักษรพอดีกรอบเสมอ", "ใช้ชื่อที่แสดงเป็นลายเซ็นให้"].map(
                    (line) => (
                      <li key={line} className="flex items-start gap-2">
                        <Check className="mt-[3px] size-3.5 flex-none text-r-acc" aria-hidden />
                        {line}
                      </li>
                    )
                  )}
                </ul>
                <button
                  id={`${ids}-card-pick`}
                  type="button"
                  onClick={openMaker}
                  aria-describedby={cardMessage ? `${ids}-card-error` : undefined}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-r-pri px-5 text-[15px] font-semibold text-r-on-pri transition-[filter] hover:brightness-110",
                    FOCUS
                  )}
                >
                  <PenLine className="size-4" aria-hidden />
                  เริ่มทำการ์ด
                </button>
              </div>
            </div>
          ) : (
        <button
          id={`${ids}-card-pick`}
          type="button"
          onClick={() => cardInputRef.current?.click()}
          aria-describedby={cardMessage ? `${ids}-card-error` : undefined}
          className={cn(
            "mt-4 flex w-full flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed bg-r-pri/[0.04] px-4 py-9 text-r-text transition-colors hover:border-r-pri/75 sm:py-11",
            cardMessage ? "border-[#ffa062]" : "border-r-pri/45",
            FOCUS
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-r-pri/14 text-r-pri">
            <Upload className="size-5" aria-hidden />
          </span>
          <span className="text-[15px]">เลือกไฟล์การ์ด</span>
          <span className="text-[12.5px] text-r-text-3">JPEG · PNG · WebP · ไม่เกิน 20 MB</span>
        </button>
          )}
        </>
      )}
      {cardMessage ? <FieldError id={`${ids}-card-error`}>{cardMessage}</FieldError> : null}
    </section>
  );

  const aboutSection = (
    <section
      id={`${ids}-about-section`}
      className={cn(CARD, "scroll-mt-24")}
      aria-labelledby={`${ids}-about`}
    >
      <StepTitle n={2} id={`${ids}-about`} done={!nameMissing}>
        ชื่อและข้อความ
      </StepTitle>
      <input
        ref={avatarInputRef}
        type="file"
        accept={HBD_AVATAR_LIMITS.accept}
        onChange={onAvatarChange}
        className="sr-only"
        tabIndex={-1}
      />
      <div className="mt-5 flex items-start gap-4">
        <div className="pt-[22px]">
          <AvatarPicker
            src={avatarPreviewUrl ?? null}
            placeholderSrc={HBD_AVATAR_DEFAULT}
            onPick={() => avatarInputRef.current?.click()}
            onRemove={removeAvatar}
            onUndoRemove={undoRemoveAvatar}
            onRemoveSettled={dropRemovedAvatar}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${ids}-name`} className={LABEL}>
            ชื่อที่แสดง<span className="text-r-pri"> *</span>
          </label>
          <input
            id={`${ids}-name`}
            value={displayName}
            autoComplete="nickname"
            onChange={(event) => setDisplayName(clampText(event.target.value, HBD_TEXT_LIMITS.nameMax))}
            placeholder="เช่น ฮันนี่"
            aria-invalid={Boolean(nameMessage)}
            aria-describedby={nameMessage ? `${ids}-name-error` : undefined}
            className={cn(INPUT, "mt-2")}
          />
          {nameMessage ? <FieldError id={`${ids}-name-error`}>{nameMessage}</FieldError> : null}
        </div>
      </div>
      {avatarPreviewUrl ? null : <p className={cn(HINT, "mt-2")}>รูปโปรไฟล์ · ไม่บังคับ</p>}
      {avatarError ? <FieldError>{avatarError}</FieldError> : null}
      <div className="mt-[18px]">
        <label htmlFor={`${ids}-message`} className={LABEL}>
          <span className="flex items-baseline justify-between gap-3">
            <span>
              ฝากข้อความถึงมายด์<span className="ml-2 text-[12.5px] text-r-text-3">ไม่บังคับ</span>
            </span>
            {textLength(message) > HBD_TEXT_LIMITS.messageMax * 0.8 ? (
              <span className="text-[12.5px] text-r-text-3 tabular-nums">
                {textLength(message).toLocaleString("en-US")}/{HBD_TEXT_LIMITS.messageMax.toLocaleString("en-US")}
              </span>
            ) : null}
          </span>
        </label>
        <textarea
          id={`${ids}-message`}
          value={message}
          onChange={(event) => setMessage(clampText(event.target.value, HBD_TEXT_LIMITS.messageMax))}
          rows={4}
          placeholder="อยากบอกอะไรมายด์อาร์…"
          className={cn(INPUT, "mt-2 h-auto resize-y py-3 leading-relaxed")}
        />
      </div>
    </section>
  );

  const contactSection = (
    <section
      id={`${ids}-contact-section`}
      className={cn(CARD, "scroll-mt-24")}
      aria-labelledby={`${ids}-contact`}
    >
      <StepTitle n={3} id={`${ids}-contact`} done={!contactMissing} required>
        ช่องทางติดต่อ
      </StepTitle>
      <p id={`${ids}-contact-hint`} className={cn(HINT, "mt-1.5 leading-relaxed")}>
        {CONTACT_HINT}
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div
          role="group"
          aria-label="ช่องทางติดต่อ"
          className="flex flex-none gap-1 rounded-full bg-black/25 p-1 ring-1 ring-white/[0.08] ring-inset sm:w-[200px]"
        >
          {(["x", "discord"] as const).map((channel) => (
            <button
              key={channel}
              type="button"
              aria-pressed={contactChannel === channel}
              onClick={() => {
                setContactChannel(channel);
                // Switching channel keeps what was typed; an empty field stays empty so the example shows.
                setContactHandle((handle) =>
                  handle.trim() === "" || handle.trim() === "@" ? "" : handleForChannel(handle, channel)
                );
              }}
              className={cn(
                "h-10 flex-1 rounded-full px-4 text-sm transition-colors",
                FOCUS,
                contactChannel === channel ? "bg-r-pri text-r-on-pri" : "text-r-text-2 hover:text-r-text"
              )}
            >
              {channelLabel(channel)}
            </button>
          ))}
        </div>
        <input
          id={`${ids}-handle`}
          value={contactHandle}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label={contactChannel === "x" ? "บัญชี X" : "ชื่อผู้ใช้ Discord"}
          aria-invalid={Boolean(contactMessage)}
          aria-describedby={
            contactMessage ? `${ids}-contact-hint ${ids}-contact-error` : `${ids}-contact-hint`
          }
          onFocus={() => setContactHandle((handle) => handleForChannel(handle, contactChannel))}
          onBlur={() => setContactHandle((handle) => (handle.trim() === "@" ? "" : handle))}
          onChange={(event) => setContactHandle(formatHandleInput(event.target.value, contactChannel))}
          placeholder={contactChannel === "x" ? "เช่น @honey_01" : "เช่น honey_01"}
          className={cn(INPUT, "min-w-0 sm:flex-1")}
        />
      </div>
      {contactMessage ? <FieldError id={`${ids}-contact-error`}>{contactMessage}</FieldError> : null}
    </section>
  );

  const submitBlock = (
    <div className="space-y-1.5 pt-1">
      {showMissing && anyMissing ? (
        <div className="pb-1.5">
          <ErrorBox>{MISSING_SUMMARY}</ErrorBox>
        </div>
      ) : null}
      <button type="submit" className={BTN}>
        ตรวจสอบก่อนส่ง
      </button>
      <div className="text-center">
        <button
          type="button"
          onClick={() => setClearConfirmOpen(true)}
          className={cn(LINK_BTN, "text-r-text-3 hover:text-r-text-2")}
        >
          <Trash2 className="size-3.5" aria-hidden />
          ล้างข้อมูลฟอร์ม
        </button>
      </div>
    </div>
  );

  const review = (
    <div className="space-y-4">
      <h2 className={cn(DISPLAY, "text-xl font-normal text-r-text sm:text-[1.375rem]")}>
        ตรวจข้อมูลอีกครั้งก่อนส่ง
      </h2>
      <article className="rounded-2xl bg-white/[0.035] p-3.5 ring-1 ring-white/[0.08] ring-inset sm:p-[18px]">
        {cardPreviewUrl ? (
          <div className="flex justify-center rounded-2xl bg-black/20 p-2 sm:p-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardPreviewUrl}
              alt="การ์ดอวยพร"
              className="h-auto max-h-[min(70vh,36rem)] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        ) : null}
        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSrc} alt="" className="size-12 flex-none rounded-full object-cover ring-2 ring-r-pri/35" />
          <p className={cn(DISPLAY, "min-w-0 text-lg break-words text-r-text")}>จาก {displayName.trim()}</p>
        </div>
        {message.trim() ? (
          <p className="mt-3 text-[15px] leading-[1.75] whitespace-pre-line text-r-text">{message.trim()}</p>
        ) : (
          <p className="mt-3 text-sm text-r-text-3">ไม่ได้ฝากข้อความ</p>
        )}
      </article>
      <div className={cn(R_CARD_CLASS, "flex items-center gap-3 rounded-2xl px-[18px] py-3.5 text-sm")}>
        <span className="flex-none text-r-text-3">ติดต่อ</span>
        <span className="min-w-0 flex-1 truncate text-r-text">
          {channelLabel(contactChannel)} · {handleShown}
        </span>
      </div>
      {loading ? (
        <div className={CARD} role="status" aria-live="polite">
          <div className="flex items-center gap-3.5">
            <Spinner />
            <div>
              <p className="text-base text-r-text">กำลังส่งการ์ดอวยพร…</p>
              <p className={cn(HINT, "mt-0.5")}>อย่าปิดหน้านี้จนกว่าจะส่งเสร็จ</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full w-full animate-pulse rounded-full bg-r-pri/80 motion-reduce:animate-none" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sendError ? <ErrorBox>{sendError}</ErrorBox> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setSendError(null);
                setPhase("form");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={cn(R_CTA_OUTLINE_CLASS, "w-full sm:w-auto")}
            >
              <Pencil className="size-4" aria-hidden />
              แก้ไข
            </button>
            <button type="button" onClick={onConfirm} className={cn(R_CTA_PRIMARY_CLASS, "w-full sm:flex-1")}>
              ยืนยันส่งการ์ดอวยพร
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const done = (
    <div className="space-y-6">
      {header("center")}
      <section className={cn(CARD, "px-5 py-8 text-center sm:px-7")}>
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-r-acc/15 text-r-acc">
          <Check className="size-6" strokeWidth={3} aria-hidden />
        </span>
        <p role="status" className={cn(DISPLAY, "mt-4 text-[1.375rem] text-r-text")}>
          ขอบคุณนะฮันนี่
        </p>
        <p className="mt-2 text-sm leading-[1.7] text-r-text-2">
          ทีมงานจะตรวจการ์ดก่อน{" "}
          <span className="whitespace-nowrap">ผ่านแล้วจะขึ้นในหน้าคำอวยพร</span>
        </p>
        <div className="mx-auto mt-6 max-w-[400px] space-y-2.5">
          {standalone ? (
            <button type="button" onClick={resetForm} className={BTN}>
              <Upload className="size-4" aria-hidden />
              ส่งการ์ดอีกใบ
            </button>
          ) : (
            <>
              <Link href="/hbd/2026" prefetch={false} className={BTN}>
                <Heart className="size-4" aria-hidden />
                ไปดูคำอวยพร
              </Link>
              <button type="button" onClick={resetForm} className={BTN_OUTLINE}>
                <Upload className="size-4" aria-hidden />
                ส่งการ์ดอีกใบ
              </button>
            </>
          )}
          <Link href={sentHref} prefetch={false} className={cn(SENT_PILL, "w-full justify-center")}>
            <ListChecks className="size-4" aria-hidden />
            ฮันนี่ที่ส่งการ์ดแล้ว
          </Link>
        </div>
      </section>
    </div>
  );

  return (
    <div
      className={cn(
        "mx-auto px-4 sm:px-5",
        phase === "done" ? "max-w-lg" : "max-w-lg lg:max-w-[1160px] lg:px-10",
        // The site header is fixed on the regular page; the standalone page has its own sticky bar.
        standalone ? "pt-8 pb-16 sm:pt-12 sm:pb-20" : "py-16 sm:py-20"
      )}
    >
      {avatarCrop.dialog}
      {makerOpen ? (
        <HbdCardMaker
          initial={{
            message: cardText,
            name: displayName,
            style: cardStyle,
          }}
          onCancel={() => setMakerOpen(false)}
          onDone={onMakerDone}
        />
      ) : null}

      {clearConfirmOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-r-bg/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${ids}-clear-title`}
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#1d0f14] p-[22px] shadow-[0_24px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10 ring-inset">
            <h2 id={`${ids}-clear-title`} className={cn(DISPLAY, "text-lg font-normal text-r-text")}>
              ล้างข้อมูลฟอร์ม?
            </h2>
            <p className="mt-2 text-sm leading-[1.7] text-r-text-2">
              ข้อความและรูปภาพที่เลือกไว้จะถูกล้างออกทั้งหมด
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className={cn(R_CTA_OUTLINE_CLASS, "h-11 flex-1 px-4")}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={clearFormData}
                className={cn(
                  "inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#ffa062] px-4 text-[0.9375rem] font-medium text-r-on-pri transition-colors hover:bg-[#ffb685]",
                  FOCUS
                )}
              >
                ยืนยันล้าง
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "done" ? (
        done
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-14">
          {aside}
          <div>
            {/* Stays mounted on the review page so the picked files stay. */}
            <form
              onSubmit={onSubmitForm}
              noValidate
              className={cn("space-y-3.5 lg:space-y-4", phase !== "form" && "hidden")}
              aria-hidden={phase !== "form"}
              inert={phase !== "form" ? true : undefined}
            >
              <button type="button" onClick={showIntro} className={cn(LINK_BTN, "lg:hidden")}>
                <BookOpen className="size-4" aria-hidden />
                ดูวิธีส่งการ์ด
              </button>
              {cardSection}
              {aboutSection}
              {contactSection}
              {submitBlock}
            </form>
            {phase === "preview" ? review : null}
            {phase === "intro" ? (cacheReady ? intro : <UploadFormSkeleton cards={["md", "lg", "sm"]} />) : null}
          </div>
        </div>
      )}
    </div>
  );
}
