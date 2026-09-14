import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { BookingDTO, Locale } from '@hafalati/shared';
import type { PlatformInfo } from '@/lib/queries';
import { money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { Confetti } from '@/design/Confetti';
import { OrnamentDivider } from '@/design/Ornament';

interface ConfirmationState {
  booking?: BookingDTO;
  platform?: PlatformInfo;
}

export function Confirmation() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const location = useLocation();
  const state = (location.state ?? {}) as ConfirmationState;
  const booking = state.booking;

  if (!booking) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
      <Confetti />
      <div className="animate-pop-in mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold-gradient text-4xl shadow-gold">
        🎉
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold text-blush-900">
        {t('confirmation.title')}
      </h1>
      <p className="mt-2 text-sm text-blush-500">{t('confirmation.subtitle')}</p>

      <div className="surface mt-6 p-6 text-start">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blush-500">{t('confirmation.reference')}</span>
          <span className="font-display text-xl font-bold tracking-wider text-gold-foil">
            {booking.reference}
          </span>
        </div>
        <OrnamentDivider />
        <div className="flex items-center justify-between rounded-2xl bg-gold-50 px-4 py-3">
          <span className="text-sm font-semibold text-gold-700">{t('summary.deposit')}</span>
          <span className="text-lg font-bold text-gold-700">
            {money(booking.fiscal.deposit, locale)}
          </span>
        </div>
        {state.platform?.bankTransferDetails && (
          <div className="mt-4 rounded-2xl border border-dashed border-gold-300 bg-white p-4">
            <p className="text-xs font-semibold text-blush-700">{t('confirmation.depositNote')}</p>
            <p className="mt-1 font-mono text-sm text-blush-900" dir="ltr">
              {state.platform.bankTransferDetails}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/account">
          <GoldButton size="lg" className="w-full sm:w-auto">
            {t('confirmation.viewBookings')}
          </GoldButton>
        </Link>
        <Link to="/">
          <GoldButton variant="outline" size="lg" className="w-full sm:w-auto">
            {t('confirmation.backHome')}
          </GoldButton>
        </Link>
      </div>
    </div>
  );
}
