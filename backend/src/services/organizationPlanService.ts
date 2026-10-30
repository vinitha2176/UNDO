import path from 'path';
import {
  DuplicateGroupDetail,
  FileCategory,
  OrganizationPlanItem,
  OrganizationPlanSummary,
  UploadedFileRecord,
  VirtualTreeNode,
  VirtualTreeResponse,
  VirtualTreeSummary,
} from '../types';
import { detectProjectGroups } from './projectGroupingService';
import { sessionService } from './sessionService';
import {
  extractExtension,
  validateDestinationFolder,
  validateProposedFilename,
} from '../utils/sanitizer';
import { AppError } from '../middleware/errorHandler';

export function formatCategoryFolder(category: FileCategory): string {
  switch (category) {
    case 'documents':
      return 'Documents';
    case 'spreadsheets':
      return 'Spreadsheets';
    case 'presentations':
      return 'Presentations';
    case 'images':
      return 'Images';
    case 'videos':
      return 'Videos';
    case 'audio':
      return 'Audio';
    case 'archives':
      return 'Archives';
    case 'source code':
      return 'Source Code';
    case 'others':
    default:
      return 'Others';
  }
}

/**
 * Resolves destination collisions by generating unique, predictable filenames:
 * e.g., 'report.pdf' -> 'report (1).pdf', 'report (2).pdf'
 */
export function resolvePathCollision(
  targetFolder: string,
  baseFilename: string,
  usedPaths: Set<string>
): { filename: string; fullPath: string } {
  let candidateName = baseFilename;
  let fullPath = targetFolder ? `${targetFolder}/${candidateName}` : candidateName;

  if (!usedPaths.has(fullPath.toLowerCase())) {
    usedPaths.add(fullPath.toLowerCase());
    return { filename: candidateName, fullPath };
  }

  const ext = path.extname(baseFilename);
  const nameWithoutExt = ext ? baseFilename.slice(0, -ext.length) : baseFilename;

  let counter = 1;
  while (true) {
    candidateName = `${nameWithoutExt} (${counter})${ext}`;
    fullPath = targetFolder ? `${targetFolder}/${candidateName}` : candidateName;
    if (!usedPaths.has(fullPath.toLowerCase())) {
      usedPaths.add(fullPath.toLowerCase());
      return { filename: candidateName, fullPath };
    }
    counter += 1;
  }
}

/**
 * Generates an initial proposed organization plan for a session
 */
export function generateInitialPlan(
  sessionId: string,
  rawFiles: UploadedFileRecord[]
): Map<string, OrganizationPlanItem> {
  const candidateFiles = rawFiles.map((f) => ({ id: f.id, originalName: f.originalName }));
  const { fileGroupMap } = detectProjectGroups(candidateFiles);

  // Group by SHA-256
  const hashToFileMap = new Map<string, UploadedFileRecord[]>();
  for (const file of rawFiles) {
    if (!hashToFileMap.has(file.sha256)) {
      hashToFileMap.set(file.sha256, []);
    }
    hashToFileMap.get(file.sha256)!.push(file);
  }

  const usedPaths = new Set<string>();
  const planMap = new Map<string, OrganizationPlanItem>();

  for (const file of rawFiles) {
    const filesWithSameHash = hashToFileMap.get(file.sha256)!;
    const isMultiCopy = filesWithSameHash.length > 1;
    const primaryFile = filesWithSameHash[0];
    const isPrimary = primaryFile.id === file.id;
    const isDuplicate = isMultiCopy && !isPrimary;

    // Determine target folder
    const projectInfo = fileGroupMap.get(file.id);
    let targetFolder: string;
    let groupingReason: string;
    let suggestedGroup: string | null = null;

    if (projectInfo) {
      targetFolder = `Projects/${projectInfo.groupName}`;
      groupingReason = projectInfo.reason;
      suggestedGroup = projectInfo.groupName;
    } else {
      targetFolder = formatCategoryFolder(file.category);
      groupingReason = `Assigned to '${targetFolder}' based on ${file.categoryReason}`;
    }

    // Predictable path collision resolution
    const { filename: proposedFilename, fullPath: proposedPath } = resolvePathCollision(
      targetFolder,
      file.sanitizedName,
      usedPaths
    );

    // Exact duplicate policy:
    // All uploaded files must be included in the initial export plan by default, including exact duplicates.
    // Duplicates may be excluded only after the user explicitly chooses to exclude them.
    const isIncludedInExport = true;
    if (isDuplicate) {
      groupingReason = `Exact duplicate of '${primaryFile.originalName}' (SHA-256 match); retained by default`;
    }

    const item: OrganizationPlanItem = {
      fileId: file.id,
      originalName: file.originalName,
      proposedFilename,
      proposedDestinationFolder: targetFolder,
      proposedPath,
      category: file.category,
      suggestedGroup,
      groupingReason,
      duplicateStatus: {
        isDuplicate,
        isPrimary,
        duplicateOfFileId: isDuplicate ? primaryFile.id : undefined,
        duplicateGroupId: isMultiCopy ? file.sha256 : undefined,
        totalCopies: filesWithSameHash.length,
      },
      isIncludedInExport,
      userModified: false,
    };

    planMap.set(file.id, item);
  }

  return planMap;
}

