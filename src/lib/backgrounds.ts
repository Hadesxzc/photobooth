// Backdrops for background replacement. Each one is drawn from a strip collection's own palette, pattern
// and decorations (the same helpers the strips use), so the photo and the strip around it match.
// Decor sits along the top, sides and corners, where people usually aren't standing.
import type { BackgroundId, CollectionId } from '../types';
import { COLLECTIONS } from './templates';
import { drawPattern, mulberry, withAlpha } from './compose';
import { drawSprite } from './sprites';
import {
  drawBow, drawPearlRow, drawHeart, drawSparkle, drawStrawberry, drawBunny, drawCloud, drawRainbow,
  drawOutlinedStar, drawShootingStar, drawStarBear, drawLace, drawFlower, drawBalloon,
} from './bow';

export type { BackgroundId };

export const BACKGROUNDS: { id: BackgroundId; name: string }[] = [
  { id: 'none', name: 'My room' },
  ...COLLECTIONS.map((c) => ({ id: c.id as BackgroundId, name: c.name })),
];

/** Wide enough to cover both a single camera (4:3) and the shared two-person frame. */
export const BG_W = 1600;
export const BG_H = 1000;

const cache = new Map<string, HTMLCanvasElement>();

export function getBackground(id: BackgroundId): HTMLCanvasElement | null {
  if (id === 'none') return null;
  const hit = cache.get(id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = BG_W;
  c.height = BG_H;
  paint(c.getContext('2d')!, id);
  cache.set(id, c);
  return c;
}

/** Small preview for the picker. */
export function backgroundThumb(id: BackgroundId, w = 120): string | null {
  const bg = getBackground(id);
  if (!bg) return null;
  const t = document.createElement('canvas');
  t.width = w;
  t.height = Math.round((w * BG_H) / BG_W);
  t.getContext('2d')!.drawImage(bg, 0, 0, t.width, t.height);
  return t.toDataURL('image/jpeg', 0.85);
}

const W = BG_W, H = BG_H;
const G = { w: W, h: H, slots: [], text: { x: 0, y: 0, w: 0, h: 0 } };

function vgrad(ctx: CanvasRenderingContext2D, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Soft light in the middle so faces read well against the backdrop. */
function glow(ctx: CanvasRenderingContext2D, color: string, a: number) {
  const g = ctx.createRadialGradient(W / 2, H * 0.55, 60, W / 2, H * 0.55, W * 0.6);
  g.addColorStop(0, withAlpha(color, a));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Positions around the edges, avoiding the centre where people stand. */
function edgeSpots(rand: () => number, n: number) {
  const out: [number, number][] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 50) {
    const x = rand() * W, y = rand() * H;
    const inCentre = x > W * 0.22 && x < W * 0.78 && y > H * 0.28;
    if (!inCentre) out.push([x, y]);
  }
  return out;
}

function pixelFloor(ctx: CanvasRenderingContext2D, color: string, line: string, horizon: number) {
  ctx.fillStyle = color;
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 40, horizon);
    ctx.lineTo(W / 2 + i * 260, H);
    ctx.stroke();
  }
  for (let k = 1; k < 8; k++) {
    const y = horizon + (H - horizon) * Math.pow(k / 8, 1.8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function paint(ctx: CanvasRenderingContext2D, id: CollectionId) {
  const col = COLLECTIONS.find((c) => c.id === id)!;
  const p = col.palette;
  const rand = mulberry(id.length * 7919 + id.charCodeAt(0));
  ctx.save();
  ctx.lineJoin = 'round'; // the outline helpers join arcs; round joins avoid spiky corners at this size
  ctx.lineCap = 'round';
  switch (id) {
    case 'coquette': {
      vgrad(ctx, '#fdeef1', p.bg);
      drawPattern(ctx, 'gingham', G, p.ink, rand);
      glow(ctx, '#ffffff', 0.55);
      // Pearl garlands with bows across the top
      for (let i = 0; i < 4; i++) drawPearlRow(ctx, i * 400 - 20, i * 400 + 420, 70, 9, 70);
      for (let i = 0; i <= 4; i++) drawBow(ctx, i * 400, 70, 150, '#f29bb0', (i % 2 ? 1 : -1) * 0.12);
      drawLace(ctx, 0, H - 26, W, 40, 14, '#ffffff');
      for (const [x, y] of edgeSpots(rand, 18)) drawHeart(ctx, x, y + 120, 22 + rand() * 18, p.accent, 0.8);
      break;
    }
    case 'kawaii': {
      vgrad(ctx, '#fff7f9', p.bg);
      drawPattern(ctx, 'dots', G, p.accent, rand);
      glow(ctx, '#ffffff', 0.5);
      drawCloud(ctx, 230, 120, 260);
      drawCloud(ctx, W - 240, 100, 300);
      for (const [x, y] of edgeSpots(rand, 12)) drawStrawberry(ctx, x, y + 80, 50 + rand() * 30);
      drawBunny(ctx, 150, H - 150, 220, -0.08);
      drawBunny(ctx, W - 150, H - 150, 220, 0.08);
      break;
    }
    case 'dream': {
      vgrad(ctx, '#d9c6ff', '#f6f0ff');
      glow(ctx, '#ffffff', 0.45);
      drawRainbow(ctx, W / 2, H * 0.62, 560);
      for (const [x, y] of edgeSpots(rand, 16)) drawOutlinedStar(ctx, x, y, 26 + rand() * 26, '#fff3a3', rand() * 0.6);
      drawShootingStar(ctx, W * 0.78, 140, 120);
      drawStarBear(ctx, 160, H - 170, 200, -0.1);
      drawBalloon(ctx, W - 170, 260, 120);
      break;
    }
    case 'night': {
      vgrad(ctx, '#0c0a09', p.bg);
      drawPattern(ctx, 'stars', G, p.ink, rand);
      pixelFloor(ctx, '#0c0a09', p.accent, H * 0.72);
      glow(ctx, p.accent, 0.08);
      // Pixel moon
      ctx.fillStyle = '#DFAF37';
      for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36 && (x - 3) * (x - 3) + y * y > 20) ctx.fillRect(W - 220 + x * 10, 150 + y * 10, 10, 10);
      for (const [x, y] of edgeSpots(rand, 16)) drawSprite(ctx, rand() > 0.5 ? 'plus' : 'sparkle', x, Math.min(y, H * 0.68), 18 + rand() * 18, 0, { tint: p.accent });
      break;
    }
    case 'gameover': {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f4f4f0';
      for (let i = 0; i < 160; i++) {
        ctx.globalAlpha = 0.2 + rand() * 0.6;
        const s = rand() > 0.9 ? 8 : 4;
        ctx.fillRect(Math.floor(rand() * W), Math.floor(rand() * H * 0.7), s, s);
      }
      ctx.globalAlpha = 1;
      pixelFloor(ctx, '#000000', '#f4f4f0', H * 0.74);
      ctx.font = '40px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS START', W / 2, 90);
      const k = 60;
      [[30, 30], [W - 30 - k, 30], [30, H - 30 - k], [W - 30 - k, H - 30 - k]].forEach(([x, y]) => {
        ctx.fillRect(x, y, k, 10);
        ctx.fillRect(x, y, 10, k);
        ctx.fillRect(x + k - 10, y, 10, k);
        ctx.fillRect(x, y + k - 10, k, 10);
      });
      break;
    }
    case 'cartridge': {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W, H);
      drawPattern(ctx, 'grid', G, p.ink, rand);
      // Pixel hills
      ctx.fillStyle = '#8bac0f';
      for (let x = 0; x < W; x += 20) {
        const h = 120 + Math.round((Math.sin(x / 160) * 50 + Math.sin(x / 60) * 16) / 20) * 20;
        ctx.fillRect(x, H - h, 20, h);
      }
      ctx.fillStyle = p.accent;
      ctx.fillRect(0, H - 60, W, 60);
      for (const [x, y] of edgeSpots(rand, 12)) drawSprite(ctx, 'coin', x, Math.min(y, H * 0.7), 56);
      ctx.fillStyle = p.ink;
      ctx.font = '36px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LEVEL 01', W / 2, 80);
      break;
    }
    case 'garden': {
      vgrad(ctx, '#efe8d4', p.bg);
      drawPattern(ctx, 'hearts', G, p.ink, rand);
      glow(ctx, '#ffffff', 0.4);
      for (let x = 40; x < W; x += 110) drawFlower(ctx, x, H - 50 - (x % 3) * 18, 70, x % 2 ? '#ffffff' : '#ffd3df');
      for (const [x, y] of edgeSpots(rand, 14)) drawSparkle(ctx, x, Math.min(y, H * 0.8), 20 + rand() * 20, p.shadow, 0.9);
      break;
    }
    case 'holiday': {
      vgrad(ctx, '#09141e', p.bg);
      drawPattern(ctx, 'snow', G, p.ink, rand);
      ctx.fillStyle = '#e8eef2';
      ctx.fillRect(0, H - 90, W, 90);
      for (let x = 60; x < W; x += 200) if (x < W * 0.25 || x > W * 0.72) drawSprite(ctx, 'tree', x, H - 170, 150);
      drawSprite(ctx, 'gift', 260, H - 110, 70);
      drawSprite(ctx, 'gift', W - 260, H - 110, 70);
      // String of lights
      ctx.strokeStyle = '#3b2b20';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 60 + Math.sin((x / W) * Math.PI * 4) * 26);
      ctx.stroke();
      for (let x = 30, i = 0; x < W; x += 80, i++) {
        ctx.fillStyle = [p.accent, p.shadow, '#7fd1a8', '#9cc8ff'][i % 4];
        ctx.fillRect(x - 8, 66 + Math.sin((x / W) * Math.PI * 4) * 26, 16, 20);
      }
      break;
    }
    case 'filmroll': {
      vgrad(ctx, '#2a2620', p.bg);
      const leak = ctx.createRadialGradient(W * 0.9, H * 0.15, 20, W * 0.9, H * 0.15, W * 0.6);
      leak.addColorStop(0, 'rgba(223,175,55,0.45)');
      leak.addColorStop(1, 'rgba(223,175,55,0)');
      ctx.fillStyle = leak;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0e0d0b';
      ctx.fillRect(0, 0, W, 70);
      ctx.fillRect(0, H - 70, W, 70);
      ctx.fillStyle = '#3a362f';
      for (let x = 20; x < W; x += 70) {
        ctx.fillRect(x, 20, 36, 28);
        ctx.fillRect(x, H - 48, 36, 28);
      }
      ctx.fillStyle = p.ink;
      ctx.font = '22px "Space Mono", monospace';
      for (let x = 60, n = 1; x < W; x += 280, n++) ctx.fillText(`${n}A`, x, H - 80);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(255,240,210,${0.04 + rand() * 0.1})`;
        ctx.fillRect(rand() * W, rand() * H, 2, 2 + rand() * 6);
      }
      break;
    }
  }
  ctx.restore();
}

/**
 * Maps a camera's screen uv to backdrop uv. The backdrop covers the whole camera box (aspect `boxAspect`),
 * while this video is shown "cover"-style inside the region [x0, x1] of the box (the full box for one camera,
 * or one half of the shared two-person frame). So both halves show their own part of one continuous scene,
 * and the saved photo (cropped the same way) matches the preview.
 */
export function backgroundMap(videoAspect: number, boxAspect: number, x0 = 0, x1 = 1): [number, number, number, number] {
  const A = boxAspect;
  const rw = (x1 - x0) * A; // region size in box units (box height = 1)
  const s = Math.max(rw / videoAspect, 1);
  const dw = videoAspect * s, dh = s;
  const dx = x0 * A + (rw - dw) / 2, dy = (1 - dh) / 2;
  const ba = BG_W / BG_H;
  const sb = Math.max(A / ba, 1);
  const bw = ba * sb, bh = sb;
  const bx = (A - bw) / 2, by = (1 - bh) / 2;
  return [dw / bw, dh / bh, (dx - bx) / bw, (dy - by) / bh];
}
