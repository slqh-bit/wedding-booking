import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { endpoints } from '@/lib/queries';
import { GoldButton } from '@/design/GoldButton';
import { Confetti } from '@/design/Confetti';

type View = 'processing' | 'success' | 'failed';

/**
 * Landing page the gateway redirects back to (?payment=<id>). Polls the
 * payment status until it settles, then shows success (Confetti) or failure.
 */
export function PaymentReturn() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const paymentId = params.get('payment');
  const [view, setView] = useState<View>('processing');
  const timer = useRef<number>();

  useEffect(() => {
    if (!paymentId) {
      setView('failed');
      return;
    }
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const { status } = await endpoints.paymentStatus(paymentId);
        if (status === 'CONFIRMED') return setView('success');
        if (status === 'FAILED') return setView('failed');
      } catch {
        /* keep polling */
      }
      if (attempts >= 20) return setView('failed'); // ~40s timeout
      timer.current = window.setTimeout(poll, 2000);
    };
    void poll();
    return () => window.clearTimeout(timer.current);
  }, [paymentId]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {view === 'processing' && (
        <div className="surface p-10">
          <span className="mx-auto mb-5 block h-12 w-12 animate-spin rounded-full border-4 border-gold-200 border-t-gold-500" />
          <p className="font-display text-lg text-blush-800">{t('payment.processing')}</p>
        </div>
      )}

      {view === 'success' && (
        <>
          <Confetti />
          <div className="surface animate-pop-in p-10">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold-gradient text-4xl shadow-gold">
              🎉
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-blush-900">
              {t('payment.successTitle')}
            </h1>
            <p className="mt-2 text-sm text-blush-500">{t('payment.successSub')}</p>
            <Link to="/account" className="mt-6 inline-block">
              <GoldButton size="lg">{t('payment.viewBooking')}</GoldButton>
            </Link>
          </div>
        </>
      )}

      {view === 'failed' && (
        <div className="surface p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-100 text-3xl">
            ✕
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-blush-900">
            {t('payment.failedTitle')}
          </h1>
          <p className="mt-2 text-sm text-blush-500">{t('payment.failedSub')}</p>
          <Link to="/account" className="mt-6 inline-block">
            <GoldButton size="lg" variant="outline">
              {t('payment.viewBooking')}
            </GoldButton>
          </Link>
        </div>
      )}
    </div>
  );
}
