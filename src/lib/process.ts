// Non-destructive photo pipeline: the original frame is kept, and the finished photo is
// re-rendered whenever the look (filter, brightness, warmth, soft skin) changes.
import type { Look, Shot } from '../types';
import { FilterRenderer, canvasToBlob } from './filters';
import { loadImage } from './compose';

export const DEFAULT_LOOK: Look = { filter: 0, bright: 0, warm: 0, soft: 0 };

let renderer: FilterRenderer | null = null;
const getRenderer = () => (renderer ??= new FilterRenderer());

/** Start compiling the photo shader in idle time, so the first photo after a countdown doesn't stall. */
export function warmUpRenderer() {
  const go = () => {
    try {
      void getRenderer().whenReady().catch(() => undefined);
    } catch {
      /* no WebGL: photos fall back where they're made */
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 });
  else setTimeout(go, 500);
}

/** Draws raw → look → face-effect layer into a canvas, optionally downscaled to `maxW`. */
export async function renderLook(raw: string, fx: string | undefined, look: Look, maxW?: number): Promise<HTMLCanvasElement> {
  const img = await loadImage(raw);
  const s = maxW ? Math.min(1, maxW / img.naturalWidth) : 1;
  const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
  let src: TexImageSource = img;
  if (s < 1) {
    const small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    small.getContext('2d')!.drawImage(img, 0, 0, w, h);
    src = small;
  }
  const r = getRenderer();
  await r.whenReady();
  r.render(src, w, h, look.filter, false, 1, look);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(r.canvas, 0, 0);
  if (fx) ctx.drawImage(await loadImage(fx), 0, 0, w, h);
  return out;
}

export async function processShot(raw: string, fx: string | undefined, look: Look): Promise<string> {
  const c = await renderLook(raw, fx, look);
  return URL.createObjectURL(await canvasToBlob(c));
}

export async function makeShot(
  id: string,
  rawBlob: Blob,
  fxBlob: Blob | undefined,
  look: Look,
  player: number
): Promise<Shot> {
  const raw = URL.createObjectURL(rawBlob);
  const fx = fxBlob ? URL.createObjectURL(fxBlob) : undefined;
  const url = await processShot(raw, fx, look);
  return { id, raw, fx, url, look, player };
}

export function revokeShot(s: Shot) {
  URL.revokeObjectURL(s.url);
  URL.revokeObjectURL(s.raw);
  if (s.fx) URL.revokeObjectURL(s.fx);
}
