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

  const categories = Object.entries(analysis.categories).filter(([_, count]) => count > 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-charcoal">File Analysis Summary</h2>
          <p className="text-sm text-charcoal-subtle">
            Deterministic analysis of file extensions, checksums, and project conventions
          </p>
        </div>
        <button
          onClick={onProceedToStudio}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition-all active:scale-[0.98]"
        >
          Open Organization Studio →
        </button>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">{analysis.totalFiles}</div>
            <div className="text-xs text-charcoal-subtle">Total Imported Files</div>
          </div>
        </div>

        {/* Total Storage */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">{formatBytes(analysis.totalSizeBytes)}</div>
            <div className="text-xs text-charcoal-subtle">Total Session Storage</div>
          </div>
        </div>

        {/* Exact Duplicates */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">
              {analysis.duplicateGroups.length}
            </div>
            <div className="text-xs text-charcoal-subtle">
              Exact Duplicate Groups {redundantBytes > 0 && `(${formatBytes(redundantBytes)} redundant)`}
            </div>
          </div>
        </div>

        {/* Project Groups */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">
              {analysis.suggestedProjectGroups.length}
            </div>
            <div className="text-xs text-charcoal-subtle">Suggested Project Groups</div>
          </div>
        </div>
      </div>

      {/* Category Distribution Pills */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-card space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal-subtle">
          Detected File Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectedCategory === 'all'
                ? 'bg-zinc-800 text-white border-zinc-800'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>
      </div>

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
            <tbody className="divide-y divide-zinc-100">
              {sortedFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 text-sm">
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

                  return (
                    <tr key={file.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-charcoal">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
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
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium border capitalize ${getCategoryBadgeClass(
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

