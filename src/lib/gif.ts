import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { composeStrip, type ComposeOpts } from './compose';

/** Animated strip: photos drop in one by one, then the finished strip holds. */
export async function makeStripGif(opts: Omit<ComposeOpts, 'scale' | 'reveal'>, maxWidth = 480): Promise<Blob> {
  const probe = document.createElement('canvas');
  const g = composeStrip(probe, { ...opts, scale: 1 });
  const scale = Math.min(1, maxWidth / g.w);
  const canvas = document.createElement('canvas');
  const n = opts.cust.slotCount;
  const gif = GIFEncoder();
  const frames: { reveal: number; delay: number }[] = [];
  for (let i = 0; i <= n; i++) frames.push({ reveal: i, delay: i === 0 ? 400 : 450 });
  frames.push({ reveal: n, delay: 2200 });
  for (const f of frames) {
    composeStrip(canvas, { ...opts, scale, reveal: f.reveal, selectedSticker: null });
    const { width, height } = canvas;
    const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data;
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay: f.delay });
    await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}
