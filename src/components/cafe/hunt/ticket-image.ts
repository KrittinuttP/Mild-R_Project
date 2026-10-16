/**
 * Draws the lucky-wheel ticket as a PNG with the browser's own canvas
 * (no image library). Browser-only: call from a click handler.
 */

export type TicketImageInput = {
  huntTitle: string;
  cafeTitle: string;
  contactName: string;
  channelLabel: string;
  contactHandle: string;
  /** Already formatted for display. */
  sentAt: string;
  /** Empty when the draw date is not announced yet. */
  drawAt: string;
};

type Fonts = { serif: string; thai: string };

const WIDTH = 1080;
const HEIGHT = 1350;

/** Sherlock Sweetie palette (same values as the `cafe-*` theme tokens). */
const GROUND = "#0f2a24";
const GLOW = "#1e4a40";
const GOLD = "#c9a14a";
const GOLD_DEEP = "#7a5c1c";
const CREAM = "#f1e6cf";
const INK = "#14211c";
const MUTED = "#556159";
const WAX = "#9b2d33";
const WAX_DARK = "#5e171c";

/** Font families come from next/font, so their real names are read from CSS. */
function readFonts(source: Element): Fonts {
  const style = window.getComputedStyle(source);
  const family = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  const thai = family("--font-cafe-thai", "serif");
  return {
    // Latin letters in the serif, Thai falls through to the Thai face.
    serif: `${family("--font-cafe-serif", "serif")}, ${thai}`,
    thai,
  };
}

/** Canvas does not wait for web fonts; ask for the ones used, with Thai text. */
async function loadFonts(fonts: Fonts, sample: string) {
  const wait = new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
  const load = Promise.all(
    [
      `700 40px ${fonts.serif}`,
      `700 40px ${fonts.thai}`,
      `600 40px ${fonts.thai}`,
      `400 40px ${fonts.thai}`,
    ].map((font) => document.fonts.load(font, sample))
  ).catch(() => undefined);
  await Promise.race([load, wait]);
}

/** Letter-spaced capitals, drawn one letter at a time (canvas has no tracking everywhere). */
function drawSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
) {
  let cursor = x;
  for (const letter of text) {
    ctx.fillText(letter, cursor, y);
    cursor += ctx.measureText(letter).width + spacing;
  }
}

/** Red wax seal with a lobed edge, as on the stamp book. */
function drawWaxSeal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  fonts: Fonts
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-9 * Math.PI) / 180);
  ctx.shadowColor = "rgba(40,8,10,0.45)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 6;
  const wax = ctx.createRadialGradient(-radius * 0.3, -radius * 0.4, 0, 0, 0, radius * 1.3);
  wax.addColorStop(0, "#d35d65");
  wax.addColorStop(0.45, WAX);
  wax.addColorStop(1, WAX_DARK);
  ctx.fillStyle = wax;
  ctx.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const a = (i / 60) * Math.PI * 2;
    const k = 1 + 0.045 * Math.sin(a * 15) + 0.02 * Math.sin(a * 3 + 1);
    const px = radius * k * Math.cos(a);
    const py = radius * k * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(94,23,28,0.55)";
  ctx.lineWidth = radius * 0.06;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.73, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#f3c9cc";
  ctx.font = `700 ${Math.round(radius * 0.2)}px ${fonts.serif}`;
  ctx.fillText("ENTERED", 0, -radius * 0.2);
  ctx.fillStyle = "#fbe6e7";
  ctx.font = `700 ${Math.round(radius * 0.55)}px ${fonts.serif}`;
  ctx.fillText("✓", 0, radius * 0.38);
  ctx.restore();
}

/** Shrinks, then cuts with "…", so long names never leave the paper. */
function drawFitted(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  font: (size: number) => string,
  size: number,
  minSize: number
) {
  let current = size;
  ctx.font = font(current);
  while (ctx.measureText(value).width > maxWidth && current > minSize) {
    current -= 2;
    ctx.font = font(current);
  }

  let shown = value;
  while (shown.length > 1 && ctx.measureText(shown).width > maxWidth) {
    shown = `${shown.slice(0, -2)}…`;
  }
  ctx.fillText(shown, x, y);
}