/**
 * Returns the active organization plan summary for a session
 */
export function getSessionPlanSummary(sessionId: string): OrganizationPlanSummary {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
  }

  const rawFiles = sessionService.getSessionFiles(sessionId);
  let activePlan = sessionService.getActivePlan(sessionId);

  if (!activePlan || activePlan.size === 0) {
    activePlan = generateInitialPlan(sessionId, rawFiles);
    sessionService.setActivePlan(sessionId, activePlan, true);
  } else {
    // Synchronize any newly uploaded files into the active plan
    const missingFiles = rawFiles.filter((f) => !activePlan!.has(f.id));
    if (missingFiles.length > 0) {
      const fullInitial = generateInitialPlan(sessionId, rawFiles);
      for (const [id, item] of fullInitial.entries()) {
        if (!activePlan.has(id)) {
          activePlan.set(id, item);
        }
      }
    }
  }

  const planItems = Array.from(activePlan.values());
  const targetFolderSet = new Set<string>();
  let includedCount = 0;
  let excludedDuplicatesCount = 0;

  for (const item of planItems) {
    if (item.proposedDestinationFolder) {
      targetFolderSet.add(item.proposedDestinationFolder);
    }
    if (item.isIncludedInExport) {
      includedCount += 1;
    } else {
      excludedDuplicatesCount += 1;
    }
  }

  return {
    sessionId,
    totalFiles: planItems.length,
    includedInExport: includedCount,
    excludedDuplicates: excludedDuplicatesCount,
    targetFolders: Array.from(targetFolderSet).sort(),
    plan: planItems,
  };
}

/**
 * Updates a single file entry in the session plan
 */
export interface UpdatePlanItemInput {
  proposedFilename?: string;
  proposedDestinationFolder?: string;
  category?: FileCategory;
  suggestedGroup?: string | null;
  isIncludedInExport?: boolean;
  allowExtensionChange?: boolean;
}

