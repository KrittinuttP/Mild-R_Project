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
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Crop,
  Download,
  Heart,
  ImageIcon,
  Lock,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { useAvatarCrop } from "@/components/upload/useAvatarCrop";
import { shrinkImageFile } from "@/lib/hbd-client-resize";
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
  "h-12 w-full rounded-[14px] bg-white/[0.04] px-4 text-[15px] text-r-text ring-1 ring-white/10 outline-none ring-inset placeholder:text-r-text-2/45 focus:ring-r-pri/60 aria-[invalid=true]:ring-[#ff8fb0]";
const BTN = cn(R_CTA_PRIMARY_CLASS, "w-full");
const BTN_OUTLINE = cn(R_CTA_OUTLINE_CLASS, "w-full");
const LINK_BTN = cn(
  "inline-flex min-h-8 items-center gap-1.5 rounded-md text-[13.5px] text-r-pri transition-colors hover:text-r-pri-hover",
  FOCUS
);
const HINT = "text-xs text-r-text-3";
const LABEL = "block text-[0.90625rem] text-r-text";
const ERROR_TEXT = "text-[#ff8fb0]";

const EYEBROW = "Birthday · 12 Dec 2026";
const MISSING_SUMMARY = "ยังส่งไม่ได้ — กรุณากรอกช่องที่มี * ให้ครบ";
const CONTACT_HINT = "จะใช้ช่องทางนี้ติดต่อกลับ ในกรณีที่มีปัญหา";

const HBD_FORM_CACHE_KEY = "mild-r-hbd-upload-draft";

const SECTION_KEYS = ["card", "about", "contact"] as const;

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
            done ? "bg-r-acc text-r-on-acc" : "bg-r-pri text-r-on-pri"
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
      className="flex items-start gap-2 rounded-2xl bg-r-pri/12 px-4 py-3 text-sm text-r-text ring-1 ring-r-pri/35 ring-inset"
    >
      <AlertCircle className={cn("mt-0.5 size-4 flex-none", ERROR_TEXT)} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function PrivateTag() {
  return (
    <span className="inline-flex flex-none items-center gap-1.5 text-[12.5px] text-r-text-3">
      <Lock className="size-3.5 text-r-acc" aria-hidden />
      ไม่แสดงบนเว็บ
    </span>
  );
}

type HbdUploadClientProps = {
  /** /upload/hbd: no way back to the site, only "send another card". */
  standalone?: boolean;
};

