import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { Logo } from '@/design/Logo';
import { OrnamentDivider } from '@/design/Ornament';

/**
 * Dev-only simulated gateway checkout. The mock gateway redirects here; the
 * buttons call the mock-complete endpoint (which drives the same webhook path)
 * and then send the customer to the real return page. Lets the whole online
 * payment flow be demoed locally with no credentials.
 */
export function MockCheckout() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { ref = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'CONFIRMED' | 'FAILED' | null>(null);
  const amount = Number(params.get('amount') ?? 0);
  const paymentId = ref.replace(/^mock_/, '');

  async function complete(status: 'CONFIRMED' | 'FAILED') {
    setBusy(status);
    try {
      await endpoints.mockComplete(ref, status);
    } catch {
      /* still navigate to return page, which reflects real status */
    }
    navigate(`/payment/return?payment=${paymentId}`, { replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="surface p-7 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <OrnamentDivider>{t('payment.mockTitle')}</OrnamentDivider>
        <p className="text-sm text-blush-500">{t('payment.mockSub')}</p>

        <div className="my-6 rounded-2xl bg-gold-50 px-4 py-4">
          <p className="text-xs text-blush-500">{t('payment.amount')}</p>
          <p className="font-display text-3xl font-bold text-gold-foil">{money(amount, locale)}</p>
        </div>

        <div className="flex flex-col gap-3">
          <GoldButton size="lg" loading={busy === 'CONFIRMED'} onClick={() => complete('CONFIRMED')}>
            ✓ {t('payment.paySuccess')}
          </GoldButton>
          <GoldButton
            size="lg"
            variant="outline"
            loading={busy === 'FAILED'}
            onClick={() => complete('FAILED')}
          >
            ✕ {t('payment.payFail')}
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
