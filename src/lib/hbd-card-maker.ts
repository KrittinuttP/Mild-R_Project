/**
 * "เขียนอวยพรบนเว็บ" (HBD card maker), browser only.
 *
 * One canvas renderer for both the live preview and the file that is sent, so
 * the card the fan sees is exactly the card that arrives. Thai has no spaces
 * between words, so lines break on word boundaries from Intl.Segmenter
 * (falls back to per-character breaks where it is missing).
 *
 * Text sits on the cream paper of the template:
 * left 41% · top 27% · width 51% · height 47% of the image.
 */
import { HBD_CARD_TEMPLATE, HBD_IMAGE_SIZES, HBD_TEXT_LIMITS, clampText } from "@/lib/hbd-upload";

/** Visible characters (see textLength). 400 still renders ≈ 50 px on the 2048 px card. */
export const HBD_CARD_MESSAGE_MAX = 400;
export const HBD_CARD_NAME_MAX = HBD_TEXT_LIMITS.nameMax;
/** Line breaks kept on the card; later ones become spaces. */
const MAX_BREAKS = 10;
/** Below this share of the card width the editor says the text will be small. */
export const HBD_CARD_SMALL_TEXT = 0.024;

/**
 * Cleans what the fan types: at most one empty line in a row, at most
 * MAX_BREAKS line breaks, at most HBD_CARD_MESSAGE_MAX visible characters.
 */
export function normalizeCardMessage(text: string): string {
  let breaks = 0;
  const tidy = text
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n/g, () => (++breaks > MAX_BREAKS ? " " : "\n"));
  return clampText(tidy, HBD_CARD_MESSAGE_MAX);
}

/** Template aspect ratio (2840 × 2015). */
export const HBD_CARD_RATIO = 2015 / 2840;

const PAPER = { left: 0.41, top: 0.27, width: 0.51, height: 0.47 } as const;
const LINE_HEIGHT = 1.45;
const SIGN_SCALE = 0.82;
const MIN_FONT = 0.016;

export type HbdCardFontId =
  | "mali"
  | "itim"
  | "charm"
  | "plex"
  | "playpen"
  | "sriracha"
  | "kodchasan"
  | "pattaya";
export type HbdCardSize = "s" | "m" | "l";

/** Order = order of the font chips (4 × 2). Self-hosted in src/fonts/hbd-card-fonts.css. */
export const HBD_CARD_FONTS: Record<HbdCardFontId, { family: string; weight: number; label: string }> = {
  mali: { family: "Mali", weight: 600, label: "ลายมือ" },
  itim: { family: "Itim", weight: 400, label: "กลมมน" },
  charm: { family: "Charm", weight: 700, label: "หวัดสวย" },
  plex: { family: "IBM Plex Sans Thai", weight: 500, label: "ตัวพิมพ์" },
  playpen: { family: "Playpen Sans Thai", weight: 500, label: "ปากกาเมจิก" },
  sriracha: { family: "Sriracha", weight: 400, label: "ลายมือเด็ก" },
  kodchasan: { family: "Kodchasan", weight: 600, label: "มนน่ารัก" },
  pattaya: { family: "Pattaya", weight: 400, label: "ตัวหนาสนุก" },
};
export const HBD_CARD_FONT_IDS = Object.keys(HBD_CARD_FONTS) as HbdCardFontId[];

/** Font size as a share of the card width; fitting shrinks it when the text is long. */
export const HBD_CARD_SIZES: ReadonlyArray<{ id: HbdCardSize; label: string; base: number }> = [
  { id: "s", label: "เล็ก", base: 0.03 },
  { id: "m", label: "กลาง", base: 0.036 },
  { id: "l", label: "ใหญ่", base: 0.044 },
];

/** Every swatch reads on the cream paper (contrast ≥ 3.3 : 1). */
export const HBD_CARD_COLORS: ReadonlyArray<{ id: string; label: string; hex: string }> = [
  { id: "pink", label: "ชมพู", hex: "#d9467a" },
  { id: "rose", label: "ชมพูเข้ม", hex: "#b0407a" },
  { id: "cherry", label: "แดงเชอร์รี่", hex: "#c8323c" },
  { id: "peach", label: "ส้มพีช", hex: "#d0602a" },
  { id: "brown", label: "น้ำตาล", hex: "#5b3a3f" },
  { id: "leaf", label: "เขียวใบไม้", hex: "#3f8a3a" },
  { id: "mint", label: "มิ้นต์", hex: "#1c9586" },
  { id: "blue", label: "ฟ้า", hex: "#3a7bd5" },
  { id: "navy", label: "กรมท่า", hex: "#2f4a8a" },
  { id: "purple", label: "ม่วง", hex: "#7b5cc4" },
  { id: "black", label: "ดำ", hex: "#2b2326" },
];

