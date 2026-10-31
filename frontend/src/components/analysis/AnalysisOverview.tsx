import React, { useState } from 'react';
import {
  FileCategory,
  SessionAnalysisSummary,
  SafeFileMetadata,
} from '../../types';
import {
  FileText,
  HardDrive,
  Copy,
  FolderGit2,
  Search,
  Filter,
  ArrowUpDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Cpu,
  Layers,
  GitBranch,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { formatBytes, getCategoryBadgeClass } from '../../utils/formatters';

interface AnalysisOverviewProps {
  analysis: SessionAnalysisSummary;
  onProceedToStudio: () => void;
}

export const AnalysisOverview: React.FC<AnalysisOverviewProps> = ({
  analysis,
  onProceedToStudio,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'size' | 'category'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Compute total redundant bytes across duplicate groups
  const redundantBytes = analysis.duplicateGroups.reduce((sum, grp) => {
    const singleFileSize = grp.totalSizeBytes / grp.fileCount;
    return sum + (grp.fileCount - 1) * singleFileSize;
  }, 0);

  // Filter files
  const filteredFiles = analysis.files.filter((file) => {
    const matchesSearch =
      file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.suggestedGroup && file.suggestedGroup.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || file.category === selectedCategory;

    const isDuplicate = analysis.duplicateGroups.some((grp) =>
      grp.duplicateFiles.some((d) => d.fileId === file.id)
    );
    const matchesDuplicate = !duplicatesOnly || isDuplicate;

    return matchesSearch && matchesCategory && matchesDuplicate;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') {
      cmp = a.originalName.localeCompare(b.originalName);
    } else if (sortField === 'size') {
      cmp = a.size - b.size;
    } else if (sortField === 'category') {
      cmp = a.category.localeCompare(b.category);
    }
    return sortAsc ? cmp : -cmp;
  });

  const [selectedFileForInspection, setSelectedFileForInspection] = useState<SafeFileMetadata | null>(
    analysis.files.length > 0 ? analysis.files[0] : null
  );

  // Content extraction and semantic metrics
  const successfulExtractions = analysis.contentExtractions?.filter((e) => e.status === 'success') || [];
  const extractedCount = successfulExtractions.length;
  const semanticClusters = analysis.semanticClusters || [];
  const versionFamilies = analysis.versionFamilies || [];
  const inspectedExtraction = selectedFileForInspection
    ? analysis.contentExtractions?.find((e) => e.fileId === selectedFileForInspection.id)
    : null;

  // Compute category color mapping
  const categoryColorMap: Record<string, string> = {
    documents: 'bg-blue-400',
    spreadsheets: 'bg-emerald-400',
    presentations: 'bg-amber-400',
    images: 'bg-purple-400',
    videos: 'bg-rose-400',
    audio: 'bg-pink-400',
    archives: 'bg-indigo-400',
    'source code': 'bg-teal-400',
    others: 'bg-zinc-400',
  };

  const categories = Object.entries(analysis.categories).filter(([_, count]) => count > 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#E9E7EF]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">
              File Analysis Summary
            </h2>
            <Badge variant="mint" size="sm">
              Analysis Complete
            </Badge>
          </div>
          <p className="text-sm text-charcoal-muted mt-1">
            Deterministic analysis of file extensions, cryptographic checksums, and project conventions
          </p>
        </div>
        <button
          onClick={onProceedToStudio}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm hover:shadow-card-hover transition-all active:scale-[0.98] shadow-brand-500/20"
        >
          Open Organization Studio →
        </button>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <div className="bg-white rounded-2xl p-5 border border-[#E9E7EF] shadow-card flex items-center gap-4 hover:border-brand-300 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-charcoal">{analysis.totalFiles}</div>
            <div className="text-xs font-medium text-charcoal-subtle">Total Imported Files</div>
          </div>
        </div>

        {/* Total Storage */}
        <div className="bg-white rounded-2xl p-5 border border-[#E9E7EF] shadow-card flex items-center gap-4 hover:border-brand-300 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-mint-100 border border-mint/40 flex items-center justify-center text-mint-dark shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-charcoal">{formatBytes(analysis.totalSizeBytes)}</div>
            <div className="text-xs font-medium text-charcoal-subtle">Total Session Storage</div>
          </div>
        </div>

        {/* Exact Duplicates */}
        <div className="bg-white rounded-2xl p-5 border border-[#E9E7EF] shadow-card flex items-center gap-4 hover:border-brand-300 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-peach-100 border border-peach/50 flex items-center justify-center text-peach-dark shrink-0">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-charcoal">
              {analysis.duplicateGroups.length}
            </div>
            <div className="text-xs font-medium text-charcoal-subtle">
              Exact Duplicate Groups {redundantBytes > 0 && `(${formatBytes(redundantBytes)} redundant)`}
            </div>
          </div>
        </div>

        {/* Project Groups */}
        <div className="bg-white rounded-2xl p-5 border border-[#E9E7EF] shadow-card flex items-center gap-4 hover:border-brand-300 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 shrink-0">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-charcoal">
              {semanticClusters.length > 0 ? semanticClusters.length : analysis.suggestedProjectGroups.length}
            </div>
            <div className="text-xs font-medium text-charcoal-subtle">
              {semanticClusters.length > 0 ? 'Semantic Project Clusters' : 'Suggested Project Groups'}
            </div>
          </div>
        </div>
      </div>

      {/* 100% Local Content Intelligence Status */}
      {analysis.contentExtractions && analysis.contentExtractions.length > 0 && (
        <div className="bg-gradient-to-r from-brand-50/70 via-indigo-50/40 to-teal-50/40 rounded-2xl p-4 border border-brand-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-800">
                  Content-Aware Local Intelligence
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  100% Local Inference &amp; Zero Cloud APIs
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Extracted readable text from {extractedCount} of {analysis.totalFiles} documents across PDF, DOCX, PPTX, TXT, CSV, and XLSX.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold font-mono text-brand-700 bg-white/80 px-2.5 py-1 rounded-lg border border-brand-200/60">
              {semanticClusters.length} Semantic Clusters
            </span>
            {versionFamilies.length > 0 && (
              <span className="text-xs font-bold font-mono text-purple-700 bg-white/80 px-2.5 py-1 rounded-lg border border-purple-200/60">
                {versionFamilies.length} Version Families
              </span>
            )}
          </div>
        </div>
      )}

      {/* Semantic Topic Clusters */}
      {semanticClusters.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-[#E9E7EF] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal">
                Content-Derived Semantic Project Clusters
              </h3>
            </div>
            <span className="text-xs text-charcoal-subtle font-mono">
              Clustered by TF-IDF &amp; Concept Overlap
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {semanticClusters.map((cluster) => (
              <div
                key={cluster.clusterId}
                className="p-4 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/40 to-white space-y-2.5 hover:border-brand-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-charcoal">{cluster.topicSummary}</h4>
                    <span className="text-xs font-mono text-brand-700 font-medium">
                      📁 {cluster.suggestedFolderName}/
                    </span>
                  </div>
                  <Badge
                    variant={cluster.confidence === 'strong' ? 'mint' : cluster.confidence === 'moderate' ? 'brand' : 'warning'}
                    size="sm"
                  >
                    {cluster.confidence} confidence
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-subtle block">
                    Content Evidence Terms
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {cluster.contentEvidence.map((term) => (
                      <span
                        key={term}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white border border-brand-200/70 text-brand-800"
                      >
                        #{term}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-charcoal-muted border-t border-brand-100/60">
                  <span>{cluster.fileIds.length} member documents</span>
                  <span className="font-mono text-[11px] text-charcoal-subtle">
                    avg sim: {(cluster.averageSimilarity * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version Families & Near-Duplicates (>=80% Content Similarity) */}
      {versionFamilies.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal">
                Document Versions &amp; Near-Duplicates (≥80% Content Match)
              </h3>
            </div>
            <span className="text-xs text-purple-600 font-semibold font-mono">
              Conservative Non-Destructive Detection
            </span>
          </div>

          <div className="space-y-2">
            {versionFamilies.map((rel, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-purple-100/80 bg-purple-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 font-mono font-medium text-charcoal">
                    <span className="text-purple-700 font-bold truncate max-w-xs">{rel.sourceFileName}</span>
                    <span className="text-charcoal-subtle">↔</span>
                    <span className="text-purple-700 font-bold truncate max-w-xs">{rel.targetFileName}</span>
                    <Badge variant={rel.relationshipType === 'revision' ? 'brand' : 'warning'} size="sm">
                      {rel.relationshipType === 'revision' ? 'Revision' : 'Near Duplicate'}
                    </Badge>
                  </div>
                  <p className="text-charcoal-muted">{rel.explanation}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="font-mono font-bold text-purple-700 bg-white px-2.5 py-1 rounded-lg border border-purple-200">
                    {(rel.similarityScore * 100).toFixed(0)}% match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Category Distribution Bar & Filter Pills */}
      <div className="bg-white rounded-2xl p-5 border border-[#E9E7EF] shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-subtle">
            Category Breakdown & Composition
          </h3>
          <span className="text-xs text-charcoal-subtle font-mono">
            {categories.length} distinct categories detected
          </span>
        </div>

        {/* Horizontal Visual Distribution Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-zinc-100 subtle-border">
          {categories.map(([category, count]) => {
            const pct = (count / analysis.totalFiles) * 100;
            const barClass = categoryColorMap[category] || 'bg-brand-400';
            return (
              <div
                key={category}
                style={{ width: `${pct}%` }}
                className={`${barClass} h-full transition-all`}
                title={`${category}: ${count} files (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selectedCategory === 'all'
                ? 'bg-charcoal text-white border-charcoal shadow-sm'
                : 'bg-[#FAF9F6] text-charcoal-muted border-[#E9E7EF] hover:bg-zinc-100'
            }`}
          >
            All Categories ({analysis.totalFiles})
          </button>
          {categories.map(([category, count]) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-[#FAF9F6] text-charcoal-muted border-[#E9E7EF] hover:bg-brand-50 hover:border-brand-200'
                }`}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Transparent Explanation Inspector Banner */}
      {selectedFileForInspection && (
        <div className="bg-gradient-to-r from-brand-50/60 via-white to-purple-50/60 rounded-2xl p-4 border border-brand-200/80 shadow-card flex items-start gap-3.5 animate-in fade-in duration-200">
          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 shrink-0 mt-0.5 shadow-sm">
            <Info className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                Why did UNDO place this here?
              </span>
              <span className="text-xs font-mono font-medium text-charcoal truncate">
                {selectedFileForInspection.originalName}
              </span>
            </div>
            <p className="text-sm text-charcoal font-medium">
              {selectedFileForInspection.groupingReason || selectedFileForInspection.categoryReason}
            </p>
            {selectedFileForInspection.suggestedGroup && (
              <div className="pt-1 flex items-center gap-2 text-xs text-charcoal-subtle">
                <span>Associated Topic / Project:</span>
                <Badge variant="brand" size="sm">
                  {selectedFileForInspection.suggestedGroup}
                </Badge>
              </div>
            )}
            {inspectedExtraction && inspectedExtraction.status === 'success' && (
              <div className="pt-1.5 flex flex-wrap items-center gap-2 text-xs text-charcoal-subtle border-t border-brand-100/60 mt-1.5">
                <span className="font-semibold text-brand-900">Extracted Content:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-brand-200 text-brand-800">
                  {inspectedExtraction.metadata.wordCount} words
                </span>
                {inspectedExtraction.metadata.pageCount !== undefined && (
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-brand-200 text-brand-800">
                    {inspectedExtraction.metadata.pageCount} pages
                  </span>
                )}
                {inspectedExtraction.metadata.sheetCount !== undefined && (
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-brand-200 text-brand-800">
                    {inspectedExtraction.metadata.sheetCount} sheets
                  </span>
                )}
                {inspectedExtraction.metadata.detectedTitle && (
                  <span className="text-charcoal italic truncate max-w-sm">
                    "{inspectedExtraction.metadata.detectedTitle}"
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File List Table with Search and Filters */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-card overflow-hidden">
        {/* Table controls */}
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search filename or project..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Duplicates filter toggle */}
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={duplicatesOnly}
                onChange={(e) => setDuplicatesOnly(e.target.checked)}
                className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
              />
              Duplicates only
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/80 text-xs font-semibold text-charcoal-subtle uppercase border-b border-zinc-100">
              <tr>
                <th
                  onClick={() => {
                    if (sortField === 'name') setSortAsc(!sortAsc);
                    else {
                      setSortField('name');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-charcoal"
                >
                  <div className="flex items-center gap-1">
                    Filename
                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'category') setSortAsc(!sortAsc);
                    else {
                      setSortField('category');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-charcoal"
                >
                  <div className="flex items-center gap-1">
                    Category
                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'size') setSortAsc(!sortAsc);
                    else {
                      setSortField('size');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-charcoal text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Size
                    <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Suggested Group</th>
                <th className="py-3 px-4">Analysis Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E7EF]">
              {sortedFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-charcoal-subtle text-sm">
                    No files match the selected search and filter criteria.
                  </td>
                </tr>
              ) : (
                sortedFiles.map((file) => {
                  const dupGroup = analysis.duplicateGroups.find((g) =>
                    g.primaryFileId === file.id || g.duplicateFiles.some((d) => d.fileId === file.id)
                  );
                  const isPrimary = dupGroup?.primaryFileId === file.id;
                  const isDupCopy = dupGroup && !isPrimary;
                  const isInspected = selectedFileForInspection?.id === file.id;

                  return (
                    <tr
                      key={file.id}
                      onClick={() => setSelectedFileForInspection(file)}
                      className={`transition-colors cursor-pointer ${
                        isInspected
                          ? 'bg-brand-50/70 border-l-4 border-l-brand-600'
                          : 'hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-charcoal">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 shrink-0 ${isInspected ? 'text-brand-600' : 'text-zinc-400'}`} />
                          <span className="truncate max-w-xs">{file.originalName}</span>
                          {isDupCopy && (
                            <Badge variant="warning" size="sm">
                              Duplicate Copy
                            </Badge>
                          )}
                          {isPrimary && dupGroup && dupGroup.fileCount > 1 && (
                            <Badge variant="brand" size="sm">
                              Primary Copy
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getCategoryBadgeClass(
                            file.category
                          )}`}
                        >
                          {file.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-xs text-charcoal-subtle">
                        {formatBytes(file.size)}
                      </td>

                      <td className="py-3 px-4">
                        {file.suggestedGroup ? (
                          <Badge variant="brand" size="sm">
                            {file.suggestedGroup}
                          </Badge>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-charcoal-subtle max-w-sm truncate">
                        <span title={file.groupingReason || file.categoryReason}>
                          {file.groupingReason || file.categoryReason}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

