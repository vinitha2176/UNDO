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
      <div className="text-center space-y-2 pt-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal">
          Turn file chaos into clarity.
        </h1>
        <p className="text-charcoal-subtle max-w-xl mx-auto text-sm sm:text-base">
          Drop your messy files here. UNDO will help you organize them while keeping your originals
          completely untouched.
        </p>
      </div>

      {/* Sample dataset banner for judges */}
      <div className="bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-charcoal">Hackathon Demo Mode</span>
            <p className="text-xs text-charcoal-subtle">
              Experience the complete flow instantly with synthetic reports, duplicate resumes & project assets.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadSampleFiles}
          disabled={isUploading}
          className="shrink-0 bg-white shadow-sm hover:bg-brand-50 text-brand-700 border-brand-300"
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
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all bg-white ${
          isDragOver
            ? 'border-brand-500 bg-brand-50/50 scale-[1.01]'
            : 'border-zinc-300 hover:border-zinc-400'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-sm">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-base sm:text-lg font-semibold text-charcoal">
              Drag and drop files here, or browse
            </p>
            <p className="text-xs sm:text-sm text-charcoal-subtle">
              PDF, DOCX, XLSX, PNG, JPEG, ZIP, source code, and ordinary files
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
              icon={<FolderUp className="w-4 h-4" />}
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

          <p className="text-xs text-zinc-400 pt-2">
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
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <span className="font-semibold text-charcoal text-sm">
                Selected Files ({selectedFiles.length})
              </span>
              <span className="text-xs text-charcoal-subtle ml-2">
                Total size: {formatBytes(totalBytes)}
              </span>
            </div>
            <button
              onClick={handleClearAll}
              disabled={isUploading}
              className="text-xs text-zinc-500 hover:text-rose-600 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Scrollable list */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-50">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between py-2 text-sm group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="truncate font-medium text-charcoal">{file.name}</span>
                  {relativePaths[file.name] && (
                    <span className="text-[11px] font-mono text-zinc-400 truncate hidden sm:inline">
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
                    className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Submit action */}
          <div className="pt-2 flex items-center justify-between gap-4">
            <p className="text-xs text-charcoal-subtle">
              Files will be stored in an isolated temporary session. Original files remain untouched.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              isLoading={isUploading}
            >
              Analyze & Organize Files
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