export type HbdCardStyle = {
  font: HbdCardFontId;
  /** Any #rrggbb; a color the fan picked may be too light, see cardInk(). */
  color: string;
  size: HbdCardSize;
};

export const HBD_CARD_DEFAULT_STYLE: HbdCardStyle = { font: "mali", color: "#d9467a", size: "m" };

const HEX = /^#[0-9a-f]{6}$/i;

/** "ลายมือ · ชมพู", or "ลายมือ · สีของฉัน" for a picked color. */
export function colorLabel(hex: string) {
  return HBD_CARD_COLORS.find((c) => c.hex === hex.toLowerCase())?.label ?? "สีของฉัน";
}
export function styleLabel(style: HbdCardStyle) {
  return `${HBD_CARD_FONTS[style.font].label} · ${colorLabel(style.color)}`;
}

/** Keeps a style read from localStorage safe to use (older drafts carried a presetId; it is dropped). */
export function sanitizeStyle(raw: unknown): HbdCardStyle {
  const value = (raw ?? {}) as Partial<HbdCardStyle>;
  const font = value.font && value.font in HBD_CARD_FONTS ? value.font : HBD_CARD_DEFAULT_STYLE.font;
  const color = typeof value.color === "string" && HEX.test(value.color) ? value.color.toLowerCase() : HBD_CARD_DEFAULT_STYLE.color;
  const size = HBD_CARD_SIZES.some((s) => s.id === value.size) ? (value.size as HbdCardSize) : "m";
  return { font, color, size };
}

// ---------------------------------------------------------------- ink

/** The cream paper of the template, where the text sits. */
const PAPER_HEX = "#fbf4ea";
const MIN_CONTRAST = 3.2;

function channel(v: number) {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance([r, g, b]: [number, number, number]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function toHex(c: [number, number, number]) {
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}
const PAPER_L = luminance(rgb(PAPER_HEX));
function contrastOnPaper(c: [number, number, number]) {
  const l = luminance(c);
  return (Math.max(l, PAPER_L) + 0.05) / (Math.min(l, PAPER_L) + 0.05);
}

/**
 * The color actually drawn: the fan's color, darkened step by step until it
 * reads on the cream paper (contrast ≥ 3.2 : 1). Palette colors pass through.
 */
export function cardInk(hex: string): string {
  if (!HEX.test(hex)) return HBD_CARD_DEFAULT_STYLE.color;
  const base = rgb(hex);
  if (contrastOnPaper(base) >= MIN_CONTRAST) return hex.toLowerCase();
  for (let k = 0.97; k > 0.05; k -= 0.03) {
    const c = base.map((v) => v * k) as [number, number, number];
    if (contrastOnPaper(c) >= MIN_CONTRAST) return toHex(c);
  }
  return "#2b2326";
}

/** True when cardInk() had to darken the color (shown as a hint under the swatches). */
export function isInkAdjusted(hex: string) {
  return HEX.test(hex) && cardInk(hex) !== hex.toLowerCase();
}

// ---------------------------------------------------------------- assets

let templatePromise: Promise<HTMLImageElement> | null = null;

/** The card template, loaded once per page. */
export function loadHbdCardTemplate(): Promise<HTMLImageElement> {
  if (!templatePromise) {
    templatePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        templatePromise = null;
        reject(new Error("template"));
      };
      img.src = HBD_CARD_TEMPLATE.path;
    });
  }
  return templatePromise;
}

function fontString(font: HbdCardFontId, px: number) {
  const f = HBD_CARD_FONTS[font];
  return `${f.weight} ${px}px "${f.family}", "IBM Plex Sans Thai", "Noto Sans Thai", sans-serif`;
}

/** Waits (up to 3 s) for the card font; a missing font falls back to IBM Plex Sans Thai. */
export async function ensureHbdCardFont(font: HbdCardFontId) {
  if (typeof document === "undefined" || !document.fonts) return;
  const f = HBD_CARD_FONTS[font];
  const load = document.fonts.load(`${f.weight} 40px "${f.family}"`, "สุขสันต์วันเกิด Aa");
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  try {
    await Promise.race([load, timeout]);
  } catch {
    /* fallback font */
  }
}

// ---------------------------------------------------------------- layout

type Segmenter = { segment(input: string): Iterable<{ segment: string }> };

let segmenter: Segmenter | null | undefined;
function getSegmenter(): Segmenter | null {
  if (segmenter !== undefined) return segmenter;
  const Ctor = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => Segmenter }).Segmenter;
  segmenter = Ctor ? new Ctor("th", { granularity: "word" }) : null;
  return segmenter;
}

