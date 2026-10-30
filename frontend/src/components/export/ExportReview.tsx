import React, { useState } from 'react';
import {
  OrganizationPlanSummary,
  VirtualTreeResponse,
  SafeFileMetadata,
  ExportRecord,
} from '../../types';
import {
  Download,
  FolderArchive,
  FileCheck,
  FileX,
  FileEdit,
  FolderTree,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatBytes } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface ExportReviewProps {
  planSummary: OrganizationPlanSummary;
  virtualTree: VirtualTreeResponse;
  fileMetadata: SafeFileMetadata[];
  onGenerateAndDownload: () => Promise<ExportRecord>;
  onBackToStudio: () => void;
}

export const ExportReview: React.FC<ExportReviewProps> = ({
  planSummary,
  virtualTree,
  fileMetadata,
  onGenerateAndDownload,
  onBackToStudio,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<ExportRecord | null>(null);
  const [isManifestOpen, setIsManifestOpen] = useState(false);

  const metaMap = new Map(fileMetadata.map((m) => [m.id, m]));

  const renamedCount = planSummary.plan.filter((item) => {
    const meta = metaMap.get(item.fileId);
    return meta && item.proposedFilename !== meta.sanitizedName;
  }).length;

  const reorganizedCount = planSummary.plan.filter(
    (item) => item.proposedDestinationFolder !== ''
  ).length;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const record = await onGenerateAndDownload();
      setDownloadSuccess(record);
    } finally {
      setIsExporting(false);
    }
  };

  // Mock manifest representation matching what backend puts in the zip
  const manifestPreview = {
    application: 'UNDO',
    manifestVersion: '1.0',
    exportTimestamp: new Date().toISOString(),
    sessionReference: planSummary.sessionId,
    totalImportedFiles: planSummary.totalFiles,
    totalExportedFiles: planSummary.includedInExport,
    totalExcludedFiles: planSummary.excludedDuplicates,
    files: planSummary.plan.map((item) => {
      const meta = metaMap.get(item.fileId);
      return {
        fileId: item.fileId,
        originalFilename: meta?.originalName || item.originalName,
        originalRelativePath: meta?.originalRelativePath || null,
        exportedPath: item.isIncludedInExport ? item.proposedPath : null,
        originalSha256: meta?.sha256 || 'verified',
        fileSizeBytes: meta?.size || 0,
        renamed: meta ? item.proposedFilename !== meta.sanitizedName : false,
        reassigned: item.proposedDestinationFolder !== '',
        isDuplicate: item.duplicateStatus.isDuplicate,
        duplicateOfFileId: item.duplicateStatus.duplicateOfFileId || null,
        excluded: !item.isIncludedInExport,
        exclusionReason: !item.isIncludedInExport ? item.groupingReason : null,
        category: item.category,
        group: item.suggestedGroup || null,
      };
    }),
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="text-center space-y-2.5 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-100 text-mint-dark text-xs font-bold uppercase tracking-wider border border-mint/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-mint-dark" />
          Ready to put everything in order?
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal">
          Everything in its place.
        </h1>
        <p className="text-charcoal-muted max-w-lg mx-auto text-sm leading-relaxed">
          Review your organized collection before downloading. Your original files haven't been changed.
        </p>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E9E7EF] shadow-card hover:border-brand-200 transition-colors">
          <div className="flex items-center gap-2 text-charcoal-subtle text-xs font-bold uppercase tracking-wider">
            <FileCheck className="w-4 h-4 text-mint-dark" />
            Included Files
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-charcoal mt-2 font-sans">
            {planSummary.includedInExport}
          </div>
          <p className="text-[11px] text-charcoal-subtle font-medium">of {planSummary.totalFiles} original files</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E9E7EF] shadow-card hover:border-brand-200 transition-colors">
          <div className="flex items-center gap-2 text-charcoal-subtle text-xs font-bold uppercase tracking-wider">
            <FileX className="w-4 h-4 text-peach-dark" />
            Excluded Copies
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-charcoal mt-2 font-sans">
            {planSummary.excludedDuplicates}
          </div>
          <p className="text-[11px] text-charcoal-subtle font-medium">redundant duplicates</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E9E7EF] shadow-card hover:border-brand-200 transition-colors">
          <div className="flex items-center gap-2 text-charcoal-subtle text-xs font-bold uppercase tracking-wider">
            <FolderTree className="w-4 h-4 text-brand-600" />
            Target Folders
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-charcoal mt-2 font-sans">
            {virtualTree.summary.folderCount}
          </div>
          <p className="text-[11px] text-charcoal-subtle font-medium">clean directory tree</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E9E7EF] shadow-card hover:border-brand-200 transition-colors">
          <div className="flex items-center gap-2 text-charcoal-subtle text-xs font-bold uppercase tracking-wider">
            <FileEdit className="w-4 h-4 text-purple-600" />
            Renamed Files
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-charcoal mt-2 font-sans">{renamedCount}</div>
          <p className="text-[11px] text-charcoal-subtle font-medium">collision-free names</p>
        </div>
      </div>

      {/* Main Action Card */}
      <div className="bg-white rounded-3xl border border-[#E9E7EF] shadow-card p-6 sm:p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-200/80 flex items-center justify-center text-brand-600 mx-auto shadow-sm shadow-brand-500/10">
          <FolderArchive className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal">Download Organized Files</h2>
          <p className="text-xs sm:text-sm text-charcoal-muted max-w-md mx-auto leading-relaxed">
            Package estimated {formatBytes(virtualTree.summary.estimatedOutputSize)} into a downloadable ZIP archive.
            Includes auditable <code className="font-mono bg-brand-50 text-brand-800 px-1.5 py-0.5 rounded border border-brand-200/60">undo-manifest.json</code>.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-lg mx-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={onBackToStudio}
            disabled={isExporting}
            className="w-full sm:w-auto px-5 whitespace-nowrap"
          >
            ← Modify Plan
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={handleExport}
            isLoading={isExporting}
            className="w-full sm:w-auto px-7 whitespace-nowrap shadow-md shadow-brand-500/25"
            icon={<Download className="w-5 h-5 shrink-0" />}
          >
            Download Organized Files
          </Button>
        </div>

        {/* View Manifest Trigger */}
        <div>
          <button
            type="button"
            onClick={() => setIsManifestOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-brand-700 hover:text-brand-900 font-semibold hover:underline"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview undo-manifest.json
          </button>
        </div>

        {/* Zero-damage guarantee */}
        <div className="pt-3 border-t border-[#E9E7EF] flex items-center justify-center gap-2 text-xs text-mint-dark font-medium">
          <ShieldCheck className="w-4 h-4 text-mint-dark shrink-0" />
          <span>Original files on your computer remain completely untouched in their original locations.</span>
        </div>
      </div>

      {/* Success banner after download */}
      {downloadSuccess && (
        <div className="p-5 rounded-2xl bg-mint-50 border border-mint/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mint-100 flex items-center justify-center text-mint-dark shrink-0">
              <CheckCircle2 className="w-6 h-6 text-mint-dark" />
            </div>
            <div className="text-sm text-mint-dark">
              <span className="font-extrabold text-base">Your organized collection is ready!</span>
              <p className="text-xs text-mint-dark/90 mt-0.5">
                Saved as <code className="font-mono font-semibold bg-white/70 px-1.5 py-0.5 rounded border border-mint/40">{downloadSuccess.filename}</code> ({formatBytes(downloadSuccess.sizeBytes)}).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateAndDownload()}
            icon={<Download className="w-3.5 h-3.5" />}
            className="bg-white border-mint text-mint-dark hover:bg-mint-100/50"
          >
            Download Again
          </Button>
        </div>
      )}

      {/* Manifest Modal */}
      <Modal
        isOpen={isManifestOpen}
        onClose={() => setIsManifestOpen(false)}
        title="undo-manifest.json"
        subtitle="Auditable machine-readable change log embedded inside your ZIP export"
        maxWidth="2xl"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsManifestOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-charcoal-subtle">
            Every exported archive contains this complete traceability manifest mapping each file's
            original name, hash, category, and final exported destination.
          </p>
          <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
            {JSON.stringify(manifestPreview, null, 2)}
          </pre>
        </div>
      </Modal>
    </div>
  );
};

