import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_NAME } from '../config';
import { COLLECTIONS, TEMPLATES, getTemplate } from '../lib/templates';
import { FILTERS } from '../lib/filters';
import { EFFECTS } from '../lib/effects';
import { samplePhoto, sampleSet } from '../lib/samples';
import type { CollectionId, Customization, EffectId, Sticker, Template } from '../types';
import { StripPreview } from './StripPreview';
import { PixelIcon } from './ui';
import { Bow, Heart, Sparkle } from './Decor';

const BRAND = APP_NAME;

const COLLECTION_FILTER: Record<CollectionId, number> = {
  coquette: 13,
  kawaii: 16,
  dream: 18,
  night: 3,
  gameover: 1,
  cartridge: 9,
  garden: 14,
  holiday: 4,
  filmroll: 5,
};

function custOf(t: Template, extra: Partial<Customization> = {}): Customization {
  return { ...t.defaults, colors: { ...t.defaults.colors }, subtitle: '', showDate: true, showScore: false, stickers: [], sprinkles: t.collection === 'coquette' ? ['hearts'] : t.collection === 'kawaii' ? ['strawberries'] : t.collection === 'dream' ? ['stars'] : [], ...extra };
}

function SampleStrip({
  id,
  seed,
  effects,
  filter,
  people,
  extra,
  slots,
}: {
  id: string;
  seed: number;
  effects: EffectId[];
  filter: number;
  people?: (1 | 2)[];
  extra?: Partial<Customization>;
  slots?: number;
}) {
  const t = getTemplate(id);
  const cust = useMemo(() => custOf(t, { ...extra, ...(slots ? { slotCount: slots } : {}) }), [t, extra, slots]);
  const images = useMemo(() => sampleSet(seed, cust.slotCount, effects, filter, people), [seed, cust.slotCount, effects, filter, people]);
  return <StripPreview template={t} cust={cust} images={images} scale={0.5} label={`Sample ${t.name} strip`} />;
}

const st = (kind: string, x: number, y: number, scale = 1, rot = 0): Sticker => ({ id: `${kind}${x}${y}`, kind, x, y, scale, rot });

const HERO = [
  {
    id: 'coquette-strip',
    seed: 21,
    filter: 13,
    effects: ['bow', 'hearteyes', 'blush', 'none'] as EffectId[],
    people: [1, 2] as (1 | 2)[],
    extra: { subtitle: 'ava & lily', stickers: [st('t-xoxo', 0.78, 0.33, 0.7, -12), st('heart', 0.15, 0.6, 0.45, -10)] },
  },
  {
    id: 'garden-strip',
    seed: 77,
    filter: 14,
    effects: ['blush', 'none', 'catears', 'sparkles'] as EffectId[],
    people: [1] as (1 | 2)[],
    extra: { title: 'sweet dreams', font: 'Shrikhand' as const, stickers: [st('bow', 0.84, 0.05, 0.55, 12)] },
  },
  {
    id: 'coquette-film',
    seed: 140,
    filter: 13,
    effects: ['none', 'bow', 'hearts', 'blush'] as EffectId[],
    people: [2, 1] as (1 | 2)[],
    extra: { title: 'besties', stickers: [st('t-cutie', 0.5, 0.86, 0.7, -6)] },
  },
];

const FAQ = [
  {
    q: 'Do I need to download anything?',
    a: 'Nope. It works in Chrome, Safari, Firefox and Edge on your phone or laptop. You can add it to your home screen if you want it to feel like an app.',
  },
  {
    q: 'Where do my photos go?',
    a: 'Nowhere. They are taken, filtered and made into a strip on your own device, and only leave it if you share or save them. With a long-distance friend, photos go straight from your browser to theirs.',
  },
  {
    q: 'Can I print my strips?',
    a: 'Yes. A classic strip saves at 1200 × 3600 pixels, which prints sharp on standard 2 × 6 inch photo paper.',
  },
  {
    q: "What if my camera doesn't work?",
    a: 'Upload photos from your gallery instead. Every template, filter and sticker works with them too.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes. No account, no watermark and no limit on how many strips you make.',
  },
];


