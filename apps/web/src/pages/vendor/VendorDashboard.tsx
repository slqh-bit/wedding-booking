import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc, money } from '@/lib/format';
import { GoldButton } from '@/design/GoldButton';
import { OrnamentDivider } from '@/design/Ornament';
import { Skeleton } from '@/design/Skeleton';
import { StatusBadge } from '@/design/StatusBadge';
import { VendorStatusBadge } from '@/design/ModerationBadge';
import { AuthField } from '../auth/AuthField';
import { useToast } from '@/design/Toast';
import { VendorOfferings } from './VendorOfferings';

type Tab = 'offerings' | 'bookings' | 'stats' | 'profile';

export function VendorDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('offerings');
  const { data: me } = useQuery({ queryKey: ['vendor-me'], queryFn: endpoints.vendorMe });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'offerings', label: t('vendor.tabs.offerings') },
    { id: 'bookings', label: t('vendor.tabs.bookings') },
    { id: 'stats', label: t('vendor.tabs.stats') },
    { id: 'profile', label: t('vendor.tabs.profile') },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-blush-900">{t('vendor.dashboard')}</h1>
        {me && <VendorStatusBadge status={me.status} />}
      </div>

      {me?.status === 'PENDING' && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          ⏳ {t('vendor.pendingBanner')}
        </div>
      )}
      {me?.status === 'SUSPENDED' && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          ⛔ {t('vendor.suspendedBanner')}
        </div>
      )}

      <div className="mt-5 flex gap-1 rounded-full border border-gold-200 bg-white/70 p-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
              tab === tb.id ? 'bg-gold-gradient text-white shadow' : 'text-gold-700 hover:bg-gold-50'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <OrnamentDivider />

      {tab === 'offerings' && <VendorOfferings />}
      {tab === 'bookings' && <VendorBookings />}
      {tab === 'stats' && <VendorStats />}
      {tab === 'profile' && <VendorProfile />}
    </div>
  );
}

function VendorBookings() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data, isLoading } = useQuery({ queryKey: ['vendor-bookings'], queryFn: endpoints.vendorBookings });

  if (isLoading) return <Skeleton className="h-28" />;
  if (!data || data.length === 0)
    return <p className="py-8 text-center text-sm text-blush-400">{t('vendor.noBookings')}</p>;

  return (
    <div className="space-y-3">
      {data.map((b) => (
        <div key={b.id} className="surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-display font-bold tracking-wide text-gold-foil">{b.reference}</span>
            <StatusBadge status={b.status as never} />
          </div>
          <div className="mt-1 text-xs text-blush-400">
            {t(`eventTypes.${b.eventType}`)} · {b.eventDate}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {b.items.map((it, idx) => (
              <span key={idx} className="rounded-full bg-ivory-100 px-2 py-0.5 text-xs text-blush-700">
                {it.emoji} {loc(it.name as never, locale)} · {money(it.unitPrice, locale)}
              </span>
            ))}
          </div>
          <div className="mt-2 text-end text-sm font-bold text-gold-700">
            {money(b.vendorSubtotal, locale)}
          </div>
        </div>
      ))}
    </div>
  );
}

function VendorStats() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data: s, isLoading } = useQuery({ queryKey: ['vendor-stats'], queryFn: endpoints.vendorStats });
  if (isLoading || !s)
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );

  const cards = [
    { label: t('vendor.bookingsCount'), value: String(s.bookings), icon: '📅' },
    { label: t('vendor.grossRevenue'), value: money(s.grossRevenue, locale), icon: '💰' },
    { label: `${t('vendor.commission')} (${Math.round(s.commissionRate * 100)}%)`, value: money(s.estimatedCommission, locale), icon: '🏦' },
    { label: t('vendor.netRevenue'), value: money(s.estimatedNet, locale), icon: '✨' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="surface p-5">
          <span className="text-2xl">{c.icon}</span>
          <p className="mt-2 font-display text-xl font-bold text-gold-foil">{c.value}</p>
          <p className="text-xs text-blush-500">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

function VendorProfile() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useQuery({ queryKey: ['vendor-me'], queryFn: endpoints.vendorMe });
  const [form, setForm] = useState({ name: '', description: '', phone: '', city: '' });
  const [ready, setReady] = useState(false);
  if (me && !ready) {
    setForm({ name: me.name, description: me.description ?? '', phone: me.phone ?? '', city: me.city ?? '' });
    setReady(true);
  }
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () => endpoints.updateVendor(form),
    onSuccess: () => {
      toast.success(t('vendor.saved'));
      void qc.invalidateQueries({ queryKey: ['vendor-me'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <div className="surface max-w-lg p-5">
      <div className="space-y-3">
        <AuthField label={t('vendor.vendorName')} value={form.name} onChange={set('name')} />
        <AuthField label={t('vendor.city')} value={form.city} onChange={set('city')} />
        <AuthField label={t('auth.phone')} value={form.phone} onChange={set('phone')} dir="ltr" />
        <AuthField label={t('vendor.description')} value={form.description} onChange={set('description')} />
      </div>
      <div className="mt-4 flex justify-end">
        <GoldButton size="sm" loading={save.isPending} onClick={() => save.mutate()}>
          {t('vendor.save')}
        </GoldButton>
      </div>
    </div>
  );
}
