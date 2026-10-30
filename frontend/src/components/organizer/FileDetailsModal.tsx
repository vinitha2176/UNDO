import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { OrganizationPlanItem, SafeFileMetadata, FileCategory } from '../../types';
import { FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

interface FileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileItem: OrganizationPlanItem | null;
  fileMetadata: SafeFileMetadata | null;
  availableFolders: string[];
  onSave: (fileId: string, updates: {
    proposedFilename?: string;
    proposedDestinationFolder?: string;
    category?: string;
    suggestedGroup?: string | null;
    isIncludedInExport?: boolean;
    allowExtensionChange?: boolean;
  }) => Promise<void>;
  onRestore: (fileId: string) => Promise<void>;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({
  isOpen,
  onClose,
  fileItem,
  fileMetadata,
  availableFolders,
  onSave,
  onRestore,
}) => {
  const [filename, setFilename] = useState('');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [category, setCategory] = useState<FileCategory>('documents');
  const [suggestedGroup, setSuggestedGroup] = useState<string>('');
  const [isIncluded, setIsIncluded] = useState(true);
  const [allowExtChange, setAllowExtChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileItem) {
      setFilename(fileItem.proposedFilename);
      setDestinationFolder(fileItem.proposedDestinationFolder);
      setCategory(fileItem.category);
      setSuggestedGroup(fileItem.suggestedGroup || '');
      setIsIncluded(fileItem.isIncludedInExport);
      setAllowExtChange(false);
      setError(null);
    }
  }, [fileItem]);

  if (!fileItem) return null;

  const originalExt = fileItem.originalName.split('.').pop() || '';
  const currentExt = filename.split('.').pop() || '';
  const isExtModified = originalExt.toLowerCase() !== currentExt.toLowerCase();

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(fileItem.fileId, {
        proposedFilename: filename,
        proposedDestinationFolder: destinationFolder,
        category,
        suggestedGroup: suggestedGroup.trim() ? suggestedGroup.trim() : null,
        isIncludedInExport: isIncluded,
        allowExtensionChange: allowExtChange,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onRestore(fileItem.fileId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to restore file suggestion');
    } finally {
      setIsSaving(false);
    }
  };

  const allCategories: FileCategory[] = [
    'documents',
    'spreadsheets',
    'presentations',
    'images',
    'videos',
    'audio',
    'archives',
    'source code',
    'others',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Organization"
      subtitle={`Original: ${fileItem.originalName}`}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestore}
            disabled={isSaving}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset to Original Suggestion
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-5 text-sm">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Proposed Filename */}
        <div className="space-y-1.5">
          <label htmlFor="proposed-filename-input" className="block text-xs font-semibold text-charcoal uppercase tracking-wider">
            Proposed Filename
          </label>
          <input
            id="proposed-filename-input"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
          />
          {isExtModified && (
            <div className="flex items-center gap-2 pt-1 text-xs text-amber-700">
              <input
                type="checkbox"
                id="allowExt"
                checked={allowExtChange}
                onChange={(e) => setAllowExtChange(e.target.checked)}
                className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="allowExt" className="cursor-pointer">
                Confirm intentional extension change (.{originalExt} → .{currentExt})
              </label>
            </div>
          )}
        </div>

        {/* 2. Destination Folder */}
        <div className="space-y-1.5">
          <label htmlFor="destination-folder-input" className="block text-xs font-semibold text-charcoal uppercase tracking-wider">
            Destination Folder
          </label>
          <input
            id="destination-folder-input"
            type="text"
            value={destinationFolder}
            onChange={(e) => setDestinationFolder(e.target.value)}
            placeholder="e.g. Documents or Projects/Alpha/Assets"
            className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
          />
          {availableFolders.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-charcoal-subtle">Suggestions:</span>
              {availableFolders.slice(0, 5).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDestinationFolder(f)}
                  className="text-xs bg-zinc-100 hover:bg-brand-50 hover:text-brand-700 px-2 py-0.5 rounded text-zinc-600 transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Category & Project Group */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FileCategory)}
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize"
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider">
              Project Group (Optional)
            </label>
            <input
              type="text"
              value={suggestedGroup}
              onChange={(e) => setSuggestedGroup(e.target.value)}
              placeholder="e.g. Pathfinder"
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* 4. Inclusion toggle */}
        <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
          <div>
            <span className="font-semibold text-charcoal text-xs sm:text-sm">
              Include in Export
            </span>
            <p className="text-xs text-charcoal-subtle">
              When disabled, this file will be omitted from the exported ZIP archive.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isIncluded}
              onChange={(e) => setIsIncluded(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {/* Reason notice */}
        <div className="text-xs text-zinc-500 italic bg-zinc-50/50 p-2.5 rounded-lg border border-dashed border-zinc-200">
          Reason: {fileItem.groupingReason}
        </div>
      </div>
    </Modal>
  );
};

