import React from 'react';
import { Undo2, PlusCircle, ShieldCheck } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-[#E9E7EF] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm shadow-brand-500/25">
            <Undo2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-charcoal font-sans">UNDO</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-mint-100 text-mint-dark border border-mint/40">
                Studio
              </span>
            </div>
            <p className="text-xs text-charcoal-subtle hidden sm:block font-medium">
              Your files, finally in order.
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Health indicator */}
          <div className="flex items-center gap-2 text-xs font-medium text-charcoal-subtle px-3 py-1.5 rounded-full bg-white border border-[#E9E7EF] shadow-sm">
            {backendHealthy ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-emerald-700 font-medium">Backend Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600 font-medium">Backend Disconnected</span>
              </>
            )}
          </div>

          {/* Active Session info & Reset */}
          {sessionId && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-charcoal-muted bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200 hidden lg:inline">
                session:{sessionId.slice(0, 8)}…
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewSession}
                icon={<PlusCircle className="w-3.5 h-3.5 text-brand-600" />}
                className="hover:border-brand-300"
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

