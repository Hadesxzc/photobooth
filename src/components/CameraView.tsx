import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import type { FaceLandmarker, ImageSegmenter } from '@mediapipe/tasks-vision';
import type { EffectId } from '../types';
import { FilterRenderer, canvasToBlob } from '../lib/filters';
import { drawEffects } from '../lib/effects';
import { getFaceLandmarker } from '../lib/face';
import { getCamera, stopCamera } from '../lib/camera';
import { createSegmenter, segmentFrame, type PersonMask } from '../lib/segment';
import { backgroundMap, getBackground, type BackgroundId } from '../lib/backgrounds';
import { DUO_HALF } from '../lib/duo';

export interface CameraHandle {
  /** Unfiltered frame (mirrored like the preview, with the chosen background) plus the face-effect layer, if any. */
  capture(): Promise<{ raw: Blob; fx?: Blob }>;
}

export type CamState = 'loading' | 'live' | 'denied' | 'unsupported' | 'error';
export type FaceState = 'off' | 'loading' | 'on' | 'failed' | 'slow';

interface Props {
  aspect: number;
  filter: number;
  effect: EffectId;
  mirror: boolean;
  facing: 'user' | 'environment';
  onStream?: (s: MediaStream) => void;
  onCamState?: (s: CamState) => void;
  onFaceState?: (s: FaceState) => void;
  onUpload?: () => void;
  /** "Friend, far away": which half of the shared frame this camera fills. */
  duo?: 'left' | 'right';
  /** Backdrop to put behind the person instead of the real room. */
  background?: BackgroundId;
  children?: ReactNode;
}

