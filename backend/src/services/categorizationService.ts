import { FileCategory } from '../types';

interface CategoryRule {
  category: FileCategory;
  extensions: Set<string>;
  description: string;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'documents',
    extensions: new Set(['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md', 'epub', 'tex', 'wps', 'log']),
    description: 'Text document file format',
  },
  {
    category: 'spreadsheets',
    extensions: new Set(['xls', 'xlsx', 'csv', 'ods', 'tsv', 'xlsm', 'xlt', 'xltx']),
    description: 'Spreadsheet tabular data format',
  },
  {
    category: 'presentations',
    extensions: new Set(['ppt', 'pptx', 'odp', 'key', 'pps', 'ppsx']),
    description: 'Slide presentation format',
  },
  {
    category: 'images',
    extensions: new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'tiff', 'tif', 'ico', 'heic', 'avif', 'psd', 'ai']),
    description: 'Raster or vector image format',
  },
  {
    category: 'videos',
    extensions: new Set(['mp4', 'mkv', 'mov', 'avi', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'mpg', 'mpeg']),
    description: 'Digital video format',
  },
  {
    category: 'audio',
    extensions: new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff', 'opus', 'mid', 'midi']),
    description: 'Digital audio format',
  },
  {
    category: 'archives',
    extensions: new Set(['zip', 'tar', 'gz', '7z', 'rar', 'bz2', 'xz', 'tgz', 'iso', 'dmg']),
    description: 'Compressed archive container',
  },
  {
    category: 'source code',
    extensions: new Set([
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'go',
      'rs', 'rb', 'php', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml',
      'yml', 'toml', 'sql', 'sh', 'bash', 'zsh', 'bat', 'ps1', 'vue', 'svelte', 'r', 'swift',
      'kt', 'dart', 'lua', 'scala', 'dockerfile', 'makefile'
    ]),
    description: 'Software source code or configuration script',
  },
];

export function categorizeFile(
  extension: string,
  mimeType?: string
): { category: FileCategory; reason: string } {
  const normalizedExt = extension.toLowerCase().trim();

  if (!normalizedExt) {
    if (mimeType && mimeType.startsWith('image/')) {
      return { category: 'images', reason: `Categorized as 'images' based on MIME type '${mimeType}' (missing extension)` };
    }
    if (mimeType && mimeType.startsWith('video/')) {
      return { category: 'videos', reason: `Categorized as 'videos' based on MIME type '${mimeType}' (missing extension)` };
    }
    if (mimeType && mimeType.startsWith('audio/')) {
      return { category: 'audio', reason: `Categorized as 'audio' based on MIME type '${mimeType}' (missing extension)` };
    }
    return {
      category: 'others',
      reason: 'No file extension or recognizable MIME type available; categorized under others',
    };
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.extensions.has(normalizedExt)) {
      return {
        category: rule.category,
        reason: `Categorized as '${rule.category}' based on '.${normalizedExt}' extension (${rule.description})`,
      };
    }
  }

  return {
    category: 'others',
    reason: `Extension '.${normalizedExt}' did not match standard categories; placed in 'others'`,
  };
}
