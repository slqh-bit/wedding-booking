import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CATEGORY_META, type AnalyticsDTO, type Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { Skeleton } from '@/design/Skeleton';
import { Stars } from '@/design/Stars';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-blush-300',
  PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-emerald-400',
  CANCELLED: 'bg-rose-400',
  COMPLETED: 'bg-gold-500',
};

export function AdminAnalytics() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data, isLoading } = useQuery({ queryKey: ['admin-analytics'], queryFn: endpoints.adminAnalytics });

  if (isLoading || !data)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );

  const tiles = [
    { label: t('analytics.revenue'), value: money(data.kpis.confirmedRevenue, locale), icon: '💰' },
    { label: t('analytics.bookings'), value: String(data.kpis.totalBookings), icon: '📅' },
    { label: t('analytics.customers'), value: String(data.kpis.customers), icon: '👥' },
    { label: t('analytics.activeOfferings'), value: String(data.kpis.activeOfferings), icon: '✨' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((c) => (
          <div key={c.label} className="surface p-5">
            <span className="text-2xl">{c.icon}</span>
            <p className="mt-2 font-display text-xl font-bold text-gold-foil">{c.value}</p>
            <p className="text-xs text-blush-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Rating summary + status mix */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-blush-700">{t('analytics.satisfaction')}</h3>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-bold text-gold-foil">
              {data.kpis.reviewCount > 0 ? data.kpis.avgRating.toFixed(1) : '—'}
            </span>
            <div>
              <Stars value={data.kpis.avgRating} size="md" />
              <p className="text-[11px] text-blush-400">
                {data.kpis.reviewCount} {t('review.reviewsCount')}
              </p>
            </div>
          </div>
          <RatingBars dist={data.ratingsDistribution} />
        </div>

        <div className="surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-blush-700">{t('analytics.statusMix')}</h3>
          <StatusMix data={data.bookingsByStatus} />
        </div>
      </div>

      {/* Revenue by month */}
      <div className="surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-blush-700">{t('analytics.revenueTrend')}</h3>
        <RevenueChart data={data.revenueByMonth} locale={locale} />
      </div>

      {/* Top offerings */}
      <div className="surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-blush-700">{t('analytics.topOfferings')}</h3>
        <TopOfferings items={data.topOfferings} locale={locale} />
      </div>
    </div>
  );
}

function RatingBars({ dist }: { dist: AnalyticsDTO['ratingsDistribution'] }) {
  const max = Math.max(1, ...dist.map((d) => d.count));
  return (
    <div className="mt-4 space-y-1.5">
      {[...dist].reverse().map((d) => (
        <div key={d.rating} className="flex items-center gap-2">
          <span className="w-8 text-[11px] text-blush-500">{d.rating}★</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ivory-100">
            <div
              className="h-full rounded-full bg-gold-gradient"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 text-end text-[11px] text-blush-400">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function StatusMix({ data }: { data: Record<string, number> }) {
  const { t } = useTranslation();
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
  if (entries.length === 0)
    return <p className="py-6 text-center text-sm text-blush-400">{t('account.empty')}</p>;
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {entries.map(([status, n]) => (
          <div
            key={status}
            className={STATUS_COLORS[status] ?? 'bg-blush-300'}
            style={{ width: `${(n / total) * 100}%` }}
            title={`${status}: ${n}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([status, n]) => (
          <div key={status} className="flex items-center gap-2 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-blush-300'}`} />
            <span className="text-blush-600">{t(`status.${status}`)}</span>
            <span className="ms-auto font-semibold text-blush-800">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueChart({
  data,
  locale,
}: {
  data: AnalyticsDTO['revenueByMonth'];
  locale: Locale;
}) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 180 }}>
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold text-gold-700">
            {d.revenue > 0 ? money(d.revenue, locale) : ''}
          </span>
          <div
            className="w-full max-w-[42px] rounded-t-lg bg-gold-gradient transition-all"
            style={{ height: `${(d.revenue / max) * 130 + (d.revenue > 0 ? 6 : 2)}px` }}
            title={`${d.month}: ${d.revenue}`}
          />
          <span className="text-[10px] text-blush-400">{d.month.slice(2)}</span>
        </div>
      ))}
    </div>
  );
}

function TopOfferings({
  items,
  locale,
}: {
  items: AnalyticsDTO['topOfferings'];
  locale: Locale;
}) {
  const { t } = useTranslation();
  if (items.length === 0)
    return <p className="py-6 text-center text-sm text-blush-400">{t('account.empty')}</p>;
  const max = Math.max(1, ...items.map((i) => i.revenue));
  return (
    <div className="space-y-2.5">
      {items.map((o) => (
        <div key={o.offeringId} className="flex items-center gap-3">
          <span className="text-lg">{CATEGORY_META[o.category].emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-blush-800">{loc(o.name, locale)}</span>
              <span className="text-xs font-bold text-gold-700">{money(o.revenue, locale)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ivory-100">
              <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${(o.revenue / max) * 100}%` }} />
            </div>
          </div>
          <span className="w-10 text-end text-[11px] text-blush-400">
            {o.bookings} {t('analytics.x')}
          </span>
        </div>
      ))}
    </div>
  );
}