export const CameraView = forwardRef<CameraHandle, Props>(function CameraView(
  { aspect, filter, effect, mirror, facing, onStream, onCamState, onFaceState, onUpload, duo, background = 'none', children },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ filter, effect, mirror, aspect, duo, background });
  live.current = { filter, effect, mirror, aspect, duo, background };
  const landmarker = useRef<FaceLandmarker | null>(null);
  const segmenter = useRef<ImageSegmenter | null>(null);
  const rendererRef = useRef<FilterRenderer | null>(null);
  const [bgState, setBgState] = useState<'off' | 'loading' | 'on' | 'failed'>('off');
  const [cam, setCam] = useState<CamState>('loading');
  const [glError, setGlError] = useState(false);
  const [retry, setRetry] = useState(0);
  const faceStateRef = useRef<FaceState>('off');
  const cbs = useRef({ onStream, onCamState, onFaceState });
  cbs.current = { onStream, onCamState, onFaceState };

  const setFace = (s: FaceState) => {
    faceStateRef.current = s;
    cbs.current.onFaceState?.(s);
  };
  const updateCam = (s: CamState) => {
    setCam(s);
    cbs.current.onCamState?.(s);
  };

  // Camera stream
  useEffect(() => {
    let cancelled = false;
    updateCam('loading');
    getCamera(facing)
      .then(async (s) => {
        if (cancelled) return;
        const v = videoRef.current!;
        v.srcObject = s;
        await v.play().catch(() => undefined);
        updateCam('live');
        cbs.current.onStream?.(s);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        updateCam(e.name === 'NotAllowedError' ? 'denied' : e.message === 'unsupported' ? 'unsupported' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [facing, retry]);

  useEffect(() => () => stopCamera(), []);

  // Lazy-load the face tracker only when a face effect is picked
  useEffect(() => {
    if (effect === 'none') {
      if (faceStateRef.current !== 'slow') setFace(landmarker.current ? 'on' : 'off');
      return;
    }
    if (landmarker.current) {
      setFace('on');
      return;
    }
    setFace('loading');
    getFaceLandmarker()
      .then((l) => {
        landmarker.current = l;
        setFace('on');
      })
      .catch(() => setFace('failed'));
  }, [effect]);

  // Lazy-load the person segmenter only when a background is picked
  useEffect(() => {
    if (background === 'none') {
      setBgState('off');
      return;
    }
    if (segmenter.current) {
      setBgState('on');
      return;
    }
    let cancelled = false;
    setBgState('loading');
    createSegmenter()
      .then((s) => {
        if (cancelled) return s.close();
        segmenter.current = s;
        setBgState('on');
      })
      .catch(() => !cancelled && setBgState('failed'));
    return () => {
      cancelled = true;
    };
  }, [background]);

  useEffect(() => () => segmenter.current?.close(), []);

  // Render loop
  useEffect(() => {
    let renderer: FilterRenderer;
    try {
      renderer = new FilterRenderer(glRef.current!, true);
      rendererRef.current = renderer;
    } catch {
      setGlError(true);
      return;
    }
    const fx = fxRef.current!.getContext('2d')!;
    let raf = 0, vfc = 0, watchdog = 0, stopped = false;
    let fxDirty = true;
    let mask: PersonMask | null = null;
    let lastVideoTime = -1;
    let faces: { x: number; y: number }[][] = [];
    let frames = 0, windowStart = performance.now(), slowWindows = 0;

    // Draw only when the camera delivers a new frame (requestVideoFrameCallback), instead of on every
    // display refresh. On 60–120 Hz screens with a 30 fps camera this halves the GPU and face-tracking work.
    // If frame callbacks don't arrive (some browsers skip them for a hidden <video>), switch to animation
    // frames for good, so the preview never freezes.
    type VfcVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number) => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };
    let useVfc = true;
    const schedule = () => {
      if (stopped) return;
      const v = videoRef.current as VfcVideo | null;
      if (useVfc && v?.requestVideoFrameCallback && v.readyState >= 2) {
        let fired = false;
        vfc = v.requestVideoFrameCallback((now) => {
          fired = true;
          clearTimeout(watchdog);
          loop(now);
        });
        watchdog = window.setTimeout(() => {
          if (fired) return;
          useVfc = false;
          v.cancelVideoFrameCallback?.(vfc);
          raf = requestAnimationFrame(loop);
        }, 250);
      } else {
        raf = requestAnimationFrame(loop);
      }
    };

    const loop = (t: number) => {
      schedule();
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      const w = v.videoWidth, h = v.videoHeight;
      const { filter, effect, mirror, background, aspect, duo } = live.current;
      // Background replacement: segment this frame and place the backdrop for this camera's part of the box.
      const bg = getBackground(background);
      const seg = segmenter.current;
      if (bg && seg) {
        mask = segmentFrame(seg, v, performance.now(), mask ?? undefined) ?? mask;
        renderer.setBackground(bg);
        renderer.setBackgroundMap(
          backgroundMap(w / h, aspect, duo === 'right' ? 1 - DUO_HALF : 0, duo === 'left' ? DUO_HALF : 1)
        );
        renderer.setMask(mask);
      } else {
        renderer.setBackground(null);
        renderer.setMask(null);
      }
      try {
        renderer.render(v, w, h, filter, mirror, t / 1000);
      } catch {
        stopped = true;
        setGlError(true);
        return;
      }
      if (fxRef.current!.width !== w) {
        fxRef.current!.width = w;
        fxRef.current!.height = h;
      }
      const lm = landmarker.current;
      if (effect !== 'none' && lm) {
        if (v.currentTime !== lastVideoTime) {
          lastVideoTime = v.currentTime;
          try {
            faces = lm.detectForVideo(v, performance.now()).faceLandmarks;
          } catch {
            faces = [];
          }
        }
        // Frame-rate guard: if face effects can't hold ~18 fps, fall back to look filters only.
        frames++;
        if (t - windowStart > 2000) {
          const fps = (frames * 1000) / (t - windowStart);
          slowWindows = fps < 18 ? slowWindows + 1 : 0;
          frames = 0;
          windowStart = t;
          if (slowWindows >= 2) setFace('slow');
        }
      } else {
        faces = [];
        frames = 0;
        windowStart = t;
      }
      if (effect === 'none' && !fxDirty) return;
      drawEffects(fx, effect, faces, w, h, mirror, t);
      fxDirty = effect !== 'none';
    };
    raf = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(watchdog);
      (videoRef.current as VfcVideo | null)?.cancelVideoFrameCallback?.(vfc);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    async capture() {
      const v = videoRef.current!, fx = fxRef.current!;
      const w = v.videoWidth, h = v.videoHeight;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d')!;
      const r = rendererRef.current;
      const { mirror, filter } = live.current;
      // Person + background, without the filter (filters stay editable later). The filtered preview is
      // redrawn straight after, in the same task, so the unfiltered frame never shows on screen.
      if (r && getBackground(live.current.background) && segmenter.current && r.render(v, w, h, 0, mirror, 0)) {
        x.drawImage(r.canvas, 0, 0, w, h);
        r.render(v, w, h, filter, mirror, performance.now() / 1000);
      } else {
        if (mirror) {
          x.translate(w, 0);
          x.scale(-1, 1);
        }
        x.drawImage(v, 0, 0, w, h);
      }
      const raw = await canvasToBlob(c);
      if (live.current.effect === 'none') return { raw };
      return { raw, fx: await canvasToBlob(fx, 'image/png') };
    },
  }));

  return (
    <div className={duo ? `cam duo duo-me-${duo}` : 'cam'} style={{ aspectRatio: String(aspect) }}>
      <video ref={videoRef} className="cam-video" playsInline muted autoPlay />
      <canvas ref={glRef} className="cam-layer" />
      <canvas ref={fxRef} className="cam-layer" />
      {cam !== 'live' && (
        <div className="cam-msg">
          {cam === 'loading' ? (
            <p className="blink">Turning on your camera…</p>
          ) : (
            <div className="cam-msg-card">
              <h3>{cam === 'denied' ? 'Camera is blocked' : 'No camera found'}</h3>
              <p>
                {cam === 'denied'
                  ? "Allow the camera for this site in your browser's address bar, then try again."
                  : cam === 'unsupported'
                    ? "This browser can't open the camera here. You can still use photos you already have."
                    : 'No camera was found, or another app is using it. Close that app and try again.'}
              </p>
              <div className="row wrap" style={{ justifyContent: 'center' }}>
                {cam !== 'unsupported' && (
                  <button className="btn btn-primary" onClick={() => setRetry((r) => r + 1)}>
                    Try again
                  </button>
                )}
                {onUpload && (
                  <button className="btn" onClick={onUpload}>
                    Use my photos
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {bgState === 'loading' && <div className="cam-tag cam-tag-r blink">Loading background…</div>}
      {bgState === 'failed' && <div className="cam-tag cam-tag-r">Background couldn't load</div>}
      {glError && (
        <div className="cam-msg">
          <p>WebGL is off in this browser, so live filters can't run. Upload photos instead.</p>
        </div>
      )}
      {children}
    </div>
  );
});
