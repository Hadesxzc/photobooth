import { useRef, useState } from 'react';
import { useStore, uid } from '../store';
import { COLLECTIONS, getLayout, getTemplate } from '../lib/templates';
import { STICKERS } from '../lib/sprites';
import { FONTS } from '../config';
import { StripPreview, useSlotImages } from '../components/StripPreview';
import { Button, Chip, Label, PixelIcon, Segmented, Toggle } from '../components/ui';
import type { BorderId, Palette, PatternId } from '../types';

type Tab = 'colors' | 'text' | 'stickers' | 'layout';

const EXTRA_PALETTES: { name: string; p: Palette }[] = [
  { name: 'Paper', p: { bg: '#DED5BC', ink: '#171312', accent: '#171312', shadow: '#DFAF37', window: '#171312' } },
  { name: 'Coral Pop', p: { bg: '#D9553F', ink: '#fff6e6', accent: '#171312', shadow: '#171312', window: '#171312' } },
  { name: 'Lime Rush', p: { bg: '#C9F26B', ink: '#171312', accent: '#171312', shadow: '#D9553F', window: '#171312' } },
  { name: 'Gold Cup', p: { bg: '#DFAF37', ink: '#171312', accent: '#171312', shadow: '#fff6e6', window: '#171312' } },
];

const COLOR_FIELDS: { key: keyof Palette; label: string }[] = [
  { key: 'bg', label: 'Background' },
  { key: 'ink', label: 'Text' },
  { key: 'accent', label: 'Frame' },
  { key: 'shadow', label: 'Shadow' },
  { key: 'window', label: 'Photo window' },
];

const PATTERNS: PatternId[] = ['none', 'stars', 'dots', 'checker', 'grid', 'stripes', 'snow', 'hearts'];
const BORDERS: BorderId[] = ['none', 'solid', 'double', 'dashed', 'pixel'];

