import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sound';

export interface CountdownState {
  total: number;
  startedAt: number;
  banner?: string;
}

/** Arcade-style progress bar countdown. Resolves via the parent's timer; this only draws. */
export function CountdownBar({ state, sound }: { state: CountdownState | null; sound: boolean }) {
  const [now, setNow] = useState(performance.now());
  const lastSec = useRef(-1);
  useEffect(() => {
    if (!state) return;
    lastSec.current = -1;
    let raf = 0;
    let shown = '';
    // Re-render only when the number or the progress bar actually changes, not on every frame.
    const loop = () => {
      const t = performance.now();
      const el = Math.max(0, (t - state.startedAt) / 1000);
      const key = `${Math.ceil(state.total - el)}:${Math.floor(Math.min(1, el / state.total) * 12 + 0.0001)}`;
      if (key !== shown) {
        shown = key;
        setNow(t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  if (!state) return null;
  const elapsed = Math.max(0, (now - state.startedAt) / 1000);
  const p = Math.min(1, elapsed / state.total);
  const left = Math.max(0, Math.ceil(state.total - elapsed));
  if (sound && left !== lastSec.current) {
    lastSec.current = left;
    if (left > 0) sfx.tick();
  }
  const blocks = 12;
  const filled = Math.floor(p * blocks + 0.0001);
  return (
    <div className="countdown" aria-live="polite">
      {state.banner && <div className="cd-banner">{state.banner}</div>}
      <div className="cd-num">{left > 0 ? left : 'SMILE!'}</div>
      <div className="cd-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
        {Array.from({ length: blocks }, (_, i) => (
          <span key={i} className={i < filled ? 'cd-on' : ''} />
        ))}
      </div>
      <div className="cd-label">{left > 1 ? 'GET READY' : 'HOLD IT…'}</div>
    </div>
  );
}
