import { ProjectGroupSuggestion } from '../types';

interface CandidateFile {
  id: string;
  originalName: string;
}

const GENERIC_PREFIXES = new Set([
  'img',
  'image',
  'photo',
  'pic',
  'dsc',
  'file',
  'doc',
  'document',
  'copy',
  'temp',
  'tmp',
  'new',
  'screenshot',
  'screen',
  'scan',
  'untitled',
  'download',
  'upload',
]);

/**
 * Extracts a candidate project keyword from a filename based on leading token patterns.
 * E.g., 'pathfinder_report.pdf' -> 'pathfinder'
 *       'ClientAlpha-Invoice-2024.docx' -> 'clientalpha'
 */
function extractLeadingKeyword(filename: string): string | null {
  // Strip extension
  const baseName = filename.replace(/\.[^/.]+$/, '').trim();
  if (!baseName) return null;

  // Split by common delimiters: underscore, hyphen, space, or dot
  const parts = baseName.split(/[-_\s.]+/).filter(Boolean);
  if (parts.length < 2) {
    // If there is only one word, it's not a compound prefix (e.g., just 'report.pdf')
    return null;
  }

  const candidate = parts[0].toLowerCase();

  // Keyword must be at least 3 characters, alphanumeric, and not a generic camera/file prefix
  if (candidate.length < 3) return null;
  if (/^\d+$/.test(candidate)) return null; // Ignore purely numeric prefixes like '01', '2024'
  if (GENERIC_PREFIXES.has(candidate)) return null;

  return candidate;
}

/**
 * Capitalizes a keyword for clean folder presentation (e.g. 'pathfinder' -> 'Pathfinder')
 */
function formatGroupName(keyword: string): string {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

/**
 * Detects project groupings across a set of files using deterministic prefix analysis.
 */
export function detectProjectGroups(files: CandidateFile[]): {
  projectGroups: ProjectGroupSuggestion[];
  fileGroupMap: Map<string, { groupName: string; reason: string }>;
} {
  const keywordToFiles = new Map<string, CandidateFile[]>();

  for (const file of files) {
    const keyword = extractLeadingKeyword(file.originalName);
    if (!keyword) continue;

    if (!keywordToFiles.has(keyword)) {
      keywordToFiles.set(keyword, []);
    }
    keywordToFiles.get(keyword)!.push(file);
  }

  const projectGroups: ProjectGroupSuggestion[] = [];
  const fileGroupMap = new Map<string, { groupName: string; reason: string }>();

  for (const [keyword, matchedFiles] of keywordToFiles.entries()) {
    // A project group requires at least 2 files
    if (matchedFiles.length >= 2) {
      const formattedName = formatGroupName(keyword);
      const folderName = `Projects/${formattedName}`;
      const reason = `Matched filename project prefix '${keyword}' across ${matchedFiles.length} files`;

      projectGroups.push({
        groupName: formattedName,
        folderName,
        keyword,
        fileCount: matchedFiles.length,
        fileIds: matchedFiles.map((f) => f.id),
        fileNames: matchedFiles.map((f) => f.originalName),
        reason,
      });

      for (const file of matchedFiles) {
        fileGroupMap.set(file.id, {
          groupName: formattedName,
          reason: `Grouped into project '${formattedName}' based on matching prefix '${keyword}' in filename`,
        });
      }
    }
  }

  // Sort groups by file count descending for stability
  projectGroups.sort((a, b) => b.fileCount - a.fileCount);

  return { projectGroups, fileGroupMap };
}
