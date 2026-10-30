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

    // Rule 1: Organize files by year and month
    if ((lower.includes('year') && lower.includes('month')) || lower.includes('date') || lower.includes('chronological')) {
      for (const item of planItems) {
        const yearMatch = item.originalName.match(/\b(20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '2026';
        const folder = `Archive/${year}/10-October`;
        updates.push({ fileId: item.fileId, destinationFolder: folder });
      }
      description = `Organize all ${planItems.length} file(s) chronologically by Year & Month into 'Archive/YYYY/MM'`;
    }
    // Rule 2: Group design files into a branding folder
    else if (lower.includes('branding') || (lower.includes('design') && (lower.includes('folder') || lower.includes('group')))) {
      const matching = planItems.filter((p) =>
        p.category === 'images' ||
        p.originalName.toLowerCase().includes('design') ||
        p.originalName.toLowerCase().includes('logo') ||
        p.originalName.toLowerCase().includes('banner') ||
        p.originalName.toLowerCase().includes('flow') ||
        p.originalName.endsWith('.png') ||
        p.originalName.endsWith('.svg') ||
        p.originalName.endsWith('.jpg')
      );
      for (const item of matching) {
        updates.push({ fileId: item.fileId, destinationFolder: 'Branding' });
      }
      description = `Group ${matching.length} design and creative asset(s) into folder 'Branding'`;
    }
    // Rule 3: Put all invoices in Finance/2026
    else if (lower.includes('invoice') || lower.includes('finance')) {
      const matching = planItems.filter((p) =>
        p.originalName.toLowerCase().includes('invoice') ||
        p.originalName.toLowerCase().includes('budget') ||
        p.originalName.toLowerCase().includes('q1') ||
        p.originalName.toLowerCase().includes('receipt')
      );
      for (const item of matching) {
        updates.push({ fileId: item.fileId, destinationFolder: 'Finance/2026' });
      }
      description = `Move ${matching.length} invoice and financial document(s) into folder 'Finance/2026'`;
    }
    // Rule 4: Keep all duplicates
    else if (lower.includes('keep') && lower.includes('duplicate')) {
      const duplicates = planItems.filter((p) => p.duplicateStatus.isDuplicate);
      for (const item of duplicates) {
        updates.push({ fileId: item.fileId, isIncluded: true });
      }
      description = `Keep and retain all ${duplicates.length} duplicate copy(ies) in the export`;
    }
    // Rule 5: Exclude all duplicate copies
    else if (lower.includes('duplicate') && (lower.includes('exclude') || lower.includes('remove') || lower.includes('clean'))) {
      const duplicates = planItems.filter((p) => p.duplicateStatus.isDuplicate);
      for (const item of duplicates) {
        updates.push({ fileId: item.fileId, isIncluded: false });
      }
      description = `Exclude all ${duplicates.length} duplicate copy(ies) from the exported archive`;
    }
    // Rule 6: Move images/screenshots to Assets or Screenshots
    else if (lower.includes('screenshot') || lower.includes('asset') || lower.includes('image')) {
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
    // Rule 7: Separate presentations into Presentations
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
    // Rule 8: Match project keywords (e.g. "pathfinder")
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
      setFeedback('Rule could not be deterministically matched. Try: "Organize files by year and month" or "Put all invoices in Finance/2026".');
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
    <div className="bg-white rounded-2xl border border-[#E9E7EF] p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-charcoal">
              Tell UNDO how you like things organized.
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 border border-brand-200/80">
              Voice Dictation Ready
            </span>
          </div>
          <p className="text-xs text-charcoal-muted mt-1">
            Type your preference, or dictate it using <strong>Wispr Flow</strong> directly into this field.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <textarea
          rows={3}
          value={dictationText}
          onChange={(e) => {
            setDictationText(e.target.value);
            interpretPreferences(e.target.value);
          }}
          placeholder="e.g. Put all project screenshots in an Assets folder and keep presentations separate..."
          className="w-full p-3.5 text-sm bg-[#FAF9F6] border border-[#E9E7EF] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none font-sans text-charcoal placeholder:text-charcoal-subtle"
        />

        {/* Quick sample chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-subtle block">
            Supported Dictation Examples:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              'Organize files by year and month',
              'Group design files into a branding folder',
              'Put all invoices in Finance/2026',
              'Keep all duplicates',
              'Exclude all duplicate copies',
              'Put all screenshots in a Screenshots folder',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setDictationText(sample);
                  interpretPreferences(sample);
                }}
                className="text-xs bg-[#FAF9F6] hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 text-charcoal-muted px-2.5 py-1 rounded-lg transition-colors border border-[#E9E7EF]"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interpreted rule confirmation */}
      {interpretedRule && (
        <div className="p-4 rounded-xl bg-brand-50/80 border border-brand-200 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold text-brand-950">Interpreted Organization Rule:</span>
              <p className="text-xs text-brand-900 mt-0.5 leading-relaxed font-medium">{interpretedRule.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-200/60">
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
              className="shadow-sm shadow-brand-500/20"
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

