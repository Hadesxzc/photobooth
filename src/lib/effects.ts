import type { EffectId } from '../types';
import { drawSprite } from './sprites';

export const EFFECTS: { id: EffectId; name: string; icon: string }[] = [
  { id: 'none', name: 'No effect', icon: 'plus' },
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
    const eyes = mid(eyeA, eyeB);
    const top = P(10);
    const off = (p: Pt, u: number, s = 0): Pt => ({
      x: p.x + up.x * faceW * u + side.x * faceW * s,
      y: p.y + up.y * faceW * u + side.y * faceW * s,
    });

    switch (effect) {
      case 'shades': {
        const c = off(eyes, 0.02);
        drawSprite(ctx, 'shades', c.x, c.y, faceW * 0.98, ang);
        break;
      }
      case 'crown': {
        const c = off(top, 0.22);
        drawSprite(ctx, 'crown', c.x, c.y, faceW * 0.62, ang);
        break;
      }
      case 'hearts': {
        for (let k = 0; k < 4; k++) {
          const ph = (t / 1800 + k / 4) % 1;
          const c = off(top, 0.12 + ph * 0.55, (k - 1.5) * 0.28 + Math.sin(t / 300 + k) * 0.04);
          drawSprite(ctx, 'heart', c.x, c.y, faceW * (0.12 + 0.05 * (1 - ph)), ang, { alpha: 1 - ph });
        }
        break;
      }
      case 'blush': {
        const l = mid(P(205), P(50)), r = mid(P(425), P(280));
        drawSprite(ctx, 'blush', l.x, l.y, faceW * 0.2, ang, { alpha: 0.8 });
        drawSprite(ctx, 'blush', r.x, r.y, faceW * 0.2, ang, { alpha: 0.8 });
        break;
      }
      case 'sparkles': {
        const center = mid(eyes, P(152), 0.3);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + t / 2400;
          const pulse = 0.6 + 0.4 * Math.sin(t / 220 + k * 1.7);
          const c = {
            x: center.x + Math.cos(a) * faceW * 0.8,
            y: center.y + Math.sin(a) * faceW * 0.95,
          };
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
        const l = off(top, 0.12, -0.3), r = off(top, 0.12, 0.3);
        drawSprite(ctx, 'ear', l.x, l.y, faceW * 0.3, ang - 0.15);
        drawSprite(ctx, 'ear', r.x, r.y, faceW * 0.3, ang + 0.15, { flipX: true });
        break;
      }
      case 'mustache': {
        const c = mid(P(2), P(13), 0.55);
        drawSprite(ctx, 'mustache', c.x, c.y, faceW * 0.46, ang);
        break;
      }
      case 'hearteyes': {
        const pulse = 1 + 0.12 * Math.sin(t / 160);
        drawSprite(ctx, 'heart', eyeA.x, eyeA.y, faceW * 0.24 * pulse, ang);
        drawSprite(ctx, 'heart', eyeB.x, eyeB.y, faceW * 0.24 * pulse, ang);
        break;
      }
      case 'halo': {
        const c = off(top, 0.3);
        const px = faceW * 0.04;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(ang);
        for (let k = 0; k < 28; k++) {
          const a = (k / 28) * Math.PI * 2;
          const x = Math.round((Math.cos(a) * faceW * 0.36) / px) * px;
          const y = Math.round((Math.sin(a) * faceW * 0.09) / px) * px;
          ctx.fillStyle = k % 4 === Math.floor(t / 120) % 4 ? '#f6d77a' : '#DFAF37';
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

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
