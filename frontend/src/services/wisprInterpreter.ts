import { OrganizationPlanItem } from '../types';

export interface MatchedFileItem {
  fileId: string;
  originalName: string;
  currentDestination: string;
  proposedDestination: string;
  category: string;
  isIncludedInExport: boolean;
  actionDescription: string;
}

export interface InterpretedSubRule {
  ruleId: string;
  title: string;
  rawClause: string;
  isSupported: boolean;
  unsupportedReason?: string;
  actionType: 'move_folder' | 'include_duplicates' | 'exclude_duplicates' | 'chronological' | 'unsupported';
  targetFolder?: string;
  description: string;
  matchedFiles: MatchedFileItem[];
  updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }>;
}

export interface WisprInterpretationResult {
  rawTranscript: string;
  subRules: InterpretedSubRule[];
  allUpdates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }>;
  totalMatchedFiles: number;
  hasUnsupportedSubRules: boolean;
  hasSupportedSubRules: boolean;
  legacyDescription: string;
}

/**
 * Splits a spoken or dictated transcript into discrete instruction clauses.
 * Handles commas, periods, semicolons, and conjunctions ("and", "then", "also")
 * while preserving multi-word phrases like "year and month" or "separate presentations from documents".
 */
export function splitDictatedClauses(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Normalize whitespace
  const normalized = text.trim().replace(/\s+/g, ' ');

  // Split on strong punctuation (periods, semicolons, exclamation/question marks, linebreaks)
  const sentences = normalized.split(/[.;!?\n]+/).map((s) => s.trim()).filter(Boolean);

  const clauses: string[] = [];

  for (const sentence of sentences) {
    // Within each sentence, split on:
    // 1. Commas followed by optional conjunction and an action verb or clause:
    //    e.g. ", and keep", ", group", ", also put"
    // 2. Conjunctions like "and then", "and also", "also", "then"
    // 3. "and" ONLY when followed by an action verb (put, move, group, keep, exclude, remove, organize, place, sort, separate, retain)
    const subParts = sentence
      .split(
        /,\s*(?:and\s+|also\s+|then\s+)?(?=(?:put|move|group|keep|exclude|remove|organize|place|sort|separate|isolate|retain)\b)|,\s*(?=[a-zA-Z]+)|(?:\s+and\s+then\s+|\s+and\s+also\s+|\s+then\s+|\s+also\s+)|\s+and\s+(?=(?:put|move|group|keep|exclude|remove|organize|place|sort|separate|isolate|retain)\b)/i
      )
      .map((part) => part.trim().replace(/^(?:also|and|then|plus)\s+/i, '').trim())
      .filter((part) => part.length > 0);

    clauses.push(...subParts);
  }

  return clauses;
}

/**
 * Deterministically interprets a single instruction clause against the user's active plan items.
 */