export function updatePlanFileItem(
  sessionId: string,
  fileId: string,
  updates: UpdatePlanItemInput
): OrganizationPlanItem {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
  }

  // Ensure active plan is loaded
  let activePlan = sessionService.getActivePlan(sessionId);
  if (!activePlan || activePlan.size === 0) {
    const rawFiles = sessionService.getSessionFiles(sessionId);
    activePlan = generateInitialPlan(sessionId, rawFiles);
    sessionService.setActivePlan(sessionId, activePlan, true);
  }

  const existingItem = activePlan.get(fileId);
  if (!existingItem) {
    throw new AppError(`File '${fileId}' not found in active session plan`, 404, 'FILE_NOT_FOUND');
  }

  const planItem: OrganizationPlanItem = {
    ...existingItem,
    duplicateStatus: { ...existingItem.duplicateStatus },
  };

  const fileRecord = sessionService.getSessionFile(sessionId, fileId);
  const originalFilename = fileRecord ? fileRecord.originalName : planItem.originalName;

  // 1. Validate proposed filename if changed
  let newFilename = planItem.proposedFilename;
  if (updates.proposedFilename !== undefined) {
    const valResult = validateProposedFilename(
      updates.proposedFilename,
      originalFilename,
      updates.allowExtensionChange
    );
    if (!valResult.valid) {
      throw new AppError(valResult.error || 'Invalid filename', 400, 'INVALID_FILENAME');
    }
    if (valResult.cleanName !== planItem.proposedFilename) {
      sessionService.recordPlanChange(
        sessionId,
        fileId,
        'FILE_RENAMED',
        planItem.proposedFilename,
        valResult.cleanName
      );
      newFilename = valResult.cleanName;
      planItem.userModified = true;
    }
  }

  // 2. Validate proposed destination folder if changed
  let newFolder = planItem.proposedDestinationFolder;
  if (updates.proposedDestinationFolder !== undefined) {
    const folderValResult = validateDestinationFolder(updates.proposedDestinationFolder);
    if (!folderValResult.valid) {
      throw new AppError(folderValResult.error || 'Invalid destination folder', 400, 'INVALID_DESTINATION_FOLDER');
    }
    if (folderValResult.cleanFolder !== planItem.proposedDestinationFolder) {
      sessionService.recordPlanChange(
        sessionId,
        fileId,
        'DESTINATION_CHANGED',
        planItem.proposedDestinationFolder,
        folderValResult.cleanFolder
      );
      newFolder = folderValResult.cleanFolder;
      planItem.userModified = true;
    }
  }

  // 3. Category change
  if (updates.category !== undefined && updates.category !== planItem.category) {
    sessionService.recordPlanChange(
      sessionId,
      fileId,
      'CATEGORY_CHANGED',
      planItem.category,
      updates.category
    );
    planItem.category = updates.category;
    planItem.userModified = true;
  }

  // 4. Project group change
  if (updates.suggestedGroup !== undefined && updates.suggestedGroup !== planItem.suggestedGroup) {
    sessionService.recordPlanChange(
      sessionId,
      fileId,
      'GROUP_CHANGED',
      planItem.suggestedGroup,
      updates.suggestedGroup
    );
    planItem.suggestedGroup = updates.suggestedGroup;
    planItem.userModified = true;
  }

  // 5. Inclusion change
  if (
    updates.isIncludedInExport !== undefined &&
    updates.isIncludedInExport !== planItem.isIncludedInExport
  ) {
    const changeType = updates.isIncludedInExport ? 'FILE_INCLUDED' : 'FILE_EXCLUDED';
    sessionService.recordPlanChange(
      sessionId,
      fileId,
      changeType,
      planItem.isIncludedInExport,
      updates.isIncludedInExport
    );
    planItem.isIncludedInExport = updates.isIncludedInExport;
    planItem.userModified = true;
  }

  // 6. Recalculate collision-free proposed path
  const otherUsedPaths = new Set<string>();
  for (const [id, item] of activePlan.entries()) {
    if (id !== fileId) {
      otherUsedPaths.add(item.proposedPath.toLowerCase());
    }
  }

  const { filename: resolvedFilename, fullPath: resolvedPath } = resolvePathCollision(
    newFolder,
    newFilename,
    otherUsedPaths
  );

  planItem.proposedFilename = resolvedFilename;
  planItem.proposedDestinationFolder = newFolder;
  planItem.proposedPath = resolvedPath;

  activePlan.set(fileId, planItem);
  return planItem;
}

/**
 * Resets the organization plan to its initial generated state
 */
export function resetSessionPlan(sessionId: string): OrganizationPlanSummary {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
  }

  const rawFiles = sessionService.getSessionFiles(sessionId);
  let initialPlan = sessionService.getInitialPlan(sessionId);

  if (!initialPlan || initialPlan.size === 0) {
    initialPlan = generateInitialPlan(sessionId, rawFiles);
  }

  // Deep clone initial plan into active plan
  const freshPlan = new Map<string, OrganizationPlanItem>();
  for (const [id, item] of initialPlan.entries()) {
    freshPlan.set(id, {
      ...item,
      duplicateStatus: { ...item.duplicateStatus },
      userModified: false,
    });
  }

  sessionService.setActivePlan(sessionId, freshPlan, false);
  sessionService.recordPlanChange(sessionId, 'ALL', 'PLAN_RESET', 'user_modified', 'initial_plan');

  return getSessionPlanSummary(sessionId);
}

