import { Request, Response, NextFunction } from 'express';
import mime from 'mime-types';
import path from 'path';
import fs from 'fs';
import { sessionService } from '../services/sessionService';
import { categorizeFile } from '../services/categorizationService';
import { computeFileSha256 } from '../utils/hasher';
import {
  extractExtension,
  sanitizeFilename,
  sanitizeRelativePath,
} from '../utils/sanitizer';
import { analyzeSessionFiles, toSafeFileMetadata } from '../services/analysisService';
import {
  buildVirtualTree,
  getDuplicateGroupsDetails,
  getSessionPlanSummary,
  resetSessionPlan,
  updateDuplicateGroupRetention,
  updatePlanFileItem,
} from '../services/organizationPlanService';
import { detectProjectGroups } from '../services/projectGroupingService';
import { exportService } from '../services/exportService';
import { AppError } from '../middleware/errorHandler';
import {
  DuplicateGroupIdParamSchema,
  ExportIdParamSchema,
  FileIdParamSchema,
  SessionIdParamSchema,
  UpdateDuplicateGroupSchema,
  UpdatePlanItemSchema,
} from '../schemas/validationSchemas';
import { UploadedFileRecord } from '../types';
import { config } from '../utils/config';

export class SessionController {
  /**
   * POST /api/v1/sessions
   * Creates a new isolated upload session
   */
  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionService.createSession();
      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/sessions/:sessionId/files
   * Handles multiple file uploads into the session
   */
  public async uploadFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);

      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new AppError('No files were provided in the upload request', 400, 'EMPTY_UPLOAD');
      }

      // Pre-check session limits before disk processing to prevent partial leaks
      const incomingTotalBytes = files.reduce((sum, f) => sum + f.size, 0);
      if (session.totalFiles + files.length > config.maxFilesPerUpload) {
        for (const file of files) {
          try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
        }
        throw new AppError(
          `Upload limit reached: session currently has ${session.totalFiles} files. Adding ${files.length} files exceeds limit of ${config.maxFilesPerUpload}`,
          400,
          'TOO_MANY_FILES'
        );
      }

      if (session.totalSizeBytes + incomingTotalBytes > config.maxTotalSessionBytes) {
        for (const file of files) {
          try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
        }
        const maxMb = Math.round(config.maxTotalSessionBytes / (1024 * 1024));
        throw new AppError(
          `Session size limit exceeded: total uploads cannot exceed ${maxMb} MB`,
          413,
          'TOTAL_SIZE_EXCEEDED'
        );
      }

      // Parse optional relative paths if provided by client (e.g., from webkitRelativePath directory drops)
      let relativePathsMap: Record<string, string> = {};
      if (req.body && req.body.relativePaths) {
        try {
          if (typeof req.body.relativePaths === 'string') {
            relativePathsMap = JSON.parse(req.body.relativePaths);
          } else if (typeof req.body.relativePaths === 'object') {
            relativePathsMap = req.body.relativePaths;
          }
        } catch {
          // Ignore invalid JSON in relativePaths, will default to null
        }
      }

      const uploadedRecords: UploadedFileRecord[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const rawFilename = file.originalname;
        const sanitized = sanitizeFilename(rawFilename);
        const extension = extractExtension(rawFilename);

        // MIME type resolution
        const detectedMime =
          file.mimetype && file.mimetype !== 'application/octet-stream'
            ? file.mimetype
            : mime.lookup(sanitized) || 'application/octet-stream';

        // Categorize file deterministically
        const { category, reason: categoryReason } = categorizeFile(extension, detectedMime);

        // File ID was used as stored basename
        const storedBase = path.basename(file.filename);
        const fileId = storedBase.replace(/\.[^/.]+$/, '');

        // Streaming SHA-256 calculation
        const sha256 = await computeFileSha256(file.path);

        // Relative path extraction
        const clientRelPath =
          relativePathsMap[rawFilename] ||
          (Array.isArray(req.body.relativePaths) ? req.body.relativePaths[i] : null);
        const safeRelativePath = sanitizeRelativePath(clientRelPath);

        const record: UploadedFileRecord = {
          id: fileId,
          sessionId,
          originalName: rawFilename,
          sanitizedName: sanitized,
          extension,
          mimeType: detectedMime,
          size: file.size,
          sha256,
          category,
          categoryReason,
          suggestedGroup: null,
          groupingReason: null,
          originalRelativePath: safeRelativePath,
          storagePath: file.path,
          uploadedAt: new Date().toISOString(),
        };

        sessionService.addFileToSession(sessionId, record);
        uploadedRecords.push(record);
      }

      // Update project grouping across all session files
      const allSessionFiles = sessionService.getSessionFiles(sessionId);
      const { fileGroupMap } = detectProjectGroups(
        allSessionFiles.map((f) => ({ id: f.id, originalName: f.originalName }))
      );

      for (const file of allSessionFiles) {
        const groupInfo = fileGroupMap.get(file.id);
        file.suggestedGroup = groupInfo ? groupInfo.groupName : null;
        file.groupingReason = groupInfo ? groupInfo.reason : null;
      }

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          uploadedCount: uploadedRecords.length,
          totalSessionFiles: session.totalFiles,
          files: uploadedRecords.map(toSafeFileMetadata),
        },
      });
    } catch (err) {
      // Clean up uploaded files in case of unhandled error
      const files = req.files as Express.Multer.File[] | undefined;
      if (files && Array.isArray(files)) {
        for (const file of files) {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch {}
        }
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/sessions/:sessionId/files
   * Returns metadata for all uploaded files in a session
   */
  public async getSessionFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);

      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
      }

      const files = sessionService.getSessionFiles(sessionId);
      res.status(200).json({
        success: true,
        data: {
          sessionId,
          count: files.length,
          files: files.map(toSafeFileMetadata),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/sessions/:sessionId/analysis
   * Returns comprehensive analysis for files in a session
   */
  public async getSessionAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);

      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
      }

      const files = sessionService.getSessionFiles(sessionId);
      const analysis = analyzeSessionFiles(sessionId, files);

      res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/sessions/:sessionId/plan
   * Returns the current editable organization plan
   */
  public async getSessionPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);
      const plan = getSessionPlanSummary(sessionId);

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/sessions/:sessionId/plan/files/:fileId
   * Updates an individual file's organization settings
   */
  public async updatePlanFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, fileId } = FileIdParamSchema.parse(req.params);
      const updates = UpdatePlanItemSchema.parse(req.body);

      const updatedItem = updatePlanFileItem(sessionId, fileId, updates);
      res.status(200).json({
        success: true,
        data: updatedItem,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/sessions/:sessionId/plan/reset
   * Restores the initial generated organization plan
   */
  public async resetPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);
      const resetPlan = resetSessionPlan(sessionId);

      res.status(200).json({
        success: true,
        data: resetPlan,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/sessions/:sessionId/plan/tree
   * Returns the complete virtual folder tree and statistics
   */
  public async getPlanTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);
      const treeResponse = buildVirtualTree(sessionId);

      res.status(200).json({
        success: true,
        data: treeResponse,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/sessions/:sessionId/duplicates
   * Returns exact duplicate groups and related retention choices
   */
  public async getDuplicateGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);
      const duplicates = getDuplicateGroupsDetails(sessionId);

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          count: duplicates.length,
          duplicateGroups: duplicates,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/sessions/:sessionId/duplicates/:groupId
   * Updates duplicate-retention choices for a group
   */
  public async updateDuplicateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, groupId } = DuplicateGroupIdParamSchema.parse(req.params);
      const body = UpdateDuplicateGroupSchema.parse(req.body);

      const updatedGroup = updateDuplicateGroupRetention(sessionId, groupId, body);
      res.status(200).json({
        success: true,
        data: updatedGroup,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/sessions/:sessionId/changes
   * Returns plan change history for the session
   */
  public async getPlanChanges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);

      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
      }

      const history = sessionService.getPlanHistory(sessionId);
      res.status(200).json({
        success: true,
        data: {
          sessionId,
          count: history.length,
          history,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/sessions/:sessionId/exports
   * Validates the plan and creates an organized ZIP export
   */
  public async createExport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = SessionIdParamSchema.parse(req.params);
      const exportRecord = await exportService.generateExport(sessionId);

      res.status(201).json({
        success: true,
        data: {
          exportId: exportRecord.exportId,
          sessionId: exportRecord.sessionId,
          filename: exportRecord.filename,
          sizeBytes: exportRecord.sizeBytes,
          fileCount: exportRecord.fileCount,
          createdAt: exportRecord.createdAt,
          expiresAt: exportRecord.expiresAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/sessions/:sessionId/exports/:exportId/download
   * Streams and downloads the generated ZIP archive
   */
  public async downloadExport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, exportId } = ExportIdParamSchema.parse(req.params);
      const { record, stream } = exportService.getExportForDownload(sessionId, exportId);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${record.filename}"`);
      res.setHeader('Content-Length', record.sizeBytes);

      stream.on('error', (err) => {
        next(err);
      });

      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

export const sessionController = new SessionController();
