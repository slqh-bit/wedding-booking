import { useMemo } from 'react';

/** Celebratory confetti burst shown on booking success. Pure CSS, no deps. */
export function Confetti({ pieces = 60 }: { pieces?: number }) {
  const colors = ['#C9A227', '#E5C76B', '#E9B8BE', '#DA98A0', '#F6D9DA', '#A9861D'];
  const items = useMemo(
    () =>
      Array.from({ length: pieces }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 1.8 + Math.random() * 1.4,
        color: colors[i % colors.length],
        rotate: Math.random() * 360,
      })),
    [pieces],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden>
      {items.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}
