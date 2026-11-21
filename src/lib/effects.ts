import type { EffectId } from '../types';
import { drawSprite } from './sprites';
import { drawBow } from './bow';

export const EFFECTS: { id: EffectId; name: string; icon: string }[] = [
  { id: 'none', name: 'No effect', icon: 'plus' },
  { id: 'bow', name: 'Big Bow', icon: 'bow' },
  { id: 'bunnyears', name: 'Bunny Ears', icon: 'bunny' },
  { id: 'shades', name: '8-bit Shades', icon: 'shades' },
  { id: 'crown', name: 'Pixel Crown', icon: 'crown' },
  { id: 'hearts', name: 'Heart Float', icon: 'heart' },
  { id: 'blush', name: 'Blush Blocks', icon: 'blush' },
  { id: 'sparkles', name: 'Sparkle Stars', icon: 'sparkle' },
  { id: 'coins', name: 'Coin Burst', icon: 'coin' },
  { id: 'catears', name: 'Cat Ears', icon: 'ear' },
  { id: 'mustache', name: 'Mustache', icon: 'mustache' },
  { id: 'hearteyes', name: 'Heart Eyes', icon: 'heart' },
  { id: 'halo', name: 'Gold Halo', icon: 'star' },
];

interface Pt {
  x: number;
  y: number;
}
type Landmarks = { x: number; y: number }[];

interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  life: number;
}
const coins: Coin[] = [];
let lastSpawn = 0;
let lastT = 0;