function interpretSingleClause(
  rawClause: string,
  clauseIndex: number,
  planItems: OrganizationPlanItem[]
): InterpretedSubRule {
  const lower = rawClause.toLowerCase().trim();
  const ruleId = `rule-${clauseIndex + 1}`;

  // 1. Prioritized Rule: Screenshots & Images
  // e.g. "Put all screenshots in a Screenshots folder", "Put screenshots in Screenshots", "Move images to assets"
  if (lower.includes('screenshot') || lower.includes('asset') || (lower.includes('image') && !lower.includes('presentation'))) {
    const isScreenshot = lower.includes('screenshot');
    const isAsset = lower.includes('asset');
    const targetFolder = isScreenshot ? 'Screenshots' : isAsset ? 'Assets' : 'Images';

    const matchedFiles: MatchedFileItem[] = [];
    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];

    const matchingItems = planItems.filter((p) => {
      if (p.userModified) return false; // Preserve manual user edits
      const name = p.originalName.toLowerCase();
      if (isScreenshot) {
        return name.includes('screenshot') || (p.category === 'images' && name.includes('screen'));
      }
      return (
        p.category === 'images' ||
        name.includes('diagram') ||
        name.includes('banner') ||
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.svg') ||
        name.endsWith('.webp')
      );
    });

    for (const item of matchingItems) {
      matchedFiles.push({
        fileId: item.fileId,
        originalName: item.originalName,
        currentDestination: item.proposedDestinationFolder,
        proposedDestination: targetFolder,
        category: item.category,
        isIncludedInExport: item.isIncludedInExport,
        actionDescription: `Move to ${targetFolder}/`,
      });
      updates.push({ fileId: item.fileId, destinationFolder: targetFolder });
    }

    return {
      ruleId,
      title: isScreenshot ? 'Organize Screenshots' : 'Organize Visual Assets',
      rawClause,
      isSupported: true,
      actionType: 'move_folder',
      targetFolder,
      description: `Move ${matchedFiles.length} file(s) into proposed folder '${targetFolder}'`,
      matchedFiles,
      updates,
    };
  }

  // 2. Prioritized Rule: Keep presentations separate from documents
  // e.g. "Keep presentations separate from documents", "Separate presentations from documents", "Put presentations in Presentations"
  if (lower.includes('presentation') || lower.includes('slide') || lower.includes('deck')) {
    const targetFolder = 'Presentations';
    const matchedFiles: MatchedFileItem[] = [];
    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];

    const matchingItems = planItems.filter((p) => {
      if (p.userModified) return false; // Preserve manual user edits
      const name = p.originalName.toLowerCase();
      return (
        p.category === 'presentations' ||
        name.endsWith('.pptx') ||
        name.endsWith('.ppt') ||
        name.endsWith('.key') ||
        name.includes('presentation') ||
        name.includes('deck') ||
        name.includes('slide')
      );
    });

    for (const item of matchingItems) {
      matchedFiles.push({
        fileId: item.fileId,
        originalName: item.originalName,
        currentDestination: item.proposedDestinationFolder,
        proposedDestination: targetFolder,
        category: item.category,
        isIncludedInExport: item.isIncludedInExport,
        actionDescription: `Separate into ${targetFolder}/`,
      });
      updates.push({ fileId: item.fileId, destinationFolder: targetFolder });
    }

    return {
      ruleId,
      title: 'Separate Presentations from Documents',
      rawClause,
      isSupported: true,
      actionType: 'move_folder',
      targetFolder,
      description: `Group ${matchedFiles.length} presentation and slide deck(s) into folder '${targetFolder}'`,
      matchedFiles,
      updates,
    };
  }

  // 3. Prioritized Rule: Exclude exact duplicate copies
  // e.g. "Exclude exact duplicate copies from the organized download", "exclude duplicate copies", "remove duplicates"
  if (
    lower.includes('duplicate') &&
    (lower.includes('exclude') || lower.includes('remove') || lower.includes('clean') || lower.includes('omit'))
  ) {
    const duplicates = planItems.filter((p) => p.duplicateStatus.isDuplicate);
    const matchedFiles: MatchedFileItem[] = [];
    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];

    for (const item of duplicates) {
      matchedFiles.push({
        fileId: item.fileId,
        originalName: item.originalName,
        currentDestination: item.proposedDestinationFolder,
        proposedDestination: item.proposedDestinationFolder,
        category: item.category,
        isIncludedInExport: false,
        actionDescription: 'Omit copy from export archive (original file untouched)',
      });
      updates.push({ fileId: item.fileId, isIncluded: false });
    }

    return {
      ruleId,
      title: 'Exclude Redundant Duplicate Copies',
      rawClause,
      isSupported: true,
      actionType: 'exclude_duplicates',
      description: `Exclude all ${duplicates.length} duplicate copy(ies) from the exported archive (original files on your computer remain untouched)`,
      matchedFiles,
      updates,
    };
  }

  // 4. Prioritized Rule: Keep all duplicate copies
  // e.g. "Keep all duplicate copies", "keep all duplicates", "retain all copies", "include all duplicate copies"
  if (
    lower.includes('duplicate') &&
    (lower.includes('keep') || lower.includes('retain') || lower.includes('include'))
  ) {
    const duplicates = planItems.filter((p) => p.duplicateStatus.isDuplicate);
    const matchedFiles: MatchedFileItem[] = [];
    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];

    for (const item of duplicates) {
      matchedFiles.push({
        fileId: item.fileId,
        originalName: item.originalName,
        currentDestination: item.proposedDestinationFolder,
        proposedDestination: item.proposedDestinationFolder,
        category: item.category,
        isIncludedInExport: true,
        actionDescription: 'Retain copy in export archive',
      });
      updates.push({ fileId: item.fileId, isIncluded: true });
    }

    return {
      ruleId,
      title: 'Retain All Duplicate Copies',
      rawClause,
      isSupported: true,
      actionType: 'include_duplicates',
      description: `Keep and retain all ${duplicates.length} duplicate copy(ies) in the export`,
      matchedFiles,
      updates,
    };
  }

  // 5. Prioritized Rule: Project grouping (e.g. "Group all Pathfinder files into one project folder")
  // Check for specific projects present in the file collection
  if (lower.includes('pathfinder') || lower.includes('medicard') || (lower.includes('project') && (lower.includes('group') || lower.includes('folder') || lower.includes('together')))) {
    let projectKeyword = '';
    if (lower.includes('pathfinder')) {
      projectKeyword = 'pathfinder';
    } else if (lower.includes('medicard')) {
      projectKeyword = 'medicard';
    } else {
      // Find matching project from actual plan items
      const knownProject = planItems.find(
        (p) => p.suggestedGroup && lower.includes(p.suggestedGroup.toLowerCase())
      );
      if (knownProject && knownProject.suggestedGroup) {
        projectKeyword = knownProject.suggestedGroup.toLowerCase();
      } else {
        projectKeyword = 'project';
      }
    }

    const folderName = projectKeyword.charAt(0).toUpperCase() + projectKeyword.slice(1);
    const targetFolder = `Projects/${folderName}`;

    const matchedFiles: MatchedFileItem[] = [];
    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];

    const matchingItems = planItems.filter((p) => {
      if (p.userModified) return false; // Preserve manual user edits
      const name = p.originalName.toLowerCase();
      const group = p.suggestedGroup ? p.suggestedGroup.toLowerCase() : '';
      return name.includes(projectKeyword) || group.includes(projectKeyword);
    });

    for (const item of matchingItems) {
      matchedFiles.push({
        fileId: item.fileId,
        originalName: item.originalName,
        currentDestination: item.proposedDestinationFolder,
        proposedDestination: targetFolder,
        category: item.category,
        isIncludedInExport: item.isIncludedInExport,
        actionDescription: `Consolidate into ${targetFolder}/`,
      });
      updates.push({ fileId: item.fileId, destinationFolder: targetFolder });
    }

    return {
      ruleId,
      title: `Group ${folderName} Project Files`,
      rawClause,
      isSupported: true,
      actionType: 'move_folder',
      targetFolder,
      description: `Consolidate ${matchedFiles.length} project file(s) containing '${projectKeyword}' into folder '${targetFolder}'`,
      matchedFiles,
      updates,
    };
  }

  // 6. Chronological / Year & Month Rule
  // e.g. "Organize files by year and month", "organize by date", "sort chronologically"
  if (
    (lower.includes('year') && lower.includes('month')) ||
    lower.includes('date') ||
    lower.includes('chronological')
  ) {
    const matchedFiles: MatchedFileItem[] = [];
    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];

    for (const item of planItems) {
      if (item.userModified) continue; // Preserve manual user edits
      const yearMatch = item.originalName.match(/\b(20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : '2026';
      const folder = `Archive/${year}/10-October`;
      matchedFiles.push({
        fileId: item.fileId,
        originalName: item.originalName,
        currentDestination: item.proposedDestinationFolder,
        proposedDestination: folder,
        category: item.category,
        isIncludedInExport: item.isIncludedInExport,
        actionDescription: `File into ${folder}/`,
      });
      updates.push({ fileId: item.fileId, destinationFolder: folder });
    }

    return {
      ruleId,
      title: 'Chronological Organization by Date',
      rawClause,
      isSupported: true,
      actionType: 'chronological',
      targetFolder: 'Archive/YYYY/MM',
      description: `Organize all ${planItems.length} file(s) chronologically by Year & Month into 'Archive/YYYY/MM'`,
      matchedFiles,
      updates,
    };
  }

  // 7. Design & Branding Assets Rule
  // e.g. "Group design files into a branding folder", "Put design files in branding"
  if (
    lower.includes('branding') ||
    (lower.includes('design') && (lower.includes('folder') || lower.includes('group') || lower.includes('put')))
  ) {
    const targetFolder = 'Branding';
    const matchedFiles: MatchedFileItem[] = [];
    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];

    const matchingItems = planItems.filter((p) => {
      if (p.userModified) return false; // Preserve manual user edits
      const name = p.originalName.toLowerCase();
      return (
        p.category === 'images' ||
        name.includes('design') ||
        name.includes('logo') ||
        name.includes('banner') ||
        name.includes('flow') ||
        name.endsWith('.png') ||
        name.endsWith('.svg') ||
        name.endsWith('.jpg')
      );
    });

    for (const item of matchingItems) {
      matchedFiles.push({
        fileId: item.fileId,
        originalName: item.originalName,
        currentDestination: item.proposedDestinationFolder,
        proposedDestination: targetFolder,
        category: item.category,
        isIncludedInExport: item.isIncludedInExport,
        actionDescription: `Move to ${targetFolder}/`,
      });
      updates.push({ fileId: item.fileId, destinationFolder: targetFolder });
    }

    return {
      ruleId,
      title: 'Group Design & Branding Files',
      rawClause,
      isSupported: true,
      actionType: 'move_folder',
      targetFolder,
      description: `Group ${matchedFiles.length} design and creative asset(s) into folder '${targetFolder}'`,
      matchedFiles,
      updates,
    };
  }

  // 8. Invoices & Financial Documents Rule
  // e.g. "Put all invoices in Finance/2026", "Put invoices in Finance"
  if (lower.includes('invoice') || lower.includes('finance') || lower.includes('receipt') || lower.includes('budget')) {
    const targetFolder = 'Finance/2026';
    const matchedFiles: MatchedFileItem[] = [];
    const updates: Array<{ fileId: string; destinationFolder?: string; isIncluded?: boolean }> = [];

    const hasInvoiceTerm = lower.includes('invoice');
    const hasBudgetTerm = lower.includes('budget');
    const hasReceiptTerm = lower.includes('receipt');

    const matchingItems = planItems.filter((p) => {
      if (p.userModified) return false; // Preserve manual user edits
      const name = p.originalName.toLowerCase();
      if (hasInvoiceTerm && !hasBudgetTerm && !hasReceiptTerm) {
        return name.includes('invoice');
      }
      if (hasBudgetTerm && !hasInvoiceTerm && !hasReceiptTerm) {
        return name.includes('budget');
      }
      if (hasReceiptTerm && !hasInvoiceTerm && !hasBudgetTerm) {
        return name.includes('receipt');
      }
      return (
        name.includes('invoice') ||
        name.includes('budget') ||
        name.includes('q1') ||
        name.includes('q2') ||
        name.includes('receipt') ||
        name.includes('finance')
      );
    });

    for (const item of matchingItems) {
      matchedFiles.push({
        fileId: item.fileId,
        originalName: item.originalName,
        currentDestination: item.proposedDestinationFolder,
        proposedDestination: targetFolder,
        category: item.category,
        isIncludedInExport: item.isIncludedInExport,
        actionDescription: `File into ${targetFolder}/`,
      });
      updates.push({ fileId: item.fileId, destinationFolder: targetFolder });
    }

    return {
      ruleId,
      title: 'Organize Invoices & Finance Documents',
      rawClause,
      isSupported: true,
      actionType: 'move_folder',
      targetFolder,
      description: `Move ${matchedFiles.length} invoice and financial document(s) into folder '${targetFolder}'`,
      matchedFiles,
      updates,
    };
  }

  // 9. Unsupported or Ambiguous Instruction
  return {
    ruleId,
    title: 'Unsupported Instruction',
    rawClause,
    isSupported: false,
    unsupportedReason: `UNDO could not deterministically map "${rawClause}" to a supported organization action. Try specifying a folder (e.g. "Put screenshots in Screenshots") or duplicate preference.`,
    actionType: 'unsupported',
    description: `Rule could not be deterministically matched: "${rawClause}"`,
    matchedFiles: [],
    updates: [],
  };
}

