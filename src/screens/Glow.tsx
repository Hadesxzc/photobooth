import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { getTemplate } from '../lib/templates';
import { FILTERS } from '../lib/filters';
import { renderLook } from '../lib/process';
import { StripPreview, useSlotImages } from '../components/StripPreview';
import { Button, Label, Segmented } from '../components/ui';
import type { Look } from '../types';

const ORDER = [0, 13, 14, 15, 16, 17, 18, 11, 3, 1, 2, 5, 4, 12, 7, 6, 8, 9, 10];
const GLOW_FILTERS = ORDER.map((id) => FILTERS.find((f) => f.id === id)!).filter(Boolean);

/** Edit step: filters and gentle touch-ups applied after shooting. Originals are never changed. */
export function Glow() {
  const { templateId, cust, shots, slotMap, setLooks, go } = useStore();
  const template = getTemplate(templateId);
  const { images, labels } = useSlotImages();
  const filledSlots = slotMap.map((s, slot) => ({ slot, shot: s })).filter((x) => x.shot !== null && shots[x.shot]);
  const [active, setActive] = useState<number>(filledSlots[0]?.shot ?? 0);
  const [scope, setScope] = useState<'all' | 'one'>('all');
  const shot = shots[active];
  const [draft, setDraft] = useState<Look | null>(shot?.look ?? null);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const timer = useRef<number>();

  useEffect(() => {
    if (shot) setDraft(shot.look);
  }, [active, shot?.look]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter previews for the selected photo
  useEffect(() => {
    if (!shot) return;
    let live = true;
    (async () => {
      const out: Record<number, string> = {};
      for (const f of GLOW_FILTERS) {
        const c = await renderLook(shot.raw, shot.fx, { ...shot.look, filter: f.id }, 150);
        out[f.id] = c.toDataURL('image/jpeg', 0.8);
        if (!live) return;
      }
      if (live) setThumbs(out);
    })();
    return () => {
      live = false;
    };
  }, [shot?.raw, shot?.fx, shot?.look.bright, shot?.look.warm, shot?.look.soft]); // eslint-disable-line react-hooks/exhaustive-deps

  const targets = useMemo(
    () => (scope === 'all' ? filledSlots.map((x) => x.shot as number) : [active]),
    [scope, active, filledSlots]
  );

  const apply = (patch: Partial<Look>, debounce = false) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    window.clearTimeout(timer.current);
    if (debounce) timer.current = window.setTimeout(() => void setLooks(targets, patch), 140);
    else void setLooks(targets, patch);
  };

  if (!shot || !draft)
    return (
      <section className="screen center-col">
        <h2>No photos yet</h2>
        <Button variant="primary" onClick={() => go('booth')}>
          Back to camera
        </Button>
      </section>
    );

  return (
    <section className="screen glow">
      <div className="glow-head">
        <p className="mode-step">glow up</p>
        <h2 className="peek-h">Filters and touch-ups</h2>
        <p className="muted">Totally optional. Your original photos are kept, so you can always go back.</p>
      </div>

      <div className="glow-stage">
        <figure className="glow-photo">
          <img src={shot.url} alt="Selected photo" />
          <figcaption>
            Photo {slotMap.indexOf(active) + 1} · {scope === 'all' ? 'changes apply to all photos' : 'changes apply to this photo only'}
          </figcaption>
        </figure>
        <div className="glow-strip">
          <StripPreview template={template} cust={cust} images={images} labels={labels} />
        </div>
      </div>

      <div className="glow-picker" role="group" aria-label="Choose a photo">
        {filledSlots.map(({ slot, shot: i }) => (
          <button key={slot} className={i === active ? 'on' : ''} onClick={() => setActive(i as number)} aria-pressed={i === active}>
            <img src={shots[i as number].url} alt={`Photo ${slot + 1}`} />
          </button>
        ))}
      </div>

      <aside className="glow-panel panel">
        <Segmented
          label="Apply to"
          value={scope}
          options={[
            { value: 'all', label: 'All photos' },
            { value: 'one', label: 'This photo' },
          ]}
          onChange={setScope}
        />
        <Label>Filter</Label>
        <div className="glow-filters">
          {GLOW_FILTERS.map((f) => (
            <button key={f.id} className={draft.filter === f.id ? 'on' : ''} onClick={() => apply({ filter: f.id })} aria-pressed={draft.filter === f.id}>
              {thumbs[f.id] ? <img src={thumbs[f.id]} alt="" /> : <span className="glow-thumb-wait" />}
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        <Label>Touch-ups</Label>
        <Slider label="Brightness" min={-1} max={1} value={draft.bright} onChange={(v) => apply({ bright: v }, true)} />
        <Slider label="Warmth" min={-1} max={1} value={draft.warm} onChange={(v) => apply({ warm: v }, true)} />
        <Slider label="Soft skin" min={0} max={1} value={draft.soft} onChange={(v) => apply({ soft: v }, true)} />

        <div className="row wrap">
          <Button onClick={() => apply({ bright: 0, warm: 0, soft: 0 })}>Reset touch-ups</Button>
          <Button onClick={() => apply({ filter: 0, bright: 0, warm: 0, soft: 0 })}>Back to original</Button>
        </div>
        <div className="row wrap push">
          <Button onClick={() => go('peek')}>Back</Button>
          <Button variant="primary" big onClick={() => go('customize')}>
            Next: style it
          </Button>
        </div>
      </aside>
    </section>
  );
}

function Slider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field col glow-slider">
      <span>
        {label} <em>{value > 0 && min < 0 ? '+' : ''}{Math.round(value * 100)}</em>
      </span>
      <input type="range" min={min} max={max} step={0.01} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}