/**
 * Returns duplicate groups and their retention status
 */
export function getDuplicateGroupsDetails(sessionId: string): DuplicateGroupDetail[] {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
  }

  const rawFiles = sessionService.getSessionFiles(sessionId);
  // Ensure active plan is loaded
  let activePlan = sessionService.getActivePlan(sessionId);
  if (!activePlan || activePlan.size === 0) {
    activePlan = generateInitialPlan(sessionId, rawFiles);
    sessionService.setActivePlan(sessionId, activePlan, true);
  }

  const hashToFileMap = new Map<string, UploadedFileRecord[]>();
  for (const file of rawFiles) {
    if (!hashToFileMap.has(file.sha256)) {
      hashToFileMap.set(file.sha256, []);
    }
    hashToFileMap.get(file.sha256)!.push(file);
  }

  const duplicateGroups: DuplicateGroupDetail[] = [];

  for (const [sha256, filesWithHash] of hashToFileMap.entries()) {
    if (filesWithHash.length > 1) {
      const primary = filesWithHash[0];
      const duplicates = filesWithHash.slice(1);
      const totalSizeBytes = filesWithHash.reduce((sum, f) => sum + f.size, 0);
      const redundantSizeBytes = (filesWithHash.length - 1) * primary.size;

      const copies = filesWithHash.map((f, idx) => {
        const planItem = activePlan!.get(f.id);
        const isIncludedInExport = planItem ? planItem.isIncludedInExport : true;
        return {
          fileId: f.id,
          originalName: f.originalName,
          size: f.size,
          isPrimary: idx === 0,
          isIncludedInExport,
        };
      });

      const includedCopiesCount = copies.filter((c) => c.isIncludedInExport).length;
      let status: 'all_retained' | 'one_retained' | 'custom' = 'custom';
      if (includedCopiesCount === copies.length) {
        status = 'all_retained';
      } else if (includedCopiesCount === 1) {
        status = 'one_retained';
      }

      duplicateGroups.push({
        sha256,
        fileCount: filesWithHash.length,
        totalSizeBytes,
        redundantSizeBytes,
        primaryFileId: primary.id,
        primaryFileName: primary.originalName,
        recommendedRetainFileId: primary.id,
        status,
        duplicateFiles: duplicates.map((d) => ({
          fileId: d.id,
          originalName: d.originalName,
          size: d.size,
        })),
        copies,
      });
    }
  }

  return duplicateGroups;
}

/**
 * Updates duplicate retention choices for a duplicate group
 */
export interface UpdateDuplicateGroupInput {
  action: 'keep_all' | 'retain_one' | 'exclude_selected' | 'include_selected';
  primaryFileId?: string;
  fileIds?: string[];
}

