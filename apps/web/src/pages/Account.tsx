import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { BookingDTO, BookingItemDTO, Locale, ReviewDTO } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { StatusBadge } from '@/design/StatusBadge';
import { Stars, StarInput } from '@/design/Stars';
import { Skeleton } from '@/design/Skeleton';
import { useToast } from '@/design/Toast';
import { TelegramLink } from './account/TelegramLink';

export function Account() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ['my-bookings'], queryFn: endpoints.myBookings });
  const { data: myReviews } = useQuery({ queryKey: ['my-reviews'], queryFn: endpoints.myReviews });
  const reviewMap = new Map((myReviews ?? []).map((r) => [r.offeringId, r]));

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
          <BookingCard key={b.id} booking={b} reviewMap={reviewMap} />
        ))}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  reviewMap,
}: {
  booking: BookingDTO;
  reviewMap: Map<string, ReviewDTO>;
}) {
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

      {booking.status === 'COMPLETED' && (
        <div className="mt-4 border-t border-gold-100 pt-4">
          <p className="mb-2 text-xs font-semibold text-blush-500">⭐ {t('review.title')}</p>
          <div className="space-y-2">
            {booking.items.map((it) => (
              <ReviewControl
                key={it.id}
                item={it}
                bookingId={booking.id}
                existing={reviewMap.get(it.offeringId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewControl({
  item,
  existing,
}: {
  item: BookingItemDTO;
  bookingId: string;
  existing?: ReviewDTO;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');

  const submit = useMutation({
    mutationFn: () => endpoints.submitReview({ offeringId: item.offeringId, rating, comment: comment || undefined }),
    onSuccess: () => {
      toast.success(t('review.thanks'));
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <div className="rounded-xl bg-ivory-50 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-blush-700">
          {item.emoji} {loc(item.name, locale)}
        </span>
        <div className="flex items-center gap-2">
          {existing && !open && <Stars value={existing.rating} size="sm" />}
          <button
            className="text-[11px] font-semibold text-gold-700 hover:underline"
            onClick={() => setOpen((o) => !o)}
          >
            {existing ? t('review.edit') : t('review.rate')}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="mb-1 text-[11px] text-blush-400">{t('review.yourRating')}</p>
            <StarInput value={rating} onChange={setRating} size="md" />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('review.commentPlaceholder')}
            rows={2}
            className="w-full rounded-lg border border-gold-200 bg-white px-2.5 py-1.5 text-xs text-blush-800 focus:border-gold-400 focus:outline-none"
          />
          <div className="flex justify-end">
            <GoldButton
              size="sm"
              disabled={rating < 1}
              loading={submit.isPending}
              onClick={() => submit.mutate()}
            >
              {t('review.submit')}
            </GoldButton>
          </div>
        </div>
      )}
    </div>
  );
}
