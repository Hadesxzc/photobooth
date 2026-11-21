import type { CollectionId, Geometry, LayoutId, Palette, PatternId, BorderId, FontId, Template, Rect } from '../types';

export interface Collection {
  id: CollectionId;
  name: string;
  blurb: string;
  palette: Palette;
  font: FontId;
  pattern: PatternId;
  border: BorderId;
  titles: string[]; // one per layout
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'coquette',
    name: 'Ribbon Club',
    blurb: 'Bows, pearls and blush pink',
    palette: { bg: '#fbe4e8', ink: '#9c3d55', accent: '#f4b6c2', shadow: '#ffffff', window: '#f7d3da' },
    font: 'Pinyon Script',
    pattern: 'gingham',
    border: 'lace',
    titles: ['xoxo', 'sweet as pie', 'pretty please', 'besties forever', 'lovers club'],
  },
  {
    id: 'kawaii',
    name: 'Strawberry Milk',
    blurb: 'Mochi the bunny, polka dots and berries',
    palette: { bg: '#fff1f4', ink: '#e0556f', accent: '#ffb3c4', shadow: '#ffd9e1', window: '#ffe4ea' },
    font: 'Fredoka',
    pattern: 'dots',
    border: 'rounded',
    titles: ['strawberry milk', 'hi bestie!', 'mochi & me', 'sweet treat', 'bun bun club'],
  },
  {
    id: 'night',
    name: 'Night Arcade',
    blurb: 'Lime, gold and cream on dark',
    palette: { bg: '#171312', ink: '#DED5BC', accent: '#C9F26B', shadow: '#D9553F', window: '#0c0a09' },
    font: 'Anton',
    pattern: 'stars',
    border: 'solid',
    titles: ['PLAYER ONE', 'HIGH SCORE', 'BONUS ROUND', 'SIDE QUEST', 'NIGHT SHIFT'],
  },
  {
    id: 'gameover',
    name: 'Game Over',
    blurb: 'Pure black and white',
    palette: { bg: '#0a0a0a', ink: '#f4f4f0', accent: '#f4f4f0', shadow: '#4a4a4a', window: '#000000' },
    font: 'Press Start 2P',
    pattern: 'none',
    border: 'pixel',
    titles: ['GAME OVER', 'CONTINUE?', 'PRESS START', 'FINAL BOSS', 'THE END'],
  },
  {
    id: 'cartridge',
    name: 'Cartridge',
    blurb: 'Four-tone green handheld',
    palette: { bg: '#9bbc0f', ink: '#0f380f', accent: '#306230', shadow: '#0f380f', window: '#0f380f' },
    font: 'Silkscreen',
    pattern: 'grid',
    border: 'double',
    titles: ['LEVEL 01', 'SAVE FILE', 'NEW GAME+', 'LINK CABLE', 'BATTERY LOW'],
  },
  {
    id: 'garden',
    name: 'Pixel Garden',
    blurb: 'Hearts, flowers, sparkles',
    palette: { bg: '#DED5BC', ink: '#171312', accent: '#171312', shadow: '#D9553F', window: '#2a2320' },
    font: 'Pixelify Sans',
    pattern: 'hearts',
    border: 'solid',
    titles: ['BLOOM MODE', 'LOVE +1', 'PETAL PARTY', 'GARDEN STAGE', 'SWEET SPOT'],
  },
  {
    id: 'holiday',
    name: 'Holiday Level',
    blurb: 'Snow pixels, gold and coral',
    palette: { bg: '#13283a', ink: '#f3ecd8', accent: '#DFAF37', shadow: '#D9553F', window: '#09141e' },
    font: 'Anton',
    pattern: 'snow',
    border: 'dashed',
    titles: ['HOLIDAY LEVEL', 'SNOW DAY', 'GIFT UNLOCKED', 'COZY MODE', 'NEW YEAR+'],
  },
  {
    id: 'filmroll',
    name: 'Film Roll',
    blurb: 'Numbered frames, amber ink',
    palette: { bg: '#1b1a17', ink: '#DFAF37', accent: '#3a362f', shadow: '#000000', window: '#0e0d0b' },
    font: 'Space Mono',
    pattern: 'none',
    border: 'none',
    titles: ['ROLL 01', 'EXPOSURE', 'DARKROOM', 'CONTACT SHEET', 'LAST FRAME'],
  },
];