export function updateDuplicateGroupRetention(
  sessionId: string,
  groupId: string,
  input: UpdateDuplicateGroupInput
): DuplicateGroupDetail {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
  }

  const rawFiles = sessionService.getSessionFiles(sessionId);
  const matchingFiles = rawFiles.filter((f) => f.sha256 === groupId);
  if (matchingFiles.length <= 1) {
    throw new AppError(
      `Duplicate group with hash '${groupId}' not found or contains only 1 file`,
      404,
      'DUPLICATE_GROUP_NOT_FOUND'
    );
  }

  // Ensure active plan is loaded
  let activePlan = sessionService.getActivePlan(sessionId);
  if (!activePlan || activePlan.size === 0) {
    activePlan = generateInitialPlan(sessionId, rawFiles);
    sessionService.setActivePlan(sessionId, activePlan, true);
  }

  const previousState = matchingFiles.map((f) => ({
    fileId: f.id,
    isIncluded: activePlan!.get(f.id)?.isIncludedInExport,
  }));

  switch (input.action) {
    case 'keep_all':
      for (const file of matchingFiles) {
        const planItem = activePlan.get(file.id);
        if (planItem) {
          planItem.isIncludedInExport = true;
          planItem.groupingReason = `Retained duplicate copy (${file.originalName})`;
        }
      }
      break;

    case 'retain_one': {
      const targetRetainId = input.primaryFileId || matchingFiles[0].id;
      const existsInGroup = matchingFiles.some((f) => f.id === targetRetainId);
      if (!existsInGroup) {
        throw new AppError(
          `File '${targetRetainId}' does not belong to duplicate group '${groupId}'`,
          400,
          'INVALID_PRIMARY_FILE'
        );
      }

      for (const file of matchingFiles) {
        const planItem = activePlan.get(file.id);
        if (planItem) {
          if (file.id === targetRetainId) {
            planItem.isIncludedInExport = true;
          } else {
            planItem.isIncludedInExport = false;
            planItem.groupingReason = `Excluded duplicate copy (retained primary copy: '${targetRetainId}')`;
          }
        }
      }
      break;
    }

    case 'exclude_selected': {
      if (!input.fileIds || input.fileIds.length === 0) {
        throw new AppError("No fileIds provided for 'exclude_selected' action", 400, 'INVALID_FILE_IDS');
      }
      const matchingIdSet = new Set(matchingFiles.map((f) => f.id));
      for (const id of input.fileIds) {
        if (!matchingIdSet.has(id)) {
          throw new AppError(
            `File '${id}' does not belong to duplicate group '${groupId}'`,
            400,
            'INVALID_FILE_ID'
          );
        }
      }
      const toExclude = new Set(input.fileIds);
      for (const file of matchingFiles) {
        if (toExclude.has(file.id)) {
          const planItem = activePlan.get(file.id);
          if (planItem) {
            planItem.isIncludedInExport = false;
            planItem.groupingReason = `Excluded duplicate copy by user selection`;
          }
        }
      }
      break;
    }

    case 'include_selected': {
      if (!input.fileIds || input.fileIds.length === 0) {
        throw new AppError("No fileIds provided for 'include_selected' action", 400, 'INVALID_FILE_IDS');
      }
      const matchingIdSet = new Set(matchingFiles.map((f) => f.id));
      for (const id of input.fileIds) {
        if (!matchingIdSet.has(id)) {
          throw new AppError(
            `File '${id}' does not belong to duplicate group '${groupId}'`,
            400,
            'INVALID_FILE_ID'
          );
        }
      }
      const toInclude = new Set(input.fileIds);
      for (const file of matchingFiles) {
        if (toInclude.has(file.id)) {
          const planItem = activePlan.get(file.id);
          if (planItem) {
            planItem.isIncludedInExport = true;
          }
        }
      }
      break;
    }
  }

  const newState = matchingFiles.map((f) => ({
    fileId: f.id,
    isIncluded: activePlan.get(f.id)?.isIncludedInExport,
  }));

  sessionService.recordPlanChange(
    sessionId,
    groupId,
    'DUPLICATE_SELECTION_CHANGED',
    previousState,
    newState
  );

  const updatedGroups = getDuplicateGroupsDetails(sessionId);
  return updatedGroups.find((g) => g.sha256 === groupId)!;
}

/**
 * Builds the complete virtual folder tree for preview
 */
