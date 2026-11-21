import { useEffect, useRef } from 'react';
import { useRemote } from '../lib/remote';

export function RemoteVideo({ label = 'P2' }: { label?: string }) {
  const stream = useRemote((s) => s.remoteStream);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  if (!stream) return null;
  return (
    <div className="pip">
      <video ref={ref} autoPlay playsInline muted />
      <span>{label}</span>
    </div>
  );
}
