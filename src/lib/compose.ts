import type { Customization, Geometry, Rect, Sticker, Template } from '../types';
import { drawSprite, spriteSize, STICKERS } from './sprites';
import { layoutGeometry } from './templates';

export interface ComposeOpts {
  template: Template;
  cust: Customization;
  images: (CanvasImageSource | null)[]; // already in slot order
  labels?: (string | null)[];
  scale: number;
  score: string;
  date?: Date;
  selectedSticker?: string | null;
  /** Show photos only in the first N slots (used for the GIF reveal). */
  reveal?: number;
}

export function composeStrip(canvas: HTMLCanvasElement, o: ComposeOpts): Geometry {
  const { template, cust, scale } = o;
  const g = layoutGeometry(template.layout, cust.slotCount);
  canvas.width = Math.round(g.w * scale);
  canvas.height = Math.round(g.h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  const c = cust.colors;
  const rand = mulberry(hash(template.id));

  // 1. Background + pattern
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, g.w, g.h);
  drawPattern(ctx, cust.pattern, g, c.ink, rand);

  // 2. Back decorations
  if (template.layout === 'film' || template.collection === 'filmroll') drawSprockets(ctx, g, template.layout === 'film', c.window);
  if (template.collection === 'cartridge') drawBezel(ctx, g, c.accent, c.shadow);

  // 3. Photo windows
  g.slots.forEach((r, i) => {
    const img = o.reveal !== undefined && i >= o.reveal ? null : o.images[i] ?? null;
    drawSlot(ctx, r, i, img, o, template.layout === 'polaroid');
  });

  // 4. Front decorations
  drawDeco(ctx, template, g, cust, rand);

  // 5. Text
  drawText(ctx, g, cust, o);

  // 6. Stickers
  cust.stickers.forEach((s) => drawSticker(ctx, s, g, cust, s.id === o.selectedSticker));
  return g;
}