export function drawEffects(
  ctx: CanvasRenderingContext2D,
  effect: EffectId,
  faces: Landmarks[],
  w: number,
  h: number,
  mirror: boolean,
  t: number
) {
  ctx.clearRect(0, 0, w, h);
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  if (effect === 'none') return;

  faces = faces.map((lm, i) => steady(lm, i));
  for (const lm of faces) {
    const P = (i: number): Pt => ({ x: (mirror ? 1 - lm[i].x : lm[i].x) * w, y: lm[i].y * h });
    const mid = (a: Pt, b: Pt, k = 0.5): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    let eyeA = mid(P(33), P(133));
    let eyeB = mid(P(362), P(263));
    if (eyeB.x < eyeA.x) [eyeA, eyeB] = [eyeB, eyeA];
    const ang = Math.atan2(eyeB.y - eyeA.y, eyeB.x - eyeA.x);
    const up: Pt = { x: Math.sin(ang), y: -Math.cos(ang) };
    const side: Pt = { x: Math.cos(ang), y: Math.sin(ang) };
    const faceW = dist(P(234), P(454));
    const eyeGap = dist(eyeA, eyeB);
    const eyes = mid(eyeA, eyeB);
    const top = P(10); // hairline at the top of the forehead
    const chin = P(152);
    const faceH = dist(top, chin);
    const off = (p: Pt, u: number, s = 0): Pt => ({
      x: p.x + up.x * faceW * u + side.x * faceW * s,
      y: p.y + up.y * faceW * u + side.y * faceW * s,
    });
    // Landmark 10 sits at the hairline; the top of the head (with hair) is roughly this far above it.
    const HEAD = 0.34;

    switch (effect) {
      case 'shades': {
        // Size so each lens lands on an eye: lens centres are about 52% of the sprite width apart.
        const width = eyeGap / 0.52;
        const c = off(eyes, -0.01);
        drawSprite(ctx, 'shades', c.x, c.y, width, ang);
        break;
      }
      case 'crown': {
        const width = faceW * 0.72;
        const height = (width * 7) / 11;
        const c = off(top, HEAD + height / faceW / 2 - 0.1);
        drawSprite(ctx, 'crown', c.x, c.y, width, ang);
        break;
      }
      case 'hearts': {
        for (let k = 0; k < 4; k++) {
          const ph = (t / 1800 + k / 4) % 1;
          const c = off(top, HEAD + 0.05 + ph * 0.55, (k - 1.5) * 0.3 + Math.sin(t / 300 + k) * 0.04);
          drawSprite(ctx, 'heart', c.x, c.y, faceW * (0.13 + 0.05 * (1 - ph)), ang, { alpha: 1 - ph });
        }
        break;
      }
      case 'blush': {
        const l = mid(P(205), P(50)), r = mid(P(425), P(280));
        drawSprite(ctx, 'blush', l.x, l.y, faceW * 0.22, ang, { alpha: 0.8 });
        drawSprite(ctx, 'blush', r.x, r.y, faceW * 0.22, ang, { alpha: 0.8 });
        break;
      }
      case 'sparkles': {
        const center = mid(top, chin, 0.42);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + t / 2400;
          const pulse = 0.6 + 0.4 * Math.sin(t / 220 + k * 1.7);
          const c = { x: center.x + Math.cos(a) * faceW * 0.85, y: center.y + Math.sin(a) * faceH * 0.95 };
          drawSprite(ctx, k % 3 === 0 ? 'plus' : 'sparkle', c.x, c.y, faceW * 0.13 * pulse, 0, { alpha: 0.5 + pulse * 0.5 });
        }
        break;
      }
      case 'coins': {
        const open = dist(P(13), P(14)) / faceW;
        const mouth = mid(P(13), P(14));
        if (open > 0.07 && t - lastSpawn > 70) {
          lastSpawn = t;
          coins.push({
            x: mouth.x,
            y: mouth.y,
            vx: (Math.random() - 0.5) * faceW * 3,
            vy: -faceW * (2 + Math.random() * 1.5),
            size: faceW * (0.1 + Math.random() * 0.05),
            spin: Math.random() * 6,
            life: 1.6,
          });
        }
        break;
      }
      case 'catears': {
        const ew = faceW * 0.36;
        const l = off(top, HEAD + 0.12, -0.32), r = off(top, HEAD + 0.12, 0.32);
        drawSprite(ctx, 'ear', l.x, l.y, ew, ang - 0.22);
        drawSprite(ctx, 'ear', r.x, r.y, ew, ang + 0.22, { flipX: true });
        break;
      }
      case 'bunnyears': {
        drawBunnyEar(ctx, off(top, HEAD - 0.02, -0.17), faceW, ang - 0.18);
        drawBunnyEar(ctx, off(top, HEAD - 0.02, 0.17), faceW, ang + 0.18);
        break;
      }
      case 'mustache': {
        const mouthW = dist(P(61), P(291));
        const c = mid(P(2), P(13), 0.55);
        drawSprite(ctx, 'mustache', c.x, c.y, mouthW * 1.35, ang);
        break;
      }
      case 'hearteyes': {
        const pulse = 1 + 0.12 * Math.sin(t / 160);
        drawSprite(ctx, 'heart', eyeA.x, eyeA.y, eyeGap * 0.55 * pulse, ang);
        drawSprite(ctx, 'heart', eyeB.x, eyeB.y, eyeGap * 0.55 * pulse, ang);
        break;
      }
      case 'bow': {
        const c = off(top, HEAD + 0.02, 0.3);
        drawBow(ctx, c.x, c.y, faceW * 0.72, '#f29bb0', ang + 0.3);
        break;
      }
      case 'halo': {
        const c = off(top, HEAD + 0.22);
        const rx = faceW * 0.46, ry = faceW * 0.1;
        const px = Math.max(3, faceW * 0.045);
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(ang);
        ctx.shadowColor = 'rgba(255, 220, 120, 0.9)';
        ctx.shadowBlur = px * 1.5;
        const n = Math.round((Math.PI * (rx + ry)) / px);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const x = Math.round((Math.cos(a) * rx) / px) * px;
          const y = Math.round((Math.sin(a) * ry) / px) * px;
          ctx.fillStyle = k % 5 === Math.floor(t / 110) % 5 ? '#fff1b8' : '#DFAF37';
          ctx.fillRect(x - px / 2, y - px / 2, px, px);
        }
        ctx.restore();
        break;
      }
    }
  }

  if (effect === 'coins' || coins.length) {
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.vy += h * 1.4 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.life -= dt;
      if (c.life <= 0 || c.y > h + 50) {
        coins.splice(i, 1);
        continue;
      }
      const sx = Math.abs(Math.cos(t / 150 + c.spin));
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(Math.max(0.15, sx), 1);
      drawSprite(ctx, 'coin', 0, 0, c.size);
      ctx.restore();
    }
    if (effect !== 'coins') coins.length = 0;
  }
}

/** Light smoothing so effects stay steady, while still snapping to quick movements. */
const prev: Landmarks[] = [];
function steady(lm: Landmarks, i: number): Landmarks {
  const p = prev[i];
  if (!p || p.length !== lm.length) {
    prev[i] = lm.map((q) => ({ x: q.x, y: q.y }));
    return prev[i];
  }
  const jump = Math.hypot(lm[1].x - p[1].x, lm[1].y - p[1].y);
  const k = jump > 0.04 ? 1 : jump > 0.012 ? 0.6 : 0.35;
  for (let j = 0; j < lm.length; j++) {
    p[j].x += (lm[j].x - p[j].x) * k;
    p[j].y += (lm[j].y - p[j].y) * k;
  }
  return p;
}

function drawBunnyEar(ctx: CanvasRenderingContext2D, base: Pt, faceW: number, ang: number) {
  const len = faceW * 0.62, wid = faceW * 0.17;
  ctx.save();
  ctx.translate(base.x, base.y);
  ctx.rotate(ang);
  ctx.lineWidth = Math.max(2, faceW * 0.012);
  ctx.strokeStyle = '#6b4a52';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -len / 2, wid, len / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f7b6c6';
  ctx.beginPath();
  ctx.ellipse(0, -len / 2 + len * 0.04, wid * 0.5, len * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
