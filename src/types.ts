export type Mode = 'solo' | 'together' | 'remote';
export type Step = 'start' | 'template' | 'booth' | 'arrange' | 'customize' | 'export';

export type LayoutId = 'strip' | 'grid' | 'polaroid' | 'wide' | 'film';
export type CollectionId = 'night' | 'gameover' | 'cartridge' | 'garden' | 'holiday' | 'filmroll';
export type PatternId = 'none' | 'stars' | 'dots' | 'checker' | 'grid' | 'stripes' | 'snow' | 'hearts';
export type BorderId = 'none' | 'solid' | 'double' | 'dashed' | 'pixel';
export type FontId =
  | 'Anton'
  | 'Space Mono'
  | 'Space Grotesk'
  | 'Press Start 2P'
  | 'VT323'
  | 'Silkscreen'
  | 'Pixelify Sans';

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
  | 'halo';

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
}

export interface Shot {
  id: string;
  url: string; // object URL of a JPEG blob
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
  sound: boolean;
  mirror: boolean;
  burst: boolean;
  facing: 'user' | 'environment';
  filter: number;
  effect: EffectId;
}
