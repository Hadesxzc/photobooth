import type { FaceLandmarker } from '@mediapipe/tasks-vision';

// WASM is copied from node_modules into /public/mediapipe on install; the model comes from Google's model CDN.
// Face data never leaves the device: landmarks are computed and used in memory only.
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let pending: Promise<FaceLandmarker> | null = null;

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!pending) {
    pending = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe`);
      const make = (delegate: 'GPU' | 'CPU') =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate },
          runningMode: 'VIDEO',
          numFaces: 4,
        });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU');
      }
    })();
    pending.catch(() => (pending = null));
  }
  return pending;
}
