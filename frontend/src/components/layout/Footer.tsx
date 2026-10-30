import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-surface/60 py-8 text-xs text-charcoal-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-zinc-600">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong className="text-charcoal font-semibold">Zero-Destruction Guarantee:</strong> UNDO
            never deletes, renames, or overwrites files in your original source folders.
          </span>
        </div>

        <div className="flex items-center gap-4 text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            Built for WeMakeDevs No Hands Challenge
          </span>
          <span>•</span>
          <span>Google Antigravity & Wispr Flow</span>
        </div>
      </div>
    </footer>
  );
};

