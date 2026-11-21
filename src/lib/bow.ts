// Smooth vector ornaments for the coquette look: ribbon bows, pearls and hearts.

export function drawBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color = '#f29bb0',
  angle = 0,
  alpha = 1
) {
  const s = size / 100;
  const dark = shade(color, -0.22);
  const light = shade(color, 0.35);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = dark;

  // tails
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * 4, 4);
    ctx.bezierCurveTo(d * 14, 30, d * 18, 52, d * 30, 76);
    ctx.lineTo(d * 20, 70);
    ctx.lineTo(d * 14, 82);
    ctx.bezierCurveTo(d * 6, 56, d * 2, 30, d * -4, 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
  }
  // loops
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(d * 18, -34, d * 54, -36, d * 50, -6);
    ctx.bezierCurveTo(d * 48, 18, d * 22, 14, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
    // inner fold
    ctx.beginPath();
    ctx.moveTo(d * 8, -2);
    ctx.bezierCurveTo(d * 20, -18, d * 36, -20, d * 38, -6);
    ctx.strokeStyle = light;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
  }
  // knot
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, -0.08);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-3, -4, 3, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = light;
  ctx.fill();
  ctx.restore();
}

export function drawPearl(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#f7efe8');
  g.addColorStop(1, '#d9c8bd');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPearlRow(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, r: number, sag = 0) {
  const n = Math.max(2, Math.floor((x2 - x1) / (r * 2.4)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    drawPearl(ctx, x1 + (x2 - x1) * t, y + Math.sin(t * Math.PI) * sag, r);
  }
}

export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1) {
  const s = size / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.3, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  ctx.fill();
  ctx.restore();
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => Math.round(Math.min(255, Math.max(0, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

export function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1) {
  const r = size / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r);
  ctx.fill();
  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const R = size / 2, r = R * 0.45;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawCherry(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const r = size * 0.24;
  ctx.save();
  ctx.strokeStyle = '#5d8a3a';
  ctx.lineWidth = Math.max(1.5, size * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 1.1, y + r * 0.4);
  ctx.quadraticCurveTo(x - r * 0.6, y - r * 1.6, x + r * 0.2, y - r * 2.1);
  ctx.moveTo(x + r * 1.1, y + r * 0.6);
  ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.2, x + r * 0.2, y - r * 2.1);
  ctx.stroke();
  ctx.fillStyle = '#6fa24a';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.8, y - r * 2.1, r * 0.6, r * 0.28, -0.4, 0, Math.PI * 2);
  ctx.fill();
  for (const [cx, cy] of [[x - r * 1.1, y + r * 0.9], [x + r * 1.1, y + r * 1.1]]) {
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ff8a9a');
    g.addColorStop(1, '#c8203f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, petal = '#ffffff') {
  const r = size / 2;
  ctx.save();
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.42, r * 0.3, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f6cf5c';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Scalloped lace edge around a rectangle. */
export function drawLace(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color = '#ffffff') {
  ctx.save();
  ctx.fillStyle = color;
  const along = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(len / (r * 1.8)));
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.arc(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  along(x, y, x + w, y);
  along(x, y + h, x + w, y + h);
  along(x, y, x, y + h);
  along(x + w, y, x + w, y + h);
  ctx.restore();
}

export function drawStrawberry(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(-s * 0.3, -s * 0.1, s * 0.1, 0, s * 0.1, s);
  g.addColorStop(0, '#ff7b8f');
  g.addColorStop(1, '#e0344f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.95);
  ctx.bezierCurveTo(-s * 1.05, s * 0.3, -s * 0.85, -s * 0.6, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.85, -s * 0.6, s * 1.05, s * 0.3, 0, s * 0.95);
  ctx.fill();
  ctx.fillStyle = '#ffe6a8';
  for (const [sx, sy] of [[-0.35, 0], [0.3, -0.05], [0, 0.3], [-0.2, 0.55], [0.25, 0.5], [0, -0.2]]) {
    ctx.beginPath();
    ctx.ellipse(sx * s, sy * s, s * 0.05, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5fa04a';
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * s * 0.3, -s * 0.5 + Math.sin(a) * s * 0.15, s * 0.22, s * 0.09, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Mochi the bunny: an original mascot for the Strawberry Milk collection. */
export function drawBunny(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle = 0) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#6b4a52';
  ctx.lineJoin = 'round';
  // ears
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * 18, -34);
    ctx.rotate(d * 0.16);
    ctx.fillStyle = '#fffaf5';
    ctx.beginPath();
    ctx.ellipse(0, -30, 13, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f9bfcd';
    ctx.beginPath();
    ctx.ellipse(0, -28, 6, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // head
  ctx.fillStyle = '#fffaf5';
  ctx.beginPath();
  ctx.ellipse(0, 4, 50, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // eyes
  ctx.fillStyle = '#3d2a2f';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(d * 18, 2, 5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(d * 18 - 1.5, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // blush
  ctx.fillStyle = 'rgba(247, 140, 165, 0.6)';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(d * 31, 15, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // nose and mouth
  ctx.fillStyle = '#f08aa3';
  ctx.beginPath();
  ctx.ellipse(0, 12, 3.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-7, 17);
  ctx.quadraticCurveTo(-3.5, 22, 0, 17);
  ctx.quadraticCurveTo(3.5, 22, 7, 17);
  ctx.stroke();
  ctx.restore();
  // strawberry hair clip at the base of the right ear
  drawStrawberry(ctx, x + Math.cos(angle) * 30 * s - Math.sin(angle) * -36 * s, y + Math.sin(angle) * 30 * s + Math.cos(angle) * -36 * s, 20 * s);
}

// ---- Dreamland: sticker-style pastel pieces with thick dark outlines ----
const DREAM_INK = '#3a2a4f';

export function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const r = w / 4;
  ctx.save();
  ctx.lineWidth = Math.max(2, w * 0.045);
  ctx.strokeStyle = DREAM_INK;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - r * 1.1, y + r * 0.2, r * 0.8, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x - r * 0.3, y - r * 0.45, r, Math.PI * 1.05, Math.PI * 1.9);
  ctx.arc(x + r * 0.8, y - r * 0.1, r * 0.85, Math.PI * 1.25, Math.PI * 0.2);
  ctx.arc(x + r * 1.15, y + r * 0.35, r * 0.65, Math.PI * 1.6, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawRainbow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const bands = ['#ffa9c9', '#ffd59a', '#fff3a3', '#b8f0d2', '#b9d8ff', '#d6c2ff'];
  const bw = r * 0.11;
  ctx.save();
  ctx.lineWidth = bw;
  bands.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r - i * bw, Math.PI, 0);
    ctx.stroke();
  });
  ctx.lineWidth = Math.max(2, r * 0.035);
  ctx.strokeStyle = DREAM_INK;
  for (const rr of [r + bw / 2, r - bands.length * bw + bw / 2]) {
    ctx.beginPath();
    ctx.arc(x, y, rr, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
  drawCloud(ctx, x - r + bw * 2.5, y, r * 0.8);
  drawCloud(ctx, x + r - bw * 2.5, y, r * 0.8);
}

export function drawOutlinedStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rot = 0) {
  const R = size / 2, r = R * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, size * 0.1);
  ctx.strokeStyle = DREAM_INK;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawShootingStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.lineCap = 'round';
  const tails = ['#ffa9c9', '#b9d8ff', '#d6c2ff'];
  tails.forEach((c, i) => {
    ctx.strokeStyle = DREAM_INK;
    ctx.lineWidth = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.2, y + size * 0.05 + i * size * 0.16 - size * 0.16);
    ctx.lineTo(x - size * 1.3, y + size * 0.55 + i * size * 0.16 - size * 0.16);
    ctx.stroke();
    ctx.strokeStyle = c;
    ctx.lineWidth = size * 0.12;
    ctx.stroke();
  });
  ctx.restore();
  drawOutlinedStar(ctx, x, y, size * 0.8, '#fff3a3', 0.2);
}

export function drawBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, size * 0.035);
  ctx.strokeStyle = DREAM_INK;
  ctx.lineJoin = 'round';
  // ropes
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, r * 0.75);
  ctx.lineTo(-r * 0.22, r * 1.25);
  ctx.moveTo(r * 0.45, r * 0.75);
  ctx.lineTo(r * 0.22, r * 1.25);
  ctx.stroke();
  // envelope with stripes
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, r * 0.95);
  ctx.bezierCurveTo(-r * 1.1, r * 0.2, -r * 1.05, -r, 0, -r);
  ctx.bezierCurveTo(r * 1.05, -r, r * 1.1, r * 0.2, 0, r * 0.95);
  ctx.closePath();
  ctx.clip();
  const stripes = ['#ffa9c9', '#fff3a3', '#d6c2ff', '#b8f0d2', '#ffa9c9'];
  const sw = (r * 2.2) / stripes.length;
  stripes.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(-r * 1.1 + i * sw, -r, sw + 1, r * 2);
  });
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, r * 0.95);
  ctx.bezierCurveTo(-r * 1.1, r * 0.2, -r * 1.05, -r, 0, -r);
  ctx.bezierCurveTo(r * 1.05, -r, r * 1.1, r * 0.2, 0, r * 0.95);
  ctx.closePath();
  ctx.stroke();
  // basket
  ctx.fillStyle = '#c9a07a';
  ctx.beginPath();
  ctx.roundRect(-r * 0.3, r * 1.2, r * 0.6, r * 0.42, r * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawHeart(ctx, x + r * 0.15, y - r * 0.15, r * 0.5, '#ff6fa8');
}

/** Pip the star bear: an original round pastel bear with a star clip. */
export function drawStarBear(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot = 0) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.lineWidth = 5;
  ctx.strokeStyle = DREAM_INK;
  ctx.lineJoin = 'round';
  const fur = '#ffe9b8';
  // ears
  for (const d of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(d * 34, -30, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffc2d6';
    ctx.beginPath();
    ctx.arc(d * 34, -30, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // little body and waving paw
  ctx.fillStyle = '#d6c2ff';
  ctx.beginPath();
  ctx.ellipse(0, 48, 30, 20, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(36, 30, 9, 12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // head
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // muzzle
  ctx.fillStyle = '#fff7e6';
  ctx.beginPath();
  ctx.ellipse(0, 14, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  // eyes, nose, mouth
  ctx.fillStyle = DREAM_INK;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(d * 17, -2, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 9, 4.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-5, 15);
  ctx.quadraticCurveTo(-2.5, 19, 0, 15);
  ctx.quadraticCurveTo(2.5, 19, 5, 15);
  ctx.stroke();
  // cheeks
  ctx.fillStyle = 'rgba(255, 140, 180, 0.65)';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(d * 30, 12, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // star clip centred on top of the head
  drawOutlinedStar(ctx, x + Math.sin(rot) * 40 * s, y - Math.cos(rot) * 40 * s, 30 * s, '#fff3a3', rot - 0.15);
}

/** Puffy two-tone title lettering with a thick dark outline. */
export function drawPuffyText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxSize: number, maxW: number) {
  let size = maxSize;
  const font = (sz: number) => `700 ${sz}px "Fredoka"`;
  ctx.font = font(size);
  const spacing = () => size * 0.02;
  const width = () => [...text].reduce((w, ch) => w + ctx.measureText(ch).width + spacing(), 0) + size * 0.2;
  while (size > 12 && width() > maxW) {
    size -= 2;
    ctx.font = font(size);
  }
  const colors = ['#ff8fc8', '#b28cff'];
  let x = cx - width() / 2 + size * 0.1;
  let word = 0;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  for (const ch of text) {
    if (ch === ' ') word++;
    const w = ctx.measureText(ch).width;
    ctx.lineWidth = size * 0.2;
    ctx.strokeStyle = DREAM_INK;
    ctx.strokeText(ch, x, cy);
    ctx.fillStyle = colors[word % 2];
    ctx.fillText(ch, x, cy);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, cy - size * 0.5, w, size * 0.22);
    ctx.clip();
    ctx.fillText(ch, x, cy);
    ctx.restore();
    x += w + spacing();
  }
  ctx.restore();
  return size;
}
