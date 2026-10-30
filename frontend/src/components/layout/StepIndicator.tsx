import React from 'react';
import { WorkflowStep } from '../../types';
import { UploadCloud, Sparkles, FolderTree, CheckCircle2, Check } from 'lucide-react';
import clsx from 'clsx';

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  hasFiles: boolean;
  onStepChange: (step: WorkflowStep) => void;
}

interface StepItem {
  key: WorkflowStep;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  hasFiles,
  onStepChange,
}) => {
  const steps: StepItem[] = [
    { key: 'upload', label: '1. Upload Files', shortLabel: 'Upload', icon: <UploadCloud className="w-3.5 h-3.5" /> },
    { key: 'analysis', label: '2. File Analysis', shortLabel: 'Analysis', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'organize', label: '3. Organization Studio', shortLabel: 'Organize', icon: <FolderTree className="w-3.5 h-3.5" /> },
    { key: 'export', label: '4. Export Review', shortLabel: 'Export', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];

  const stepOrder: WorkflowStep[] = ['upload', 'analysis', 'organize', 'export'];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="w-full bg-white/70 backdrop-blur-sm border-b border-[#E9E7EF] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <nav aria-label="Workflow progress">
          <ol className="flex items-center justify-between sm:justify-start sm:gap-6 overflow-x-auto py-1 scrollbar-none">
            {steps.map((step, idx) => {
              const isActive = step.key === currentStep;
              const isPast = idx < currentIndex;
              const isAccessible = idx === 0 || (hasFiles && idx <= currentIndex + 1);

              return (
                <li key={step.key} className="flex items-center shrink-0">
                  <button
                    type="button"
                    disabled={!isAccessible}
                    onClick={() => onStepChange(step.key)}
                    className={clsx(
                      'flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400',
                      isActive &&
                        'bg-brand-50 text-brand-700 shadow-sm border border-brand-200/80 shadow-brand-500/10 scale-[1.02]',
                      isPast &&
                        'text-mint-dark hover:text-mint-dark hover:bg-mint-50/80',
                      !isActive && !isPast && isAccessible &&
                        'text-charcoal-muted hover:text-charcoal hover:bg-zinc-100/70',
                      !isAccessible && 'text-zinc-300 cursor-not-allowed opacity-60'
                    )}
                  >
                    <span
                      className={clsx(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 font-bold transition-all',
                        isActive && 'bg-brand-600 text-white shadow-sm shadow-brand-500/30',
                        isPast && 'bg-mint-dark text-white',
                        !isActive && !isPast && 'bg-zinc-100 text-charcoal-subtle border border-[#E9E7EF]'
                      )}
                    >
                      {isPast ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                    </span>
                    <span className="hidden md:inline">{step.label}</span>
                    <span className="md:hidden text-xs">{step.shortLabel}</span>
                  </button>

                  {idx < steps.length - 1 && (
                    <div
                      className={clsx(
                        'w-6 sm:w-10 h-0.5 mx-2 rounded-full transition-colors hidden sm:block',
                        isPast ? 'bg-mint-dark/50' : 'bg-[#E9E7EF]'
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};
