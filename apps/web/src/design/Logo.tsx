import { useTranslation } from 'react-i18next';

/** Crowned wordmark lockup echoing the flier. */
export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gold-gradient shadow-gold">
        <CrownIcon className="h-6 w-6 text-white" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-2xl font-bold text-gold-foil">
            {t('brand.name')}
          </span>
          <span className="-mt-1 block text-[11px] font-medium text-blush-500">
            {t('brand.tagline')}
          </span>
        </span>
      )}
    </div>
  );
}

export function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 18h18l-1.6-9-4.4 3.8L12 6l-3 6.8L4.6 9 3 18z" />
      <rect x="3" y="19" width="18" height="2.4" rx="1" />
    </svg>
  );
}
