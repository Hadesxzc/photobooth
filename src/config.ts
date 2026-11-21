export const APP_NAME = 'Oh, Snap!';
/** File-safe version of the name, for downloads and storage keys. */
export const APP_SLUG = 'oh-snap';
export const APP_TAGLINE = 'An arcade photobooth in your browser';

export const RETRO = {
  ground: '#171312',
  cream: '#DED5BC',
  lime: '#C9F26B',
  gold: '#DFAF37',
  coral: '#D9553F',
  muted: '#A39C89',
};

export const FONTS = [
  'Anton',
  'Space Mono',
  'Space Grotesk',
  'Press Start 2P',
  'VT323',
  'Silkscreen',
  'Pixelify Sans',
  'Pinyon Script',
  'Playfair Display',
  'Fredoka',
  'Shrikhand',
] as const;

/** Export scale: base strip is 600×1800, so ×2 gives 1200×3600 (2×6 in at 600 dpi, crisp at 300). */
export const EXPORT_SCALE = 2;
