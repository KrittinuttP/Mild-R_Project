"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { HAND, Pin, Stamp, TYPE } from "@/components/cafe/board/pieces";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

registerGsapPlugins();

type ScanState = "starting" | "scanning" | "blocked" | "unsupported";
type Facing = "environment" | "user";

/** Time between two decode attempts. Lower = faster but hotter phone. */
const SCAN_EVERY_MS = 180;
/** Frames are shrunk to this many pixels on the long side before decoding. */
const DECODE_EDGE = 640;
const WRONG_NOTE_MS = 3500;

const TOKEN_PATH = /^\/cafe\/hunt\/([^/?#]+)\/?$/;
/** Same rule as CAFE_HUNT_TOKENS: 16+ characters, no spaces or slashes. */
const PLAIN_TOKEN = /^[A-Za-z0-9_-]{16,}$/;

/**
 * Evidence QR codes hold a link to /cafe/hunt/<code>. Only the path is read,
 * so a printed code keeps working when the site moves to another domain.
 * The code itself is checked by the page it opens, not here.
 */
function huntTokenFromQr(text: string): string | null {
  const value = text.trim();
  // A QR holding only the code (no link) is accepted too.
  if (PLAIN_TOKEN.test(value)) return value;
  try {
    const url = new URL(text.trim(), window.location.origin);
    const match = url.pathname.match(TOKEN_PATH);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

type Detector = {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
};

/** Built-in QR reader (Chrome on Android, among others). null where missing. */
function nativeDetector(): Detector | null {
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (options: { formats: string[] }) => Detector;
    }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

const ROUND_BUTTON =
  "flex size-[46px] items-center justify-center rounded-full bg-[#0a0c0e]/75 transition hover:bg-[#0a0c0e] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a]";
const OUTLINE_BUTTON =
  "flex min-h-[50px] items-center justify-center gap-2 border-2 border-[#f4ebe3]/70 px-3 text-[15px] text-[#f4ebe3] transition hover:border-[#f4ebe3] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e85a7a] aria-pressed:bg-[#f4ebe3] aria-pressed:text-[#1a1410]";

type HuntScannerProps = {
  count: number;
  total: number;
  onClose: () => void;
};

/**
 * Full-screen camera that reads evidence QR codes inside the page, so every
 * stamp lands in this same browser (scanning with another app can open a
 * different browser with its own storage). Frames never leave the phone.
 */
export function HuntScanner({ count, total, onClose }: HuntScannerProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [state, setState] = useState<ScanState>("starting");
  const [facing, setFacing] = useState<Facing>("environment");
  const [attempt, setAttempt] = useState(0);
  const [canSwitch, setCanSwitch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [wrongQr, setWrongQr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer = 0;
    let wrongTimer = 0;
    let lastWrong: string | null = null;
    let leaving = false;

    const onText = (text: string) => {
      if (leaving) return;
      const token = huntTokenFromQr(text);
      if (token) {
        leaving = true;
        navigator.vibrate?.(60);
        router.push(`/cafe/hunt/${encodeURIComponent(token)}`);
        return;
      }
      // Same wrong code still in view: keep the note, do not restart it.
      if (text === lastWrong) return;
      lastWrong = text;
      setWrongQr(true);
      window.clearTimeout(wrongTimer);
      wrongTimer = window.setTimeout(() => {
        setWrongQr(false);
        lastWrong = null;
      }, WRONG_NOTE_MS);
    };

    const start = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : "";
        setState(
          name === "NotAllowedError" || name === "SecurityError"
            ? "blocked"
            : "unsupported"
        );
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      const track = stream.getVideoTracks()[0] ?? null;
      trackRef.current = track;
      const capabilities = track?.getCapabilities?.() as
        | { torch?: boolean }
        | undefined;
      setTorchAvailable(Boolean(capabilities?.torch));
      setTorchOn(false);

      const devices = await navigator.mediaDevices
        .enumerateDevices()
        .catch(() => [] as MediaDeviceInfo[]);
      if (cancelled) return;
      setCanSwitch(
        devices.filter((device) => device.kind === "videoinput").length > 1
      );
      setState("scanning");

      let detector = nativeDetector();
      // The library is only downloaded where the browser has no QR reader.
      let decode = detector ? null : (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      const tick = async () => {
        if (cancelled) return;
        let text: string | null = null;

        if (video.readyState >= 2 && video.videoWidth > 0) {
          try {
            if (detector) {
              const codes = await detector.detect(video);
              text = codes[0]?.rawValue ?? null;
            } else if (decode && context) {
              const scale = Math.min(
                1,
                DECODE_EDGE / Math.max(video.videoWidth, video.videoHeight)
              );
              const width = Math.round(video.videoWidth * scale);
              const height = Math.round(video.videoHeight * scale);
              canvas.width = width;
              canvas.height = height;
              context.drawImage(video, 0, 0, width, height);
              const frame = context.getImageData(0, 0, width, height);
              text =
                decode(frame.data, width, height, {
                  inversionAttempts: "dontInvert",
                })?.data ?? null;
            }
          } catch {
            // A built-in reader that fails once is not trusted again.
            if (detector) {
              detector = null;
              decode = (await import("jsqr")).default;
            }
          }
        }

        if (cancelled) return;
        if (text) onText(text);
        timer = window.setTimeout(() => void tick(), SCAN_EVERY_MS);
      };
      void tick();
    };

    void start();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(wrongTimer);
      stream?.getTracks().forEach((track) => track.stop());
      trackRef.current = null;
    };
  }, [facing, attempt, router]);

  // Keep the page behind still, and let Escape close the camera.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Scan line sweeping the frame.
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to("[data-scan-line]", {
          // From the top inset (14px) to the bottom inset of the frame.
          y: (_index: number, line: HTMLElement) =>
            (line.parentElement?.clientHeight ?? 0) - 31,
          duration: 1.2,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [state], revertOnUpdate: true }
  );

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }

  const failed = state === "blocked" || state === "unsupported";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="สแกน QR หลักฐาน"
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#0a0c0e] font-[family-name:var(--font-cafe-thai)] text-[#f4ebe3]"
    >
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 size-full object-cover",
          // Front camera is mirrored so moving the code feels natural.
          facing === "user" && "-scale-x-100",
          failed && "hidden"
        )}
        playsInline
        muted
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3.5">
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="ปิดกล้อง"
          className={ROUND_BUTTON}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[22px] fill-none stroke-[#f4ebe3] stroke-[2.2] [stroke-linecap:round]"
            aria-hidden
          >
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
        <p className={cn(HAND, "text-xl")}>สแกนหลักฐาน</p>
        <p
          className={cn(
            TYPE,
            "min-w-[46px] rounded-full bg-[#0a0c0e]/75 px-2.5 pt-1.5 pb-1 text-center text-sm font-bold text-[#f3b8c4]"
          )}
          aria-label={`เก็บแล้ว ${count} จาก ${total} ชิ้น`}
        >
          {count}/{total}
        </p>
      </header>

      {failed ? (
        <div className="relative z-10 flex-1 overflow-y-auto px-5 pt-4 pb-8">
          <div
            className="mx-auto flex size-[120px] items-center justify-center rounded-[22px] border-[3px] border-dashed border-[#5c4636]"
            aria-hidden
          >
            <svg
              viewBox="0 0 48 48"
              className="size-[58px] fill-none stroke-[#c4a882] stroke-[3] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="M8 14 h32 v24 H8 z M18 14 l3 -6 h6 l3 6" />
              <circle cx="24" cy="26" r="7" />
              <path d="M6 42 L42 6" className="stroke-[#e85a7a]" />
            </svg>
          </div>

          <section className="relative mx-auto mt-7 max-w-md bg-[#f4ebe3] px-[18px] pt-[22px] pb-5 text-[#1a1410] shadow-[0_18px_34px_rgba(0,0,0,0.55)]">
            <Pin />
            <h2 className={cn(HAND, "text-[25px] leading-[1.3] text-[#7a1f2a]")}>
              เปิดกล้องในหน้าเว็บไม่ได้
            </h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-[#3d3024]">
              {state === "blocked"
                ? "เบราว์เซอร์ยังไม่ได้รับอนุญาตให้ใช้กล้อง"
                : "เบราว์เซอร์นี้เปิดกล้องในหน้าเว็บไม่ได้"}
            </p>
            {state === "blocked" ? (
              <>
                <p className="mt-4 text-[15px] font-semibold">วิธีอนุญาตใช้กล้อง</p>
                <p className="mt-1.5 text-sm leading-[1.7] text-[#3d3024]">
                  เปิดการตั้งค่าของเว็บไซต์นี้จากแถบที่อยู่เว็บ
                  หาหัวข้อกล้อง แล้วเลือกอนุญาต จากนั้นกดลองอีกครั้ง
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setState("starting");
                    setAttempt((value) => value + 1);
                  }}
                  className="mt-[18px] flex min-h-[54px] w-full items-center justify-center bg-[#e85a7a] px-4 text-[17px] font-semibold text-[#1a1410] transition hover:bg-[#f3b8c4] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#1a1410]"
                >
                  ลองเปิดกล้องอีกครั้ง
                </button>
              </>
            ) : null}
          </section>

          <section className="mx-auto mt-5 max-w-md border-l-4 border-[#b9e6e1] bg-[#14100c] px-4 py-3.5">
            <p className="text-[15px] font-semibold text-[#f4ebe3]">
              ทางสำรอง: ใช้แอปกล้องของมือถือ
            </p>
            <p className="mt-1 text-sm leading-[1.6] text-[#d8d0c4]">
              เปิดแอปกล้อง เล็งที่ QR แล้วแตะลิงก์ที่ขึ้นมา ตราจะเก็บได้เหมือนกัน
              แต่ต้องเปิดใน Safari หรือ Chrome ตัวเดียวกับที่ใช้อยู่ทุกครั้ง
            </p>
          </section>
        </div>
      ) : (
        <>
          <div className="relative z-0 flex flex-1 items-center justify-center">
            <div className="relative size-[min(68vw,280px)] rounded-[14px] shadow-[0_0_0_200vmax_rgba(5,6,7,0.66)]">
              {(
                [
                  "top-0 left-0 rounded-tl-[14px] border-t-[5px] border-l-[5px]",
                  "top-0 right-0 rounded-tr-[14px] border-t-[5px] border-r-[5px]",
                  "bottom-0 left-0 rounded-bl-[14px] border-b-[5px] border-l-[5px]",
                  "right-0 bottom-0 rounded-br-[14px] border-r-[5px] border-b-[5px]",
                ] as const
              ).map((corner) => (
                <span
                  key={corner}
                  className={cn("absolute size-[46px] border-[#e85a7a]", corner)}
                  aria-hidden
                />
              ))}
              {state === "scanning" ? (
                <span
                  data-scan-line
                  className="absolute inset-x-3.5 top-3.5 h-[3px] rounded-full bg-[#e85a7a] shadow-[0_0_14px_3px_rgba(232,90,122,0.75)]"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  TYPE,
                  "absolute -top-[34px] left-1/2 -translate-x-1/2 bg-[#f4ebe3] px-2.5 pt-[3px] pb-px text-[11px] font-bold tracking-[0.16em] whitespace-nowrap text-[#a8323f]"
                )}
                aria-hidden
              >
                EVIDENCE FRAME
              </span>
            </div>

            {wrongQr ? (
              <div
                role="status"
                className="absolute inset-x-5 bottom-4 mx-auto max-w-md -rotate-1 bg-[#f4ebe3] px-4 py-3.5 text-[#1a1410] shadow-[0_16px_30px_rgba(0,0,0,0.55)]"
              >
                <Pin />
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-base leading-[1.4] font-semibold text-[#7a1f2a]">
                      QR นี้ไม่ใช่จุดหลักฐาน
                    </p>
                    <p className="mt-1 text-sm leading-[1.6] text-[#3d3024]">
                      มองหา QR ที่มีป้าย EVIDENCE แล้วเล็งใหม่ได้เลย กล้องยังเปิดอยู่
                    </p>
                  </div>
                  <Stamp className="shrink-0 rotate-6 text-center text-[11px] leading-[1.15]">
                    Not
                    <br />
                    Evidence
                  </Stamp>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative z-10 border-t-[3px] border-[#e85a7a] bg-[#0a0c0e] px-5 pt-[22px] pb-[max(26px,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-md">
              <p className={cn(HAND, "text-[22px] leading-[1.3]")} aria-live="polite">
                {state === "starting"
                  ? "กำลังเปิดกล้อง…"
                  : "เล็งกล้องไปที่ QR ของจุดหลักฐาน"}
              </p>
              <p className="mt-1.5 text-sm leading-[1.6] text-[#c4b8a8]">
                ไม่ต้องกดถ่ายรูป เจอ QR แล้วจะเปิดหน้าหลักฐานให้เอง
              </p>

              {torchAvailable || canSwitch ? (
                <div
                  className={cn(
                    "mt-[18px] grid gap-2.5",
                    torchAvailable && canSwitch ? "grid-cols-2" : "grid-cols-1"
                  )}
                >
                  {torchAvailable ? (
                    <button
                      type="button"
                      aria-pressed={torchOn}
                      onClick={() => void toggleTorch()}
                      className={OUTLINE_BUTTON}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
                        aria-hidden
                      >
                        <path d="M7 2 h10 l-2 6 h-6 z M9 8 v13 h6 V8 M12 12 v3" />
                      </svg>
                      {torchOn ? "ปิดไฟฉาย" : "เปิดไฟฉาย"}
                    </button>
                  ) : null}
                  {canSwitch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setState("starting");
                        setFacing((value) =>
                          value === "environment" ? "user" : "environment"
                        );
                      }}
                      className={OUTLINE_BUTTON}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
                        aria-hidden
                      >
                        <path d="M4 7 h16 v12 H4 z M9 7 l1.5 -3 h3 L15 7" />
                        <circle cx="12" cy="13" r="3.5" />
                      </svg>
                      สลับกล้อง
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
