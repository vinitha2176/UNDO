import React, { useState } from 'react';
import {
  DuplicateGroupDetail,
  OrganizationPlanItem,
  OrganizationPlanSummary,
  SafeFileMetadata,
  VirtualTreeResponse,
} from '../../types';
import {
  FolderTree,
  ArrowRightLeft,
  Copy,
  Mic,
  RotateCcw,
  FileText,
  Search,
  Check,
  Edit2,
  FolderOpen,
  Eye,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { VirtualFolderTree } from './VirtualFolderTree';
import { BeforeAfterComparison } from './BeforeAfterComparison';
import { DuplicateReviewCenter } from '../duplicates/DuplicateReviewCenter';
import { WisprPreferences } from './WisprPreferences';
import { FileDetailsModal } from './FileDetailsModal';
import { formatBytes, getCategoryBadgeClass } from '../../utils/formatters';

interface OrganizationStudioProps {
  planSummary: OrganizationPlanSummary;
  virtualTree: VirtualTreeResponse;
  fileMetadata: SafeFileMetadata[];
  duplicateGroups: DuplicateGroupDetail[];
  onUpdatePlanItem: (
    fileId: string,
    updates: {
      proposedFilename?: string;
      proposedDestinationFolder?: string;
      category?: string;
      suggestedGroup?: string | null;
      isIncludedInExport?: boolean;
      allowExtensionChange?: boolean;
    }
  ) => Promise<void>;
  onResetPlan: () => Promise<void>;
  onUpdateDuplicateGroup: (
    groupId: string,
    action: 'keep_all' | 'retain_one' | 'exclude_selected' | 'include_selected',
    primaryFileId?: string,
    fileIds?: string[]
  ) => Promise<void>;
  onProceedToExport: () => void;
}

export const OrganizationStudio: React.FC<OrganizationStudioProps> = ({
  planSummary,
  virtualTree,
  fileMetadata,
  duplicateGroups,
  onUpdatePlanItem,
  onResetPlan,
  onUpdateDuplicateGroup,
  onProceedToExport,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'comparison' | 'duplicates' | 'wispr'>('tree');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const selectedPlanItem = planSummary.plan.find((p) => p.fileId === (editingFileId || selectedFileId)) || null;
  const selectedFileMeta = fileMetadata.find((m) => m.id === (editingFileId || selectedFileId)) || null;

  const handleReset = async () => {
    if (confirm('Are you sure you want to restore the initial organization plan? Any custom renames and folder changes will be reset.')) {
      setIsResetting(true);
      try {
        await onResetPlan();
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleApplyWisprRules = async (
    updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }>
  ) => {
    for (const update of updates) {
      await onUpdatePlanItem(update.fileId, {
        proposedDestinationFolder: update.destinationFolder,
        isIncludedInExport: update.isIncluded,
      });
    }
  };

  const filteredInventory = planSummary.plan.filter((item) =>
    item.originalName.toLowerCase().includes(fileSearch.toLowerCase()) ||
    item.proposedFilename.toLowerCase().includes(fileSearch.toLowerCase()) ||
    item.proposedDestinationFolder.toLowerCase().includes(fileSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Studio Navigation Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-card">
        {/* Tab buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'tree'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            Virtual Folder Studio
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'comparison'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Before & After
          </button>

          <button
            onClick={() => setActiveTab('duplicates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'duplicates'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <Copy className="w-4 h-4" />
            Duplicates ({duplicateGroups.length})
          </button>

          <button
            onClick={() => setActiveTab('wispr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'wispr'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <Mic className="w-4 h-4" />
            Wispr Dictation
          </button>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            isLoading={isResetting}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Plan
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onProceedToExport}
          >
            Review & Export →
          </Button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: File Collection Inventory (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200 shadow-card flex flex-col h-[650px] overflow-hidden">
            <div className="p-4 border-b border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-charcoal">Original File Inventory</h3>
                  <p className="text-xs text-charcoal-subtle">
                    {planSummary.includedInExport} of {planSummary.totalFiles} files selected for export
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="Filter inventory files..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-50 p-2 space-y-1">
              {filteredInventory.map((item) => {
                const isSelected = selectedFileId === item.fileId;
                const isExcluded = !item.isIncludedInExport;

                return (
                  <div
                    key={item.fileId}
                    onClick={() => setSelectedFileId(item.fileId)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-50 border border-brand-200 shadow-sm'
                        : 'hover:bg-zinc-50 border border-transparent'
                    } ${isExcluded ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className={`font-semibold text-xs truncate ${isSelected ? 'text-brand-950' : 'text-charcoal'}`}>
                            {item.originalName}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            Target: {item.proposedPath}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFileId(item.fileId);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-brand-600 hover:bg-brand-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isExcluded && (
                          <Badge variant="danger" size="sm">
                            Excluded
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Proposed Virtual Folder Tree (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 shadow-card flex flex-col h-[650px] overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-charcoal">Proposed Virtual Folder Hierarchy</h3>
                <p className="text-xs text-charcoal-subtle">
                  Live preview of how your files will be arranged in the exported ZIP archive
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded text-zinc-600">
                  {virtualTree.summary.folderCount} Folders
                </span>
                <span className="text-xs font-mono bg-teal-50 text-teal-700 px-2 py-1 rounded border border-teal-200">
                  {formatBytes(virtualTree.summary.estimatedOutputSize)}
                </span>
              </div>
            </div>

            {/* Tree Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/30">
              <VirtualFolderTree
                tree={virtualTree.tree}
                selectedFileId={selectedFileId}
                onSelectFile={(id) => {
                  setSelectedFileId(id);
                  setEditingFileId(id);
                }}
              />
            </div>

            {/* Bottom active inspector card if file selected */}
            {selectedPlanItem && (
              <div className="p-4 bg-surface border-t border-zinc-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-charcoal truncate block">
                    {selectedPlanItem.proposedFilename}
                  </span>
                  <span className="text-[11px] text-charcoal-subtle truncate block">
                    Folder: {selectedPlanItem.proposedDestinationFolder || '(Root)'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingFileId(selectedPlanItem.fileId)}
                  icon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit Location & Name
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Before & After */}
      {activeTab === 'comparison' && (
        <BeforeAfterComparison
          planItems={planSummary.plan}
          fileMetadata={fileMetadata}
          onEditFile={(fileId) => setEditingFileId(fileId)}
        />
      )}

      {/* Tab: Duplicates */}
      {activeTab === 'duplicates' && (
        <DuplicateReviewCenter
          duplicateGroups={duplicateGroups}
          onUpdateGroup={onUpdateDuplicateGroup}
        />
      )}

      {/* Tab: Wispr Dictation */}
      {activeTab === 'wispr' && (
        <WisprPreferences
          planItems={planSummary.plan}
          onApplyRules={handleApplyWisprRules}
        />
      )}

      {/* Customize File Modal */}
      <FileDetailsModal
        isOpen={editingFileId !== null}
        onClose={() => setEditingFileId(null)}
        fileItem={selectedPlanItem}
        fileMetadata={selectedFileMeta}
        availableFolders={planSummary.targetFolders}
        onSave={async (id, updates) => {
          await onUpdatePlanItem(id, updates);
        }}
        onRestore={async (id) => {
          // Restore to initial plan
          const init = fileMetadata.find((m) => m.id === id);
          if (init) {
            await onUpdatePlanItem(id, {
              proposedFilename: init.sanitizedName,
              proposedDestinationFolder: init.suggestedGroup
                ? `Projects/${init.suggestedGroup}`
                : init.category.charAt(0).toUpperCase() + init.category.slice(1),
              category: init.category,
              isIncludedInExport: true,
            });
          }
        }}
      />
    </div>
  );
};

