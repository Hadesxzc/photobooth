import { useState } from 'react';
import { useStore } from '../store';
import { getTemplate } from '../lib/templates';
import { StripPreview, useSlotImages } from '../components/StripPreview';
import { Button } from '../components/ui';

export function Arrange() {
  const { templateId, cust, shots, slotMap, swapSlots, assignSlot, setSlotCount, go } = useStore();
  const template = getTemplate(templateId);
  const { images, labels } = useSlotImages();
  const [sel, setSel] = useState<number | null>(null);

  const tapSlot = (i: number) => {
    if (sel === null) setSel(i);
    else {
      if (sel !== i) swapSlots(sel, i);
      setSel(null);
    }
  };

  const tapShot = (shotIndex: number) => {
    if (sel === null) {
      const empty = slotMap.findIndex((s) => s === null);
      if (empty >= 0) assignSlot(empty, shotIndex);
      return;
    }
    assignSlot(sel, shotIndex);
    setSel(null);
  };

  const autoFill = () => {
    setSlotCount(cust.slotCount);
    const taken = shots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < cust.slotCount; i++) assignSlot(i, taken[i] ?? null);
    setSel(null);
  };

  return (
    <section className="screen split">
      <div className="split-main">
        <StripPreview
          template={template}
          cust={cust}
          images={images}
          labels={labels}
          highlightSlot={sel}
          onSlotClick={tapSlot}
          className="strip-big"
        />
      </div>
      <aside className="split-side">
        <h2>ARRANGE</h2>
        <p className="muted">
          {sel === null
            ? 'Tap a slot, then tap another slot to swap them, or tap a shot below to put it there.'
            : `Slot ${sel + 1} selected. Tap another slot to swap, or pick a shot.`}
        </p>
        <div className="shot-pick">
          {shots.map((s, i) =>
            s ? (
              <button key={s.id} className={`shot-thumb ${slotMap.includes(i) ? 'used' : ''}`} onClick={() => tapShot(i)}>
                <img src={s.url} alt={`Shot ${i + 1}`} />
                <span>{i + 1}</span>
              </button>
            ) : null
          )}
        </div>
        <div className="row wrap">
          <Button onClick={autoFill}>AUTO-FILL</Button>
          {sel !== null && <Button onClick={() => (assignSlot(sel, null), setSel(null))}>EMPTY SLOT</Button>}
          <Button onClick={() => go('booth')}>◀ RETAKE</Button>
        </div>
        <Button variant="primary" big onClick={() => go('customize')}>
          NEXT: STYLE ▶
        </Button>
      </aside>
    </section>
  );
}
