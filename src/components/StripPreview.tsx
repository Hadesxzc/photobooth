import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Customization, Geometry, Sticker, Template } from '../types';
import { composeStrip, hitSticker, loadImage } from '../lib/compose';
import { useStore } from '../store';

/** Bumps whenever webfonts finish loading so canvases redraw with the right type. */
export function useFontsReady() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const bump = () => setN((x) => x + 1);
    document.fonts?.ready.then(bump);
    document.fonts?.addEventListener('loadingdone', bump);
    return () => document.fonts?.removeEventListener('loadingdone', bump);
  }, []);
  return n;
}

/** Loads the images for each slot according to the store's slotMap. */
export function useSlotImages() {
  const shots = useStore((s) => s.shots);
  const slotMap = useStore((s) => s.slotMap);
  const players = useStore((s) => s.players);
  const mode = useStore((s) => s.mode);
  const [images, setImages] = useState<(HTMLImageElement | null)[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all(slotMap.map((i) => (i !== null && shots[i] ? loadImage(shots[i].url).catch(() => null) : null))).then(
      (imgs) => live && setImages(imgs)
    );
    return () => {
      live = false;
    };
  }, [shots, slotMap]);
  const labels = slotMap.map((i) => (mode !== 'solo' && i !== null && shots[i] ? `P${shots[i].player + 1}` : null));
  return { images, labels: mode === 'solo' ? undefined : labels, players };
}

interface Props {
  template: Template;
  cust: Customization;
  images?: (CanvasImageSource | null)[];
  labels?: (string | null)[];
  scale?: number;
  highlightSlot?: number | null;
  onSlotClick?: (i: number) => void;
  onTextClick?: () => void;
  editStickers?: {
    selected: string | null;
    onSelect: (id: string | null) => void;
    onMove: (id: string, x: number, y: number) => void;
  };
  className?: string;
  label?: string;
}

export function StripPreview({
  template,
  cust,
  images = [],
  labels,
  scale = 1,
  highlightSlot,
  onSlotClick,
  onTextClick,
  editStickers,
  className = '',
  label = 'Photo strip preview',
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const geom = useRef<Geometry | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const fonts = useFontsReady();
  const score = useStore((s) => s.score);

  useEffect(() => {
    const c = ref.current!;
    const g = composeStrip(c, {
      template,
      cust,
      images,
      labels,
      scale,
      score,
      selectedSticker: editStickers?.selected ?? null,
    });
    geom.current = g;
    if (highlightSlot !== null && highlightSlot !== undefined && g.slots[highlightSlot]) {
      const ctx = c.getContext('2d')!;
      const r = g.slots[highlightSlot];
      ctx.save();
      ctx.strokeStyle = '#C9F26B';
      ctx.lineWidth = 10;
      ctx.setLineDash([22, 14]);
      ctx.strokeRect(r.x - 16, r.y - 16, r.w + 32, r.h + 32);
      ctx.restore();
    }
  }, [template, cust, images, labels, scale, score, fonts, highlightSlot, editStickers?.selected]);

  const toStrip = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const g = geom.current!;
    return { x: ((e.clientX - r.left) / r.width) * g.w, y: ((e.clientY - r.top) / r.height) * g.h };
  };

  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    const g = geom.current;
    if (!g) return;
    const p = toStrip(e);
    if (editStickers) {
      const hit: Sticker | null = hitSticker(ref.current!, cust.stickers, g, p.x, p.y);
      if (hit) {
        editStickers.onSelect(hit.id);
        drag.current = { id: hit.id, dx: hit.x * g.w - p.x, dy: hit.y * g.h - p.y };
        ref.current!.setPointerCapture(e.pointerId);
        return;
      }
      editStickers.onSelect(null);
    }
    const t = g.text;
    if (onTextClick && p.x > t.x && p.x < t.x + t.w && p.y > t.y && p.y < t.y + t.h) {
      onTextClick();
      return;
    }
    if (onSlotClick) {
      const i = g.slots.findIndex((r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h);
      if (i >= 0) onSlotClick(i);
    }
  };
  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current, g = geom.current;
    if (!d || !g || !editStickers) return;
    const p = toStrip(e);
    editStickers.onMove(d.id, clamp((p.x + d.dx) / g.w), clamp((p.y + d.dy) / g.h));
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <canvas
      ref={ref}
      className={`strip ${onSlotClick || editStickers || onTextClick ? 'strip-interactive' : ''} ${className}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="img"
      aria-label={label}
    />
  );
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
