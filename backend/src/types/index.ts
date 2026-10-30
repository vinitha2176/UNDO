export type FileCategory =
  | 'documents'
  | 'spreadsheets'
  | 'presentations'
  | 'images'
  | 'videos'
  | 'audio'
  | 'archives'
  | 'source code'
  | 'others';

export interface UploadedFileRecord {
  id: string;
  sessionId: string;
  originalName: string;
  sanitizedName: string;
  extension: string;
  mimeType: string;
  size: number;
  sha256: string;
  category: FileCategory;
  categoryReason: string;
  suggestedGroup: string | null;
  groupingReason: string | null;
  originalRelativePath: string | null;
  storagePath: string; // Internal filesystem path, omitted from API responses
  uploadedAt: string;
}

export type SafeFileMetadata = Omit<UploadedFileRecord, 'storagePath'>;

export interface DuplicateGroup {
  sha256: string;
  fileCount: number;
  totalSizeBytes: number;
  primaryFileId: string;
  primaryFileName: string;
  duplicateFiles: Array<{
    fileId: string;
    originalName: string;
    size: number;
  }>;
}

export interface DuplicateGroupDetail extends DuplicateGroup {
  redundantSizeBytes: number;
  recommendedRetainFileId: string;
  status: 'all_retained' | 'one_retained' | 'custom';
  copies: Array<{
    fileId: string;
    originalName: string;
    size: number;
    isPrimary: boolean;
    isIncludedInExport: boolean;
  }>;
}

export interface ProjectGroupSuggestion {
  groupName: string;
  folderName: string;
  keyword: string;
  fileCount: number;
  fileIds: string[];
  fileNames: string[];
  reason: string;
}

export interface SessionAnalysisSummary {
  sessionId: string;
  totalFiles: number;
  totalSizeBytes: number;
  categories: Record<FileCategory, number>;
  duplicateGroups: DuplicateGroup[];
  suggestedProjectGroups: ProjectGroupSuggestion[];
  files: SafeFileMetadata[];
}

export interface OrganizationPlanItem {
  fileId: string;
  originalName: string;
  proposedFilename: string;
  proposedDestinationFolder: string;
  proposedPath: string;
  category: FileCategory;
  groupingReason: string;
  suggestedGroup?: string | null;
  duplicateStatus: {
    isDuplicate: boolean;
    isPrimary: boolean;
    duplicateOfFileId?: string;
    duplicateGroupId?: string;
    totalCopies: number;
  };
  isIncludedInExport: boolean;
  userModified?: boolean;
}

export interface OrganizationPlanSummary {
  sessionId: string;
  totalFiles: number;
  includedInExport: number;
  excludedDuplicates: number;
  targetFolders: string[];
  plan: OrganizationPlanItem[];
}

export type PlanChangeType =
  | 'FILE_RENAMED'
  | 'DESTINATION_CHANGED'
  | 'CATEGORY_CHANGED'
  | 'GROUP_CHANGED'
  | 'FILE_EXCLUDED'
  | 'FILE_INCLUDED'
  | 'DUPLICATE_SELECTION_CHANGED'
  | 'PLAN_RESET';

export interface PlanChangeRecord {
  id: string;
  sessionId: string;
  fileId: string;
  changeType: PlanChangeType;
  previousValue: any;
  newValue: any;
  timestamp: string;
}

export interface VirtualTreeNode {
  name: string;
  type: 'file' | 'folder';
  relativePath: string;
  children?: VirtualTreeNode[];
  fileId?: string;
  fileCount?: number;
  aggregateSize: number;
}

export interface VirtualTreeSummary {
  totalImportedFiles: number;
  includedFiles: number;
  excludedFiles: number;
  duplicateGroups: number;
  estimatedOutputSize: number;
  folderCount: number;
  renamedCount: number;
  reassignedCount: number;
  unresolvedConflicts: number;
}

export interface VirtualTreeResponse {
  sessionId: string;
  summary: VirtualTreeSummary;
  tree: VirtualTreeNode;
}

export interface ExportRecord {
  exportId: string;
  sessionId: string;
  filename: string;
  filePath: string;
  sizeBytes: number;
  fileCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface UndoManifestFileEntry {
  fileId: string;
  originalFilename: string;
  originalRelativePath: string | null;
  exportedPath: string | null;
  originalSha256: string;
  fileSizeBytes: number;
  renamed: boolean;
  reassigned: boolean;
  isDuplicate: boolean;
  duplicateOfFileId: string | null;
  excluded: boolean;
  exclusionReason: string | null;
  category: FileCategory;
  group: string | null;
}

export interface UndoManifest {
  application: string;
  manifestVersion: string;
  exportTimestamp: string;
  sessionReference: string;
  totalImportedFiles: number;
  totalExportedFiles: number;
  totalExcludedFiles: number;
  files: UndoManifestFileEntry[];
}

export interface SessionRecord {
  id: string;
  createdAt: string;
  expiresAt: string;
  totalFiles: number;
  totalSizeBytes: number;
  files: Map<string, UploadedFileRecord>;
  activePlan?: Map<string, OrganizationPlanItem>;
  initialPlan?: Map<string, OrganizationPlanItem>;
  history?: PlanChangeRecord[];
  exports?: Map<string, ExportRecord>;
}
