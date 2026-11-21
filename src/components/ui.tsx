import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useMemo } from 'react';
import { spriteCanvas } from '../lib/sprites';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'lime' | 'danger'; big?: boolean };

export function Button({ variant = 'ghost', big, className = '', ...rest }: BtnProps) {
  return <button className={`btn btn-${variant} ${big ? 'btn-big' : ''} ${className}`} {...rest} />;
}

export function Chip({ active, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button className={`chip ${active ? 'chip-on' : ''}`} aria-pressed={active} {...rest}>
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'seg-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button className={`toggle ${on ? 'toggle-on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="toggle-box">{on ? 'ON' : 'OFF'}</span>
      {children}
    </button>
  );
}

export function PixelIcon({ id, size = 28, tint }: { id: string; size?: number; tint?: string }) {
  const { src, w, h } = useMemo(() => {
    const c = spriteCanvas(id, tint);
    const s = size / Math.max(c.width, c.height);
    return { src: c.toDataURL(), w: Math.round(c.width * s), h: Math.round(c.height * s) };
  }, [id, tint, size]);
  return <img className="pixel" src={src} alt="" width={w} height={h} draggable={false} />;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="label">{children}</div>;
}
