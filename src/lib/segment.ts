import type { ImageSegmenter } from '@mediapipe/tasks-vision';

// Person segmentation for background replacement. Like the face tracker, the WASM is served from
// /public/mediapipe and the small model (~250 KB) comes from Google's model CDN. Frames never leave the device.
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

/**
 * A new segmenter. Each video needs its own (MediaPipe requires increasing timestamps per instance),
 * so the host gets one for their camera and one for the friend's video.
 */
export async function createSegmenter(): Promise<ImageSegmenter> {
  const { ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe`);
  const make = (delegate: 'GPU' | 'CPU') =>
    ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate },
      runningMode: 'VIDEO',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  try {
    return await make('GPU');
  } catch {
    return await make('CPU');
  }
}

export interface PersonMask {
  data: Uint8Array;
  w: number;
  h: number;
}

/**
 * Runs the segmenter on the current video frame and returns a person mask (255 = person), in the
 * video's own orientation. Returns null if segmentation failed for this frame.
 */
export function segmentFrame(seg: ImageSegmenter, video: HTMLVideoElement, ts: number, reuse?: PersonMask): PersonMask | null {
  let out: PersonMask | null = null;
  try {
    seg.segmentForVideo(video, ts, (result) => {
      const m = result.confidenceMasks?.[0];
      if (!m) return;
      const f = m.getAsFloat32Array();
      const n = f.length;
      const data = reuse && reuse.data.length === n ? reuse.data : new Uint8Array(n);
      for (let i = 0; i < n; i++) data[i] = f[i] * 255;
      out = { data, w: m.width, h: m.height };
    });
  } catch {
    return null;
  }
  return out;
}
