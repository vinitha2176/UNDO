import React, { useState } from 'react';
import { DuplicateGroupDetail } from '../../types';
import { Copy, Check, CheckCheck, Trash2, RotateCcw, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatBytes } from '../../utils/formatters';

interface DuplicateReviewCenterProps {
  duplicateGroups: DuplicateGroupDetail[];
  onUpdateGroup: (
    groupId: string,
    action: 'keep_all' | 'retain_one' | 'exclude_selected' | 'include_selected',
    primaryFileId?: string,
    fileIds?: string[]
  ) => Promise<void>;
}

export const DuplicateReviewCenter: React.FC<DuplicateReviewCenterProps> = ({
  duplicateGroups,
  onUpdateGroup,
}) => {
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);

  const totalRedundant = duplicateGroups.reduce((acc, g) => acc + g.redundantSizeBytes, 0);

  const handleAction = async (
    groupId: string,
    action: 'keep_all' | 'retain_one' | 'exclude_selected' | 'include_selected',
    primaryFileId?: string,
    fileIds?: string[]
  ) => {
    setLoadingGroupId(groupId);
    try {
      await onUpdateGroup(groupId, action, primaryFileId, fileIds);
    } finally {
      setLoadingGroupId(null);
    }
  };

  if (duplicateGroups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-card space-y-3">
        <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mx-auto">
          <CheckCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-charcoal">No Exact Duplicates Detected</h3>
        <p className="text-sm text-charcoal-subtle max-w-md mx-auto">
          All imported files have unique SHA-256 content checksums. No duplicate copies are cluttering your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Overview Banner */}
      <div className="bg-white rounded-2xl border border-[#E9E7EF] p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-charcoal">Same files, different names?</h3>
            <Badge variant="peach">{duplicateGroups.length} Duplicate Group(s)</Badge>
          </div>
          <p className="text-xs text-charcoal-muted mt-1 max-w-xl leading-relaxed">
            UNDO found files with identical content. Decide which copies should appear in your organized download.
          </p>
        </div>

        <div className="flex items-center gap-2 text-right">
          <div className="bg-mint-50 border border-mint/40 px-3.5 py-2 rounded-xl">
            <div className="text-xl font-extrabold text-mint-dark">
              {formatBytes(totalRedundant)}
            </div>
            <div className="text-[11px] font-semibold text-mint-dark/80">Redundant Storage Identified</div>
          </div>
        </div>
      </div>

      {/* Zero deletion reassurance */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-mint-50/80 border border-mint/40 text-mint-dark text-xs shadow-xs">
        <ShieldCheck className="w-5 h-5 text-mint-dark shrink-0" />
        <span className="leading-relaxed">
          <strong className="font-bold">Your original files remain untouched:</strong> Excluded duplicate copies simply won't be included in the new ZIP download. All duplicates remain included by default until you confirm an exclusion.
        </span>
      </div>

      {/* Duplicate Groups Cards */}
      <div className="space-y-4">
        {duplicateGroups.map((group) => {
          const isLoading = loadingGroupId === group.sha256;

          return (
            <div
              key={group.sha256}
              className="bg-white rounded-2xl border border-[#E9E7EF] shadow-card p-5 space-y-4 hover:border-brand-200 transition-colors"
            >
              {/* Group Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E9E7EF]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-peach-100 flex items-center justify-center text-peach-dark">
                      <Copy className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-charcoal">
                      {group.fileCount} Identical Content Copies
                    </span>
                    <span className="text-xs text-charcoal-subtle font-mono">
                      ({formatBytes(group.totalSizeBytes / group.fileCount)} each)
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-charcoal-subtle truncate max-w-md">
                    Matching SHA-256: {group.sha256}
                  </p>
                </div>

                {/* Batch choices */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleAction(group.sha256, 'keep_all')}
                  >
                    Keep All Copies
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isLoading}
                    onClick={() =>
                      handleAction(group.sha256, 'retain_one', group.recommendedRetainFileId)
                    }
                  >
                    Retain 1 Copy Only
                  </Button>
                </div>
              </div>

              {/* Copies List */}
              <div className="space-y-2">
                {group.copies.map((copy) => {
                  const isRecommended = copy.fileId === group.recommendedRetainFileId;

                  return (
                    <div
                      key={copy.fileId}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                        copy.isIncludedInExport
                          ? 'bg-mint-50/40 border-mint/40 shadow-xs'
                          : 'bg-[#FAF9F6] border-[#E9E7EF] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={copy.isIncludedInExport}
                          disabled={isLoading}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleAction(group.sha256, 'include_selected', undefined, [copy.fileId]);
                            } else {
                              handleAction(group.sha256, 'exclude_selected', undefined, [copy.fileId]);
                            }
                          }}
                          className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                        />
                        <div className="truncate">
                          <span className="font-semibold text-charcoal">{copy.originalName}</span>
                          {isRecommended && (
                            <span className="ml-2 text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Primary Copy
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-charcoal-subtle">
                          {formatBytes(copy.size)}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            copy.isIncludedInExport
                              ? 'bg-mint-100 text-mint-dark border border-mint/40'
                              : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {copy.isIncludedInExport ? 'Included in ZIP' : 'Excluded'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

