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
