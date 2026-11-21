import { useEffect, useState } from 'react';
import { BACKGROUNDS, backgroundThumb } from '../lib/backgrounds';
import type { BackgroundId, CollectionId } from '../types';

/**
 * Backdrop choices. The one that matches the current strip's theme is listed first and marked, so the
 * photos and the strip around them go together.
 */
export function BackgroundPicker({
  value,
  onChange,
  match,
}: {
  value: BackgroundId;
  onChange: (id: BackgroundId) => void;
  match: CollectionId;
}) {
  const [thumbs, setThumbs] = useState<Partial<Record<BackgroundId, string>>>({});

  // Draw the previews a few at a time after the panel shows, so opening it never stalls.
  useEffect(() => {
    let cancelled = false;
    const ids = BACKGROUNDS.map((b) => b.id).filter((id) => id !== 'none');
    let i = 0;
    const step = () => {
      if (cancelled || i >= ids.length) return;
      const id = ids[i++];
      const url = backgroundThumb(id);
      if (url) setThumbs((t) => ({ ...t, [id]: url }));
      setTimeout(step, 0);
    };
    const start = setTimeout(step, 50);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, []);

  const order = [
    BACKGROUNDS[0],
    ...BACKGROUNDS.filter((b) => b.id === match),
    ...BACKGROUNDS.filter((b) => b.id !== 'none' && b.id !== match),
  ];

  return (
    <div className="bg-grid" role="radiogroup" aria-label="Background">
      {order.map((b) => (
        <button
          key={b.id}
          role="radio"
          aria-checked={value === b.id}
          className={`bg-opt ${value === b.id ? 'on' : ''}`}
          onClick={() => onChange(b.id)}
        >
          <span className="bg-thumb">
            {b.id === 'none' ? <span className="bg-none">Real room</span> : thumbs[b.id] ? <img src={thumbs[b.id]} alt="" /> : null}
            {b.id === match && <em className="bg-match">Matches strip</em>}
          </span>
          <span className="bg-name">{b.name}</span>
        </button>
      ))}
    </div>
  );
}
