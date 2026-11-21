import { useEffect, useRef } from 'react';
import { useRemote } from '../lib/remote';
import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import { FilterRenderer } from '../lib/filters';
import { createSegmenter, segmentFrame, type PersonMask } from '../lib/segment';
import { backgroundMap, getBackground, type BackgroundId } from '../lib/backgrounds';
import { DUO_HALF } from '../lib/duo';

type VfcVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * The friend's live camera, filling their half of the shared frame (see lib/duo.ts) and drawn through
 * the same filter as yours, so both halves read as one photo. `side` is where the friend sits: the host
 * sees the guest on the right, the guest sees the host on the left.
 */
export function RemoteVideo({
  side,
  label,
  filter,
  aspect,
  background = 'none',
}: {
  side: 'left' | 'right';
  label: string;
  filter: number;
  /** Aspect of the whole shared frame, so the backdrop lines up across both halves. */
  aspect: number;
  background?: BackgroundId;
}) {
  const stream = useRemote((s) => s.remoteStream);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ filter, aspect, background });
  opts.current = { filter, aspect, background };
  const segmenter = useRef<ImageSegmenter | null>(null);

  // The friend's video arrives without the backdrop, so it gets its own segmenter here.
  useEffect(() => {
    if (background === 'none' || segmenter.current) return;
    let cancelled = false;
    createSegmenter()
      .then((s) => (cancelled ? s.close() : (segmenter.current = s)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [background]);
  useEffect(() => () => segmenter.current?.close(), []);

  useEffect(() => {
    const v = videoRef.current as VfcVideo | null;
    const c = canvasRef.current;
    if (!v || !c || !stream) return;
    v.srcObject = stream;
    void v.play().catch(() => undefined);

    let renderer: FilterRenderer | null = null;
    try {
      renderer = new FilterRenderer(c, true);
    } catch {
      renderer = null; // No WebGL: the plain video element below stays visible instead.
    }
    c.style.display = renderer ? '' : 'none';
    v.style.opacity = renderer ? '0' : '1';
    if (!renderer) return;

    let raf = 0, vfc = 0, watchdog = 0, stopped = false, useVfc = !!v.requestVideoFrameCallback;
    let mask: PersonMask | null = null;
    // Draw only when a new frame arrives from the call. If frame callbacks don't arrive, switch to
    // animation frames for good so the picture never freezes.
    const next = () => {
      if (stopped) return;
      if (useVfc && v.readyState >= 2) {
        let fired = false;
        vfc = v.requestVideoFrameCallback!((t) => {
          fired = true;
          clearTimeout(watchdog);
          draw(t);
        });
        watchdog = window.setTimeout(() => {
          if (fired) return;
          useVfc = false;
          v.cancelVideoFrameCallback?.(vfc);
          raf = requestAnimationFrame(draw);
        }, 500);
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    const draw = (t: number) => {
      next();
      if (!(v.readyState >= 2 && v.videoWidth)) return;
      const { filter, aspect, background } = opts.current;
      const bg = getBackground(background);
      if (bg && segmenter.current) {
        mask = segmentFrame(segmenter.current, v, performance.now(), mask ?? undefined) ?? mask;
        renderer!.setBackground(bg);
        renderer!.setBackgroundMap(
          backgroundMap(v.videoWidth / v.videoHeight, aspect, side === 'right' ? 1 - DUO_HALF : 0, side === 'left' ? DUO_HALF : 1)
        );
        renderer!.setMask(mask);
      } else {
        renderer!.setBackground(null);
        renderer!.setMask(null);
      }
      try {
        renderer!.render(v, v.videoWidth, v.videoHeight, filter, true, t / 1000);
      } catch {
        // Shader failed: stop drawing and show the plain video instead.
        stopped = true;
        c.style.display = 'none';
        v.style.opacity = '1';
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(watchdog);
      v.cancelVideoFrameCallback?.(vfc);
    };
  }, [stream, side]);

  return (
    <>
      <div className={`duo-half duo-${side}`}>
        {stream ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted />
            <canvas ref={canvasRef} />
          </>
        ) : (
          <p className="duo-wait blink">Waiting for {label}'s camera…</p>
        )}
      </div>
      <span className={`duo-tag duo-tag-${side}`}>{label}</span>
    </>
  );
}