export async function renderTicketImage(
  input: TicketImageInput,
  fontSource: Element
): Promise<Blob> {
  const fonts = readFonts(fontSource);
  await loadFonts(fonts, Object.values(input).join(" "));

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  // Green wall with the lamp glow of the cafe pages, inside a gold frame.
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH / 2, 0, 0, WIDTH / 2, 0, HEIGHT * 0.8);
  glow.addColorStop(0, GLOW);
  glow.addColorStop(1, GROUND);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "rgba(201,161,74,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);
  ctx.strokeStyle = "rgba(201,161,74,0.25)";
  ctx.strokeRect(42, 42, WIDTH - 84, HEIGHT - 84);

  const paper = { x: 110, y: 150, w: 860, h: 1040 };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = CREAM;
  ctx.fillRect(paper.x, paper.y, paper.w, paper.h);
  ctx.restore();

  // Brass pin
  const pin = ctx.createRadialGradient(WIDTH / 2 - 7, paper.y - 7, 0, WIDTH / 2, paper.y, 20);
  pin.addColorStop(0, "#f6e4a8");
  pin.addColorStop(0.55, GOLD);
  pin.addColorStop(1, "#6e5218");
  ctx.fillStyle = pin;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, paper.y, 20, 0, Math.PI * 2);
  ctx.fill();

  const left = paper.x + 66;
  const right = paper.x + paper.w - 66;
  const inner = right - left;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  ctx.fillStyle = GOLD_DEEP;
  ctx.font = `700 24px ${fonts.serif}`;
  drawSpaced(ctx, "PRIZE DRAW TICKET", left, paper.y + 104, 5);

  ctx.fillStyle = INK;
  ctx.font = `700 60px ${fonts.thai}`;
  ctx.fillText("ใบยืนยันสิทธิ์", left, paper.y + 190);

  drawWaxSeal(ctx, right - 86, paper.y + 130, 92, fonts);

  ctx.fillStyle = INK;
  drawFitted(
    ctx,
    input.huntTitle,
    left,
    paper.y + 290,
    inner - 40,
    (size) => `700 ${size}px ${fonts.thai}`,
    40,
    28
  );
  ctx.fillStyle = GOLD_DEEP;
  drawFitted(
    ctx,
    input.cafeTitle,
    left,
    paper.y + 338,
    inner,
    (size) => `700 ${size}px ${fonts.serif}`,
    26,
    20
  );

  const rows: { label: string; value: string; latin?: boolean }[] = [
    { label: "ชื่อผู้ติดต่อ", value: input.contactName },
    { label: "ช่องทาง", value: input.channelLabel },
    { label: "ชื่อบัญชี", value: input.contactHandle, latin: true },
    { label: "ส่งเมื่อ", value: input.sentAt },
  ];
  let y = paper.y + 420;
  for (const row of rows) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 28px ${fonts.thai}`;
    ctx.fillText(row.label, left, y);
    ctx.fillStyle = INK;
    drawFitted(
      ctx,
      row.value,
      left,
      y + 60,
      inner,
      (size) =>
        row.latin
          ? `700 ${size}px ${fonts.serif}`
          : `700 ${size}px ${fonts.thai}`,
      44,
      28
    );
    y += 122;
  }

  // Tear line with a notch on each side.
  const tearY = y - 10;
  ctx.strokeStyle = "rgba(52,67,60,0.4)";
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(paper.x + 34, tearY);
  ctx.lineTo(paper.x + paper.w - 34, tearY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = GROUND;
  for (const x of [paper.x, paper.x + paper.w]) {
    ctx.beginPath();
    ctx.arc(x, tearY, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = GOLD_DEEP;
  ctx.font = `600 28px ${fonts.thai}`;
  ctx.fillText("ประกาศผลรางวัล", left, tearY + 78);
  ctx.fillStyle = INK;
  drawFitted(
    ctx,
    input.drawAt || "รอประกาศจากทีมงาน",
    left,
    tearY + 132,
    inner,
    (size) => `700 ${size}px ${fonts.thai}`,
    40,
    26
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("no image"))),
      "image/png"
    );
  });
}

/**
 * Saves the ticket as a PNG file straight away (no share sheet).
 * iPhone: Safari asks to download, the file lands in Files › Downloads.
 * Android / computers: the usual Downloads folder.
 */
export function saveTicketImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before the link is freed.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
