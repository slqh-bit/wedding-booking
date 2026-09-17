import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { EventType, Locale, PackageDTO } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { GoldButton } from '@/design/GoldButton';
import { Skeleton } from '@/design/Skeleton';
import { OrnamentDivider } from '@/design/Ornament';
import { ApiRequestError } from '@/lib/api';
import { useToast } from '@/design/Toast';

const EVENT_TYPES: EventType[] = ['WEDDING', 'ENGAGEMENT', 'BIRTHDAY', 'GRADUATION', 'OTHER'];

export function Packages() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ['packages'], queryFn: endpoints.packages });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-blush-900">{t('packages.title')}</h1>
      <p className="mt-1 text-sm text-blush-500">{t('packages.subtitle')}</p>

      <OrnamentDivider />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="py-16 text-center text-sm text-blush-400">{t('packages.empty')}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PackageCard({ pkg }: { pkg: PackageDTO }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<EventType>('WEDDING');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const pct = Math.round(pkg.discountRate * 100);

  async function book() {
    if (!user) {
      toast.show(t('summary.loginToBook'), 'info');
      navigate('/login', { state: { from: '/packages' } });
      return;
    }
    if (!eventDate) return;
    setSubmitting(true);
    try {
      const platform = await endpoints.platform();
      const created = await endpoints.createBooking({
        eventDate,
        eventType,
        offeringIds: [],
        packageId: pkg.id,
      });
      const confirmed = await endpoints.confirmBooking(created.id);
      navigate('/confirmation', { state: { booking: confirmed, platform } });
    } catch (err) {
      const message =
        err instanceof ApiRequestError && err.code === 'date_unavailable'
          ? t('packages.dateUnavailable')
          : t('common.error');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="surface relative flex flex-col overflow-hidden">
      <span className="absolute end-3 top-3 z-10 rounded-full bg-gold-gradient px-2.5 py-1 text-xs font-bold text-white shadow">
        −{pct}%
      </span>
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-gold-100 to-blush-100 text-5xl">
        {pkg.emoji}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold text-blush-900">{loc(pkg.name, locale)}</h3>
        <p className="mt-1 text-xs text-blush-500">{loc(pkg.description, locale)}</p>

        <ul className="mt-3 space-y-1">
          {pkg.offerings.map((o) => (
            <li key={o.id} className="flex items-center gap-2 text-xs text-blush-700">
              <span>{o.emoji}</span>
              <span className="flex-1 truncate">{loc(o.name, locale)}</span>
              <span className="text-blush-400">{money(o.basePrice, locale)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-end justify-between border-t border-gold-100 pt-3">
          <div>
            <span className="block text-[11px] text-blush-400 line-through">
              {money(pkg.originalTotal, locale)}
            </span>
            <span className="font-display text-xl font-bold text-gold-foil">
              {money(pkg.discountedTotal, locale)}
            </span>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {t('packages.save')} {money(pkg.savings, locale)}
          </span>
        </div>

        {!open ? (
          <GoldButton className="mt-4 w-full" onClick={() => setOpen(true)}>
            🎁 {t('packages.book')}
          </GoldButton>
        ) : (
          <div className="mt-4 space-y-2 rounded-2xl bg-ivory-50 p-3">
            <label className="block text-[11px] font-semibold text-blush-500">
              {t('summary.eventDate')}
            </label>
            <input
              type="date"
              min={today}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border border-gold-200 bg-white px-2.5 py-1.5 text-sm focus:border-gold-400 focus:outline-none"
            />
            <label className="block text-[11px] font-semibold text-blush-500">
              {t('summary.eventType')}
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full rounded-lg border border-gold-200 bg-white px-2.5 py-1.5 text-sm focus:border-gold-400 focus:outline-none"
            >
              {EVENT_TYPES.map((et) => (
                <option key={et} value={et}>
                  {t(`eventTypes.${et}`)}
                </option>
              ))}
            </select>
            <GoldButton
              className="w-full"
              disabled={!eventDate}
              loading={submitting}
              onClick={book}
            >
              {t('summary.confirm')}
            </GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}
