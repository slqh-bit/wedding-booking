import { useEffect } from 'react';
import { CATEGORY_ORDER } from '@hafalati/shared';
import { WizardProvider, useWizard } from '@/store/wizard';
import { Stepper } from './Stepper';
import { StepCategory } from './StepCategory';
import { Summary } from './Summary';
import { EventGate } from './EventGate';
import { EventBar } from './EventBar';

export function Planner() {
  return (
    <WizardProvider>
      <PlannerInner />
    </WizardProvider>
  );
}

function PlannerInner() {
  const { step, isSummary, hasEvent } = useWizard();

  // Scroll to top on step (or gate) change for a clean transition.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, hasEvent]);

  const category = CATEGORY_ORDER[step];

  // Hard gate: no categories until the event type + date are chosen.
  if (!hasEvent) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
        <EventGate />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
      <EventBar />
      <div className="mb-6">
        <Stepper />
      </div>
      {isSummary || !category ? <Summary /> : <StepCategory category={category} />}
    </div>
  );
}
