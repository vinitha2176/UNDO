import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { OrganizationPlanItem } from '../../types';
import {
  interpretWisprPreferences,
  WisprInterpretationResult,
  InterpretedSubRule,
} from '../../services/wisprInterpreter';

interface WisprPreferencesProps {
  planItems: OrganizationPlanItem[];
  onApplyRules: (
    updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }>
  ) => Promise<void>;
}

export const WisprPreferences: React.FC<WisprPreferencesProps> = ({
  planItems,
  onApplyRules,
}) => {
  const [dictationText, setDictationText] = useState('');
  const [interpretation, setInterpretation] = useState<WisprInterpretationResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expandedRuleIds, setExpandedRuleIds] = useState<Record<string, boolean>>({});

  const handleInterpret = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setInterpretation(null);
      setFeedback(null);
      return;
    }

    const result = interpretWisprPreferences(trimmed, planItems);
    setInterpretation(result);

    // Expand all sub-rules by default so the user immediately sees matched files
    const expandedMap: Record<string, boolean> = {};
    for (const r of result.subRules) {
      expandedMap[r.ruleId] = true;
    }
    setExpandedRuleIds(expandedMap);

    if (!result.hasSupportedSubRules) {
      setFeedback(
        'Rule could not be deterministically matched. Try: "Put all screenshots in a Screenshots folder" or "Group all Pathfinder files into one project folder".'
      );
    } else {
      setFeedback(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDictationText(val);
    handleInterpret(val);
  };

  const handleApply = async () => {
    if (!interpretation || interpretation.allUpdates.length === 0) return;
    setIsApplying(true);
    try {
      await onApplyRules(interpretation.allUpdates);
      const appliedCount = interpretation.totalMatchedFiles;
      setDictationText('');
      setInterpretation(null);
      setFeedback(`Preferences applied successfully! Updated ${appliedCount} file(s) in the organization plan.`);
    } finally {
      setIsApplying(false);
    }
  };

  const toggleRuleExpand = (ruleId: string) => {
    setExpandedRuleIds((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9E7EF] p-5 shadow-card space-y-5">
      {/* Header section with voice-first copy */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-charcoal">
              Just tell UNDO how you want your files organized.
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 border border-brand-200/80 flex-shrink-0">
              Voice Dictation Ready
            </span>
          </div>
          <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
            Use Wispr Flow to dictate your preferences. UNDO will interpret your instructions and prepare an organization preview for your approval.
          </p>
        </div>
      </div>

      {/* Transparent Wispr Flow Desktop Guide Banner */}
      <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E9E7EF] flex items-start gap-3 text-xs text-charcoal-muted">
        <HelpCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-charcoal font-semibold">
            How Wispr Flow Voice Dictation Works in UNDO:
          </p>
          <p className="leading-relaxed">
            Wispr Flow is an external desktop application. Simply click inside the instruction box below, press your <strong>Wispr Flow dictation shortcut</strong> (such as the <code>Fn</code> key or <code>Caps Lock</code>), and speak naturally. Your words will appear directly in the box as editable text.
          </p>
          <p className="text-[11px] text-charcoal-subtle">
            🔒 <em>Transparency Note:</em> UNDO never accesses your microphone directly or streams audio to external servers. You can review or edit the transcribed text before previewing.
          </p>
        </div>
      </div>

      {/* Dictation Input / Transcript Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="wispr-dictation-input" className="text-xs font-bold text-charcoal uppercase tracking-wider">
            Dictated Transcript & Preferences:
          </label>
          {dictationText && (
            <button
              type="button"
              onClick={() => {
                setDictationText('');
                setInterpretation(null);
                setFeedback(null);
              }}
              className="text-[11px] text-charcoal-subtle hover:text-rose-600 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear Transcript
            </button>
          )}
        </div>

        <textarea
          id="wispr-dictation-input"
          rows={3}
          value={dictationText}
          onChange={handleTextChange}
          placeholder="e.g. Put all project screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies."
          className="w-full p-3.5 text-sm bg-[#FAF9F6] border border-[#E9E7EF] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none font-sans text-charcoal placeholder:text-charcoal-subtle"
        />

        {/* Action bar below textarea */}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleInterpret(dictationText)}
            icon={<Sliders className="w-3.5 h-3.5" />}
          >
            Preview Instructions
          </Button>

          <span className="text-[11px] text-charcoal-subtle">
            {dictationText.trim() ? `${dictationText.trim().split(/\s+/).length} words dictated` : 'Ready for input'}
          </span>
        </div>

        {/* Quick sample chips */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-subtle block">
            Try One of These Supported Spoken Instructions:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              'Put all screenshots in a Screenshots folder',
              'Keep presentations separate from documents',
              'Group all Pathfinder files into one project folder',
              'Keep all duplicate copies',
              'Exclude exact duplicate copies from the organized download',
              'Put screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies',
              'Organize files by year and month',
              'Group design files into a branding folder',
              'Put all invoices in Finance/2026',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setDictationText(sample);
                  handleInterpret(sample);
                }}
                className="text-xs bg-[#FAF9F6] hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 text-charcoal-muted px-2.5 py-1.5 rounded-lg transition-colors border border-[#E9E7EF] text-left"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interpretation Preview Section (Task 4) */}
      {interpretation && interpretation.hasSupportedSubRules && (
        <div className="p-4 rounded-xl bg-brand-50/80 border border-brand-200 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-brand-950 text-sm">
                  Interpreted Organization Rule:
                </span>
                <p className="text-xs text-brand-900 mt-0.5 leading-relaxed font-medium">
                  {interpretation.legacyDescription}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-brand-700">
                  <span>{interpretation.subRules.filter((r) => r.isSupported).length} instruction rule(s) recognized</span>
                  <span>•</span>
                  <span>{interpretation.totalMatchedFiles} file(s) matched in your collection</span>
                </div>
              </div>
            </div>
            <Badge variant="brand" size="sm">
              Review & Approve
            </Badge>
          </div>

          {/* Sub-rule breakdown */}
          <div className="space-y-3">
            {interpretation.subRules.map((rule, idx) => (
              <div
                key={rule.ruleId}
                className="bg-white rounded-lg border border-brand-200/90 p-3 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      Rule {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-charcoal">
                      {rule.title}
                    </span>
                  </div>

                  {rule.matchedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleRuleExpand(rule.ruleId)}
                      className="text-[11px] text-brand-700 hover:text-brand-900 font-semibold flex items-center gap-1"
                    >
                      <span>{rule.matchedFiles.length} matched file(s)</span>
                      {expandedRuleIds[rule.ruleId] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Show detailed clause text if multi-rule */}
                {interpretation.subRules.length > 1 && (
                  <p className="text-xs text-charcoal-muted font-normal leading-relaxed">
                    {rule.description}
                  </p>
                )}

                {/* Matched files preview table */}
                {expandedRuleIds[rule.ruleId] && rule.matchedFiles.length > 0 && (
                  <div className="pt-2 border-t border-zinc-100 mt-2">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-charcoal-subtle mb-1.5">
                      Matched Files from Your Upload:
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {rule.matchedFiles.map((f) => (
                        <div
                          key={f.fileId}
                          className="flex items-center justify-between text-xs p-1.5 rounded bg-[#FAF9F6] border border-[#E9E7EF]"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-mono text-[11px] text-charcoal truncate block">
                              {f.originalName}
                            </span>
                            <span className="text-[10px] text-charcoal-subtle">
                              Current: {f.currentDestination}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 text-right">
                            <ArrowRight className="w-3 h-3 text-brand-500" />
                            <span className="text-[11px] font-semibold text-brand-700">
                              {f.actionDescription}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rule.actionType === 'exclude_duplicates' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Original files on your computer remain completely untouched; duplicates are only omitted from the downloaded ZIP.</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Any unsupported sub-rules warning */}
          {interpretation.hasUnsupportedSubRules && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Notice on Partial Instructions:</span>
              </div>
              {interpretation.subRules
                .filter((r) => !r.isSupported)
                .map((r, i) => (
                  <p key={i} className="text-[11px] pl-5">
                    • {r.unsupportedReason || r.description}
                  </p>
                ))}
            </div>
          )}

          {/* Action footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-200/60">
            <p className="text-[11px] text-charcoal-subtle">
              No changes are applied until you confirm.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDictationText('');
                  setInterpretation(null);
                  setFeedback(null);
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
        </div>
      )}

      {/* Honest unsupported feedback when entire query could not be parsed */}
      {feedback && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
          <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
