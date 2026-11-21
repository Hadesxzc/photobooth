import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import type { EffectId } from '../types';
import { FilterRenderer, canvasToBlob } from '../lib/filters';
import { drawEffects } from '../lib/effects';
import { getFaceLandmarker } from '../lib/face';
import { getCamera, stopCamera } from '../lib/camera';

export interface CameraHandle {
  /** Unfiltered frame (mirrored like the preview) plus the face-effect layer, if any. */
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
  children?: ReactNode;
}

export const CameraView = forwardRef<CameraHandle, Props>(function CameraView(
  { aspect, filter, effect, mirror, facing, onStream, onCamState, onFaceState, onUpload, duo, children },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ filter, effect, mirror });
  live.current = { filter, effect, mirror };
  const landmarker = useRef<FaceLandmarker | null>(null);
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

  // Render loop
  useEffect(() => {
    let renderer: FilterRenderer;
    try {
      renderer = new FilterRenderer(glRef.current!, true);
    } catch {
      setGlError(true);
      return;
    }
    const fx = fxRef.current!.getContext('2d')!;
    let raf = 0, vfc = 0, watchdog = 0, stopped = false;
    let fxDirty = true;
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
      const { filter, effect, mirror } = live.current;
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
      if (live.current.mirror) {
        x.translate(w, 0);
        x.scale(-1, 1);
      }
      x.drawImage(v, 0, 0, w, h);
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
      {glError && (
        <div className="cam-msg">
          <p>WebGL is off in this browser, so live filters can't run. Upload photos instead.</p>
        </div>
      )}
      {children}
    </div>
  );
});
