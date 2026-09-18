import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CATEGORY_ORDER, type EventType, type OfferingDTO, type ServiceCategory } from '@hafalati/shared';

const STORAGE_KEY = 'hafalati.wizard';

interface WizardData {
  /** Selected offering per category. */
  selections: Partial<Record<ServiceCategory, OfferingDTO>>;
  eventDate: string;
  eventType: EventType | '';
  notes: string;
}

interface WizardState extends WizardData {
  step: number; // 0-based index into CATEGORY_ORDER; === length means summary
  totalSteps: number;
  isSummary: boolean;
  /** True once both event type and date are chosen — the hard gate to the wizard. */
  hasEvent: boolean;
  select: (offering: OfferingDTO) => void;
  clearSelection: (category: ServiceCategory) => void;
  /** Drop several categories' picks at once (used when the date changes). */
  clearSelections: (categories: ServiceCategory[]) => void;
  setEventDate: (v: string) => void;
  setEventType: (v: EventType) => void;
  setNotes: (v: string) => void;
  goto: (step: number) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  selectedOfferingIds: string[];
}

const WizardContext = createContext<WizardState | null>(null);

function load(): WizardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WizardData;
  } catch {
    /* ignore */
  }
  return { selections: {}, eventDate: '', eventType: '', notes: '' };
}

function persist(data: WizardData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function WizardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WizardData>(load);
  const [step, setStep] = useState(0);

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => {
      const nextData = { ...prev, ...patch };
      persist(nextData);
      return nextData;
    });
  }, []);

  const select = useCallback(
    (offering: OfferingDTO) => {
      setData((prev) => {
        const nextData = {
          ...prev,
          selections: { ...prev.selections, [offering.category]: offering },
        };
        persist(nextData);
        return nextData;
      });
    },
    [],
  );

  const clearSelection = useCallback((category: ServiceCategory) => {
    setData((prev) => {
      const selections = { ...prev.selections };
      delete selections[category];
      const nextData = { ...prev, selections };
      persist(nextData);
      return nextData;
    });
  }, []);

  const clearSelections = useCallback((categories: ServiceCategory[]) => {
    if (categories.length === 0) return;
    setData((prev) => {
      const selections = { ...prev.selections };
      for (const c of categories) delete selections[c];
      const nextData = { ...prev, selections };
      persist(nextData);
      return nextData;
    });
  }, []);

  const totalSteps = CATEGORY_ORDER.length;
  const goto = useCallback((s: number) => setStep(Math.max(0, Math.min(s, totalSteps))), [totalSteps]);
  const next = useCallback(() => setStep((s) => Math.min(s + 1, totalSteps)), [totalSteps]);
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const reset = useCallback(() => {
    const empty: WizardData = { selections: {}, eventDate: '', eventType: '', notes: '' };
    setData(empty);
    persist(empty);
    setStep(0);
  }, []);

  const selectedOfferingIds = useMemo(
    () =>
      CATEGORY_ORDER.map((c) => data.selections[c]?.id).filter(
        (id): id is string => Boolean(id),
      ),
    [data.selections],
  );

  const value = useMemo<WizardState>(
    () => ({
      ...data,
      step,
      totalSteps,
      isSummary: step >= totalSteps,
      hasEvent: Boolean(data.eventDate) && Boolean(data.eventType),
      select,
      clearSelection,
      clearSelections,
      setEventDate: (v) => update({ eventDate: v }),
      setEventType: (v) => update({ eventType: v }),
      setNotes: (v) => update({ notes: v }),
      goto,
      next,
      prev,
      reset,
      selectedOfferingIds,
    }),
    [
      data,
      step,
      totalSteps,
      select,
      clearSelection,
      clearSelections,
      update,
      goto,
      next,
      prev,
      reset,
      selectedOfferingIds,
    ],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardState {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
