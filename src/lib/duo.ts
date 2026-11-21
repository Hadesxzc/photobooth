// "Friend, far away": both people share one frame. Player 1 (the host) is always on the left,
// Player 2 (the guest) on the right, and the two halves overlap slightly with a soft blend so the
// photo reads as one scene instead of two boxes. The live preview (CSS in styles) uses the same
// numbers, so what you see is what gets saved.
import { canvasToBlob } from './filters';
import { loadImage } from './compose';

/** How far each half reaches past the centre line, as a fraction of the frame width. */
export const DUO_OVERLAP = 0.01;
/** Width of each half including its overlap. */
export const DUO_HALF = 0.5 + DUO_OVERLAP;

/** Draws `img` into the box (dx, dy, dw, dh) like CSS object-fit: cover, centred. */
function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, dx: number, dy: number, dw: number, dh: number) {
  const s = Math.max(dw / img.width, dh / img.height);
  const sw = dw / s, sh = dh / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, dx, dy, dw, dh);
}

/** Paints left and right images into one canvas, feathering the right one over the seam. */
function paint(out: HTMLCanvasElement, left: HTMLImageElement | null, right: HTMLImageElement | null) {
  const W = out.width, H = out.height;
  const ctx = out.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const half = Math.round(W * DUO_HALF);
  if (left) drawCover(ctx, left, 0, 0, half, H);
  if (!right) return;
  const layer = document.createElement('canvas');
  layer.width = half;
  layer.height = H;
  const lc = layer.getContext('2d')!;
  drawCover(lc, right, 0, 0, half, H);
  // Fade the right half in across the overlap band.
  const band = (W * DUO_OVERLAP * 2) / half;
  const g = lc.createLinearGradient(0, 0, half, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(band, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  lc.globalCompositeOperation = 'destination-in';
  lc.fillStyle = g;
  lc.fillRect(0, 0, half, H);
  ctx.drawImage(layer, W - half, 0);
}

async function load(b?: Blob) {
  if (!b) return null;
  const url = URL.createObjectURL(b);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface DuoPart {
  raw: Blob;
  fx?: Blob;
}

/** Merges the host's and the guest's captures into one shared photo (plus a shared face-effect layer). */
export async function composeDuo(host: DuoPart, guest: DuoPart, aspect: number): Promise<DuoPart> {
  const [hr, gr, hf, gf] = await Promise.all([load(host.raw), load(guest.raw), load(host.fx), load(guest.fx)]);
  const H = Math.min(960, Math.max(hr!.naturalHeight, gr!.naturalHeight));
  const W = Math.round(H * aspect);
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  paint(out, hr, gr);
  const raw = await canvasToBlob(out, 'image/jpeg', 0.92);
  if (!hf && !gf) return { raw };
  paint(out, hf, gf);
  return { raw, fx: await canvasToBlob(out, 'image/png') };
}