export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="lp">
      <header className="lp-nav">
        <a className="lp-logo" href={location.pathname}>
          {BRAND}
        </a>
        <nav className="lp-links" aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#effects">Effects</a>
          <a href="#templates">Templates</a>
          <a href="#faq">FAQ</a>
        </nav>
        <button className="lp-btn lp-btn-sm" onClick={onStart}>
          Open the booth
        </button>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-kicker">A photobooth for your phone or laptop</p>
          <h1>
            Strike a pose. <em>Keep the strip.</em>
          </h1>
          <p className="lp-lead">
            Four photos, a countdown, and a strip you can actually post. Pick a template, add a bow or two, and save it. No
            account, and your photos never leave your device.
          </p>
          <div className="lp-actions">
            <button className="lp-btn" onClick={onStart}>
              Open the booth
            </button>
            <a className="lp-textlink" href="#templates">
              See all {TEMPLATES.length} templates
            </a>
          </div>
        </div>
        <div className="lp-hero-art" aria-hidden>
          <div className="lp-stamp">
            <span>free</span>
            <b>no sign-up</b>
          </div>
          {HERO.map((h, i) => (
            <div key={h.id} className={`lp-hs lp-hs-${i}`}>
              {i === 1 && <Bow className="lp-hs-bow" size={60} />}
              <SampleStrip {...h} />
            </div>
          ))}
        </div>
      </section>

      <div className="lp-ribbon" aria-hidden>
        <div className="lp-ribbon-track">
          {Array.from({ length: 2 }, (_, k) => (
            <span key={k}>
              free forever <Heart size={14} color="#fff" /> no sign-up <Heart size={14} color="#fff" /> {TEMPLATES.length} strip
              templates <Heart size={14} color="#fff" /> bows &amp; pearls <Heart size={14} color="#fff" /> photos stay on your
              phone <Heart size={14} color="#fff" /> print ready <Heart size={14} color="#fff" />{' '}
            </span>
          ))}
        </div>
      </div>

      <section className="lp-facts">
        {(
          [
            [TEMPLATES.length, 'strip templates'],
            [FILTERS.length - 1, 'soft & retro filters'],
            [EFFECTS.length - 1, 'face effects'],
            [0, 'photos uploaded'],
          ] as const
        ).map(([n, label]) => (
          <div key={label}>
            <b>{n}</b>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="lp-row" id="how">
        <div className="lp-row-copy">
          <p className="lp-kicker">No. 01 — Shoot</p>
          <h2>A countdown you can actually see.</h2>
          <p>
            Pick 3, 5 or 10 seconds. A little bar fills up before every shot, the screen flashes, and the next one starts on its
            own. Someone blinked? Retake just that photo.
          </p>
          <ul className="lp-list">
            <li>2 to 6 photos per strip</li>
            <li>Front or back camera, mirrored or not</li>
            <li>No camera? Upload photos instead</li>
          </ul>
        </div>
        <div className="lp-row-art">
          <CameraMock />
        </div>
      </section>

      <section className="lp-row lp-row-flip" id="effects">
        <div className="lp-row-copy">
          <p className="lp-kicker">No. 02 — Add a look</p>
          <h2>Bows, blush and sparkles that follow your face.</h2>
          <p>
            {EFFECTS.length - 1} face effects and {FILTERS.length - 1} filters, from soft Rosé and Dreamy to film grain. You see
            them live while you pose, and they're saved right into the photo.
          </p>
          <p className="lp-note">Try them on the sample. Tap an effect or a filter.</p>
        </div>
        <div className="lp-row-art">
          <EffectDemo />
        </div>
      </section>

      <section className="lp-row" id="templates">
        <div className="lp-row-copy">
          <p className="lp-kicker">No. 03 — Make it yours</p>
          <h2>{TEMPLATES.length} strips to make your own.</h2>
          <p>
            Start with Ribbon Club's bows and pearls or pick another collection. Change the colors, fonts, caption and stickers,
            then save it as a PNG or a little animated GIF.
          </p>
        </div>
        <div className="lp-row-art">
          <TemplateDemo />
        </div>
      </section>

      <section className="lp-modes">
        <p className="lp-kicker center">Who's in the photo</p>
        <h2>Bring your friends. Even the far-away ones.</h2>
        <div className="lp-mode-cols">
          <div className="lp-mode lp-mode-pink">
            <Heart size={26} color="#e889a2" />
            <h3>Just me</h3>
            <p>Four poses, your favorite template, done before your iced latte melts.</p>
          </div>
          <div className="lp-mode lp-mode-lilac">
            <Bow size={34} color="#d7b4ea" />
            <h3>Friends, one screen</h3>
            <p>Up to four of you take turns, and every photo is labeled with whose turn it was.</p>
          </div>
          <div className="lp-mode lp-mode-butter">
            <Sparkle size={26} color="#f2c46b" />
            <h3>Bestie, far away</h3>
            <p>Send a link, see each other live, and you both end up on the same strip.</p>
          </div>
        </div>
      </section>

      <section className="lp-privacy">
        <div className="lp-privacy-card">
          <Bow className="lp-privacy-bow" size={58} />
          <h2>Your photos stay yours.</h2>
          <p>
            Everything happens on your device: the camera, the filters, the face tracking and the finished strip. There's no
            account to make and nothing is uploaded to us.
          </p>
          <ul className="lp-list">
            <li>No sign-up, no watermark</li>
            <li>Face tracking runs on your phone and is never saved</li>
            <li>Long-distance mode sends photos straight to your friend</li>
          </ul>
        </div>
      </section>

      <section className="lp-faq" id="faq">
        <h2>Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <section className="lp-final">
        <p className="lp-kicker">See you in the booth</p>
        <h2>Your next favorite photo is one minute away.</h2>
        <button className="lp-btn" onClick={onStart}>
          Open the booth
        </button>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <a className="lp-logo" href={location.pathname}>
            {BRAND}
          </a>
          <p>A free photobooth that lives in your browser.</p>
        </div>
        <div className="lp-footer-cols">
          <div>
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#effects">Effects</a>
            <a href="#templates">Templates</a>
          </div>
          <div>
            <h4>Help</h4>
            <a href="#faq">FAQ</a>
            <a href="#faq">Privacy</a>
            <button className="lp-footer-link" onClick={onStart}>
              Open the booth
            </button>
          </div>
        </div>
        <p className="lp-copy">© {new Date().getFullYear()} {BRAND}</p>
      </footer>
    </div>
  );
}

function PhotoCanvas({ effect, filter, seed, people = 1 }: { effect: EffectId; filter: number; seed: number; people?: 1 | 2 }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const src = samplePhoto({ seed, effect, filter, people });
    const c = ref.current!;
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d')!.drawImage(src, 0, 0);
  }, [effect, filter, seed, people]);
  return <canvas ref={ref} className="lp-photo" />;
}

