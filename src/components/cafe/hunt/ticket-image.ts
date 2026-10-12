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

type Fonts = { type: string; thai: string; hand: string };

const WIDTH = 1080;
const HEIGHT = 1350;

const INK = "#1a1410";
const FADED = "#5c4636";
const RED = "#a8323f";

/** Font families come from next/font, so their real names are read from CSS. */
function readFonts(source: Element): Fonts {
  const style = window.getComputedStyle(source);
  const family = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    type: family("--font-cafe-type", "monospace"),
    thai: family("--font-cafe-thai", "serif"),
    hand: family("--font-cafe-hand", "cursive"),
  };
}

/** Canvas does not wait for web fonts; ask for the ones used, with Thai text. */
async function loadFonts(fonts: Fonts, sample: string) {
  const wait = new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
  const load = Promise.all(
    [
      `700 40px ${fonts.type}`,
      `400 40px ${fonts.type}`,
      `600 40px ${fonts.thai}`,
      `400 40px ${fonts.thai}`,
      `400 40px ${fonts.hand}`,
    ].map((font) => document.fonts.load(font, sample))
  ).catch(() => undefined);
  await Promise.race([load, wait]);
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

  // Wall with the 44px grid of the cafe pages (scaled up).
  ctx.fillStyle = "#0a0c0e";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "rgba(244,235,227,0.03)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= WIDTH; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  const paper = { x: 90, y: 130, w: 900, h: 1090 };
  ctx.fillStyle = "#f4ebe3";
  ctx.fillRect(paper.x, paper.y, paper.w, paper.h);

  // Pin
  ctx.fillStyle = "#e85a7a";
  ctx.beginPath();
  ctx.arc(WIDTH / 2, paper.y, 20, 0, Math.PI * 2);
  ctx.fill();

  const left = paper.x + 70;
  const right = paper.x + paper.w - 70;
  const inner = right - left;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  ctx.fillStyle = FADED;
  ctx.font = `400 30px ${fonts.type}`;
  ctx.fillText("PRIZE DRAW TICKET", left, paper.y + 110);

  ctx.fillStyle = INK;
  ctx.font = `600 62px ${fonts.thai}`;
  ctx.fillText("ใบยืนยันสิทธิ์", left, paper.y + 200);

  // ENTERED stamp, turned a little.
  ctx.save();
  ctx.translate(right - 130, paper.y + 130);
  ctx.rotate((7 * Math.PI) / 180);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 7;
  ctx.strokeRect(-130, -42, 260, 84);
  ctx.fillStyle = RED;
  ctx.font = `700 40px ${fonts.type}`;
  ctx.textAlign = "center";
  ctx.fillText("ENTERED", 0, 15);
  ctx.restore();
  ctx.textAlign = "left";

  ctx.fillStyle = "#7a1f2a";
  drawFitted(
    ctx,
    input.huntTitle,
    left,
    paper.y + 290,
    inner,
    (size) => `400 ${size}px ${fonts.hand}`,
    46,
    30
  );
  ctx.fillStyle = FADED;
  drawFitted(
    ctx,
    input.cafeTitle,
    left,
    paper.y + 340,
    inner,
    (size) => `400 ${size}px ${fonts.type}`,
    28,
    20
  );

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "ชื่อผู้ติดต่อ", value: input.contactName },
    { label: "ช่องทาง", value: input.channelLabel },
    { label: "ชื่อบัญชี", value: input.contactHandle, mono: true },
    { label: "ส่งเมื่อ", value: input.sentAt },
  ];
  let y = paper.y + 420;
  for (const row of rows) {
    ctx.fillStyle = FADED;
    ctx.font = `400 30px ${fonts.thai}`;
    ctx.fillText(row.label, left, y);
    ctx.fillStyle = INK;
    drawFitted(
      ctx,
      row.value,
      left,
      y + 62,
      inner,
      (size) =>
        row.mono
          ? `400 ${size}px ${fonts.type}`
          : `600 ${size}px ${fonts.thai}`,
      48,
      28
    );
    y += 125;
  }

  // Tear line with a notch on each side.
  const tearY = y - 10;
  ctx.strokeStyle = FADED;
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(paper.x + 34, tearY);
  ctx.lineTo(paper.x + paper.w - 34, tearY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#0a0c0e";
  for (const x of [paper.x, paper.x + paper.w]) {
    ctx.beginPath();
    ctx.arc(x, tearY, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = FADED;
  ctx.font = `400 30px ${fonts.thai}`;
  ctx.fillText("ประกาศผลรางวัล", left, tearY + 80);
  ctx.fillStyle = INK;
  drawFitted(
    ctx,
    input.drawAt || "รอประกาศจากทีมงาน",
    left,
    tearY + 136,
    inner,
    (size) => `600 ${size}px ${fonts.thai}`,
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
