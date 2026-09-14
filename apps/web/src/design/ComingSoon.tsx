import { useTranslation } from 'react-i18next';

/** Gilded "coming soon" badge for phased/unbuilt features. */
export function ComingSoonBadge({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-gold-300 bg-gold-50 px-2.5 py-0.5 text-[10px] font-semibold text-gold-700 ${className}`}
    >
      ✦ {t('common.comingSoon')}
    </span>
  );
}
