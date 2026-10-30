import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ZipArchive } from 'archiver';
import {
  ExportRecord,
  UndoManifest,
  UndoManifestFileEntry,
} from '../types';
import { sessionService } from './sessionService';
import { getSessionPlanSummary } from './organizationPlanService';
import { AppError } from '../middleware/errorHandler';

export class ExportService {
  /**
   * Generates machine-readable undo-manifest.json content for a session export
   */
  public generateManifest(sessionId: string): UndoManifest {
    const session = sessionService.getSession(sessionId);
    if (!session) {
      throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
    }

    const rawFiles = sessionService.getSessionFiles(sessionId);
    const planSummary = getSessionPlanSummary(sessionId);
    const initialPlan = sessionService.getInitialPlan(sessionId);
    const rawFileMap = new Map(rawFiles.map((f) => [f.id, f]));

    const fileEntries: UndoManifestFileEntry[] = [];
    let exportedCount = 0;
    let excludedCount = 0;

    for (const planItem of planSummary.plan) {
      const rawFile = rawFileMap.get(planItem.fileId);
      if (!rawFile) continue;

      const isIncluded = planItem.isIncludedInExport;
      if (isIncluded) {
        exportedCount += 1;
      } else {
        excludedCount += 1;
      }

      const initialItem = initialPlan?.get(planItem.fileId);
      const isRenamed = planItem.proposedFilename !== rawFile.sanitizedName;
      const isReassigned = initialItem
        ? planItem.proposedDestinationFolder !== initialItem.proposedDestinationFolder
        : false;

      fileEntries.push({
        fileId: planItem.fileId,
        originalFilename: rawFile.originalName,
        originalRelativePath: rawFile.originalRelativePath,
        exportedPath: isIncluded ? planItem.proposedPath : null,
        originalSha256: rawFile.sha256,
        fileSizeBytes: rawFile.size,
        renamed: isRenamed,
        reassigned: isReassigned,
        isDuplicate: planItem.duplicateStatus.isDuplicate,
        duplicateOfFileId: planItem.duplicateStatus.duplicateOfFileId || null,
        excluded: !isIncluded,
        exclusionReason: !isIncluded ? planItem.groupingReason : null,
        category: planItem.category,
        group: planItem.suggestedGroup || null,
      });
    }

    return {
      application: 'UNDO',
      manifestVersion: '1.0',
      exportTimestamp: new Date().toISOString(),
      sessionReference: sessionId,
      totalImportedFiles: rawFiles.length,
      totalExportedFiles: exportedCount,
      totalExcludedFiles: excludedCount,
      files: fileEntries,
    };
  }