export function buildVirtualTree(sessionId: string): VirtualTreeResponse {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
  }

  const rawFiles = sessionService.getSessionFiles(sessionId);
  let activePlan = sessionService.getActivePlan(sessionId);
  if (!activePlan || activePlan.size === 0) {
    activePlan = generateInitialPlan(sessionId, rawFiles);
    sessionService.setActivePlan(sessionId, activePlan, true);
  }

  const initialPlan = sessionService.getInitialPlan(sessionId);
  const fileRecordMap = new Map(rawFiles.map((f) => [f.id, f]));

  // Root tree container
  const rootNode: VirtualTreeNode = {
    name: 'Organized Files',
    type: 'folder',
    relativePath: '',
    children: [],
    fileCount: 0,
    aggregateSize: 0,
  };

  // Intermediate node map for folder lookup
  const folderNodeMap = new Map<string, VirtualTreeNode>();
  folderNodeMap.set('', rootNode);

  function getOrCreateFolderNode(folderPath: string): VirtualTreeNode {
    if (!folderPath) return rootNode;
    if (folderNodeMap.has(folderPath)) return folderNodeMap.get(folderPath)!;

    const parentPath = path.posix.dirname(folderPath);
    const parentFolder = parentPath === '.' ? '' : parentPath;
    const parentNode = getOrCreateFolderNode(parentFolder);

    const folderName = path.posix.basename(folderPath);
    const newNode: VirtualTreeNode = {
      name: folderName,
      type: 'folder',
      relativePath: folderPath,
      children: [],
      fileCount: 0,
      aggregateSize: 0,
    };

    parentNode.children = parentNode.children || [];
    parentNode.children.push(newNode);
    folderNodeMap.set(folderPath, newNode);
    return newNode;
  }

  let includedCount = 0;
  let excludedCount = 0;
  let estimatedOutputSize = 0;
  let renamedCount = 0;
  let reassignedCount = 0;

  for (const item of activePlan.values()) {
    const rawRecord = fileRecordMap.get(item.fileId);
    const fileSize = rawRecord ? rawRecord.size : 0;

    // Check if renamed
    if (rawRecord && item.proposedFilename !== rawRecord.sanitizedName) {
      renamedCount += 1;
    }

    // Check if reassigned compared to initial plan
    if (initialPlan) {
      const initItem = initialPlan.get(item.fileId);
      if (initItem && initItem.proposedDestinationFolder !== item.proposedDestinationFolder) {
        reassignedCount += 1;
      }
    }

    if (item.isIncludedInExport) {
      includedCount += 1;
      estimatedOutputSize += fileSize;

      // Add to folder hierarchy
      const parentFolder = getOrCreateFolderNode(item.proposedDestinationFolder);
      const fileNode: VirtualTreeNode = {
        name: item.proposedFilename,
        type: 'file',
        relativePath: item.proposedPath,
        fileId: item.fileId,
        aggregateSize: fileSize,
      };

      parentFolder.children = parentFolder.children || [];
      parentFolder.children.push(fileNode);
    } else {
      excludedCount += 1;
    }
  }

  // Calculate file counts and aggregate sizes recursively
  function calculateAggregates(node: VirtualTreeNode): { count: number; size: number } {
    if (node.type === 'file') {
      return { count: 1, size: node.aggregateSize };
    }

    let totalCount = 0;
    let totalSize = 0;

    if (node.children) {
      // Sort children: folders first, then files alphabetically
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      for (const child of node.children) {
        const { count, size } = calculateAggregates(child);
        totalCount += count;
        totalSize += size;
      }
    }

    node.fileCount = totalCount;
    node.aggregateSize = totalSize;
    return { count: totalCount, size: totalSize };
  }

  calculateAggregates(rootNode);

  // Count folders (excluding root)
  let folderCount = 0;
  for (const [key] of folderNodeMap.entries()) {
    if (key !== '') folderCount += 1;
  }

  // Count duplicate groups
  const duplicateGroups = getDuplicateGroupsDetails(sessionId);

  const summary: VirtualTreeSummary = {
    totalImportedFiles: rawFiles.length,
    includedFiles: includedCount,
    excludedFiles: excludedCount,
    duplicateGroups: duplicateGroups.length,
    estimatedOutputSize,
    folderCount,
    renamedCount,
    reassignedCount,
    unresolvedConflicts: 0,
  };

  return {
    sessionId,
    summary,
    tree: rootNode,
  };
}

// Preserve backwards compatibility with Phase 1 generateOrganizationPlan (pure function)
export function generateOrganizationPlan(
  sessionId: string,
  rawFiles: UploadedFileRecord[]
): OrganizationPlanSummary {
  const planMap = generateInitialPlan(sessionId, rawFiles);
  const planItems = Array.from(planMap.values());
  const targetFolderSet = new Set<string>();
  let includedCount = 0;
  let excludedDuplicatesCount = 0;

  for (const item of planItems) {
    if (item.proposedDestinationFolder) {
      targetFolderSet.add(item.proposedDestinationFolder);
    }
    if (item.isIncludedInExport) {
      includedCount += 1;
    } else {
      excludedDuplicatesCount += 1;
    }
  }

  return {
    sessionId,
    totalFiles: planItems.length,
    includedInExport: includedCount,
    excludedDuplicates: excludedDuplicatesCount,
    targetFolders: Array.from(targetFolderSet).sort(),
    plan: planItems,
  };
}
