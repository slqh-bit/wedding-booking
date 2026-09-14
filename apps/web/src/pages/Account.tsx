import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { BookingDTO, Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { StatusBadge } from '@/design/StatusBadge';
import { Skeleton } from '@/design/Skeleton';
import { useToast } from '@/design/Toast';
import { TelegramLink } from './account/TelegramLink';

export function Account() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ['my-bookings'], queryFn: endpoints.myBookings });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-blush-900">{t('account.title')}</h1>

      <div className="mt-6">
        <TelegramLink />
      </div>

      {isLoading && (
        <div className="mt-6 space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="surface mt-6 p-10 text-center">
          <p className="text-blush-500">{t('account.empty')}</p>
          <Link to="/plan" className="mt-4 inline-block">
            <GoldButton>{t('account.startPlanning')}</GoldButton>
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {data?.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: BookingDTO }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();

  const [paying, setPaying] = useState(false);

  const cancel = useMutation({
    mutationFn: () => endpoints.cancelBooking(booking.id),
    onSuccess: () => {
      toast.success(t('status.CANCELLED'));
      void qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  const canCancel = booking.status === 'PENDING' || booking.status === 'DRAFT';
  const canPay = booking.status === 'PENDING' && booking.depositStatus !== 'PAID';
  const hasInvoice = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';

  async function downloadInvoice() {
    try {
      await endpoints.downloadInvoice(booking.id, booking.reference);
    } catch {
      toast.error(t('common.error'));
    }
  }

  async function payOnline() {
    setPaying(true);
    try {
      const { checkoutUrl } = await endpoints.payDeposit(booking.id);
      window.location.assign(checkoutUrl);
    } catch {
      toast.error(t('common.error'));
      setPaying(false);
    }
  }

  return (
    <div className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold tracking-wide text-gold-foil">
            {booking.reference}
          </span>
          <StatusBadge status={booking.status} />
        </div>
        <div className="text-end">
          <span className="block text-xs text-blush-400">
            {t(`eventTypes.${booking.eventType}`)} · {booking.eventDate}
          </span>
          <span className="font-bold text-gold-700">{money(booking.fiscal.total, locale)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {booking.items.map((it) => (
          <span
            key={it.id}
            className="inline-flex items-center gap-1 rounded-full bg-ivory-100 px-2.5 py-1 text-xs text-blush-700"
          >
            {it.emoji} {loc(it.name, locale)}
          </span>
        ))}
      </div>

      {(canCancel || canPay || hasInvoice) && (
        <div className="mt-4 flex justify-end gap-2">
          {hasInvoice && (
            <GoldButton variant="outline" size="sm" onClick={downloadInvoice}>
              📄 {t('account.downloadInvoice')}
            </GoldButton>
          )}
          {canCancel && (
            <GoldButton
              variant="ghost"
              size="sm"
              loading={cancel.isPending}
              onClick={() => {
                if (confirm(t('account.cancelConfirm'))) cancel.mutate();
              }}
            >
              {t('account.cancel')}
            </GoldButton>
          )}
          {canPay && (
            <GoldButton size="sm" loading={paying} onClick={payOnline}>
              💳 {t('payment.payOnline')}
            </GoldButton>
          )}
        </div>
      )}
    </div>
  );
}