export function Customize() {
  const { templateId, cust, patchCust, setSlotCount, addSticker, updateSticker, removeSticker, go } = useStore();
  const template = getTemplate(templateId);
  const layout = getLayout(template.layout);
  const { images, labels } = useSlotImages();
  const [tab, setTab] = useState<Tab>('colors');
  const [sel, setSel] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const selected = cust.stickers.find((s) => s.id === sel) ?? null;

  const palettes = [...COLLECTIONS.map((c) => ({ name: c.name, p: c.palette })), ...EXTRA_PALETTES];

  const add = (kind: string) => {
    const id = uid();
    addSticker({ id, kind, x: 0.25 + Math.random() * 0.5, y: 0.2 + Math.random() * 0.6, scale: 1, rot: 0 });
    setSel(id);
  };

  return (
    <section className="screen split">
      <div className="split-main">
        <StripPreview
          template={template}
          cust={cust}
          images={images}
          labels={labels}
          className="strip-big"
          onTextClick={() => {
            setTab('text');
            setTimeout(() => titleRef.current?.focus(), 0);
          }}
          editStickers={{
            selected: sel,
            onSelect: (id) => {
              setSel(id);
              if (id) setTab('stickers');
            },
            onMove: (id, x, y) => updateSticker(id, { x, y }),
          }}
        />
        <p className="muted small center">Drag stickers to move them. Tap the caption to edit it.</p>
      </div>

      <aside className="split-side">
        <h2>STYLE IT</h2>
        <div className="row wrap tabs" role="tablist">
          {(['colors', 'text', 'stickers', 'layout'] as Tab[]).map((t) => (
            <Chip key={t} active={tab === t} onClick={() => setTab(t)} role="tab">
              {t.toUpperCase()}
            </Chip>
          ))}
        </div>

        {tab === 'colors' && (
          <>
            <Label>THEMES</Label>
            <div className="swatches">
              {palettes.map(({ name, p }) => (
                <button key={name} className="swatch" onClick={() => patchCust({ colors: { ...p } })} title={name}>
                  <span style={{ background: p.bg }} />
                  <span style={{ background: p.accent }} />
                  <span style={{ background: p.shadow }} />
                  <span style={{ background: p.ink }} />
                  <em>{name}</em>
                </button>
              ))}
            </div>
            <Label>FINE TUNE</Label>
            <div className="color-fields">
              {COLOR_FIELDS.map((f) => (
                <label key={f.key} className="color-field">
                  <input
                    type="color"
                    value={cust.colors[f.key]}
                    onChange={(e) => patchCust({ colors: { ...cust.colors, [f.key]: e.target.value } })}
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {tab === 'text' && (
          <>
            <label className="field col">
              <span>TITLE</span>
              <input ref={titleRef} value={cust.title} maxLength={24} onChange={(e) => patchCust({ title: e.target.value })} />
            </label>
            <label className="field col">
              <span>NAMES / CAPTION</span>
              <input
                value={cust.subtitle}
                maxLength={40}
                placeholder="e.g. ALEX & SAM"
                onChange={(e) => patchCust({ subtitle: e.target.value })}
              />
            </label>
            <Label>TITLE FONT</Label>
            <div className="row wrap">
              {FONTS.map((f) => (
                <Chip key={f} active={cust.font === f} onClick={() => patchCust({ font: f })}>
                  <span style={{ fontFamily: `"${f}"` }}>{f}</span>
                </Chip>
              ))}
            </div>
            <div className="toggles">
              <Toggle on={cust.showDate} onChange={(v) => patchCust({ showDate: v })}>
                Date stamp
              </Toggle>
              <Toggle on={cust.showScore} onChange={(v) => patchCust({ showScore: v })}>
                Score line
              </Toggle>
            </div>
          </>
        )}

        {tab === 'stickers' && (
          <>
            <div className="sticker-grid">
              {STICKERS.map((s) => (
                <button key={s.id} className="sticker-btn" onClick={() => add(s.id)} title={`Add ${s.label}`}>
                  {s.text ? <span className="sticker-text">{s.text}</span> : <PixelIcon id={s.id} size={32} />}
                </button>
              ))}
            </div>
            {selected ? (
              <div className="panel">
                <Label>SELECTED STICKER</Label>
                <label className="field col">
                  <span>SIZE</span>
                  <input
                    type="range"
                    min={0.4}
                    max={3}
                    step={0.05}
                    value={selected.scale}
                    onChange={(e) => updateSticker(selected.id, { scale: +e.target.value })}
                  />
                </label>
                <label className="field col">
                  <span>ROTATE</span>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={1}
                    value={selected.rot}
                    onChange={(e) => updateSticker(selected.id, { rot: +e.target.value })}
                  />
                </label>
                <Button
                  variant="danger"
                  onClick={() => {
                    removeSticker(selected.id);
                    setSel(null);
                  }}
                >
                  REMOVE
                </Button>
              </div>
            ) : (
              <p className="muted small">Tap a sticker to add it, then drag it on the strip.</p>
            )}
            {cust.stickers.length > 0 && (
              <Button
                onClick={() => {
                  patchCust({ stickers: [] });
                  setSel(null);
                }}
              >
                CLEAR ALL STICKERS
              </Button>
            )}
          </>
        )}

        {tab === 'layout' && (
          <>
            <Label>PHOTO SLOTS</Label>
            <Segmented
              label="Photo slots"
              value={cust.slotCount}
              options={layout.slots.map((v) => ({ value: v, label: String(v) }))}
              onChange={setSlotCount}
            />
            <Label>BACKGROUND PATTERN</Label>
            <div className="row wrap">
              {PATTERNS.map((p) => (
                <Chip key={p} active={cust.pattern === p} onClick={() => patchCust({ pattern: p })}>
                  {p.toUpperCase()}
                </Chip>
              ))}
            </div>
            <Label>BORDER</Label>
            <div className="row wrap">
              {BORDERS.map((b) => (
                <Chip key={b} active={cust.border === b} onClick={() => patchCust({ border: b })}>
                  {b.toUpperCase()}
                </Chip>
              ))}
            </div>
            <Button onClick={() => go('template')}>CHANGE TEMPLATE</Button>
          </>
        )}

        <div className="row wrap push">
          <Button onClick={() => go('arrange')}>◀ ARRANGE</Button>
          <Button variant="primary" big onClick={() => go('export')}>
            NEXT: SAVE ▶
          </Button>
        </div>
      </aside>
    </section>
  );
}
