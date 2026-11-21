// Illustrated sample "photos" for the landing page. They go through the same filter shader and
// face-effect code as real shots, so what the page shows is what the booth actually produces.
import type { EffectId } from '../types';
import { FilterRenderer } from './filters';
import { drawEffects } from './effects';

export interface SampleOpts {
  seed: number;
  people?: 1 | 2;
  effect?: EffectId;
  filter?: number;
  w?: number;
  h?: number;
}

const SKIN = ['#f1c7a5', '#d9a37e', '#b97b56', '#8d5a3b', '#f5d6bd', '#6b4430'];
const HAIR = ['#1d1412', '#3b2416', '#6b3f24', '#c9873e', '#2a2a2a', '#7a2f2a'];
const SHIRT = ['#ffffff', '#f29bb0', '#c9a2e0', '#9ccbe8', '#f6d27a', '#e46a86', '#4b2a33', '#a8d8c2'];
const BACKDROP: [string, string][] = [
  ['#f4c7d2', '#fbdde4'],
  ['#e3d0f0', '#efe2f8'],
  ['#f8d9c4', '#fde8da'],
  ['#cfe6dc', '#e2f1ea'],
  ['#cfe0f2', '#e2edf8'],
  ['#f6e3b8', '#fbefd2'],
];
type Hair = 'short' | 'long' | 'bun' | 'curly';
const HAIRS: Hair[] = ['short', 'long', 'bun', 'curly'];

function rng(seed: number) {
  let a = seed * 2654435761;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

interface Person {
  x: number;
  y: number;
  r: number;
  tilt: number;
  skin: string;
  hair: string;
  hairStyle: Hair;
  shirt: string;
  smile: number;
}

function drawPerson(ctx: CanvasRenderingContext2D, p: Person) {
  const { x, y, r } = p;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.tilt);
  // body
  ctx.fillStyle = p.shirt;
  ctx.beginPath();
  ctx.ellipse(0, r * 2.45, r * 1.75, r * 1.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.skin;
  ctx.fillRect(-r * 0.28, r * 0.7, r * 0.56, r * 0.6);
  // long hair behind head
  ctx.fillStyle = p.hair;
  if (p.hairStyle === 'long') {
    ctx.beginPath();
    ctx.roundRect(-r * 0.98, -r * 0.85, r * 1.96, r * 2.25, r * 0.9);
    ctx.fill();
  }
  // head
  ctx.fillStyle = p.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.8, r, 0, 0, Math.PI * 2);
  ctx.fill();
  // hair on top
  ctx.fillStyle = p.hair;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.42, r * 0.86, r * 0.66, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  if (p.hairStyle === 'bun') {
    ctx.beginPath();
    ctx.arc(0, -r * 1.12, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.hairStyle === 'curly') {
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.78, -r * 0.35 + Math.sin(a) * r * 0.72, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // face
  ctx.fillStyle = '#1d1412';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * r * 0.32, -r * 0.03, r * 0.07, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#1d1412';
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.32, r * 0.24, 0.15 * Math.PI, (0.85 - 0.1 * (1 - p.smile)) * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/** Synthetic face landmarks matching MediaPipe indices used by the effects. */
function landmarks(p: Person, w: number, h: number) {
  const lm = Array.from({ length: 478 }, () => ({ x: p.x / w, y: p.y / h }));
  const c = Math.cos(p.tilt), s = Math.sin(p.tilt);
  const set = (i: number, dx: number, dy: number) => {
    const X = p.x + (dx * c - dy * s) * p.r;
    const Y = p.y + (dx * s + dy * c) * p.r;
    lm[i] = { x: X / w, y: Y / h };
  };
  set(33, -0.46, -0.03); set(133, -0.18, -0.03); set(362, 0.18, -0.03); set(263, 0.46, -0.03);
  set(234, -0.8, 0); set(454, 0.8, 0); set(10, 0, -0.5); set(152, 0, 1);
  set(1, 0, 0.18); set(2, 0, 0.24); set(13, 0, 0.42); set(14, 0, 0.46);
  set(205, -0.45, 0.3); set(50, -0.47, 0.26); set(425, 0.45, 0.3); set(280, 0.47, 0.26);
  return lm;
}

let renderer: FilterRenderer | null = null;
const cache = new Map<string, HTMLCanvasElement>();

export function samplePhoto(o: SampleOpts): HTMLCanvasElement {
  const { seed, people = 1, effect = 'none', filter = 0, w = 640, h = 480 } = o;
  const key = `${seed}-${people}-${effect}-${filter}-${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(seed + 1);
  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const ctx = base.getContext('2d')!;

  // photobooth curtain backdrop
  const [c1, c2] = pick(r, BACKDROP);
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, w, h);
  const fold = w / 9;
  for (let x = 0; x < w; x += fold) {
    const g = ctx.createLinearGradient(x, 0, x + fold, 0);
    g.addColorStop(0, c1);
    g.addColorStop(0.5, c2);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, fold, h);
  }
  const glow = ctx.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.4, w * 0.7);
  glow.addColorStop(0, 'rgba(255,250,245,0.35)');
  glow.addColorStop(1, 'rgba(150,80,100,0.12)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const list: Person[] = [];
  const n = people;
  for (let i = 0; i < n; i++) {
    const rad = h * (n === 1 ? 0.2 : 0.17) * (0.92 + r() * 0.16);
    list.push({
      x: n === 1 ? w * (0.42 + r() * 0.16) : w * (i === 0 ? 0.32 : 0.68) + (r() - 0.5) * w * 0.05,
      y: h * (0.44 + r() * 0.08),
      r: rad,
      tilt: (r() - 0.5) * 0.35,
      skin: pick(r, SKIN),
      hair: pick(r, HAIR),
      hairStyle: pick(r, HAIRS),
      shirt: pick(r, SHIRT),
      smile: r(),
    });
  }
  list.forEach((p) => drawPerson(ctx, p));

  // Same pipeline as the booth: filter shader first, then face effects on top.
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d')!;
  try {
    renderer ??= new FilterRenderer();
    renderer.render(base, w, h, filter, false, seed);
    octx.drawImage(renderer.canvas, 0, 0);
  } catch {
    octx.drawImage(base, 0, 0);
  }
  if (effect !== 'none') {
    const fx = document.createElement('canvas');
    fx.width = w;
    fx.height = h;
    drawEffects(fx.getContext('2d')!, effect, list.map((p) => landmarks(p, w, h)), w, h, false, 1200 + seed * 137);
    octx.drawImage(fx, 0, 0);
  }
  cache.set(key, out);
  return out;
}

/** Four shots for a sample strip, with a consistent look. */
export function sampleSet(seed: number, n: number, effects: EffectId[], filter: number, people: (1 | 2)[] = [1]) {
  return Array.from({ length: n }, (_, i) =>
    samplePhoto({ seed: seed + i * 7, effect: effects[i % effects.length], filter, people: people[i % people.length] })
  );
}