function CameraMock() {
  return (
    <div className="lp-polaroid lp-tilt-r">
      <span className="lp-tape" aria-hidden />
      <div className="lp-cam">
        <PhotoCanvas seed={42} effect="blush" filter={13} people={2} />
        <div className="lp-cam-ui">
          <span className="lp-cam-tag">photo 2 of 4</span>
          <span className="lp-cam-num">2</span>
          <span className="lp-cam-bar">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} className={i < 8 ? 'on' : ''} />
            ))}
          </span>
        </div>
      </div>
      <p className="lp-polaroid-caption">SMILE! — photo 2 of 4</p>
    </div>
  );
}

const DEMO_EFFECTS = EFFECTS.filter((e) => e.id !== 'coins' && e.id !== 'mustache');
const DEMO_FILTERS = [0, 13, 14, 11, 1, 5, 7].map((id) => FILTERS.find((f) => f.id === id)!);

function EffectDemo() {
  const [effect, setEffect] = useState<EffectId>('bow');
  const [filter, setFilter] = useState(13);
  return (
    <div className="lp-demo">
      <div className="lp-polaroid lp-tilt-l">
        <div className="lp-cam">
          <PhotoCanvas seed={8} effect={effect} filter={filter} />
        </div>
      </div>
      <div className="lp-demo-row" role="group" aria-label="Face effects">
        {DEMO_EFFECTS.map((e) => (
          <button key={e.id} className={effect === e.id ? 'on' : ''} onClick={() => setEffect(e.id)} title={e.name} aria-pressed={effect === e.id}>
            <PixelIcon id={e.icon} size={22} />
            <span className="sr">{e.name}</span>
          </button>
        ))}
      </div>
      <div className="lp-demo-row" role="group" aria-label="Filters">
        {DEMO_FILTERS.map((f) => (
          <button key={f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}>
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function TemplateDemo() {
  const [col, setCol] = useState<CollectionId>('coquette');
  const filter = COLLECTION_FILTER[col];
  const fx = useMemo<EffectId[]>(
    () => (col === 'coquette' || col === 'garden' ? ['bow', 'blush', 'none', 'hearteyes'] : ['none', 'shades', 'none', 'crown']),
    [col]
  );
  const fxRev = useMemo(() => [...fx].reverse(), [fx]);
  return (
    <div className="lp-demo">
      <div className="lp-demo-row" role="tablist" aria-label="Collections">
        {COLLECTIONS.map((c) => (
          <button key={c.id} role="tab" aria-selected={col === c.id} className={col === c.id ? 'on' : ''} onClick={() => setCol(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="lp-tpl-stage">
        <div className="lp-tpl">
          <SampleStrip id={`${col}-strip`} seed={500} effects={fx} filter={filter} people={PEOPLE_MIX} />
        </div>
        <div className="lp-tpl">
          <SampleStrip id={`${col}-film`} seed={540} effects={FILM_FX} filter={filter} slots={3} />
        </div>
        <div className="lp-tpl lp-tpl-wide">
          <SampleStrip id={`${col}-polaroid`} seed={580} effects={fxRev} filter={filter} people={PEOPLE_MIX_REV} />
        </div>
      </div>
    </div>
  );
}

const PEOPLE_MIX: (1 | 2)[] = [1, 2];
const PEOPLE_MIX_REV: (1 | 2)[] = [2, 1];
const FILM_FX: EffectId[] = ['hearts', 'none', 'blush'];
