import {
  DuplicateGroup,
  FileCategory,
  SafeFileMetadata,
  SessionAnalysisSummary,
  UploadedFileRecord,
} from '../types';
import { detectProjectGroups } from './projectGroupingService';
import { sessionService } from './sessionService';

const ALL_CATEGORIES: FileCategory[] = [
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

/**
 * Strips internal storage paths and returns public-safe metadata
 */
export function toSafeFileMetadata(record: UploadedFileRecord): SafeFileMetadata {
  const { storagePath, ...safe } = record;
  return safe;
}

/**
 * Analyzes a session's uploaded files:
 * - Detects exact SHA-256 duplicate groups
 * - Identifies project groups based on filename keywords
 * - Aggregates category counts
 * - Returns structured summary
 */
export function analyzeSessionFiles(
  sessionId: string,
  rawFiles: UploadedFileRecord[]
): SessionAnalysisSummary {
  // 1. Detect project groups across all files in the session
  const candidateFiles = rawFiles.map((f) => ({ id: f.id, originalName: f.originalName }));
  const { projectGroups, fileGroupMap } = detectProjectGroups(candidateFiles);

  // 2. Detect duplicate groups by exact SHA-256 hash
  const hashToFileMap = new Map<string, UploadedFileRecord[]>();
  for (const file of rawFiles) {
    if (!hashToFileMap.has(file.sha256)) {
      hashToFileMap.set(file.sha256, []);
    }
    hashToFileMap.get(file.sha256)!.push(file);
  }

  const duplicateGroups: DuplicateGroup[] = [];
  const duplicateInfoMap = new Map<
    string,
    { isDuplicate: boolean; isPrimary: boolean; duplicateOf?: string; duplicateCount: number }
  >();

  for (const [sha256, filesWithHash] of hashToFileMap.entries()) {
    if (filesWithHash.length > 1) {
      // Primary is the first file uploaded
      const primary = filesWithHash[0];
      const duplicates = filesWithHash.slice(1);

      duplicateGroups.push({
        sha256,
        fileCount: filesWithHash.length,
        totalSizeBytes: filesWithHash.reduce((sum, f) => sum + f.size, 0),
        primaryFileId: primary.id,
        primaryFileName: primary.originalName,
        duplicateFiles: duplicates.map((d) => ({
          fileId: d.id,
          originalName: d.originalName,
          size: d.size,
        })),
      });

      duplicateInfoMap.set(primary.id, {
        isDuplicate: false,
        isPrimary: true,
        duplicateCount: filesWithHash.length,
      });

      for (const dup of duplicates) {
        duplicateInfoMap.set(dup.id, {
          isDuplicate: true,
          isPrimary: false,
          duplicateOf: primary.id,
          duplicateCount: filesWithHash.length,
        });
      }
    } else {
      duplicateInfoMap.set(filesWithHash[0].id, {
        isDuplicate: false,
        isPrimary: true,
        duplicateCount: 1,
      });
    }
  }

  // 3. Initialize category breakdown
  const categoryCounts: Record<FileCategory, number> = {
    documents: 0,
    spreadsheets: 0,
    presentations: 0,
    images: 0,
    videos: 0,
    audio: 0,
    archives: 0,
    'source code': 0,
    others: 0,
  };

  let totalSizeBytes = 0;

  // Retrieve semantic intelligence state if available
  const extractionsMap = sessionService.getSessionExtractions(sessionId);
  const safeExtractions = extractionsMap
    ? Array.from(extractionsMap.values()).map(({ extractedText, ...rest }) => rest)
    : [];
  const semanticClusters = sessionService.getSessionSemanticClusters(sessionId) || [];
  const versionFamilies = sessionService.getSessionVersionFamilies(sessionId) || [];

  const semanticClusterMap = new Map<string, (typeof semanticClusters)[0]>();
  for (const cluster of semanticClusters) {
    for (const fId of cluster.fileIds) {
      if (!semanticClusterMap.has(fId)) {
        semanticClusterMap.set(fId, cluster);
      }
    }
  }

  // 4. Update file records with project and semantic group info
  const enrichedFiles: SafeFileMetadata[] = rawFiles.map((file) => {
    totalSizeBytes += file.size;
    categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;

    const cluster = semanticClusterMap.get(file.id);
    const groupInfo = fileGroupMap.get(file.id);
    let suggestedGroup: string | null = null;
    let groupingReason: string | null = null;

    if (cluster) {
      suggestedGroup = cluster.topicSummary;
      groupingReason = `Content topic: ${cluster.topicSummary} (Evidence: ${cluster.contentEvidence.slice(0, 3).join(', ')})`;
    } else if (groupInfo) {
      suggestedGroup = groupInfo.groupName;
      groupingReason = groupInfo.reason;
    }

    return {
      ...toSafeFileMetadata(file),
      suggestedGroup,
      groupingReason,
    };
  });

  return {
    sessionId,
    totalFiles: rawFiles.length,
    totalSizeBytes,
    categories: categoryCounts,
    duplicateGroups,
    suggestedProjectGroups: projectGroups,
    files: enrichedFiles,
    contentExtractions: safeExtractions,
    semanticClusters,
    versionFamilies,
  };
}
