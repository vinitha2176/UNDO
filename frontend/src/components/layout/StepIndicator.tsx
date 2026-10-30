import React from 'react';
import { WorkflowStep } from '../../types';
import { UploadCloud, BarChart3, FolderTree, FolderCheck, Check } from 'lucide-react';
import clsx from 'clsx';

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  hasFiles: boolean;
  onStepChange: (step: WorkflowStep) => void;
}

interface StepItem {
  key: WorkflowStep;
  label: string;
  icon: React.ReactNode;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  hasFiles,
  onStepChange,
}) => {
  const steps: StepItem[] = [
    { key: 'upload', label: '1. Upload Files', icon: <UploadCloud className="w-4 h-4" /> },
    { key: 'analysis', label: '2. File Analysis', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'organize', label: '3. Organization Studio', icon: <FolderTree className="w-4 h-4" /> },
    { key: 'export', label: '4. Export Review', icon: <FolderCheck className="w-4 h-4" /> },
  ];

  const stepOrder: WorkflowStep[] = ['upload', 'analysis', 'organize', 'export'];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="w-full bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between sm:justify-start sm:gap-8">
            {steps.map((step, idx) => {
              const isActive = step.key === currentStep;
              const isPast = idx < currentIndex;
              const isAccessible = idx === 0 || (hasFiles && idx <= currentIndex + 1);

              return (
                <li key={step.key} className="flex items-center">
                  <button
                    type="button"
                    disabled={!isAccessible}
                    onClick={() => onStepChange(step.key)}
                    className={clsx(
                      'flex items-center gap-2 text-xs sm:text-sm font-medium transition-all rounded-lg px-2.5 py-1.5',
                      isActive && 'bg-brand-50 text-brand-700 shadow-sm border border-brand-200',
                      isPast && 'text-teal-700 hover:text-teal-800 hover:bg-teal-50',
                      !isActive && !isPast && isAccessible && 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
                      !isAccessible && 'text-zinc-300 cursor-not-allowed'
                    )}
                  >
                    <span
                      className={clsx(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0',
                        isActive && 'bg-brand-600 text-white font-bold',
                        isPast && 'bg-teal-600 text-white',
                        !isActive && !isPast && 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                      )}
                    >
                      {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                    </span>
                    <span className="hidden md:inline">{step.label}</span>
                  </button>

                  {idx < steps.length - 1 && (
                    <div className="hidden sm:block w-8 sm:w-12 h-0.5 mx-2 bg-zinc-200" />
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
