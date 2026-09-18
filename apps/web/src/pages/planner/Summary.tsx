import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CATEGORY_ORDER,
  DEFAULT_FISCAL_CONFIG,
  EventType,
  computeTotals,
  type Locale,
} from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { ApiRequestError } from '@/lib/api';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { OrnamentDivider } from '@/design/Ornament';
import { useWizard } from '@/store/wizard';
import { useAuth } from '@/store/auth';
import { useToast } from '@/design/Toast';

export function Summary() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { selections, selectedOfferingIds, eventDate, eventType, notes, setNotes, prev, reset } =
    useWizard();

  const [submitting, setSubmitting] = useState(false);

  const { data: platform } = useQuery({ queryKey: ['platform'], queryFn: endpoints.platform });
  const fiscalConfig = platform
    ? {
        tvaRate: platform.fiscal.tvaRate,
        timbreFiscalTnd: platform.fiscal.timbreFiscalTnd,
        depositRate: platform.fiscal.depositRate,
      }
    : DEFAULT_FISCAL_CONFIG;

  const chosen = CATEGORY_ORDER.map((c) => selections[c]).filter(Boolean);
  const fiscal = computeTotals(
    chosen.map((o) => ({ unitPrice: o!.basePrice })),
    fiscalConfig,
  );

  const canSubmit = chosen.length > 0 && Boolean(eventDate) && Boolean(eventType);
  const eventDateLabel = (() => {
    if (!eventDate) return '—';
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(
        new Date(`${eventDate}T00:00:00`),
      );
    } catch {
      return eventDate;
    }
  })();

  async function handleConfirm() {
    if (!user) {
      toast.show(t('summary.loginToBook'), 'info');
      navigate('/login', { state: { from: '/plan' } });
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await endpoints.createBooking({
        eventDate,
        eventType: eventType as EventType,
        offeringIds: selectedOfferingIds,
        notes: notes || undefined,
      });
      const confirmed = await endpoints.confirmBooking(created.id);
      reset();
      navigate('/confirmation', { state: { booking: confirmed, platform } });
    } catch (err) {
      const message =
        err instanceof ApiRequestError && err.code === 'date_unavailable'
          ? 'التاريخ المختار غير متاح لأحد العناصر'
          : t('common.error');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-2 text-center">
        <h2 className="font-display text-2xl font-bold text-blush-900">{t('summary.title')}</h2>
        <p className="text-sm text-blush-500">{t('summary.subtitle')}</p>
      </div>
      <OrnamentDivider />

      <div className="mx-auto max-w-3xl">
        {/* Line items */}
        <div className="surface p-5">
          {chosen.length === 0 ? (
            <p className="py-8 text-center text-sm text-blush-400">{t('summary.empty')}</p>
          ) : (
            <ul className="space-y-2.5">
              {chosen.map((o) => (
                <li
                  key={o!.id}
                  className="flex items-center justify-between rounded-2xl bg-ivory-100 p-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{o!.emoji}</span>
                    <span>
                      <span className="block text-sm font-semibold text-blush-900">
                        {loc(o!.name, locale)}
                      </span>
                      <span className="block text-[11px] text-blush-400">
                        {loc(o!.description, locale)}
                      </span>
                    </span>
                  </span>
                  <span className="text-sm font-bold text-gold-700">
                    {money(o!.basePrice, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Fiscal breakdown */}
          <div className="mt-5 space-y-1.5 border-t border-gold-100 pt-4 text-sm">
            <Row label={t('summary.subtotal')} value={money(fiscal.subtotal, locale)} />
            <Row label={t('summary.tva')} value={money(fiscal.tva, locale)} />
            <Row label={t('summary.timbre')} value={money(fiscal.timbreFiscal, locale)} />
            <div className="flex items-center justify-between border-t border-gold-100 pt-2">
              <span className="font-semibold text-blush-900">{t('summary.total')}</span>
              <span className="font-display text-xl font-bold text-gold-foil">
                {money(fiscal.total, locale)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-gold-50 px-3 py-2">
              <span className="text-xs font-semibold text-gold-700">{t('summary.deposit')}</span>
              <span className="text-sm font-bold text-gold-700">{money(fiscal.deposit, locale)}</span>
            </div>
            <Row
              label={t('summary.balance')}
              value={money(fiscal.balance, locale)}
              subtle
            />
          </div>
        </div>

        {/* Event details — type + date are set in the gate (read-only here); edit them from the bar above. */}
        <div className="surface mt-4 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div className="rounded-xl bg-ivory-100 px-3 py-2.5">
            <span className="mb-0.5 block text-[11px] font-medium text-blush-400">
              {t('summary.eventDate')}
            </span>
            <span className="text-sm font-semibold text-blush-900">{eventDateLabel}</span>
          </div>
          <div className="rounded-xl bg-ivory-100 px-3 py-2.5">
            <span className="mb-0.5 block text-[11px] font-medium text-blush-400">
              {t('summary.eventType')}
            </span>
            <span className="text-sm font-semibold text-blush-900">
              {eventType ? t(`eventTypes.${eventType}`) : '—'}
            </span>
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-blush-700">{t('summary.notes')}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gold-200 bg-white px-3 py-2 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <GoldButton variant="outline" onClick={prev}>
            ← {t('wizard.prev')}
          </GoldButton>
          <GoldButton size="lg" onClick={handleConfirm} loading={submitting} disabled={!canSubmit}>
            {user ? t('summary.confirm') : t('summary.loginToBook')} ✦
          </GoldButton>
        </div>
        {chosen.length === 0 && (
          <p className="mt-2 text-center text-xs text-blush-400">{t('summary.empty')}</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={subtle ? 'text-xs text-blush-400' : 'text-blush-600'}>{label}</span>
      <span className={subtle ? 'text-xs text-blush-400' : 'font-medium text-blush-800'}>{value}</span>
    </div>
  );
}
