// One shared camera stream for the booth and for remote calls.
let stream: MediaStream | null = null;
let currentFacing: 'user' | 'environment' | null = null;
let inflight: { facing: string; p: Promise<MediaStream> } | null = null;

export async function getCamera(facing: 'user' | 'environment'): Promise<MediaStream> {
  if (stream && currentFacing === facing && stream.getVideoTracks().some((t) => t.readyState === 'live')) return stream;
  if (inflight && inflight.facing === facing) return inflight.p;
  stopCamera();
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
  const p = navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    })
    .then((s) => {
      stream = s;
      currentFacing = facing;
      return s;
    })
    .finally(() => {
      inflight = null;
    });
  inflight = { facing, p };
  return p;
}

export function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  currentFacing = null;
}

export const currentStream = () => stream;

export async function hasMultipleCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length > 1;
  } catch {
    return false;
  }
}
