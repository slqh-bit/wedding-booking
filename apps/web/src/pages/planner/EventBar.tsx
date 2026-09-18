import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_ORDER, EventType, type Locale } from '@hafalati/shared';
import { endpoints } from '@/lib/queries';
import { loc } from '@/lib/format';
import { useToast } from '@/design/Toast';
import { useWizard } from '@/store/wizard';

const EVENT_EMOJI: Record<EventType, string> = {
  [EventType.WEDDING]: '💍',
  [EventType.ENGAGEMENT]: '💐',
  [EventType.BIRTHDAY]: '🎂',
  [EventType.GRADUATION]: '🎓',
  [EventType.OTHER]: '🎉',
};

/**
 * The always-visible event summary atop the wizard. The event type and date are
 * editable here — and because date-limited categories only show what's free on
 * the chosen day, changing the date re-checks the current picks and drops any
 * that just became unavailable, telling the customer what was removed.
 */
export function EventBar() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const toast = useToast();
  const { eventType, eventDate, setEventType, setEventDate, selections, clearSelections } = useWizard();

  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(`${iso}T00:00:00`));
    } catch {
      return iso;
    }
  };

  async function onDateChange(newDate: string) {
    if (!newDate || newDate === eventDate) {
      setEventDate(newDate);
      return;
    }
    setEventDate(newDate);

    // Re-check the current picks against the new date; drop the now-taken ones.
    const ids = CATEGORY_ORDER.map((c) => selections[c]?.id).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    setChecking(true);
    try {
      const unavailable = await endpoints.checkAvailability(newDate, ids);
      if (unavailable.length === 0) return;
      const removed = CATEGORY_ORDER.filter((c) => {
        const o = selections[c];
        return o && unavailable.includes(o.id);
      });
      if (removed.length === 0) return;
      const names = removed.map((c) => loc(selections[c]!.name, locale)).join('، ');
      clearSelections(removed);
      toast.show(t('gate.autoRemoved', { items: names }), 'info');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="surface mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 p-3.5">
      {!editing ? (
        <>
          <span className="flex items-center gap-2 text-sm font-semibold text-blush-900">
            <span className="text-xl">{eventType ? EVENT_EMOJI[eventType] : '🎉'}</span>
            {eventType ? t(`eventTypes.${eventType}`) : ''}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-blush-600">
            <span className="text-gold-500">🗓️</span>
            {fmtDate(eventDate)}
          </span>
          {checking && <span className="text-xs text-blush-400">{t('gate.checking')}</span>}
          <button
            onClick={() => setEditing(true)}
            className="ms-auto rounded-xl border border-gold-200 px-3 py-1.5 text-xs font-semibold text-gold-700 transition hover:bg-gold-50"
          >
            ✎ {t('gate.edit')}
          </button>
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gold-500">🎉</span>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="rounded-xl border border-gold-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
            >
              {Object.values(EventType).map((et) => (
                <option key={et} value={et}>
                  {t(`eventTypes.${et}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gold-500">🗓️</span>
            <input
              type="date"
              min={today}
              value={eventDate}
              onChange={(e) => void onDateChange(e.target.value)}
              className="rounded-xl border border-gold-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
            />
          </label>
          {checking && <span className="text-xs text-blush-400">{t('gate.checking')}</span>}
          <button
            onClick={() => setEditing(false)}
            className="ms-auto rounded-xl bg-gold-gradient px-3 py-1.5 text-xs font-semibold text-white shadow"
          >
            {t('gate.done')}
          </button>
        </>
      )}
    </div>
  );
}
