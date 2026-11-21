import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import type { EffectId } from '../types';
import { FilterRenderer, canvasToBlob } from '../lib/filters';
import { drawEffects } from '../lib/effects';
import { getFaceLandmarker } from '../lib/face';
import { getCamera, stopCamera } from '../lib/camera';

export interface CameraHandle {
  capture(): Promise<Blob>;
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
  children?: ReactNode;
}

export const CameraView = forwardRef<CameraHandle, Props>(function CameraView(
  { aspect, filter, effect, mirror, facing, onStream, onCamState, onFaceState, children },
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
  }, [facing]);

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
      renderer = new FilterRenderer(glRef.current!);
    } catch {
      setGlError(true);
      return;
    }
    const fx = fxRef.current!.getContext('2d')!;
    let raf = 0;
    let lastVideoTime = -1;
    let faces: { x: number; y: number }[][] = [];
    let frames = 0, windowStart = performance.now(), slowWindows = 0;

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      const w = v.videoWidth, h = v.videoHeight;
      const { filter, effect, mirror } = live.current;
      renderer.render(v, w, h, filter, mirror, t / 1000);
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
      drawEffects(fx, effect, faces, w, h, mirror, t);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useImperativeHandle(ref, () => ({
    async capture() {
      const gl = glRef.current!, fx = fxRef.current!;
      const c = document.createElement('canvas');
      c.width = gl.width;
      c.height = gl.height;
      const x = c.getContext('2d')!;
      x.drawImage(gl, 0, 0);
      x.drawImage(fx, 0, 0);
      return canvasToBlob(c);
    },
  }));

  return (
    <div className="cam" style={{ aspectRatio: String(aspect) }}>
      <video ref={videoRef} className="cam-video" playsInline muted autoPlay />
      <canvas ref={glRef} className="cam-layer" />
      <canvas ref={fxRef} className="cam-layer" />
      {cam !== 'live' && (
        <div className="cam-msg">
          {cam === 'loading' && <p className="blink">WAKING UP CAMERA…</p>}
          {cam === 'denied' && (
            <p>
              Camera access was blocked. Allow it in your browser's site settings, or use <b>Upload photos</b> below.
            </p>
          )}
          {cam === 'unsupported' && <p>This browser can't open the camera here. Use <b>Upload photos</b> instead.</p>}
          {cam === 'error' && <p>No camera found, or it's busy in another app. Use <b>Upload photos</b> instead.</p>}
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