export function HbdUploadClient({ standalone = false }: HbdUploadClientProps) {
  const ids = useId();
  const [phase, setPhase] = useState<Phase>("form");
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
    }
    setCacheReady(true);
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    writeFormCache({ displayName, message, contactChannel, contactHandle });
  }, [displayName, message, contactChannel, contactHandle, cacheReady]);

  useEffect(() => {
    return () => {
      revokeUrl(cardUrlRef.current);
      revokeUrl(avatarUrlRef.current);
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
    setAvatarMedia(null, undefined);
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

  /** Step list: from the review page it goes back to the form first. */
  function goToSection(index: number) {
    if (phase === "preview") {
      if (loading) return;
      setSendError(null);
      setPhase("form");
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToSection(index)));
      return;
    }
    scrollToSection(index);
  }

  function onCardChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCardError(null);
    if (!file) return;

    if (file.size > HBD_CARD_TEMPLATE.maxSourceBytes) {
      setCardError("ไฟล์การ์ดใหญ่เกินไป (สูงสุด 20 MB)");
      event.target.value = "";
      return;
    }

    setCardMedia(file, URL.createObjectURL(file));
  }

  function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setAvatarError(null);
    if (!file) return;

    if (file.size > HBD_AVATAR_LIMITS.maxSourceBytes) {
      setAvatarError("ไฟล์ avatar ใหญ่เกินไป (สูงสุด 10 MB)");
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
    if (cardInputRef.current) cardInputRef.current.value = "";
  }

  function clearAvatar() {
    setAvatarError(null);
    setAvatarMedia(null, undefined);
    avatarCrop.clear();
    if (avatarInputRef.current) avatarInputRef.current.value = "";
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
        setSendError("ไฟล์ avatar ใหญ่เกินไปหลังย่อ — ลองใช้รูปอื่น");
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
        setSendError(data?.error ?? "ส่งไม่สำเร็จ");
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
      setSendError("เครือข่ายมีปัญหา — ลองอีกครั้ง");
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
  const cardMessage = cardError ?? (showMissing && cardMissing ? "กรุณาอัปโหลดรูปการ์ดจาก template" : null);
  const nameMessage = showMissing && nameMissing ? "กรุณากรอกชื่อที่จะแสดงบนเว็บ" : null;
  const contactMessage = showMissing && contactMissing ? "กรุณากรอกชื่อช่องทางติดต่อ" : null;

  const steps = [
    { title: "การ์ดอวยพร", sub: cardFile?.name ?? "", done: !cardMissing },
    { title: "ชื่อและคำอวยพร", sub: displayName.trim(), done: !nameMissing },
    {
      title: "ช่องทางติดต่อ",
      sub: contactMissing ? "" : `${channelLabel(contactChannel)} · ${handleShown}`,
      done: !contactMissing,
    },
  ];

  const header = (align: "left" | "center" = "left") => (
    <header className={align === "center" ? "text-center" : undefined}>
      <p className={R_EYEBROW_CLASS}>{EYEBROW}</p>
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
    <aside className={cn("space-y-6 lg:sticky lg:space-y-4", standalone ? "lg:top-[88px]" : "lg:top-24")}>
      {standalone ? null : (
        <Link
          href="/hbd/2026"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-r-text-2 ring-1 ring-r-text-2/20 transition-colors ring-inset hover:text-r-text hover:ring-r-pri/50",
            FOCUS
          )}
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          คำอวยพร
        </Link>
      )}
      {header()}
      <nav aria-label="ขั้นตอนการกรอก" className="-ml-3 hidden space-y-1 lg:block">
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
            โหลดเทมเพลต
          </a>
        </div>
      ) : null}
    </aside>
  );

  const cardSection = (
    <section
      id={`${ids}-card-section`}
      className={cn(CARD, "scroll-mt-24")}
      aria-labelledby={`${ids}-card`}
    >
      <StepTitle n={1} id={`${ids}-card`} done={!cardMissing} required aside={templateLink}>
        การ์ดอวยพร
      </StepTitle>
      <input
        ref={cardInputRef}
        type="file"
        accept={HBD_CARD_TEMPLATE.accept}
        onChange={onCardChange}
        className="sr-only"
        tabIndex={-1}
      />
      {cardPreviewUrl && cardFile ? (
        <div className="mt-4 rounded-[18px] bg-black/20 p-3 ring-1 ring-white/[0.08] ring-inset">
          <div className="flex justify-center overflow-hidden rounded-[14px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardPreviewUrl}
              alt="การ์ดอวยพรที่เลือก"
              className="h-auto max-h-[min(70vh,36rem)] w-auto max-w-full object-contain"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <ImageIcon className="size-[17px] flex-none text-r-acc" aria-hidden />
              <span className="truncate text-[13.5px] text-r-text">{cardFile.name}</span>
            </span>
            <span className="flex gap-4 max-sm:w-full">
              <button type="button" onClick={() => cardInputRef.current?.click()} className={LINK_BTN}>
                <Upload className="size-3.5" aria-hidden />
                เลือกไฟล์ใหม่
              </button>
              <button type="button" onClick={clearCard} className={cn(LINK_BTN, "text-r-text-2 hover:text-r-text")}>
                <X className="size-3.5" aria-hidden />
                ล้างรูปการ์ด
              </button>
            </span>
          </div>
        </div>
      ) : (
        <button
          id={`${ids}-card-pick`}
          type="button"
          onClick={() => cardInputRef.current?.click()}
          aria-describedby={cardMessage ? `${ids}-card-error` : undefined}
          className={cn(
            "mt-4 flex w-full flex-col items-center gap-2.5 rounded-[18px] border-[1.5px] border-dashed bg-white/[0.02] px-4 py-9 text-r-text transition-colors hover:border-r-pri/70 hover:bg-r-pri/[0.04] sm:py-11",
            cardMessage ? "border-[#ff8fb0]" : "border-r-text-2/35",
            FOCUS
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-r-pri/14 text-r-pri">
            <Upload className="size-5" aria-hidden />
          </span>
          <span className="text-[15px]">เลือกไฟล์การ์ด</span>
          <span className="text-[12.5px] text-r-text-3">JPEG · PNG · WebP · สูงสุด 20 MB</span>
        </button>
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
        ชื่อและคำอวยพร
      </StepTitle>
      <input
        ref={avatarInputRef}
        type="file"
        accept={HBD_AVATAR_LIMITS.accept}
        onChange={onAvatarChange}
        className="sr-only"
        tabIndex={-1}
      />
      <div className="mt-5 flex items-center gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc}
          alt="รูปโปรไฟล์"
          className="size-16 flex-none rounded-full object-cover ring-2 ring-r-pri/35"
        />
        <div className="min-w-0">
          <p className="text-[0.90625rem] text-r-text">
            รูปโปรไฟล์<span className="ml-2 text-[12.5px] text-r-text-3">ไม่บังคับ</span>
          </p>
          <div className="flex flex-wrap gap-x-3">
            {avatarFile ? (
              <>
                <button type="button" onClick={() => avatarInputRef.current?.click()} className={LINK_BTN}>
                  เปลี่ยนรูป
                </button>
                {avatarCrop.canRecrop ? (
                  <button type="button" onClick={avatarCrop.recrop} className={LINK_BTN}>
                    <Crop className="size-3.5" aria-hidden />
                    ครอปใหม่
                  </button>
                ) : null}
                <button type="button" onClick={clearAvatar} className={cn(LINK_BTN, "text-r-text-2 hover:text-r-text")}>
                  เอาออก
                </button>
              </>
            ) : (
              <button type="button" onClick={() => avatarInputRef.current?.click()} className={LINK_BTN}>
                <Upload className="size-3.5" aria-hidden />
                เลือกรูป
              </button>
            )}
          </div>
        </div>
      </div>
      {avatarError ? <FieldError>{avatarError}</FieldError> : null}
      <div className="mt-[18px]">
        <label htmlFor={`${ids}-name`} className={LABEL}>
          ชื่อที่แสดง<span className="text-r-pri"> *</span>
        </label>
        <input
          id={`${ids}-name`}
          value={displayName}
          autoComplete="nickname"
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="เช่น ฮันนี่"
          aria-invalid={Boolean(nameMessage)}
          aria-describedby={nameMessage ? `${ids}-name-error` : undefined}
          className={cn(INPUT, "mt-2")}
        />
        {nameMessage ? <FieldError id={`${ids}-name-error`}>{nameMessage}</FieldError> : null}
      </div>
      <div className="mt-[18px]">
        <label htmlFor={`${ids}-message`} className={LABEL}>
          ข้อความอวยพร<span className="ml-2 text-[12.5px] text-r-text-3">ไม่บังคับ</span>
        </label>
        <textarea
          id={`${ids}-message`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          placeholder="สุขสันต์วันเกิดนะมายด์อาร์…"
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
      <StepTitle n={3} id={`${ids}-contact`} done={!contactMissing} required aside={<PrivateTag />}>
        ช่องทางติดต่อ
      </StepTitle>
      <p id={`${ids}-contact-hint`} className={cn(HINT, "mt-1.5 text-[12.5px] leading-relaxed")}>
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
                setContactHandle((handle) => handleForChannel(handle, channel));
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
      <article className="rounded-[22px] bg-white/[0.035] p-3.5 ring-1 ring-white/[0.08] ring-inset sm:p-[18px]">
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
          <p className="mt-3 text-sm text-r-text-3">ไม่มีข้อความอวยพร</p>
        )}
      </article>
      <div className={cn(R_CARD_CLASS, "flex items-center gap-3 rounded-[22px] px-[18px] py-3.5 text-sm")}>
        <span className="flex-none text-r-text-3">ติดต่อ</span>
        <span className="min-w-0 flex-1 truncate text-r-text">
          {channelLabel(contactChannel)} · {handleShown}
        </span>
        <PrivateTag />
      </div>
      {loading ? (
        <div className={CARD} role="status" aria-live="polite">
          <div className="flex items-center gap-3.5">
            <Spinner />
            <div>
              <p className="text-base text-r-text">กำลังส่งการ์ดอวยพร…</p>
              <p className={cn(HINT, "mt-0.5 text-[12.5px]")}>อย่าปิดหน้านี้จนกว่าจะส่งเสร็จ</p>
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
          การ์ดของคุณจะถูกนำไปจัดแสดงในหน้ารวมคำอวยพร
          <span className="whitespace-nowrap">เร็วๆ นี้</span>
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

      {clearConfirmOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-r-bg/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${ids}-clear-title`}
        >
          <div className="w-full max-w-sm rounded-[22px] bg-[#1d0f14] p-[22px] shadow-[0_24px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10 ring-inset">
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
                  "inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#ff8fb0] px-4 text-[0.9375rem] font-medium text-r-on-pri transition-colors hover:bg-[#ffa6c1]",
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
              {cardSection}
              {aboutSection}
              {contactSection}
              {submitBlock}
            </form>
            {phase === "preview" ? review : null}
          </div>
        </div>
      )}
    </div>
  );
}
