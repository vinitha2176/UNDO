import React from 'react';
import { Undo2, PlusCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface HeaderProps {
  sessionId: string | null;
  backendHealthy: boolean;
  onNewSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sessionId,
  backendHealthy,
  onNewSession,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-sm">
            <Undo2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-charcoal">UNDO</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                MVP
              </span>
            </div>
            <p className="text-xs text-charcoal-subtle hidden sm:block">
              Your files, finally in order.
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Health indicator */}
          <div className="flex items-center gap-1.5 text-xs text-charcoal-subtle px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200">
            {backendHealthy ? (
              <>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="hidden md:inline">Backend Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="hidden md:inline text-rose-600">Backend Disconnected</span>
              </>
            )}
          </div>

          {/* Active Session info & Reset */}
          {sessionId && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 hidden lg:inline">
                {sessionId.slice(0, 8)}…
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewSession}
                icon={<PlusCircle className="w-3.5 h-3.5" />}
              >
                New Session
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

