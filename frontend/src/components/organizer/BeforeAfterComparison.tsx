import React, { useState } from 'react';
import { OrganizationPlanItem, SafeFileMetadata } from '../../types';
import { ArrowRight, FileText, Check, AlertCircle, Edit3, Filter } from 'lucide-react';
import { Badge } from '../common/Badge';
import { formatBytes } from '../../utils/formatters';

interface BeforeAfterComparisonProps {
  planItems: OrganizationPlanItem[];
  fileMetadata: SafeFileMetadata[];
  onEditFile: (fileId: string) => void;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  planItems,
  fileMetadata,
  onEditFile,
}) => {
  const [filter, setFilter] = useState<'all' | 'renamed' | 'moved' | 'excluded' | 'unchanged'>('all');

  const metaMap = new Map(fileMetadata.map((m) => [m.id, m]));

  const transformedItems = planItems.map((item) => {
    const meta = metaMap.get(item.fileId);
    const originalName = meta ? meta.originalName : item.originalName;
    const isRenamed = item.proposedFilename !== (meta?.sanitizedName || originalName);
    const isMoved = item.proposedDestinationFolder !== '' && item.proposedDestinationFolder !== 'Others';
    const isExcluded = !item.isIncludedInExport;

    return {
      item,
      meta,
      originalName,
      isRenamed,
      isMoved,
      isExcluded,
      isUnchanged: !isRenamed && !isExcluded && item.proposedDestinationFolder === '',
    };
  });

  const filtered = transformedItems.filter((t) => {
    if (filter === 'renamed') return t.isRenamed;
    if (filter === 'moved') return t.isMoved;
    if (filter === 'excluded') return t.isExcluded;
    if (filter === 'unchanged') return !t.isRenamed && !t.isExcluded;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E9E7EF] shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-charcoal">Before & After Transformation</h3>
            <span className="text-xs font-mono text-charcoal-subtle bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E9E7EF]">
              {filtered.length} files shown
            </span>
          </div>
          <p className="text-xs text-charcoal-subtle mt-0.5">
            Audit proposed file paths, renames, and exclusions against your original uploads
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(['all', 'renamed', 'moved', 'excluded', 'unchanged'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${
                filter === key
                  ? 'bg-charcoal text-white shadow-sm'
                  : 'bg-[#FAF9F6] text-charcoal-muted hover:text-charcoal hover:bg-zinc-100 border border-[#E9E7EF]'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side transformational list */}
      <div className="space-y-2.5">
        {filtered.map(({ item, meta, originalName, isRenamed, isMoved, isExcluded, isUnchanged }) => (
          <div
            key={item.fileId}
            onClick={() => onEditFile(item.fileId)}
            className={`p-4 rounded-2xl border bg-white shadow-card transition-all cursor-pointer hover:border-brand-300 hover:shadow-card-hover ${
              isExcluded ? 'opacity-60 bg-[#FAF9F6]' : 'border-[#E9E7EF]'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Before Column */}
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-subtle">
                  Before (Original Upload)
                </span>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-sm text-charcoal truncate">{originalName}</span>
                </div>
                {meta?.originalRelativePath && (
                  <p className="text-xs text-charcoal-subtle font-mono truncate">
                    Original Path: {meta.originalRelativePath}
                  </p>
                )}
              </div>

              {/* Transformation Indicator */}
              <div className="hidden lg:flex flex-col items-center justify-center px-4 shrink-0">
                <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200/80 flex items-center justify-center text-brand-600 shadow-xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold text-brand-600 uppercase tracking-wider mt-0.5">
                  UNDO
                </span>
              </div>

              {/* After Column */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-700">
                    After (Proposed Destination)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isRenamed && (
                      <Badge variant="brand" size="sm">
                        Renamed
                      </Badge>
                    )}
                    {isMoved && (
                      <Badge variant="mint" size="sm">
                        Organized
                      </Badge>
                    )}
                    {isExcluded && (
                      <Badge variant="danger" size="sm">
                        Excluded from ZIP
                      </Badge>
                    )}
                    {isUnchanged && (
                      <Badge variant="outline" size="sm">
                        Unchanged
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-sm font-semibold truncate ${
                      isExcluded ? 'line-through text-zinc-400' : 'text-charcoal'
                    }`}
                  >
                    {item.proposedPath}
                  </span>
                </div>
                <p className="text-xs text-charcoal-muted truncate font-sans">
                  Reason: {item.groupingReason}
                </p>
              </div>

              {/* Quick Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFile(item.fileId);
                }}
                className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors shrink-0 border border-transparent hover:border-brand-200"
                title="Edit location and filename"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

