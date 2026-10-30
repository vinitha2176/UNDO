import React from 'react';
import { ToastMessage } from '../../types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          info: <Info className="w-5 h-5 text-brand-600 shrink-0" />,
        };

        const bgStyles = {
          success: 'bg-teal-50 border-teal-200 text-teal-950',
          error: 'bg-rose-50 border-rose-200 text-rose-950',
          warning: 'bg-amber-50 border-amber-200 text-amber-950',
          info: 'bg-brand-50 border-brand-200 text-brand-950',
        };

        return (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all animate-in slide-in-from-bottom-2 duration-200',
              bgStyles[toast.type]
            )}
          >
            {icons[toast.type]}
            <div className="flex-1 text-sm">
              {toast.title && <div className="font-semibold mb-0.5">{toast.title}</div>}
              <div>{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

