import React from 'react';
import { ShieldCheck, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-[#E9E7EF] bg-surface/80 backdrop-blur-sm py-6 text-xs text-charcoal-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-charcoal-muted">
          <div className="w-5 h-5 rounded-full bg-mint-100 flex items-center justify-center text-mint-dark shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span>
            <strong className="text-charcoal font-semibold">Zero-Destruction Guarantee:</strong> UNDO
            never deletes, renames, or overwrites files in your original source folders.
          </span>
        </div>

        <div className="flex items-center gap-3 text-charcoal-subtle">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            WeMakeDevs No Hands Challenge
          </span>
          <span>•</span>
          <span>Google Antigravity & Wispr Flow</span>
        </div>
      </div>
    </footer>
  );
};