/** Word-sized pieces; spaces stay attached so they can be dropped at line ends. */
function pieces(paragraph: string): string[] {
  const seg = getSegmenter();
  const raw = seg ? Array.from(seg.segment(paragraph), (s) => s.segment) : Array.from(paragraph);
  // Keep "#tag" and "@name" together: a lone "#" / "@" joins the next piece.
  const out: string[] = [];
  for (const piece of raw) {
    const prev = out[out.length - 1];
    if (prev !== undefined && /[#@]$/.test(prev) && !/^\s/.test(piece)) out[out.length - 1] = prev + piece;
    else out.push(piece);
  }
  return out;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const piece of pieces(paragraph)) {
      const next = line + piece;
      if (line && ctx.measureText(next.trimEnd()).width > maxWidth) {
        lines.push(line.trimEnd());
        line = piece.trimStart();
        // A single piece wider than the line (a long URL, a long run of emoji): break by character.
        while (ctx.measureText(line).width > maxWidth && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut -= 1;
          lines.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      } else {
        line = next;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export type HbdCardContent = { message: string; name: string; style: HbdCardStyle };

type TextLayout = { px: number; lines: string[]; total: number };

/**
 * Finds the font size that fits the paper. If even the smallest size overflows
 * (many line breaks), the breaks become spaces and it fits again.
 */
function layoutText(ctx: CanvasRenderingContext2D, width: number, { message, name, style }: HbdCardContent): TextLayout {
  const boxW = width * PAPER.width;
  const boxH = width * HBD_CARD_RATIO * PAPER.height;
  const sign = name.trim() ? `— ${name.trim()}` : "";
  const base = HBD_CARD_SIZES.find((s) => s.id === style.size)?.base ?? 0.036;
  const fit = (text: string): TextLayout & { fits: boolean } => {
    let px = width * base;
    for (;;) {
      ctx.font = fontString(style.font, px);
      const lines = wrap(ctx, text, boxW);
      const signH = sign ? px * SIGN_SCALE * LINE_HEIGHT + px * 0.4 : 0;
      const total = lines.length * px * LINE_HEIGHT + signH;
      if (total <= boxH) return { px, lines, total, fits: true };
      if (px <= width * MIN_FONT) return { px, lines, total, fits: false };
      px = Math.max(px * 0.94, width * MIN_FONT);
    }
  };
  const text = message.trim() || "พิมพ์คำอวยพรตรงนี้";
  const first = fit(text);
  if (first.fits || !text.includes("\n")) return first;
  return fit(text.replace(/\s*\n\s*/g, " "));
}

let measureCtx: CanvasRenderingContext2D | null = null;
/** Font size the card will use, as a share of the card width (for the "text will be small" hint). */
export function measureHbdCardFont(content: HbdCardContent): number {
  if (typeof document === "undefined") return 1;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 1;
  const width = 1000;
  return layoutText(measureCtx, width, content).px / width;
}

/** Draws the whole card at `width` px (height follows the template). */
export function drawHbdCard(
  ctx: CanvasRenderingContext2D,
  template: HTMLImageElement,
  width: number,
  { message, name, style }: HbdCardContent
) {
  const height = Math.round(width * HBD_CARD_RATIO);
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(template, 0, 0, width, height);

  const boxW = width * PAPER.width;
  const boxH = height * PAPER.height;
  const left = width * PAPER.left;
  const top = height * PAPER.top;
  const sign = name.trim() ? `— ${name.trim()}` : "";
  const { px, lines, total } = layoutText(ctx, width, { message, name, style });

  // Safety net: nothing is ever drawn outside the paper.
  ctx.save();
  ctx.beginPath();
  ctx.rect(left - width * 0.01, top - height * 0.01, boxW + width * 0.02, boxH + height * 0.02);
  ctx.clip();
  ctx.fillStyle = cardInk(style.color);
  ctx.globalAlpha = message.trim() ? 1 : 0.45;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = fontString(style.font, px);
  let y = top + (boxH - total) / 2 + (px * LINE_HEIGHT) / 2;
  for (const line of lines) {
    ctx.fillText(line, left + boxW / 2, y, boxW);
    y += px * LINE_HEIGHT;
  }
  ctx.globalAlpha = 1;
  if (sign) {
    const signPx = px * SIGN_SCALE;
    ctx.font = fontString(style.font, signPx);
    ctx.textAlign = "right";
    y += px * 0.4 - (px * LINE_HEIGHT) / 2 + (signPx * LINE_HEIGHT) / 2;
    ctx.fillText(sign, left + boxW, y, boxW);
  }
  ctx.restore();
}

/** The card as a JPEG at the size the server keeps (2048 px wide). */
export async function renderHbdCardFile(content: HbdCardContent): Promise<File> {
  const [template] = await Promise.all([loadHbdCardTemplate(), ensureHbdCardFont(content.style.font)]);
  const width = HBD_IMAGE_SIZES.cardMaxEdge;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(width * HBD_CARD_RATIO);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  drawHbdCard(ctx, template, width, content);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("export");
  return new File([blob], "mild-r-hbd-card.jpg", { type: "image/jpeg" });
}