function drawSlot(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  i: number,
  img: CanvasImageSource | null,
  o: ComposeOpts,
  polaroid: boolean
) {
  const c = o.cust.colors;
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  ctx.rotate(((r.rot ?? 0) * Math.PI) / 180);
  const x = -r.w / 2, y = -r.h / 2;

  if (polaroid) {
    const m = 22;
    ctx.fillStyle = c.shadow;
    ctx.fillRect(x - m + 12, y - m + 12, r.w + m * 2, r.h + m + 90);
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(x - m, y - m, r.w + m * 2, r.h + m + 90);
  } else if (c.shadow.toLowerCase() !== c.bg.toLowerCase()) {
    ctx.fillStyle = c.shadow;
    ctx.fillRect(x + 10, y + 10, r.w, r.h);
  }

  ctx.fillStyle = c.window;
  ctx.fillRect(x, y, r.w, r.h);

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, r.w, r.h);
    ctx.clip();
    drawCover(ctx, img, x, y, r.w, r.h);
    ctx.restore();
  } else {
    ctx.fillStyle = withAlpha(c.accent, 0.55);
    const s = Math.min(r.w, r.h) * 0.12;
    drawSprite(ctx, 'plus', 0, -s * 0.4, s);
    ctx.font = `700 ${Math.max(14, s * 0.45)}px "Space Mono"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SHOT ${i + 1}`, 0, s * 0.8);
  }

  if (!polaroid) drawBorder(ctx, x, y, r.w, r.h, o.cust.border, c.accent);

  const label = o.labels?.[i];
  if (label) {
    ctx.font = `700 22px "Space Mono"`;
    const tw = ctx.measureText(label).width + 20;
    ctx.fillStyle = c.accent;
    ctx.fillRect(x + 14, y + 14, tw, 34);
    ctx.fillStyle = c.window;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 24, y + 32);
  }

  if (o.template.collection === 'filmroll' || o.template.layout === 'film') {
    ctx.font = `700 20px "Space Mono"`;
    ctx.fillStyle = o.cust.colors.ink;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${String(i + 1).padStart(2, '0')}A`, x + r.w - 10, y + r.h + 4);
  }
  ctx.restore();
}

export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
  const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function drawBorder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, b: string, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.setLineDash([]);
  switch (b) {
    case 'solid':
      ctx.lineWidth = 6;
      ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
      break;
    case 'double':
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 12, y - 12, w + 24, h + 24);
      break;
    case 'dashed':
      ctx.lineWidth = 5;
      ctx.setLineDash([18, 12]);
      ctx.strokeRect(x - 8, y - 8, w + 16, h + 16);
      ctx.setLineDash([]);
      break;
    case 'pixel': {
      const p = 8;
      ctx.fillRect(x + p, y - p, w - p * 2, p);
      ctx.fillRect(x + p, y + h, w - p * 2, p);
      ctx.fillRect(x - p, y + p, p, h - p * 2);
      ctx.fillRect(x + w, y + p, p, h - p * 2);
      ctx.fillRect(x, y, p, p);
      ctx.fillRect(x + w - p, y, p, p);
      ctx.fillRect(x, y + h - p, p, p);
      ctx.fillRect(x + w - p, y + h - p, p, p);
      break;
    }
  }
}

function drawPattern(ctx: CanvasRenderingContext2D, p: string, g: Geometry, ink: string, rand: () => number) {
  ctx.save();
  switch (p) {
    case 'stars':
      ctx.globalAlpha = 0.18;
      for (let y = 30; y < g.h; y += 90)
        for (let x = ((y / 90) % 2) * 45 + 20; x < g.w; x += 90) {
          ctx.fillStyle = ink;
          ctx.fillRect(x - 2, y - 6, 4, 12);
          ctx.fillRect(x - 6, y - 2, 12, 4);
        }
      break;
    case 'dots':
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = ink;
      for (let y = 15; y < g.h; y += 30) for (let x = 15; x < g.w; x += 30) ctx.fillRect(x - 3, y - 3, 6, 6);
      break;
    case 'checker':
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = ink;
      for (let y = 0; y < g.h; y += 40) for (let x = (y / 40) % 2 === 0 ? 0 : 40; x < g.w; x += 80) ctx.fillRect(x, y, 40, 40);
      break;
    case 'grid':
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = ink;
      for (let x = 0; x < g.w; x += 24) ctx.fillRect(x, 0, 2, g.h);
      for (let y = 0; y < g.h; y += 24) ctx.fillRect(0, y, g.w, 2);
      break;
    case 'stripes':
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 18;
      for (let d = -g.h; d < g.w; d += 60) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + g.h, g.h);
        ctx.stroke();
      }
      break;
    case 'snow':
      ctx.fillStyle = ink;
      for (let i = 0; i < (g.w * g.h) / 2600; i++) {
        ctx.globalAlpha = 0.15 + rand() * 0.35;
        const s = rand() > 0.85 ? 8 : 4;
        ctx.fillRect(Math.floor(rand() * g.w), Math.floor(rand() * g.h), s, s);
      }
      break;
    case 'hearts':
      for (let y = 40; y < g.h; y += 110)
        for (let x = ((y / 110) % 2) * 55 + 30; x < g.w; x += 110) drawSprite(ctx, 'heart', x, y, 28, 0, { alpha: 0.22 });
      break;
  }
  ctx.restore();
}

function drawSprockets(ctx: CanvasRenderingContext2D, g: Geometry, sides: boolean, color: string) {
  ctx.fillStyle = color;
  if (sides) {
    for (let y = 30; y < g.h - 20; y += 70) {
      ctx.fillRect(28, y, 34, 40);
      ctx.fillRect(g.w - 62, y, 34, 40);
    }
  } else {
    for (let x = 30; x < g.w - 20; x += 70) {
      ctx.fillRect(x, 8, 36, 18);
      ctx.fillRect(x, g.h - 26, 36, 18);
    }
  }
}

function drawBezel(ctx: CanvasRenderingContext2D, g: Geometry, accent: string, dark: string) {
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, g.w - 28, g.h - 28);
  ctx.fillStyle = '#D9553F';
  ctx.fillRect(28, g.h - 44, 14, 14); // power LED
  ctx.fillStyle = dark;
  ctx.font = '700 16px "Silkscreen"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('POWER', 50, g.h - 37);
}

function insideAny(x: number, y: number, rects: Rect[], pad = 30) {
  return rects.some((r) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad + 60);
}

function drawDeco(ctx: CanvasRenderingContext2D, t: Template, g: Geometry, cust: Customization, rand: () => number) {
  const c = cust.colors;
  const scatter = (sprites: string[], count: number, size: [number, number], alpha = 1) => {
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 40) {
      const x = rand() * g.w, y = rand() * g.h;
      if (insideAny(x, y, g.slots) || insideText(x, y, g)) continue;
      const id = sprites[Math.floor(rand() * sprites.length)];
      drawSprite(ctx, id, x, y, size[0] + rand() * (size[1] - size[0]), 0, { alpha });
      placed++;
    }
  };
  switch (t.collection) {
    case 'night': {
      scatter(['plus', 'sparkle'], 14, [16, 30]);
      dashedLine(ctx, g, c.accent);
      break;
    }
    case 'gameover': {
      ctx.fillStyle = c.accent;
      const k = 26;
      [[12, 12], [g.w - 12 - k, 12], [12, g.h - 12 - k], [g.w - 12 - k, g.h - 12 - k]].forEach(([x, y]) => {
        ctx.fillRect(x, y, k, 6);
        ctx.fillRect(x, y, 6, k);
        ctx.fillRect(x + k - 6, y, 6, k);
        ctx.fillRect(x, y + k - 6, k, 6);
      });
      break;
    }
    case 'garden':
      scatter(['heart', 'flower', 'sparkle'], 18, [22, 40]);
      break;
    case 'holiday':
      scatter(['snow', 'snow', 'star'], 14, [18, 34]);
      if (t.layout !== 'wide') {
        drawSprite(ctx, 'tree', g.text.x + 30, g.text.y + g.text.h - 40, 56);
        drawSprite(ctx, 'gift', g.text.x + g.text.w - 30, g.text.y + g.text.h - 30, 44);
      }
      break;
    case 'cartridge':
      dashedLine(ctx, g, c.accent);
      break;
    case 'filmroll':
      break;
  }
}

function insideText(x: number, y: number, g: Geometry) {
  const r = g.text;
  return x > r.x - 10 && x < r.x + r.w + 10 && y > r.y - 10 && y < r.y + r.h + 10;
}

function dashedLine(ctx: CanvasRenderingContext2D, g: Geometry, color: string) {
  ctx.fillStyle = color;
  const r = g.text;
  if (r.w > r.h) for (let x = r.x; x < r.x + r.w; x += 24) ctx.fillRect(x, r.y - 4, 12, 4);
  else for (let y = r.y; y < r.y + r.h; y += 24) ctx.fillRect(r.x - 20, y, 4, 12);
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, font: string, weight: string, max: number, width: number) {
  let size = max;
  ctx.font = `${weight} ${size}px "${font}"`;
  while (size > 10 && ctx.measureText(text).width > width) {
    size -= 2;
    ctx.font = `${weight} ${size}px "${font}"`;
  }
  return size;
}

function drawText(ctx: CanvasRenderingContext2D, g: Geometry, cust: Customization, o: ComposeOpts) {
  const r = g.text;
  const c = cust.colors;
  const cx = r.x + r.w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines: { text: string; font: string; weight: string; max: number; color: string }[] = [];
  const heavy = cust.font === 'Anton' ? 110 : cust.font === 'Press Start 2P' ? 52 : 84;
  if (cust.title) lines.push({ text: cust.title, font: cust.font, weight: '400', max: Math.min(heavy, r.h * 0.42), color: c.ink });
  if (cust.subtitle) lines.push({ text: cust.subtitle, font: 'Space Mono', weight: '700', max: 30, color: c.ink });
  const meta: string[] = [];
  if (cust.showScore) meta.push(o.score);
  if (cust.showDate) meta.push(formatDate(o.date ?? new Date()));
  if (meta.length) lines.push({ text: meta.join('   '), font: 'Space Mono', weight: '400', max: 22, color: c.accent });

  const sizes = lines.map((l) => fitFont(ctx, l.text, l.font, l.weight, l.max, r.w));
  const total = sizes.reduce((a, s) => a + s * 1.25, 0);
  let y = r.y + (r.h - total) / 2;
  lines.forEach((l, i) => {
    const s = sizes[i];
    ctx.font = `${l.weight} ${s}px "${l.font}"`;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, cx, y + (s * 1.25) / 2);
    y += s * 1.25;
  });
}

export function formatDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function stickerBox(ctx: CanvasRenderingContext2D, s: Sticker, g: Geometry) {
  const def = STICKERS.find((d) => d.id === s.kind);
  const cx = s.x * g.w, cy = s.y * g.h;
  if (def?.text) {
    const size = 34 * s.scale;
    ctx.font = `400 ${size}px "Press Start 2P"`;
    const w = ctx.measureText(def.text).width + size * 0.9;
    return { cx, cy, w, h: size * 1.9, text: def.text, size };
  }
  const { w, h } = spriteSize(s.kind);
  const width = 110 * s.scale;
  return { cx, cy, w: width, h: (width * h) / w };
}

function drawSticker(ctx: CanvasRenderingContext2D, s: Sticker, g: Geometry, cust: Customization, selected: boolean) {
  const b = stickerBox(ctx, s, g);
  const rot = (s.rot * Math.PI) / 180;
  ctx.save();
  ctx.translate(b.cx, b.cy);
  ctx.rotate(rot);
  if (b.text) {
    ctx.fillStyle = cust.colors.shadow;
    ctx.fillRect(-b.w / 2 + 6, -b.h / 2 + 6, b.w, b.h);
    ctx.fillStyle = cust.colors.accent;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = cust.colors.window;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `400 ${b.size}px "Press Start 2P"`;
    ctx.fillText(b.text, 0, b.size * 0.08);
  } else {
    drawSprite(ctx, s.kind, 0, 0, b.w);
  }
  if (selected) {
    ctx.strokeStyle = '#C9F26B';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(-b.w / 2 - 10, -b.h / 2 - 10, b.w + 20, b.h + 20);
  }
  ctx.restore();
}

export function hitSticker(canvas: HTMLCanvasElement, stickers: Sticker[], g: Geometry, x: number, y: number) {
  const ctx = canvas.getContext('2d')!;
  for (let i = stickers.length - 1; i >= 0; i--) {
    const b = stickerBox(ctx, stickers[i], g);
    if (Math.abs(x - b.cx) < b.w / 2 + 12 && Math.abs(y - b.cy) < b.h / 2 + 12) return stickers[i];
  }
  return null;
}

export function withAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(url: string) {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });
    imageCache.set(url, p);
  }
  return p;
}
