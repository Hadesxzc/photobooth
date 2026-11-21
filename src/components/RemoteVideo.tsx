import { useEffect, useRef } from 'react';
import { useRemote } from '../lib/remote';
import { FilterRenderer } from '../lib/filters';

type VfcVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * The friend's live camera, filling their half of the shared frame (see lib/duo.ts) and drawn through
 * the same filter as yours, so both halves read as one photo. `side` is where the friend sits: the host
 * sees the guest on the right, the guest sees the host on the left.
 */
export function RemoteVideo({ side, label, filter }: { side: 'left' | 'right'; label: string; filter: number }) {
  const stream = useRemote((s) => s.remoteStream);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filterRef = useRef(filter);
  filterRef.current = filter;

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
      try {
        renderer!.render(v, v.videoWidth, v.videoHeight, filterRef.current, true, t / 1000);
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
  }, [stream]);

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
