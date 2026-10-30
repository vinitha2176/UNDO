import React, { useState } from 'react';
import { Mic, Sparkles, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { OrganizationPlanItem } from '../../types';

interface WisprPreferencesProps {
  planItems: OrganizationPlanItem[];
  onApplyRules: (updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }>) => Promise<void>;
}

interface InterpretedRule {
  description: string;
  matchedFilesCount: number;
  updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }>;
}

export const WisprPreferences: React.FC<WisprPreferencesProps> = ({
  planItems,
  onApplyRules,
}) => {
  const [dictationText, setDictationText] = useState('');
  const [interpretedRule, setInterpretedRule] = useState<InterpretedRule | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const interpretPreferences = (text: string) => {
    const lower = text.toLowerCase().trim();
    if (!lower) {
      setInterpretedRule(null);
      return;
    }

    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];
    let description = '';

    // Rule 1: Move images/screenshots to Assets or Screenshots
    if (lower.includes('screenshot') || lower.includes('asset') || lower.includes('image')) {
      const targetFolder = lower.includes('screenshot') ? 'Screenshots' : 'Assets';
      const matching = planItems.filter(
        (p) =>
          p.category === 'images' ||
          p.originalName.toLowerCase().includes('screenshot') ||
          p.originalName.toLowerCase().includes('diagram') ||
          p.originalName.toLowerCase().includes('banner')
      );

      for (const item of matching) {
        updates.push({ fileId: item.fileId, destinationFolder: targetFolder });
      }
      description = `Move ${matching.length} image and graphic file(s) into proposed folder '${targetFolder}'`;
    }
    // Rule 2: Separate presentations into Presentations
    else if (lower.includes('presentation') || lower.includes('slide') || lower.includes('deck')) {
      const matching = planItems.filter(
        (p) =>
          p.category === 'presentations' ||
          p.originalName.endsWith('.pptx') ||
          p.originalName.endsWith('.key')
      );
      for (const item of matching) {
        updates.push({ fileId: item.fileId, destinationFolder: 'Presentations' });
      }
      description = `Group ${matching.length} presentation and slide deck(s) into folder 'Presentations'`;
    }
    // Rule 3: Exclude all duplicates
    else if (lower.includes('duplicate') && (lower.includes('exclude') || lower.includes('remove') || lower.includes('clean'))) {
      const duplicates = planItems.filter((p) => p.duplicateStatus.isDuplicate);
      for (const item of duplicates) {
        updates.push({ fileId: item.fileId, isIncluded: false });
      }
      description = `Exclude all ${duplicates.length} duplicate copy(ies) from the exported archive`;
    }
    // Rule 4: Match project keywords (e.g. "pathfinder")
    else if (lower.includes('pathfinder') || lower.includes('project')) {
      const keyword = lower.includes('pathfinder') ? 'pathfinder' : 'project';
      const matching = planItems.filter((p) =>
        p.originalName.toLowerCase().includes(keyword)
      );
      const folder = `Projects/${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
      for (const item of matching) {
        updates.push({ fileId: item.fileId, destinationFolder: folder });
      }
      description = `Consolidate ${matching.length} project file(s) containing '${keyword}' into folder '${folder}'`;
    } else {
      setInterpretedRule(null);
      setFeedback('Rule could not be deterministically matched. Try: "Move screenshots to Assets" or "Group presentations in Presentations".');
      return;
    }

    setFeedback(null);
    setInterpretedRule({
      description,
      matchedFilesCount: updates.length,
      updates,
    });
  };

  const handleApply = async () => {
    if (!interpretedRule || interpretedRule.updates.length === 0) return;
    setIsApplying(true);
    try {
      await onApplyRules(interpretedRule.updates);
      setDictationText('');
      setInterpretedRule(null);
      setFeedback('Preferences successfully applied to the active organization plan!');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-charcoal">
              Describe how you want your files organized
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-700">
              Voice Dictation Ready
            </span>
          </div>
          <p className="text-xs text-charcoal-subtle mt-0.5">
            Prefer to speak? Dictate your preferences using <strong>Wispr Flow</strong> directly into this field.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          rows={2}
          value={dictationText}
          onChange={(e) => {
            setDictationText(e.target.value);
            interpretPreferences(e.target.value);
          }}
          placeholder="e.g. Put all project screenshots in an Assets folder and keep presentations separate..."
          className="w-full p-3 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
        />

        {/* Quick sample chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-zinc-400">Try dictating:</span>
          {[
            'Put all screenshots into Assets',
            'Group presentations in Presentations',
            'Exclude all duplicate copies',
            'Consolidate pathfinder files into Project',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setDictationText(sample);
                interpretPreferences(sample);
              }}
              className="text-xs bg-zinc-100 hover:bg-brand-50 hover:text-brand-700 text-zinc-600 px-2.5 py-1 rounded-lg transition-colors border border-zinc-200/60"
            >
              "{sample}"
            </button>
          ))}
        </div>
      </div>

      {/* Interpreted rule confirmation */}
      {interpretedRule && (
        <div className="p-4 rounded-xl bg-brand-50/70 border border-brand-200 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold text-brand-950">Interpreted Organization Rule:</span>
              <p className="text-xs text-brand-800 mt-0.5">{interpretedRule.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-brand-200/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDictationText('');
                setInterpretedRule(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              isLoading={isApplying}
              icon={<Check className="w-3.5 h-3.5" />}
            >
              Confirm & Apply Rule
            </Button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
          <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};

