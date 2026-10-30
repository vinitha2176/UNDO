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
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">
          Ready to put everything in order?
        </h1>
        <p className="text-charcoal-subtle max-w-lg mx-auto text-sm">
          Review your finalized organization plan below. UNDO will package your files into a clean,
          structured ZIP archive containing a verified change manifest.
        </p>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-card">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase">
            <FileCheck className="w-4 h-4 text-teal-600" />
            Included Files
          </div>
          <div className="text-2xl font-bold text-charcoal mt-2">
            {planSummary.includedInExport}
          </div>
          <p className="text-[11px] text-zinc-400">of {planSummary.totalFiles} original files</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-card">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase">
            <FileX className="w-4 h-4 text-amber-600" />
            Excluded Copies
          </div>
          <div className="text-2xl font-bold text-charcoal mt-2">
            {planSummary.excludedDuplicates}
          </div>
          <p className="text-[11px] text-zinc-400">redundant duplicates</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-card">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase">
            <FolderTree className="w-4 h-4 text-brand-600" />
            Target Folders
          </div>
          <div className="text-2xl font-bold text-charcoal mt-2">
            {virtualTree.summary.folderCount}
          </div>
          <p className="text-[11px] text-zinc-400">clean directory tree</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-card">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase">
            <FileEdit className="w-4 h-4 text-purple-600" />
            Renamed Files
          </div>
          <div className="text-2xl font-bold text-charcoal mt-2">{renamedCount}</div>
          <p className="text-[11px] text-zinc-400">safe collision-free names</p>
        </div>
      </div>

      {/* Main Action Card */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-card p-6 sm:p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 mx-auto">
          <FolderArchive className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-charcoal">Download Organized Files</h2>
          <p className="text-xs sm:text-sm text-charcoal-subtle max-w-md mx-auto">
            Package estimated {formatBytes(virtualTree.summary.estimatedOutputSize)} into a downloadable ZIP archive.
            Includes machine-readable <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">undo-manifest.json</code>.
          </p>
        </div>

        {/* Big Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={onBackToStudio}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            ← Modify Plan
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={handleExport}
            isLoading={isExporting}
            className="w-full sm:w-auto px-8 shadow-md"
            icon={<Download className="w-5 h-5" />}
          >
            Download Organized Files
          </Button>
        </div>

        {/* View Manifest Trigger */}
        <div>
          <button
            type="button"
            onClick={() => setIsManifestOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-brand-700 hover:text-brand-900 font-medium hover:underline"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview undo-manifest.json
          </button>
        </div>

        {/* Zero-damage guarantee */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-center gap-2 text-xs text-teal-800">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Original files on your machine remain completely untouched in their original folders.</span>
        </div>
      </div>

      {/* Success banner after download */}
      {downloadSuccess && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <div className="text-sm text-teal-950">
              <span className="font-semibold">Archive generated successfully!</span>
              <p className="text-xs text-teal-800 mt-0.5">
                Saved as <code className="font-mono">{downloadSuccess.filename}</code> ({formatBytes(downloadSuccess.sizeBytes)}).
              </p>
            </div>
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={() => onGenerateAndDownload()}
            icon={<Download className="w-3.5 h-3.5" />}
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

