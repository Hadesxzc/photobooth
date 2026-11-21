export type Mode = 'solo' | 'together' | 'remote';
export type Step = 'start' | 'template' | 'booth' | 'peek' | 'glow' | 'customize' | 'export';

export type LayoutId = 'strip' | 'grid' | 'polaroid' | 'wide' | 'film';
export type CollectionId = 'coquette' | 'kawaii' | 'dream' | 'night' | 'gameover' | 'cartridge' | 'garden' | 'holiday' | 'filmroll';
export type PatternId = 'none' | 'gingham' | 'stars' | 'dots' | 'checker' | 'grid' | 'stripes' | 'snow' | 'hearts';
export type BorderId = 'none' | 'solid' | 'double' | 'dashed' | 'pixel' | 'white' | 'rounded' | 'lace' | 'washi' | 'pearl';
export type SprinkleId = 'strawberries' | 'bows' | 'hearts' | 'pearls' | 'cherries' | 'sparkles' | 'flowers' | 'stars';
export type FontId =
  | 'Anton'
  | 'Space Mono'
  | 'Space Grotesk'
  | 'Press Start 2P'
  | 'VT323'
  | 'Silkscreen'
  | 'Pixelify Sans'
  | 'Pinyon Script'
  | 'Playfair Display'
  | 'Fredoka'
  | 'Shrikhand';

export type EffectId =
  | 'none'
  | 'shades'
  | 'crown'
  | 'hearts'
  | 'blush'
  | 'sparkles'
  | 'coins'
  | 'catears'
  | 'mustache'
  | 'hearteyes'
  | 'halo'
  | 'bow'
  | 'bunnyears';

export interface Palette {
  bg: string;
  ink: string;
  accent: string;
  shadow: string;
  window: string;
}

export interface Sticker {
  id: string;
  kind: string; // sprite id or text sticker id
  x: number; // 0..1 of strip width
  y: number; // 0..1 of strip height
  scale: number;
  rot: number; // degrees
}

export interface Customization {
  colors: Palette;
  title: string;
  subtitle: string;
  showDate: boolean;
  showScore: boolean;
  font: FontId;
  pattern: PatternId;
  border: BorderId;
  slotCount: number;
  stickers: Sticker[];
  sprinkles: SprinkleId[];
}

export interface Look {
  filter: number;
  bright: number;
  warm: number;
  soft: number;
}

export interface Shot {
  id: string;
  url: string; // finished photo: raw + look + face-effect layer
  raw: string; // unfiltered camera frame
  fx?: string; // transparent face-effect layer (PNG), drawn on top after the look
  look: Look;
  player: number; // 0-based player index who took it
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number; // degrees
}

export interface Geometry {
  w: number;
  h: number;
  slots: Rect[];
  text: Rect;
}

export interface Template {
  id: string;
  name: string;
  collection: CollectionId;
  layout: LayoutId;
  defaults: Pick<Customization, 'colors' | 'title' | 'font' | 'pattern' | 'border' | 'slotCount'>;
}

export interface CaptureSettings {
  countdown: 3 | 5 | 10;
  flash: boolean;
  /** Screen light: the screen glows white while shooting and flashes at the moment of capture to light the face. */
  light: boolean;
  sound: boolean;
  mirror: boolean;
  burst: boolean;
  facing: 'user' | 'environment';
  filter: number;
  effect: EffectId;
}