  /**
   * Generates a validated temporary organized ZIP archive from the session files
   */
  public async generateExport(sessionId: string): Promise<ExportRecord> {
    const session = sessionService.getSession(sessionId);
    if (!session) {
      throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
    }

    const planSummary = getSessionPlanSummary(sessionId);
    const includedItems = planSummary.plan.filter((p) => p.isIncludedInExport);

    if (includedItems.length === 0) {
      throw new AppError(
        'Cannot generate export: no files are selected for inclusion in the export',
        400,
        'EMPTY_EXPORT'
      );
    }

    const rawFiles = sessionService.getSessionFiles(sessionId);
    const rawFileMap = new Map(rawFiles.map((f) => [f.id, f]));

    const exportId = crypto.randomUUID();
    const exportDir = sessionService.getSessionExportDir(sessionId);
    if (!fs.existsSync(exportDir)) {
      await fs.promises.mkdir(exportDir, { recursive: true });
    }

    const tempZipPath = path.join(exportDir, `${exportId}.tmp`);
    const finalZipPath = path.join(exportDir, `${exportId}.zip`);

    // Generate manifest
    const manifest = this.generateManifest(sessionId);
    const manifestJson = JSON.stringify(manifest, null, 2);

    // Create streaming archive
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(tempZipPath);
      const archive = new ZipArchive({
        zlib: { level: 9 }, // Maximum compression
      });

      output.on('close', () => resolve());
      output.on('error', (err: Error) => reject(err));
      archive.on('error', (err: Error) => reject(err));
      archive.on('warning', (err: any) => {
        if (err && err.code === 'ENOENT') {
          // Log warning
        } else {
          reject(err);
        }
      });

      archive.pipe(output);

      // 1. Append undo-manifest.json at the archive root
      archive.append(manifestJson, { name: 'undo-manifest.json' });

      // 2. Track entry paths to ensure strictly no duplicates inside the archive
      const addedEntryPaths = new Set<string>();
      addedEntryPaths.add('undo-manifest.json'.toLowerCase());

      for (const item of includedItems) {
        const rawFile = rawFileMap.get(item.fileId);
        if (!rawFile) {
          return reject(
            new AppError(`File '${item.fileId}' not found in session storage`, 404, 'FILE_NOT_FOUND')
          );
        }

        if (!fs.existsSync(rawFile.storagePath)) {
          return reject(
            new AppError(
              `Stored file content for '${item.originalName}' is missing on disk`,
              500,
              'STORAGE_FILE_MISSING'
            )
          );
        }

        const entryPath = item.proposedPath;
        const normalizedEntry = path.posix.normalize(entryPath.replace(/\\/g, '/'));
        if (normalizedEntry.startsWith('..') || path.isAbsolute(normalizedEntry)) {
          return reject(
            new AppError(`Unsafe archive entry path detected: '${entryPath}'`, 400, 'UNSAFE_ARCHIVE_PATH')
          );
        }

        if (addedEntryPaths.has(normalizedEntry.toLowerCase())) {
          return reject(
            new AppError(
              `Duplicate archive entry path detected: '${normalizedEntry}'`,
              400,
              'DUPLICATE_ENTRY_PATH'
            )
          );
        }

        addedEntryPaths.add(normalizedEntry.toLowerCase());
        archive.file(rawFile.storagePath, { name: normalizedEntry });
      }

      archive.finalize().catch(reject);
    }).catch(async (err) => {
      // Clean up temporary artifact on error
      if (fs.existsSync(tempZipPath)) {
        await fs.promises.unlink(tempZipPath).catch(() => {});
      }
      throw err;
    });

    // Atomically rename .tmp to .zip once finalized and verified
    await fs.promises.rename(tempZipPath, finalZipPath);
    const stat = await fs.promises.stat(finalZipPath);

    const exportRecord: ExportRecord = {
      exportId,
      sessionId,
      filename: `undo-organized-${sessionId.slice(0, 8)}.zip`,
      filePath: finalZipPath,
      sizeBytes: stat.size,
      fileCount: includedItems.length,
      createdAt: new Date().toISOString(),
      expiresAt: session.expiresAt,
    };

    sessionService.addExportRecord(sessionId, exportRecord);
    return exportRecord;
  }

  /**
   * Retrieves export stream and metadata for download
   */
  public getExportForDownload(
    sessionId: string,
    exportId: string
  ): { record: ExportRecord; stream: fs.ReadStream } {
    const session = sessionService.getSession(sessionId);
    if (!session) {
      throw new AppError(`Session '${sessionId}' does not exist or has expired`, 404, 'SESSION_NOT_FOUND');
    }

    const record = sessionService.getExportRecord(sessionId, exportId);
    if (!record) {
      throw new AppError(`Export '${exportId}' not found for session '${sessionId}'`, 404, 'EXPORT_NOT_FOUND');
    }

    if (!fs.existsSync(record.filePath)) {
      throw new AppError('Export archive file is no longer available on disk', 410, 'EXPORT_EXPIRED');
    }

    const stream = fs.createReadStream(record.filePath);
    return { record, stream };
  }
}

export const exportService = new ExportService();
