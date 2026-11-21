// Original pixel art drawn for this product. Each sprite is a grid of palette characters; '.' is transparent.
const PAL: Record<string, string> = {
  Q: '#f4b6c2',
  K: '#171312',
  W: '#ffffff',
  C: '#DED5BC',
  L: '#C9F26B',
  l: '#8fbf3a',
  G: '#b8861f',
  Y: '#DFAF37',
  y: '#f6d77a',
  P: '#D9553F',
  p: '#f08a72',
  R: '#c23b3b',
  B: '#5aa9e6',
  b: '#2f6fb0',
  S: '#cfe6f2',
  N: '#3a2a22',
  M: '#6b4a34',
};

export const SPRITES: Record<string, string[]> = {
  shades: [
    'KKKKKKKKKKKKKKKKKKKK',
    'KKWKKKKKK..KKWKKKKKK',
    'KWKKKKKKK..KWKKKKKKK',
    '.KKKKKKK....KKKKKKK.',
    '..KKKKK......KKKKK..',
  ],
  crown: [
    'Y....Y....Y',
    'YY..YYY..YY',
    'YYYYYYYYYYY',
    'YyyyyyyyyyY',
    'YRYYYBYYYRY',
    'YYYYYYYYYYY',
    'GGGGGGGGGGG',
  ],
  heart: [
    '.PP.PP.',
    'PWPPPPP',
    'PPPPPPP',
    '.PPPPP.',
    '..PPP..',
    '...P...',
  ],
  sparkle: [
    '...y...',
    '...y...',
    '..yYy..',
    'yyYWYyy',
    '..yYy..',
    '...y...',
    '...y...',
  ],
  plus: ['.L.', 'LLL', '.L.'],
  bow: [
    'pp.......pp',
    'pPp.....pPp',
    'pPPp...pPPp',
    'pPPPpRpPPPp',
    'pPPPRRRPPPp',
    'pPPPpRpPPPp',
    'pPPp.R.pPPp',
    'pPp.RR.RpPp',
    'pp.RR...RRp',
    '...R.....R.',
  ],
  pearl: ['.WW.', 'WWCW', 'WCCW', '.WW.'],
  bunny: [
    '.KK...KK.',
    '.KpK.KpK.',
    '.KpK.KpK.',
    '.KpK.KpK.',
    'KKWWWWWKK',
    'KWWWWWWWK',
    'KWKWWWKWK',
    'KpWWKWWpK',
    '.KWWWWWK.',
    '..KKKKK..',
  ],
  strawberry: [
    '..lLl..',
    '.RRlRR.',
    'RRWRRRR',
    'RRRRWRR',
    '.RWRRR.',
    '..RRR..',
    '...R...',
  ],
  coin: [
    '..GGGG..',
    '.GYYYYG.',
    'GYYyYYYG',
    'GYYyYYYG',
    'GYYyYYYG',
    'GYYyYYYG',
    '.GYYYYG.',
    '..GGGG..',
  ],
  blush: ['.pPpPp.', 'pPpPpPp', '.pPpPp.'],
  ear: [
    'K......',
    'KK.....',
    'KpK....',
    'KppK...',
    'KpppK..',
    'KppppK.',
    'KKKKKKK',
  ],
  mustache: ['.NNN....NNN.', 'NNNNNNNNNNNN', 'NN..NNNN..NN'],
  flower: [
    '..p.p..',
    '.pPpPp.',
    'pPPyPPp',
    '.pPyPp.',
    '..pPp..',
    '...l...',
    '..lLl..',
  ],
  snow: [
    '...S...',
    '.S.S.S.',
    '..SSS..',
    'SSSWSSS',
    '..SSS..',
    '.S.S.S.',
    '...S...',
  ],
  bolt: ['...YY', '..YY.', '.YYYY', '..YY.', '.YY..', 'YY...'],
  smile: [
    '.YYYYY.',
    'YYYYYYY',
    'YKYYYKY',
    'YYYYYYY',
    'YKYYYKY',
    'YYKKKYY',
    '.YYYYY.',
  ],
  star: [
    '...Y...',
    '..YYY..',
    'YYYyYYY',
    '.YyyyY.',
    '..YYY..',
    '.YY.YY.',
    'YY...YY',
  ],
  tree: [
    '...Y...',
    '...L...',
    '..LLL..',
    '.LPLLL.',
    '..LLL..',
    '.LLLYL.',
    'LLPLLLL',
    '...M...',
  ],
  gift: [
    '..P.P..',
    '...P...',
    'YYYPYYY',
    'YYYPYYY',
    'PPPPPPP',
    'YYYPYYY',
    'YYYPYYY',
  ],
};

const cache = new Map<string, HTMLCanvasElement>();

/** Renders a sprite at 1px per cell; 'X' cells (if any) take the tint color. */
export function spriteCanvas(id: string, tint?: string): HTMLCanvasElement {
  const key = id + (tint ?? '');
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = SPRITES[id] ?? SPRITES.star;
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = tint && ch !== 'W' && ch !== 'K' ? tint : PAL[ch] ?? '#000';
      ctx.fillRect(x, y, 1, 1);
    })
  );
  cache.set(key, c);
  return c;
}

export function spriteSize(id: string) {
  const rows = SPRITES[id] ?? SPRITES.star;
  return { w: rows[0].length, h: rows.length };
}

/** Draws a sprite centered at (cx, cy) with the given total width, rotated by `angle` radians. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  cy: number,
  width: number,
  angle = 0,
  opts: { tint?: string; alpha?: number; flipX?: boolean } = {}
) {
  const c = spriteCanvas(id, opts.tint);
  const scale = width / c.width;
  const h = c.height * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  if (opts.flipX) ctx.scale(-1, 1);
  ctx.drawImage(c, -width / 2, -h / 2, width, h);
  ctx.restore();
}

/** Sticker catalogue: pixel sprites plus score-style text badges. */
export const STICKERS: { id: string; label: string; text?: string }[] = [
  { id: 'heart', label: 'Heart' },
  { id: 'bow', label: 'Bow' },
  { id: 'pearl', label: 'Pearl' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'strawberry', label: 'Strawberry' },
  { id: 'star', label: 'Star' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'coin', label: 'Coin' },
  { id: 'crown', label: 'Crown' },
  { id: 'flower', label: 'Flower' },
  { id: 'snow', label: 'Snow' },
  { id: 'bolt', label: 'Bolt' },
  { id: 'smile', label: 'Smile' },
  { id: 'tree', label: 'Tree' },
  { id: 'gift', label: 'Gift' },
  { id: 'shades', label: 'Shades' },
  { id: 't-1up', label: '1UP', text: '1UP' },
  { id: 't-gg', label: 'GG', text: 'GG' },
  { id: 't-win', label: 'WIN!', text: 'WIN!' },
  { id: 't-lvl', label: 'LV UP', text: 'LV UP' },
  { id: 't-combo', label: 'x2 COMBO', text: 'x2 COMBO' },
  { id: 't-bff', label: 'BFF', text: 'BFF' },
  { id: 't-xoxo', label: 'xoxo', text: 'xoxo' },
  { id: 't-cutie', label: 'cutie', text: 'cutie' },
];