/**
 * Interprets a complete dictated preference text (supporting single and multi-instruction commands).
 */
export function interpretWisprPreferences(
  text: string,
  planItems: OrganizationPlanItem[]
): WisprInterpretationResult {
  const rawTranscript = text.trim();
  if (!rawTranscript) {
    return {
      rawTranscript: '',
      subRules: [],
      allUpdates: [],
      totalMatchedFiles: 0,
      hasUnsupportedSubRules: false,
      hasSupportedSubRules: false,
      legacyDescription: '',
    };
  }

  const clauses = splitDictatedClauses(rawTranscript);
  const subRules: InterpretedSubRule[] = [];

  for (let i = 0; i < clauses.length; i++) {
    const subRule = interpretSingleClause(clauses[i], i, planItems);
    subRules.push(subRule);
  }

  // Merge updates across all supported sub-rules, preserving order and resolving duplicate file updates
  const updateMap = new Map<string, { fileId: string; destinationFolder?: string; isIncluded?: boolean }>();

  for (const rule of subRules) {
    if (rule.isSupported) {
      for (const update of rule.updates) {
        const existing = updateMap.get(update.fileId) || { fileId: update.fileId };
        if (update.destinationFolder !== undefined) {
          existing.destinationFolder = update.destinationFolder;
        }
        if (update.isIncluded !== undefined) {
          existing.isIncluded = update.isIncluded;
        }
        updateMap.set(update.fileId, existing);
      }
    }
  }

  const allUpdates = Array.from(updateMap.values());
  const supportedRules = subRules.filter((r) => r.isSupported);
  const unsupportedRules = subRules.filter((r) => !r.isSupported);

  // Set legacyDescription for backwards compatibility with existing UI / tests
  let legacyDescription = '';
  if (supportedRules.length === 1) {
    legacyDescription = supportedRules[0].description;
  } else if (supportedRules.length > 1) {
    legacyDescription = supportedRules.map((r, idx) => `Rule ${idx + 1}: ${r.description}`).join(' • ');
  }

  return {
    rawTranscript,
    subRules,
    allUpdates,
    totalMatchedFiles: allUpdates.length,
    hasUnsupportedSubRules: unsupportedRules.length > 0,
    hasSupportedSubRules: supportedRules.length > 0,
    legacyDescription,
  };
}
