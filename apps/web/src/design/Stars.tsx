import { useState } from 'react';

interface StarsProps {
  /** Rating value 0–5 (may be fractional for display). */
  value: number;
  /** Number of reviews to show alongside (optional). */
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeCls: Record<NonNullable<StarsProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
};

/** Read-only star display with a half-star gradient fill for fractional values. */
export function Stars({ value, count, size = 'sm', className = '' }: StarsProps) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={`${value} / 5`}>
      <span className={`relative inline-block leading-none ${sizeCls[size]}`}>
        {/* empty track */}
        <span className="text-gold-200">★★★★★</span>
        {/* gold fill clipped to the rating percentage */}
        <span
          className="absolute inset-0 overflow-hidden whitespace-nowrap text-gold-500"
          style={{ width: `${pct}%` }}
        >
          ★★★★★
        </span>
      </span>
      {typeof count === 'number' && (
        <span className="text-[11px] text-blush-400">
          {value > 0 ? value.toFixed(1) : '—'}
          {count > 0 && <span className="ms-0.5">({count})</span>}
        </span>
      )}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (v: number) => void;
  size?: 'md' | 'lg';
}

/** Interactive 1–5 star picker with hover preview. */
export function StarInput({ value, onChange, size = 'lg' }: StarInputProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className={`inline-flex gap-1 ${size === 'lg' ? 'text-3xl' : 'text-xl'}`} role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n}`}
          aria-checked={value === n}
          role="radio"
          className={`transition-transform hover:scale-110 ${
            n <= shown ? 'text-gold-500' : 'text-gold-200'
          }`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
