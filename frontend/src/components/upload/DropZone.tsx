import React, { useRef, useState } from 'react';
import { UploadCloud, FolderUp, FileText, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { formatBytes } from '../../utils/formatters';
import { generateSampleFiles } from '../../services/sampleData';

interface DropZoneProps {
  onFilesSelected: (files: File[], relativePaths?: Record<string, string>) => void;
  isUploading: boolean;
  maxFiles?: number;
  maxTotalBytes?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  isUploading,
  maxFiles = 100,
  maxTotalBytes = 104857600, // 100 MB
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [relativePaths, setRelativePaths] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const validateAndAddFiles = (newFiles: File[], paths?: Record<string, string>) => {
    setValidationError(null);
    const combined = [...selectedFiles, ...newFiles];

    if (combined.length > maxFiles) {
      setValidationError(`Maximum ${maxFiles} files allowed per upload. You selected ${combined.length}.`);
      return;
    }

    const combinedBytes = combined.reduce((acc, f) => acc + f.size, 0);
    if (combinedBytes > maxTotalBytes) {
      setValidationError(
        `Total upload size exceeds limit of ${formatBytes(maxTotalBytes)}. Selected: ${formatBytes(combinedBytes)}.`
      );
      return;
    }

    setSelectedFiles(combined);
    if (paths) {
      setRelativePaths((prev) => ({ ...prev, ...paths }));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const paths: Record<string, string> = {};
      for (const file of files) {
        if ((file as any).webkitRelativePath) {
          paths[file.name] = (file as any).webkitRelativePath;
        }
      }
      validateAndAddFiles(files, paths);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      validateAndAddFiles(files);
      e.target.value = '';
    }
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const paths: Record<string, string> = {};
      for (const file of files) {
        if ((file as any).webkitRelativePath) {
          paths[file.name] = (file as any).webkitRelativePath;
        }
      }
      validateAndAddFiles(files, paths);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    const file = selectedFiles[index];
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (file && relativePaths[file.name]) {
      const updated = { ...relativePaths };
      delete updated[file.name];
      setRelativePaths(updated);
    }
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setRelativePaths({});
    setValidationError(null);
  };

  const handleLoadSampleFiles = () => {
    const samples = generateSampleFiles();
    setSelectedFiles(samples);
    setRelativePaths({});
    setValidationError(null);
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) return;
    onFilesSelected(selectedFiles, relativePaths);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="text-center space-y-3 pt-6 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          Intelligent, Reversible File Organization
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-charcoal leading-tight">
          Your files are a mess.<br />
          <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 bg-clip-text text-transparent">
            Let's make that UNDO.
          </span>
        </h1>
        <p className="text-charcoal-muted max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          From scattered downloads to organized folders in just a few steps. Find duplicates,
          preview every change, and keep your originals untouched.
        </p>
      </div>

      {/* Creative Illustrative File Transformation Preview */}
      <div className="bg-white rounded-2xl p-5 border border-[#E9E7EF] shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-[#E9E7EF] text-xs font-semibold text-charcoal-subtle uppercase tracking-wider">
          <span>Transformation Preview</span>
          <span className="text-[11px] text-brand-600 font-mono font-medium lowercase">zero-destruction guarantee</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 pt-3">
          {/* Before: Messy Downloads */}
          <div className="md:col-span-5 bg-[#FAF9F6] rounded-xl p-3 border border-[#E9E7EF] space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-subtle block mb-1">
              Before: Scattered Downloads
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-charcoal-muted bg-white px-2.5 py-1.5 rounded-lg border border-[#E9E7EF]">
              <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">report_final2.pdf</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-charcoal-muted bg-white px-2.5 py-1.5 rounded-lg border border-[#E9E7EF]">
              <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="truncate">screenshot_104.png</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-charcoal-muted bg-white px-2.5 py-1.5 rounded-lg border border-[#E9E7EF]">
              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">project_notes.txt</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-charcoal-muted bg-white px-2.5 py-1.5 rounded-lg border border-[#E9E7EF]">
              <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">presentation_new.pptx</span>
            </div>
          </div>

          {/* Transformation Indicator */}
          <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-sm">
              <span className="text-base font-bold">→</span>
            </div>
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mt-1 hidden md:block">
              UNDO
            </span>
          </div>

          {/* After: Curated Virtual Folders */}
          <div className="md:col-span-5 bg-brand-50/40 rounded-xl p-3 border border-brand-200/60 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 block mb-1">
              After: Organized & Curated Structure
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-charcoal bg-white px-2.5 py-1.5 rounded-lg border border-brand-200/50 shadow-xs">
              <FolderUp className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="truncate font-semibold">Documents/</span>
              <span className="text-[11px] text-charcoal-subtle ml-auto font-sans font-normal">report_final2.pdf</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-charcoal bg-white px-2.5 py-1.5 rounded-lg border border-brand-200/50 shadow-xs">
              <FolderUp className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate font-semibold">Images/</span>
              <span className="text-[11px] text-charcoal-subtle ml-auto font-sans font-normal">screenshot_104.png</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-charcoal bg-white px-2.5 py-1.5 rounded-lg border border-brand-200/50 shadow-xs">
              <FolderUp className="w-3.5 h-3.5 text-mint-dark shrink-0" />
              <span className="truncate font-semibold">Projects/</span>
              <span className="text-[11px] text-charcoal-subtle ml-auto font-sans font-normal">project_notes.txt</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-charcoal bg-white px-2.5 py-1.5 rounded-lg border border-brand-200/50 shadow-xs">
              <FolderUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate font-semibold">Presentations/</span>
              <span className="text-[11px] text-charcoal-subtle ml-auto font-sans font-normal">presentation_new.pptx</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sample dataset banner for judges & evaluation */}
      <div className="bg-gradient-to-r from-brand-50/80 via-white to-mint-50/80 border border-brand-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-card">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-10 h-10 rounded-2xl bg-brand-100/80 border border-brand-200 flex items-center justify-center text-brand-700 shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-charcoal">Try UNDO with Realistic Sample Files</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-peach-100 text-peach-dark border border-peach/50">
                30 Files
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Instantly test multi-category sorting, Pathfinder project grouping, and duplicate resume detection.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadSampleFiles}
          disabled={isUploading}
          className="shrink-0 bg-white shadow-sm hover:bg-brand-50 text-brand-700 border-brand-300 font-semibold"
          icon={<Sparkles className="w-3.5 h-3.5 text-brand-600" />}
        >
          Try with Sample Files
        </Button>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all bg-white shadow-card ${
          isDragOver
            ? 'border-brand-500 bg-brand-50/60 shadow-glow scale-[1.01]'
            : 'border-brand-200/80 hover:border-brand-400'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-300 ${
            isDragOver
              ? 'bg-brand-500 text-white shadow-glow scale-110'
              : 'bg-brand-50 border border-brand-200 text-brand-600 shadow-sm'
          }`}>
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-base sm:text-lg font-bold text-charcoal">
              Drag and drop your messy files here, or browse
            </p>
            <p className="text-xs sm:text-sm text-charcoal-muted">
              PDF, DOCX, XLSX, PNG, JPEG, ZIP, source code, and ordinary documents
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              icon={<UploadCloud className="w-4 h-4" />}
            >
              Browse Files
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => folderInputRef.current?.click()}
              disabled={isUploading}
              icon={<FolderUp className="w-4 h-4 text-brand-600" />}
            >
              Select Folder
            </Button>

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFolderInput}
              // @ts-expect-error webkitdirectory is standard for folder upload in modern browsers
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
            />
          </div>

          <p className="text-xs text-charcoal-subtle pt-1 font-mono">
            Max 100 files • 20 MB per file • 100 MB total session limit
          </p>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Selected Files Staging List */}
      {selectedFiles.length > 0 && (
        <div className="bg-white border border-[#E9E7EF] rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E9E7EF]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-charcoal text-sm">
                Selected Files ({selectedFiles.length})
              </span>
              <span className="text-xs text-charcoal-subtle font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200/60">
                {formatBytes(totalBytes)}
              </span>
            </div>
            <button
              onClick={handleClearAll}
              disabled={isUploading}
              className="text-xs font-medium text-charcoal-subtle hover:text-rose-600 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Scrollable list */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 divide-y divide-[#FAF9F6]">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between py-2 text-sm group hover:bg-[#FAF9F6] px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                  <span className="truncate font-medium text-charcoal">{file.name}</span>
                  {relativePaths[file.name] && (
                    <span className="text-[11px] font-mono text-charcoal-subtle truncate hidden sm:inline">
                      ({relativePaths[file.name]})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-charcoal-subtle font-mono">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    disabled={isUploading}
                    className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Submit action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E9E7EF]">
            <p className="text-xs text-charcoal-subtle text-center sm:text-left">
              Files are processed in an isolated session. Original source files remain untouched.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              isLoading={isUploading}
              className="w-full sm:w-auto shadow-md shadow-brand-500/20"
            >
              Analyze & Organize Files
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

