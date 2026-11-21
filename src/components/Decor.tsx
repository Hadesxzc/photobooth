import type { CSSProperties } from 'react';

// Soft vector ornaments for the coquette landing page.

export function Bow({ size = 60, color = '#FF8FB1', style, className = '' }: { size?: number; color?: string; style?: CSSProperties; className?: string }) {
  return (
    <svg className={className} style={style} width={size} height={size * 1.1} viewBox="-60 -42 120 132" aria-hidden>
      <g stroke="#2B1A1F" strokeWidth="5" strokeLinejoin="round" fill={color}>
        <path d="M4 4 C14 30 18 52 30 76 L20 70 L14 82 C6 56 2 30 -4 6 Z" />
        <path d="M-4 4 C-14 30 -18 52 -30 76 L-20 70 L-14 82 C-6 56 -2 30 4 6 Z" />
        <path d="M0 0 C18 -34 54 -36 50 -6 C48 18 22 14 0 0 Z" />
        <path d="M0 0 C-18 -34 -54 -36 -50 -6 C-48 18 -22 14 0 0 Z" />
        <ellipse cx="0" cy="0" rx="10" ry="12" />
      </g>
      <g stroke="rgba(255,255,255,.85)" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M8 -2 C20 -18 36 -20 38 -6" />
        <path d="M-8 -2 C-20 -18 -36 -20 -38 -6" />
      </g>
    </svg>
  );
}

export function Heart({ size = 20, color = '#f29bb0', style, className = '' }: { size?: number; color?: string; style?: CSSProperties; className?: string }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill={color} stroke="#2B1A1F" strokeWidth="1.6" strokeLinejoin="round" d="M12 21s-7.5-4.6-10-9.2C.3 8.6 2.2 4.5 6 4.5c2.2 0 3.6 1.2 4.6 2.6.4.6.8.6 1.2 0 1-1.4 2.4-2.6 4.6-2.6 3.8 0 5.7 4.1 4 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export function Sparkle({ size = 18, color = '#ffffff', style, className = '' }: { size?: number; color?: string; style?: CSSProperties; className?: string }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill={color} stroke="#2B1A1F" strokeWidth="1.4" strokeLinejoin="round" d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0z" />
    </svg>
  );
}

export function Pearls({ count = 9, size = 10, className = '' }: { count?: number; size?: number; className?: string }) {
  return (
    <span className={`pearls ${className}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <i key={i} style={{ width: size, height: size }} />
      ))}
    </span>
  );
}

type Floaty = { kind: 'bow' | 'heart' | 'sparkle'; x: number; y: number; s: number; d: number; c?: string; r?: number };

/** A layer of slowly drifting bows, hearts and sparkles behind a section. */
export function Floaties({ items }: { items: Floaty[] }) {
  return (
    <div className="floaties" aria-hidden>
      {items.map((f, i) => {
        const style = {
          left: `${f.x}%`,
          top: `${f.y}%`,
          animationDelay: `${f.d}s`,
          ['--r' as string]: `${f.r ?? 0}deg`,
        } as CSSProperties;
        return (
          <span key={i} className={`floaty floaty-${f.kind}`} style={style}>
            {f.kind === 'bow' && <Bow size={f.s} color={f.c} />}
            {f.kind === 'heart' && <Heart size={f.s} color={f.c} />}
            {f.kind === 'sparkle' && <Sparkle size={f.s} color={f.c} />}
          </span>
        );
      })}
    </div>
  );
}
