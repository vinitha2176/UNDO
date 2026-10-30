import { ProjectGroupSuggestion } from '../types';

interface CandidateFile {
  id: string;
  originalName: string;
}

/**
 * Generic terms, administrative document types, media descriptors, and workflow suffixes
 * that must NOT independently trigger project group identification.
 */
const GENERIC_TERMS = new Set([
  // Common document & file types
  'form', 'forms', 'document', 'documents', 'doc', 'docs', 'file', 'files',
  'page', 'pages', 'paper', 'papers', 'sheet', 'sheets', 'table', 'data',
  'item', 'items', 'entry', 'entries', 'record', 'records', 'text', 'txt',
  'list', 'lists', 'info', 'information',

  // Administrative, business & financial document types
  'report', 'reports', 'invoice', 'invoices', 'receipt', 'receipts', 'bill', 'bills',
  'statement', 'statements', 'budget', 'budgets', 'finance', 'financial',
  'memo', 'notes', 'note', 'meeting', 'agenda', 'minutes', 'checklist',
  'letter', 'contract', 'agreement', 'policy', 'guidelines', 'guide', 'manual',
  'presentation', 'slide', 'slides', 'deck', 'keynote', 'pitch',
  'spec', 'specs', 'specification', 'specifications', 'requirement', 'requirements',
  'proposal', 'proposals', 'resume', 'resumes', 'cv', 'portfolio', 'bio',
  'summary', 'overview', 'review', 'reviews', 'template', 'templates',
  'sample', 'samples', 'example', 'examples', 'test', 'tests', 'demo',
  'project', 'projects', // The word "project" itself is generic

  // Revisions, versions & workflow descriptors
  'final', 'draft', 'wip', 'temp', 'tmp', 'scratch', 'new', 'old',
  'latest', 'recent', 'current', 'updated', 'update', 'updates',
  'modified', 'edited', 'revision', 'revisions', 'rev', 'version', 'ver',
  'v1', 'v2', 'v3', 'v4', 'v5', 'copy', 'copies', 'backup', 'backups',
  'bak', 'archive', 'archived', 'untitled', 'export', 'exports', 'import',
  'imports', 'download', 'downloads', 'upload', 'uploads', 'scan', 'scans',
  'print', 'prints', 'output', 'input',

  // Media descriptors & camera prefixes
  'img', 'image', 'images', 'photo', 'photos', 'picture', 'pictures',
  'pic', 'pics', 'dsc', 'dji', 'mov', 'vid', 'screenshot', 'screen', 'screens',
  'snapshot', 'graphic', 'graphics', 'banner', 'logo', 'icon', 'icons',
  'thumbnail', 'thumb', 'video', 'clip', 'recording', 'audio', 'sound', 'music', 'track',

  // Common dates, calendar & time markers
  'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april',
  'may', 'jun', 'june', 'jul', 'july', 'aug', 'august', 'sep', 'september',
  'oct', 'october', 'nov', 'november', 'dec', 'december',
  'mon', 'monday', 'tue', 'tuesday', 'wed', 'wednesday', 'thu', 'thursday',
  'fri', 'friday', 'sat', 'saturday', 'sun', 'sunday',
  'q1', 'q2', 'q3', 'q4', 'h1', 'h2', 'fy', 'annual', 'monthly', 'weekly', 'daily',
  'spring', 'summer', 'fall', 'autumn', 'winter',

  // Generic adjectives & structural words
  'part', 'pt', 'ch', 'chapter', 'sec', 'section', 'vol', 'volume', 'no', 'num', 'number',
  'general', 'misc', 'miscellaneous', 'other', 'others', 'shared', 'personal'
]);

/**
 * Extracts distinct, meaningful (non-generic) candidate project tokens from a filename.
 * Normalizes separators, handles camelCase/PascalCase, and strips noise/copy suffixes.
 */
