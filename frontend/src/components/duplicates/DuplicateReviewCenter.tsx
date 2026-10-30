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
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-charcoal">Duplicate Review Center</h3>
            <Badge variant="warning">{duplicateGroups.length} Duplicate Group(s)</Badge>
          </div>
          <p className="text-xs text-charcoal-subtle mt-0.5">
            Files with identical SHA-256 byte signatures across different filenames or folders
          </p>
        </div>

        <div className="flex items-center gap-2 text-right">
          <div>
            <div className="text-xl font-bold text-teal-700">
              {formatBytes(totalRedundant)}
            </div>
            <div className="text-[11px] text-charcoal-subtle">Potential Redundant Storage</div>
          </div>
        </div>
      </div>

      {/* Zero deletion reminder */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 text-teal-900 text-xs">
        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
        <span>
          <strong>Safe Deduplication:</strong> Excluded copies are omitted from the generated ZIP archive only. Your original source files are never deleted or modified.
        </span>
      </div>

      {/* Duplicate Groups Cards */}
      <div className="space-y-4">
        {duplicateGroups.map((group) => {
          const isLoading = loadingGroupId === group.sha256;

          return (
            <div
              key={group.sha256}
              className="bg-white rounded-2xl border border-zinc-200 shadow-card p-5 space-y-4"
            >
              {/* Group Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-sm text-charcoal">
                      {group.fileCount} Identical Copies
                    </span>
                    <span className="text-xs text-charcoal-subtle font-mono">
                      ({formatBytes(group.totalSizeBytes / group.fileCount)} each)
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 truncate max-w-md">
                    SHA-256: {group.sha256}
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
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-colors ${
                        copy.isIncludedInExport
                          ? 'bg-teal-50/40 border-teal-200'
                          : 'bg-zinc-50 border-zinc-200 opacity-70'
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
                          className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                        />
                        <div className="truncate">
                          <span className="font-medium text-charcoal">{copy.originalName}</span>
                          {isRecommended && (
                            <span className="ml-2 text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-semibold uppercase">
                              Recommended Copy
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-zinc-500">
                          {formatBytes(copy.size)}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            copy.isIncludedInExport
                              ? 'bg-teal-100 text-teal-800'
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

