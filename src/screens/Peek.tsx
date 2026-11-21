import { useState } from 'react';
import { useStore } from '../store';
import { getTemplate } from '../lib/templates';
import { StripPreview, useSlotImages } from '../components/StripPreview';
import { Button } from '../components/ui';

/** Review step: look over every photo, retake any single one, and swap their order. */
export function Peek() {
  const { templateId, cust, shots, slotMap, swapSlots, go, setPendingRetake, clearShots, mode, players } = useStore();
  const template = getTemplate(templateId);
  const { images, labels } = useSlotImages();
  const [sel, setSel] = useState<number | null>(null);

  const retake = (slot: number) => {
    setPendingRetake(slotMap[slot] ?? slot);
    go('booth');
  };

  const tap = (slot: number) => {
    if (sel === null) setSel(slot);
    else {
      if (sel !== slot) swapSlots(sel, slot);
      setSel(null);
    }
  };

  const missing = slotMap.filter((i) => i === null || !shots[i]).length;

  return (
    <section className="screen split">
      <div className="split-main peek-main">
        <p className="mode-step">how cute!</p>
        <h2 className="peek-h">Happy with your photos?</h2>
        <p className="muted">
          Retake any single photo and the others stay exactly as they are. To change the order, tap one photo and then another.
        </p>
        <div className="peek-grid">
          {slotMap.map((shotIndex, slot) => {
            const s = shotIndex !== null ? shots[shotIndex] : undefined;
            const who = mode !== 'solo' && s ? players[s.player] || `Player ${s.player + 1}` : null;
            return (
              <figure key={slot} className={`peek-card ${sel === slot ? 'peek-sel' : ''}`}>
                <button className="peek-photo" onClick={() => tap(slot)} aria-pressed={sel === slot} aria-label={`Photo ${slot + 1}, tap to move`}>
                  {s ? <img src={s.url} alt={`Photo ${slot + 1}`} /> : <span className="peek-empty">empty</span>}
                  <span className="peek-n">{slot + 1}</span>
                </button>
                <figcaption>
                  <span>{who ?? `Photo ${slot + 1}`}</span>
                  <Button onClick={() => retake(slot)}>{s ? 'Retake' : 'Take it'}</Button>
                </figcaption>
              </figure>
            );
          })}
        </div>
        {sel !== null && <p className="ok">Photo {sel + 1} picked. Tap another photo to swap them.</p>}
      </div>
      <aside className="split-side peek-side">
        <StripPreview template={template} cust={cust} images={images} labels={labels} className="peek-strip" />
        <Button variant="primary" big onClick={() => go('glow')} disabled={missing === cust.slotCount}>
          Next: glow up
        </Button>
        {missing > 0 && missing < cust.slotCount && <p className="muted small">{missing} slot{missing > 1 ? 's are' : ' is'} still empty. You can fill it later.</p>}
        <div className="row wrap">
          <Button onClick={() => go('booth')}>Back to camera</Button>
          <Button
            variant="danger"
            onClick={() => {
              clearShots();
              go('booth');
            }}
          >
            Retake all
          </Button>
        </div>
      </aside>
    </section>
  );
}
