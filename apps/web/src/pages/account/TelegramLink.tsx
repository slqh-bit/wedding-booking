import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { endpoints } from '@/lib/queries';
import { GoldButton } from '@/design/GoldButton';
import { useToast } from '@/design/Toast';

interface LinkInfo {
  code: string;
  deepLink: string | null;
  botConfigured: boolean;
}

export function TelegramLink() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);

  const status = useQuery({ queryKey: ['telegram-status'], queryFn: endpoints.telegramStatus });
  const linked = status.data?.linked ?? false;

  const refresh = () => qc.invalidateQueries({ queryKey: ['telegram-status'] });

  const start = useMutation({
    mutationFn: endpoints.telegramLink,
    onSuccess: (info) => {
      setLinkInfo(info);
      if (info.deepLink) window.open(info.deepLink, '_blank', 'noopener');
      // Poll for the link to complete (real bot path).
      const started = Date.now();
      const poll = async () => {
        const s = await endpoints.telegramStatus();
        if (s.linked) {
          toast.success(t('telegram.linkedToast'));
          setLinkInfo(null);
          void refresh();
          return;
        }
        if (Date.now() - started < 120_000) window.setTimeout(poll, 2500);
      };
      void poll();
    },
    onError: () => toast.error(t('common.error')),
  });

  const simulate = useMutation({
    mutationFn: (code: string) => endpoints.telegramMockLink(code),
    onSuccess: () => {
      toast.success(t('telegram.linkedToast'));
      setLinkInfo(null);
      void refresh();
    },
    onError: () => toast.error(t('common.error')),
  });

  const unlink = useMutation({
    mutationFn: endpoints.telegramUnlink,
    onSuccess: () => {
      setLinkInfo(null);
      void refresh();
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <div className="surface mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-2xl">✈️</span>
          <div>
            <h3 className="font-display text-lg font-bold text-blush-900">{t('telegram.title')}</h3>
            <p className="text-xs text-blush-500">{t('telegram.desc')}</p>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            linked
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gold-200 bg-gold-50 text-gold-700'
          }`}
        >
          {linked ? t('telegram.linked') : t('telegram.notLinked')}
        </span>
      </div>

      <div className="mt-4">
        {linked ? (
          <GoldButton
            variant="outline"
            size="sm"
            loading={unlink.isPending}
            onClick={() => unlink.mutate()}
          >
            {t('telegram.unlink')}
          </GoldButton>
        ) : linkInfo ? (
          <div className="space-y-3">
            {linkInfo.deepLink && (
              <a href={linkInfo.deepLink} target="_blank" rel="noopener noreferrer">
                <GoldButton size="sm">✈️ {t('telegram.openBot')}</GoldButton>
              </a>
            )}
            <div className="rounded-xl border border-dashed border-gold-300 bg-white p-3">
              <p className="text-xs text-blush-500">{t('telegram.codeHint')}</p>
              <p className="mt-1 font-mono text-sm font-bold text-blush-900" dir="ltr">
                /start {linkInfo.code}
              </p>
            </div>
            {!linkInfo.botConfigured ? (
              <GoldButton
                size="sm"
                loading={simulate.isPending}
                onClick={() => simulate.mutate(linkInfo.code)}
              >
                {t('telegram.simulate')}
              </GoldButton>
            ) : (
              <p className="text-xs text-blush-400">{t('telegram.waiting')}</p>
            )}
          </div>
        ) : (
          <GoldButton size="sm" loading={start.isPending} onClick={() => start.mutate()}>
            ✈️ {t('telegram.link')}
          </GoldButton>
        )}
      </div>
    </div>
  );
}
