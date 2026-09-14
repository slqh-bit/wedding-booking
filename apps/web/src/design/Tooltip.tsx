import type { ReactNode } from 'react';

/** Lightweight CSS tooltip (no dependency). Wrap any element. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full start-1/2 z-40 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-blush-900 px-2.5 py-1 text-[11px] font-medium text-ivory-50 opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 rtl:translate-x-1/2"
      >
        {label}
      </span>
    </span>
  );
}
