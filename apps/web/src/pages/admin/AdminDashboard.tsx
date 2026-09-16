import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { endpoints } from '@/lib/queries';
import { OrnamentDivider } from '@/design/Ornament';
import { AdminStatsCards } from './AdminStatsCards';
import { AdminBookings } from './AdminBookings';
import { AdminOfferings } from './AdminOfferings';
import { AdminNotifications } from './AdminNotifications';
import { AdminVendors } from './AdminVendors';
import { AdminModeration } from './AdminModeration';
import { AdminPayouts } from './AdminPayouts';

type Tab =
  | 'dashboard'
  | 'bookings'
  | 'offerings'
  | 'vendors'
  | 'moderation'
  | 'payouts'
  | 'notifications';

export function AdminDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('dashboard');
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: endpoints.adminStats });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: t('admin.dashboard') },
    { id: 'bookings', label: t('admin.bookings') },
    { id: 'offerings', label: t('admin.offerings') },
    { id: 'vendors', label: t('adminMarket.vendors') },
    { id: 'moderation', label: t('adminMarket.moderation') },
    { id: 'payouts', label: t('adminMarket.payouts') },
    { id: 'notifications', label: t('admin.notifications') },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-blush-900">{t('admin.title')}</h1>

      <div className="mt-5 flex flex-wrap gap-1 rounded-2xl border border-gold-200 bg-white/70 p-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === tb.id ? 'bg-gold-gradient text-white shadow' : 'text-gold-700 hover:bg-gold-50'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <OrnamentDivider />

      {tab === 'dashboard' && <AdminStatsCards stats={stats} />}
      {tab === 'bookings' && <AdminBookings />}
      {tab === 'offerings' && <AdminOfferings />}
      {tab === 'vendors' && <AdminVendors />}
      {tab === 'moderation' && <AdminModeration />}
      {tab === 'payouts' && <AdminPayouts />}
      {tab === 'notifications' && <AdminNotifications />}
    </div>
  );
}
