import { z } from 'zod';

export const SessionIdParamSchema = z.object({
  sessionId: z.string().uuid({ message: 'Invalid session ID format. Must be a valid UUID v4' }),
});

export const FileIdParamSchema = z.object({
  sessionId: z.string().uuid({ message: 'Invalid session ID format' }),
  fileId: z.string().min(1, { message: 'File ID is required' }),
});

export const DuplicateGroupIdParamSchema = z.object({
  sessionId: z.string().uuid({ message: 'Invalid session ID format' }),
  groupId: z.string().min(1, { message: 'Duplicate group ID is required' }),
});

export const ExportIdParamSchema = z.object({
  sessionId: z.string().uuid({ message: 'Invalid session ID format' }),
  exportId: z.string().uuid({ message: 'Invalid export ID format' }),
});

export const UpdatePlanItemSchema = z.object({
  proposedFilename: z.string().min(1, 'Proposed filename cannot be empty').max(255).optional(),
  proposedDestinationFolder: z.string().max(1024).optional(),
  category: z
    .enum([
      'documents',
      'spreadsheets',
      'presentations',
      'images',
      'videos',
      'audio',
      'archives',
      'source code',
      'others',
    ])
    .optional(),
  suggestedGroup: z.string().nullable().optional(),
  isIncludedInExport: z.boolean().optional(),
  allowExtensionChange: z.boolean().optional(),
});

export const UpdateDuplicateGroupSchema = z.object({
  action: z.enum(['keep_all', 'retain_one', 'exclude_selected', 'include_selected'], {
    message: "Action must be one of 'keep_all', 'retain_one', 'exclude_selected', 'include_selected'",
  }),
  primaryFileId: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
});
