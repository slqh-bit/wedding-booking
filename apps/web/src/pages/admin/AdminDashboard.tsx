import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { endpoints } from '@/lib/queries';
import { OrnamentDivider } from '@/design/Ornament';
import { ComingSoonBadge } from '@/design/ComingSoon';
import { AdminStatsCards } from './AdminStatsCards';
import { AdminBookings } from './AdminBookings';
import { AdminOfferings } from './AdminOfferings';

type Tab = 'dashboard' | 'bookings' | 'offerings';

export function AdminDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('dashboard');
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: endpoints.adminStats });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: t('admin.dashboard') },
    { id: 'bookings', label: t('admin.bookings') },
    { id: 'offerings', label: t('admin.offerings') },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-blush-900">{t('admin.title')}</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blush-400">Phase 3</span>
          <ComingSoonBadge />
          <span className="text-xs text-blush-400">تسجيل مزوّدي الخدمات</span>
        </div>
      </div>

      <div className="mt-5 flex gap-1 rounded-full border border-gold-200 bg-white/70 p-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
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
    </div>
  );
}
