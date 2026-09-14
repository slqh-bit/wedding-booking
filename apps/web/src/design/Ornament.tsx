import type { ReactNode } from 'react';

/** Thin gold divider with a center diamond — echoes the flier's separators. */
export function OrnamentDivider({ children }: { children?: ReactNode }) {
  return (
    <div className="ornament my-6">
      {children ? (
        <span className="font-display text-sm text-gold-600">{children}</span>
      ) : (
        <Diamond />
      )}
    </div>
  );
}

export function Diamond() {
  return <span className="text-gold-400">✦</span>;
}
