/*
 * /hbd/2026 · fireworks after the envelope opens (heart firework + confetti).
 * One fixed <canvas> over the viewport, added on first use and removed when the
 * last particle is gone. Browser only, no library. Callers skip it when the
 * visitor prefers reduced motion.
 */

type Shape = "dot" | "rect";
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  life: number;
  max: number;
  size: number;
  color: string;
  shape: Shape;
  rot: number;
  vr: number;
};
type Emitter = { t: number; dur: number; tick: (t: number) => void };

const PINKS = ["#f2437d", "#ff8fb3", "#ffc2d4"];
const CONFETTI = ["#f2437d", "#ffc2d4", "#22d6bf", "#fff5f7", "#ff8fb3"];
/** Frames are counted at 60 fps so the timing matches on 120 Hz screens. */
const FRAME_MS = 1000 / 60;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let parts: Particle[] = [];
let emitters: Emitter[] = [];
let timers: number[] = [];
let raf = 0;
let last = 0;
let width = 0;
let height = 0;

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function mount() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.className = "hbd-fx";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function unmount() {
  cancelAnimationFrame(raf);
  raf = 0;
  window.removeEventListener("resize", resize);
  canvas?.remove();
  canvas = null;
  ctx = null;
}

function add(p: Partial<Particle> & Pick<Particle, "x" | "y">) {
  parts.push({ vx: 0, vy: 0, g: 0, drag: 1, life: 0, max: 60, size: 3, color: "#fff", shape: "dot", rot: 0, vr: 0, ...p });
}

function frame(now: number) {
  if (!ctx) return;
  const k = last ? Math.min(3, (now - last) / FRAME_MS) : 1;
  last = now;
  ctx.clearRect(0, 0, width, height);

  for (const e of emitters) {
    e.t += k;
    if (e.t < e.dur) e.tick(e.t);
  }
  emitters = emitters.filter((e) => e.t < e.dur);

  for (const p of parts) {
    p.life += k;
    p.vx *= p.drag ** k;
    p.vy = p.vy * p.drag ** k + p.g * k;
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.rot += p.vr * k;
    const f = p.life / p.max;
    ctx.globalAlpha = Math.max(0, 1 - f * f);
    ctx.fillStyle = p.color;
    if (p.shape === "dot") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - f * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.rot * 1.7));
      ctx.fillRect(-p.size, -p.size * 0.55, p.size * 2, p.size * 1.1);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  parts = parts.filter((p) => p.life < p.max && p.y < height + 40);

  if (parts.length || emitters.length || timers.length) raf = requestAnimationFrame(frame);
  else unmount();
}

function run() {
  mount();
  if (!raf) {
    last = 0;
    raf = requestAnimationFrame(frame);
  }
}

function later(ms: number, fn: () => void) {
  const id = window.setTimeout(() => {
    timers = timers.filter((t) => t !== id);
    fn();
    run();
  }, ms);
  timers.push(id);
}

/** A rocket rises from the bottom of the screen and bursts into a heart at (x, y) (viewport px). */
export function hbdHeartFirework(x: number, y: number) {
  run();
  const startY = height + 10;
  const ty = Math.max(70, y);
  emitters.push({
    t: 0,
    dur: 34,
    tick: (t) => {
      const f = t / 34;
      add({ x, y: startY + (ty - startY) * (1 - (1 - f) ** 2), vx: (Math.random() - 0.5) * 0.6, vy: 1, size: 2.2, max: 18, color: "#ffc2d4" });
    },
  });
  later(560, () => {
    const scale = Math.min(width, height) / 170;
    const count = width < 600 ? 72 : 90;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const hx = 16 * Math.sin(a) ** 3;
      const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
      add({ x, y: ty, vx: hx * scale * 0.13, vy: hy * scale * 0.13, drag: 0.955, g: 0.035, size: 2.6, max: 95, color: i % 4 === 0 ? "#22d6bf" : pick(PINKS) });
    }
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 3;
      add({ x, y: ty, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.95, g: 0.03, size: 1.6, max: 70, color: "#fff5f7" });
    }
  });
}

/** Confetti falls from the top of the screen. */
export function hbdConfetti() {
  run();
  const count = width < 600 ? 70 : 110;
  for (let i = 0; i < count; i++) {
    add({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.5,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 1.6 + Math.random() * 2.2,
      g: 0.01,
      drag: 0.995,
      size: 3 + Math.random() * 3,
      shape: "rect",
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.25,
      max: 200,
      color: pick(CONFETTI),
    });
  }
}

/** Stops everything and removes the canvas (page leave). */
export function stopHbdFireworks() {
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
  parts = [];
  emitters = [];
  unmount();
}