export function extractMeaningfulTokens(filename: string): Array<{ token: string; raw: string }> {
  // Strip extension
  let baseName = filename.replace(/\.[^/.]+$/, '').trim();
  if (!baseName) return [];

  // Strip trailing copy suffixes like " (1)", "_copy", "- copy"
  baseName = baseName.replace(/\s*\(\d+\)$/, '').replace(/[-_]copy(\s*\(\d+\))?$/i, '');

  // Separate camelCase / PascalCase boundaries: "PathfinderReport" -> "Pathfinder Report"
  const normalizedSeparators = baseName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[[\]()]+/g, ' ');

  // Split on delimiters: underscore, hyphen, space, dot, slash
  const rawParts = normalizedSeparators.split(/[-_\s./]+/).filter(Boolean);

  const results: Array<{ token: string; raw: string }> = [];
  const seenTokens = new Set<string>();

  for (const raw of rawParts) {
    const cleanRaw = raw.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    const lower = cleanRaw.toLowerCase();

    // Token must be at least 3 characters
    if (lower.length < 3) continue;
    // Token must not be purely numeric or a 4-digit year
    if (/^\d+$/.test(lower)) continue;
    // Token must not be in generic terms / stop words
    if (GENERIC_TERMS.has(lower)) continue;

    if (!seenTokens.has(lower)) {
      seenTokens.add(lower);
      results.push({ token: lower, raw: cleanRaw });
    }
  }

  return results;
}

/**
 * Detects project groupings across a set of files using distinctive identifier analysis.
 * Generic terms (form, report, final, copy, invoice, etc.) are strictly excluded from
 * becoming project folders. A project group requires at least 2 distinct files sharing
 * a distinctive, meaningful identifier.
 */
export function detectProjectGroups(files: CandidateFile[]): {
  projectGroups: ProjectGroupSuggestion[];
  fileGroupMap: Map<string, { groupName: string; reason: string }>;
} {
  // Map of lowercase candidate token -> array of files containing this token
  const tokenToFileMap = new Map<string, Array<{ file: CandidateFile; rawToken: string }>>();

  for (const file of files) {
    const tokens = extractMeaningfulTokens(file.originalName);
    for (const { token, raw } of tokens) {
      if (!tokenToFileMap.has(token)) {
        tokenToFileMap.set(token, []);
      }
      tokenToFileMap.get(token)!.push({ file, rawToken: raw });
    }
  }

  // Filter candidates that meet the evidence threshold: at least 2 files
  const candidateGroups: Array<{
    token: string;
    files: CandidateFile[];
    rawToken: string;
  }> = [];

  for (const [token, entries] of tokenToFileMap.entries()) {
    if (entries.length >= 2) {
      // Find the most representative raw token (prefer PascalCase / Capitalized)
      const bestRaw =
        entries.find((e) => /^[A-Z][a-zA-Z0-9]*$/.test(e.rawToken))?.rawToken || entries[0].rawToken;
      candidateGroups.push({
        token,
        files: entries.map((e) => e.file),
        rawToken: bestRaw,
      });
    }
  }

  // Sort candidate groups by file count descending for stability
  candidateGroups.sort((a, b) => b.files.length - a.files.length);

  const assignedFileIds = new Set<string>();
  const projectGroups: ProjectGroupSuggestion[] = [];
  const fileGroupMap = new Map<string, { groupName: string; reason: string }>();

  for (const group of candidateGroups) {
    // Only assign files that haven't been claimed by a higher-frequency group
    const unassignedFiles = group.files.filter((f) => !assignedFileIds.has(f.id));
    if (unassignedFiles.length >= 2) {
      const formattedName = group.rawToken.charAt(0).toUpperCase() + group.rawToken.slice(1);
      const folderName = `Projects/${formattedName}`;
      const reason = `Suggested for Projects/${formattedName} because ${unassignedFiles.length} filenames share the distinctive project identifier '${formattedName}'`;

      projectGroups.push({
        groupName: formattedName,
        folderName,
        keyword: group.token,
        fileCount: unassignedFiles.length,
        fileIds: unassignedFiles.map((f) => f.id),
        fileNames: unassignedFiles.map((f) => f.originalName),
        reason,
      });

      for (const file of unassignedFiles) {
        assignedFileIds.add(file.id);
        fileGroupMap.set(file.id, {
          groupName: formattedName,
          reason,
        });
      }
    }
  }

  return { projectGroups, fileGroupMap };
}