export const LAYOUTS: { id: LayoutId; name: string; slots: number[]; defaultSlots: number }[] = [
  { id: 'strip', name: 'Classic Run', slots: [2, 3, 4, 6], defaultSlots: 4 },
  { id: 'grid', name: 'Quad Stage', slots: [2, 3, 4, 6], defaultSlots: 4 },
  { id: 'polaroid', name: 'Snapshot Card', slots: [2, 3, 4, 6], defaultSlots: 4 },
  { id: 'wide', name: 'Side Scroller', slots: [2, 3, 4], defaultSlots: 3 },
  { id: 'film', name: 'Film Reel', slots: [2, 3, 4, 6], defaultSlots: 4 },
];

export const TEMPLATES: Template[] = COLLECTIONS.flatMap((c) =>
  LAYOUTS.map((l, i) => ({
    id: `${c.id}-${l.id}`,
    name: l.name,
    collection: c.id,
    layout: l.id,
    defaults: {
      colors: { ...c.palette },
      title: c.titles[i],
      font: c.font,
      pattern: c.pattern,
      border: c.border,
      slotCount: l.defaultSlots,
    },
  }))
);

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
export const getCollection = (id: CollectionId) => COLLECTIONS.find((c) => c.id === id)!;
export const getLayout = (id: LayoutId) => LAYOUTS.find((l) => l.id === id)!;

/** Geometry is in base units; exports multiply by EXPORT_SCALE. */
export function layoutGeometry(layout: LayoutId, n: number): Geometry {
  switch (layout) {
    case 'strip': {
      const w = 600, h = 1800, pad = 40, gap = 24, footer = 250;
      const sh = (h - pad - footer - gap * (n - 1)) / n;
      const slots = range(n).map((i) => ({ x: pad, y: pad + i * (sh + gap), w: w - pad * 2, h: sh }));
      return { w, h, slots, text: { x: pad, y: h - footer + 16, w: w - pad * 2, h: footer - 40 } };
    }
    case 'film': {
      const w = 700, h = 1900, side = 90, pad = 40, gap = 30, footer = 250;
      const sh = (h - pad - footer - gap * (n - 1)) / n;
      const slots = range(n).map((i) => ({ x: side, y: pad + i * (sh + gap), w: w - side * 2, h: sh }));
      return { w, h, slots, text: { x: side, y: h - footer + 16, w: w - side * 2, h: footer - 40 } };
    }
    case 'grid': {
      const cols = n === 3 ? 3 : n === 6 ? 3 : 2;
      const rows = Math.ceil(n / cols);
      const w = 1200, pad = 60, gap = 30, footer = 240;
      const sw = (w - pad * 2 - gap * (cols - 1)) / cols;
      const sh = n === 2 ? sw * 1.3 : sw * 1.25;
      const h = pad + rows * sh + gap * (rows - 1) + footer;
      const slots = range(n).map((i) => ({
        x: pad + (i % cols) * (sw + gap),
        y: pad + Math.floor(i / cols) * (sh + gap),
        w: sw,
        h: sh,
      }));
      return { w, h, slots, text: { x: pad, y: h - footer + 20, w: w - pad * 2, h: footer - 50 } };
    }
    case 'polaroid': {
      const cols = n === 3 ? 3 : n === 6 ? 3 : 2;
      const rows = Math.ceil(n / cols);
      const w = 1200, pad = 90, gap = 70, footer = 240;
      const sw = (w - pad * 2 - gap * (cols - 1)) / cols;
      const sh = sw * 1.05;
      const cell = sh + 90; // room for the polaroid chin
      const h = pad + rows * cell + gap * (rows - 1) + footer;
      const tilts = [-4, 3, -2, 4, -3, 2];
      const slots = range(n).map((i) => ({
        x: pad + (i % cols) * (sw + gap),
        y: pad + Math.floor(i / cols) * (cell + gap),
        w: sw,
        h: sh,
        rot: tilts[i % tilts.length],
      }));
      return { w, h, slots, text: { x: pad, y: h - footer + 20, w: w - pad * 2, h: footer - 50 } };
    }
    case 'wide': {
      const h = 640, pad = 40, gap = 20, side = 360;
      const w = 1900;
      const sw = (w - pad - side - gap * (n - 1)) / n;
      const slots = range(n).map((i) => ({ x: pad + i * (sw + gap), y: pad, w: sw, h: h - pad * 2 }));
      return { w, h, slots, text: { x: w - side + 30, y: pad, w: side - 70, h: h - pad * 2 } };
    }
  }
}

export const slotAspect = (r: Rect) => r.w / r.h;

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}
