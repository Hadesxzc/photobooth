import type { Customization, Geometry, Rect, Sticker, Template } from '../types';
import { drawSprite, spriteSize, STICKERS } from './sprites';
import { layoutGeometry } from './templates';
import { drawBalloon, drawOutlinedStar, drawPuffyText, drawRainbow, drawShootingStar, drawStarBear } from './bow';
import { drawBow, drawBunny, drawCherry, drawFlower, drawHeart, drawLace, drawPearl, drawPearlRow, drawSparkle, drawStar, drawStrawberry } from './bow';
import type { SprinkleId } from '../types';

const ELEGANT = ['Pinyon Script', 'Playfair Display'];
const ROUNDED = ['Fredoka'];

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
  }
  const b = o.cust.border;
  const mat = !polaroid && (b === 'white' || b === 'lace' || b === 'pearl') ? 14 : 0;
  const radius = b === 'rounded' ? Math.min(r.w, r.h) * 0.08 : 0;
  if (!polaroid && c.shadow.toLowerCase() !== c.bg.toLowerCase()) {
    ctx.fillStyle = c.shadow;
    ctx.beginPath();
    ctx.roundRect(x - mat + 10, y - mat + 10, r.w + mat * 2, r.h + mat * 2, radius);
    ctx.fill();
  }
  if (mat) {
    if (b === 'lace') drawLace(ctx, x - mat, y - mat, r.w + mat * 2, r.h + mat * 2, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - mat, y - mat, r.w + mat * 2, r.h + mat * 2);
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, r.w, r.h, radius);
  ctx.clip();
  ctx.fillStyle = c.window;
  ctx.fillRect(x, y, r.w, r.h);
  if (img) {
    drawCover(ctx, img, x, y, r.w, r.h);
    if (o.cust.sprinkles?.length) drawSprinkles(ctx, o.cust.sprinkles, x, y, r.w, r.h, i);
  }
  ctx.restore();

  if (b === 'pearl') {
    const pr = 6;
    drawPearlRow(ctx, x - mat / 2, x + r.w + mat / 2, y - mat / 2, pr);
    drawPearlRow(ctx, x - mat / 2, x + r.w + mat / 2, y + r.h + mat / 2, pr);
    const n = Math.max(2, Math.floor(r.h / (pr * 2.4)));
    for (let k = 1; k < n; k++) {
      drawPearl(ctx, x - mat / 2, y - mat / 2 + ((r.h + mat) * k) / n, pr);
      drawPearl(ctx, x + r.w + mat / 2, y - mat / 2 + ((r.h + mat) * k) / n, pr);
    }
  }
  if (b === 'washi') {
    const tw = Math.min(110, r.w * 0.3), th = tw * 0.3;
    for (const [tx, rot] of [[x + 6, -0.6], [x + r.w - 6, 0.6]] as const) {
      ctx.save();
      ctx.translate(tx, y + 4);
      ctx.rotate(rot);
      ctx.shadowColor = 'rgba(120, 50, 70, 0.25)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = 'rgba(255, 250, 246, 0.92)';
      ctx.fillRect(-tw / 2, -th / 2, tw, th);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(232, 137, 162, 0.6)';
      for (let d = -tw / 2 + 5; d < tw / 2 - 3; d += 13) ctx.fillRect(d, -th / 2, 5, th);
      ctx.restore();
    }
  }

  if (!img) {
    const s = Math.min(r.w, r.h) * 0.12;
    const elegant = ELEGANT.includes(o.cust.font);
    if (elegant) drawHeart(ctx, 0, -s * 0.4, s, '#ffffff', 0.9);
    else drawSprite(ctx, 'plus', 0, -s * 0.4, s);
    ctx.fillStyle = elegant ? withAlpha(c.ink, 0.6) : withAlpha(c.accent, 0.55);
    ctx.font = elegant ? `italic 500 ${Math.max(14, s * 0.5)}px "Playfair Display"` : `700 ${Math.max(14, s * 0.45)}px "Space Mono"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(elegant ? `photo ${i + 1}` : `SHOT ${i + 1}`, 0, s * 0.8);
  }

  if (!polaroid && !mat && b !== 'washi' && b !== 'rounded') drawBorder(ctx, x, y, r.w, r.h, b, c.accent);
  if (b === 'rounded') {
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, r.w + 4, r.h + 4, radius + 2);
    ctx.stroke();
  }

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
    case 'gingham': {
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.07;
      for (let x = 0; x < g.w; x += 60) ctx.fillRect(x, 0, 30, g.h);
      for (let y = 0; y < g.h; y += 60) ctx.fillRect(0, y, g.w, 30);
      break;
    }
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
    case 'dream': {
      // scattered pastel stars and dots in the margins
      const starCols = ['#fff3a3', '#ffa9c9', '#b9d8ff', '#b8f0d2'];
      let placed = 0, tries = 0;
      while (placed < 16 && tries++ < 600) {
        const x = rand() * g.w, y = rand() * g.h;
        if (insideAny(x, y, g.slots, 14) || insideText(x, y, g)) continue;
        if (placed % 3 === 2) {
          ctx.fillStyle = starCols[placed % 4];
          ctx.beginPath();
          ctx.arc(x, y, 5 + rand() * 4, 0, Math.PI * 2);
          ctx.fill();
        } else drawOutlinedStar(ctx, x, y, 18 + rand() * 14, starCols[placed % 4], rand() * 0.6 - 0.3);
        placed++;
      }
      const r0 = g.slots[0];
      const tr = g.text;
      if (t.layout === 'wide') {
        drawRainbow(ctx, tr.x + tr.w / 2, tr.y + 120, 110);
        drawStarBear(ctx, tr.x + tr.w / 2, tr.y + tr.h - 70, 110);
      } else if (t.layout === 'grid' || t.layout === 'polaroid') {
        drawRainbow(ctx, r0.x + 70, r0.y + 30, 90);
        drawBalloon(ctx, g.w - 70, r0.y + 40, 70);
        drawStarBear(ctx, tr.x + tr.w - 80, tr.y + tr.h / 2 + 6, 120, 0.08);
        drawShootingStar(ctx, tr.x + 70, tr.y + 30, 40);
      } else {
        drawRainbow(ctx, r0.x + 60, r0.y + 22, 70);
        drawBalloon(ctx, r0.x + r0.w - 30, r0.y + 34, 54);
        drawStarBear(ctx, tr.x + tr.w - 40, tr.y + 6, 80, 0.12);
        drawShootingStar(ctx, tr.x + 50, tr.y + tr.h - 26, 30);
      }
      break;
    }
    case 'kawaii': {
      // polka dots in white over the pink pattern, berries in the margins, Mochi peeking in
      let placed = 0, tries = 0;
      while (placed < 10 && tries++ < 400) {
        const x = rand() * g.w, y = rand() * g.h;
        if (insideAny(x, y, g.slots, 16) || insideText(x, y, g)) continue;
        if (placed % 2) drawStrawberry(ctx, x, y, 26 + rand() * 14);
        else drawHeart(ctx, x, y, 18 + rand() * 10, '#ff8fa8', 0.7);
        placed++;
      }
      const tr = g.text;
      if (t.layout === 'wide') drawBunny(ctx, tr.x + tr.w / 2, tr.y + 70, 120);
      else if (t.layout === 'polaroid' || t.layout === 'grid') {
        drawBunny(ctx, tr.x + 70, tr.y + tr.h / 2, 110, -0.12);
        drawBunny(ctx, tr.x + tr.w - 70, tr.y + tr.h / 2, 110, 0.12);
      } else {
        const r0 = g.slots[0];
        drawBunny(ctx, r0.x + r0.w - 40, r0.y + 30, Math.min(140, r0.w * 0.28), 0.15);
        drawBunny(ctx, tr.x + tr.w - 34, tr.y + 6, 68, 0.12);
      }
      break;
    }
    case 'coquette': {
      const bowColor = '#f29bb0';
      const small = Math.min(g.w, g.h) * 0.035;
      scatterHearts(ctx, g, rand, c.ink, small);
      if (t.layout === 'polaroid') {
        g.slots.forEach((r, i) => drawBow(ctx, r.x + r.w / 2, r.y - 26, r.w * 0.32, bowColor, ((r.rot ?? 0) * Math.PI) / 180 + (i % 2 ? 0.08 : -0.08)));
      } else {
        const r0 = g.slots[0];
        drawBow(ctx, r0.x + r0.w / 2, r0.y + 4, Math.min(r0.w * 0.36, 190), bowColor);
        const last = g.slots[g.slots.length - 1];
        if (t.layout === 'wide') drawBow(ctx, last.x + last.w - 10, last.y + last.h - 10, 90, bowColor, 0.4);
      }
      const tr = g.text;
      if (tr.w > tr.h) drawPearlRow(ctx, tr.x + 20, tr.x + tr.w - 20, tr.y + 4, 7, 10);
      else drawPearlRow(ctx, tr.x, tr.x + tr.w, tr.y + tr.h - 10, 6, 8);
      break;
    }
  }
}

function scatterHearts(ctx: CanvasRenderingContext2D, g: Geometry, rand: () => number, color: string, size: number) {
  let placed = 0, tries = 0;
  while (placed < 12 && tries++ < 600) {
    const x = rand() * g.w, y = rand() * g.h;
    if (insideAny(x, y, g.slots, 20) || insideText(x, y, g)) continue;
    drawHeart(ctx, x, y, size * (0.7 + rand() * 0.8), color, 0.35 + rand() * 0.3);
    placed++;
  }
}

/** Little decorations scattered around the edges of each photo, kept away from the middle where faces are. */
function drawSprinkles(ctx: CanvasRenderingContext2D, kinds: SprinkleId[], x: number, y: number, w: number, h: number, seed: number) {
  const rand = mulberry(seed * 977 + 13);
  const base = Math.min(w, h);
  const spots: [number, number][] = [
    [0.1, 0.12], [0.88, 0.1], [0.08, 0.86], [0.9, 0.88], [0.5, 0.06], [0.06, 0.5], [0.94, 0.48],
  ];
  const count = 5;
  for (let k = 0; k < count; k++) {
    const [fx, fy] = spots[(k + seed) % spots.length];
    const px = x + w * (fx + (rand() - 0.5) * 0.06);
    const py = y + h * (fy + (rand() - 0.5) * 0.06);
    const kind = kinds[(k + seed) % kinds.length];
    const s = base * (0.1 + rand() * 0.06);
    switch (kind) {
      case 'strawberries':
        drawStrawberry(ctx, px, py, s * 1.1);
        break;
      case 'bows':
        drawBow(ctx, px, py, s * 1.4, '#f29bb0', (rand() - 0.5) * 0.6);
        break;
      case 'hearts':
        drawHeart(ctx, px, py, s, ['#f29bb0', '#e46a86', '#ffffff'][k % 3], 0.95);
        break;
      case 'pearls':
        drawPearl(ctx, px, py, s * 0.18);
        drawPearl(ctx, px + s * 0.34, py + s * 0.12, s * 0.14);
        drawPearl(ctx, px - s * 0.3, py + s * 0.16, s * 0.12);
        break;
      case 'cherries':
        drawCherry(ctx, px, py, s * 1.1);
        break;
      case 'sparkles':
        drawSparkle(ctx, px, py, s, k % 2 ? '#ffffff' : '#ffe39a', 0.95);
        break;
      case 'flowers':
        drawFlower(ctx, px, py, s, k % 2 ? '#ffffff' : '#f8c6d3');
        break;
      case 'stars':
        drawStar(ctx, px, py, s * 0.9, k % 2 ? '#ffe39a' : '#ffffff');
        break;
    }
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
  const elegant = ELEGANT.includes(cust.font);
  const heavy = cust.font === 'Anton' ? 110 : cust.font === 'Press Start 2P' ? 52 : cust.font === 'Pinyon Script' ? 170 : cust.font === 'Fredoka' ? 92 : cust.font === 'Shrikhand' ? 96 : 84;
  const subFont = elegant ? 'Playfair Display' : 'Space Mono';
  const subWeight = elegant ? 'italic 500' : '700';
  if (cust.title) lines.push({ text: cust.title, font: cust.font, weight: cust.font === 'Playfair Display' ? 'italic 700' : ROUNDED.includes(cust.font) ? '700' : '400', max: Math.min(heavy, r.h * (cust.font === 'Pinyon Script' ? 0.62 : 0.46)), color: c.ink });
  if (cust.subtitle) lines.push({ text: cust.subtitle, font: subFont, weight: subWeight, max: 30, color: c.ink });
  const meta: string[] = [];
  if (cust.showScore) meta.push(o.score);
  if (cust.showDate) meta.push(formatDate(o.date ?? new Date()));
  if (meta.length) lines.push({ text: meta.join('   '), font: subFont, weight: elegant ? 'italic 500' : '400', max: 22, color: elegant ? c.ink : c.accent });

  const sizes = lines.map((l) => fitFont(ctx, l.text, l.font, l.weight, l.max, r.w));
  const total = sizes.reduce((a, s) => a + s * 1.25, 0);
  let y = r.y + (r.h - total) / 2;
  const puffy = o.template.collection === 'dream' && cust.font === 'Fredoka';
  lines.forEach((l, i) => {
    const s = sizes[i];
    if (puffy && i === 0 && cust.title) {
      drawPuffyText(ctx, l.text, cx, y + (s * 1.25) / 2, s * 1.05, r.w);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    } else {
      ctx.font = `${l.weight} ${s}px "${l.font}"`;
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, cx, y + (s * 1.25) / 2);
    }
    y += s * 1.25;
  });
}

export function formatDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

const SCRIPT_STICKERS = ['t-xoxo', 't-cutie'];

export function stickerBox(ctx: CanvasRenderingContext2D, s: Sticker, g: Geometry) {
  const def = STICKERS.find((d) => d.id === s.kind);
  const cx = s.x * g.w, cy = s.y * g.h;
  if (def?.text && SCRIPT_STICKERS.includes(s.kind)) {
    const size = 72 * s.scale;
    ctx.font = `400 ${size}px "Pinyon Script"`;
    return { cx, cy, w: ctx.measureText(def.text).width + 10, h: size * 1.1, text: def.text, size, script: true };
  }
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
  if (b.text && b.script) {
    ctx.font = `400 ${b.size}px "Pinyon Script"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = b.size * 0.12;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = cust.colors.ink;
    ctx.fillText(b.text, 0, 0);
  } else if (b.text) {
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
