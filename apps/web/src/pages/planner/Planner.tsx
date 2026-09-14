import { useEffect } from 'react';
import { CATEGORY_ORDER } from '@hafalati/shared';
import { WizardProvider, useWizard } from '@/store/wizard';
import { Stepper } from './Stepper';
import { StepCategory } from './StepCategory';
import { Summary } from './Summary';

export function Planner() {
  return (
    <WizardProvider>
      <PlannerInner />
    </WizardProvider>
  );
}

function PlannerInner() {
  const { step, isSummary } = useWizard();

  // Scroll to top on step change for a clean transition.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const category = CATEGORY_ORDER[step];

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Stepper />
      </div>
      {isSummary || !category ? <Summary /> : <StepCategory category={category} />}
    </div>
  );
}
