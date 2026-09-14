import { useTranslation } from 'react-i18next';
import type { Locale } from '@hafalati/shared';
import type { AdminStats } from '@/lib/queries';
import { money } from '@/lib/format';
import { Skeleton } from '@/design/Skeleton';

export function AdminStatsCards({ stats }: { stats?: AdminStats }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: t('admin.revenue'), value: money(stats.confirmedRevenue, locale), icon: '💰' },
    { label: t('admin.upcoming'), value: String(stats.upcomingEvents), icon: '📅' },
    { label: t('admin.activeOfferings'), value: String(stats.activeOfferings), icon: '✨' },
    { label: t('admin.customers'), value: String(stats.customers), icon: '👥' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface p-5">
            <span className="text-2xl">{c.icon}</span>
            <p className="mt-2 font-display text-2xl font-bold text-gold-foil">{c.value}</p>
            <p className="text-xs text-blush-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="surface mt-4 p-5">
        <h3 className="mb-3 text-sm font-semibold text-blush-700">{t('admin.bookings')}</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.bookingsByStatus).map(([status, count]) => (
            <span
              key={status}
              className="inline-flex items-center gap-2 rounded-full bg-ivory-100 px-3 py-1.5 text-sm"
            >
              <span className="font-bold text-gold-700">{count}</span>
              <span className="text-blush-600">{t(`status.${status}`)}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
