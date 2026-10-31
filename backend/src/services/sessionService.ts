import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DocumentExtractionResult,
  ExportRecord,
  OrganizationPlanItem,
  PlanChangeRecord,
  PlanChangeType,
  SemanticCluster,
  SessionRecord,
  UploadedFileRecord,
  VersionRelationship,
} from '../types';
import { config } from '../utils/config';
import { AppError } from '../middleware/errorHandler';

export class SessionService {
  private sessions = new Map<string, SessionRecord>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureStorageRoot();
    this.startPeriodicCleanup();
  }

  /**
   * Ensures the storage root exists safely
   */
  private ensureStorageRoot(): void {
    const sessionsDir = path.join(config.storageDir, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }
  }

  /**
   * Creates a new isolated session
   */
  public async createSession(): Promise<SessionRecord> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.sessionTtlMs);

    const sessionDir = path.join(config.storageDir, 'sessions', sessionId);
    const uploadsDir = path.join(sessionDir, 'uploads');
    const exportsDir = path.join(sessionDir, 'exports');

    await fs.promises.mkdir(uploadsDir, { recursive: true });
    await fs.promises.mkdir(exportsDir, { recursive: true });

    const session: SessionRecord = {
      id: sessionId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      totalFiles: 0,
      totalSizeBytes: 0,
      files: new Map<string, UploadedFileRecord>(),
      activePlan: new Map<string, OrganizationPlanItem>(),
      initialPlan: new Map<string, OrganizationPlanItem>(),
      history: [],
      exports: new Map<string, ExportRecord>(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Retrieves a session by ID and checks expiry
   */
  public getSession(sessionId: string): SessionRecord | null {
    if (!sessionId || typeof sessionId !== 'string') return null;

    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiry
    const now = new Date();
    if (new Date(session.expiresAt) < now) {
      // Session has expired, purge asynchronously
      this.deleteSession(sessionId).catch(() => {});
      return null;
    }

    return session;
  }

  /**
   * Checks whether session exists and is active
   */
  public isSessionActive(sessionId: string): boolean {
    return this.getSession(sessionId) !== null;
  }

  /**
   * Returns session upload directory path safely
   */
  public getSessionUploadDir(sessionId: string): string {
    return path.join(config.storageDir, 'sessions', sessionId, 'uploads');
  }

  /**
   * Returns session export directory path safely
   */
  public getSessionExportDir(sessionId: string): string {
    return path.join(config.storageDir, 'sessions', sessionId, 'exports');
  }

  /**
   * Adds an uploaded file record to the session
   */
  public addFileToSession(sessionId: string, fileRecord: UploadedFileRecord): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new AppError(`Session '${sessionId}' not found or has expired`, 404, 'SESSION_NOT_FOUND');
    }

    // Check limits
    if (session.totalFiles >= config.maxFilesPerUpload) {
      throw new AppError(
        `Upload limit reached: maximum ${config.maxFilesPerUpload} files allowed per session`,
        400,
        'TOO_MANY_FILES'
      );
    }

    if (session.totalSizeBytes + fileRecord.size > config.maxTotalSessionBytes) {
      const maxMb = Math.round(config.maxTotalSessionBytes / (1024 * 1024));
      throw new AppError(
        `Session size limit exceeded: total session uploads cannot exceed ${maxMb} MB`,
        413,
        'TOTAL_SIZE_EXCEEDED'
      );
    }

    session.files.set(fileRecord.id, fileRecord);
    session.totalFiles = session.files.size;
    session.totalSizeBytes += fileRecord.size;
  }

  /**
   * Retrieves all file records for a session
   */
  public getSessionFiles(sessionId: string): UploadedFileRecord[] {
    const session = this.getSession(sessionId);
    if (!session) return [];
    return Array.from(session.files.values());
  }

  /**
   * Retrieves a single file record by ID
   */
  public getSessionFile(sessionId: string, fileId: string): UploadedFileRecord | null {
    const session = this.getSession(sessionId);
    if (!session) return null;
    return session.files.get(fileId) || null;
  }

  /**
   * Plan state management
   */
  public getActivePlan(sessionId: string): Map<string, OrganizationPlanItem> | null {
    const session = this.getSession(sessionId);
    if (!session) return null;
    return session.activePlan || null;
  }

  public setActivePlan(
    sessionId: string,
    planMap: Map<string, OrganizationPlanItem>,
    isInitial = false
  ): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new AppError(`Session '${sessionId}' not found or has expired`, 404, 'SESSION_NOT_FOUND');
    }
    session.activePlan = new Map(planMap);
    if (isInitial || !session.initialPlan || session.initialPlan.size === 0) {
      session.initialPlan = new Map();
      for (const [id, item] of planMap.entries()) {
        session.initialPlan.set(id, {
          ...item,
          duplicateStatus: { ...item.duplicateStatus },
        });
      }
    }
  }

  public getInitialPlan(sessionId: string): Map<string, OrganizationPlanItem> | null {
    const session = this.getSession(sessionId);
    if (!session) return null;
    return session.initialPlan || null;
  }

  /**
   * Records a plan change in session history
   */
  public recordPlanChange(
    sessionId: string,
    fileId: string,
    changeType: PlanChangeType,
    previousValue: any,
    newValue: any
  ): PlanChangeRecord {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new AppError(`Session '${sessionId}' not found or has expired`, 404, 'SESSION_NOT_FOUND');
    }

    const record: PlanChangeRecord = {
      id: crypto.randomUUID(),
      sessionId,
      fileId,
      changeType,
      previousValue,
      newValue,
      timestamp: new Date().toISOString(),
    };

    if (!session.history) {
      session.history = [];
    }
    session.history.push(record);
    return record;
  }

  /**
   * Retrieves change history for a session
   */
  public getPlanHistory(sessionId: string): PlanChangeRecord[] {
    const session = this.getSession(sessionId);
    if (!session) return [];
    return session.history ? [...session.history] : [];
  }

  /**
   * Content extraction and semantic intelligence state management
   */
  public setSessionExtractions(sessionId: string, extractions: Map<string, DocumentExtractionResult>): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.extractions = new Map(extractions);
    }
  }

  public getSessionExtractions(sessionId: string): Map<string, DocumentExtractionResult> | undefined {
    const session = this.getSession(sessionId);
    return session?.extractions;
  }

  public setSessionSemanticClusters(sessionId: string, clusters: SemanticCluster[]): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.semanticClusters = clusters;
    }
  }

  public getSessionSemanticClusters(sessionId: string): SemanticCluster[] | undefined {
    const session = this.getSession(sessionId);
    return session?.semanticClusters;
  }

  public setSessionVersionFamilies(sessionId: string, versions: VersionRelationship[]): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.versionFamilies = versions;
    }
  }

  public getSessionVersionFamilies(sessionId: string): VersionRelationship[] | undefined {
    const session = this.getSession(sessionId);
    return session?.versionFamilies;
  }

  /**
   * Export tracking
   */
  public addExportRecord(sessionId: string, exportRecord: ExportRecord): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new AppError(`Session '${sessionId}' not found or has expired`, 404, 'SESSION_NOT_FOUND');
    }
    if (!session.exports) {
      session.exports = new Map();
    }
    session.exports.set(exportRecord.exportId, exportRecord);
  }

  public getExportRecord(sessionId: string, exportId: string): ExportRecord | null {
    const session = this.getSession(sessionId);
    if (!session || !session.exports) return null;
    return session.exports.get(exportId) || null;
  }

  /**
   * Safely deletes a session and all its stored temporary files from disk
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);

    const sessionDir = path.join(config.storageDir, 'sessions', sessionId);
    try {
      if (fs.existsSync(sessionDir)) {
        await fs.promises.rm(sessionDir, { recursive: true, force: true });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Purges all expired sessions from disk and memory
   */
  public async purgeExpiredSessions(): Promise<number> {
    const now = new Date();
    let purged = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        await this.deleteSession(sessionId);
        purged += 1;
      }
    }

    return purged;
  }

  /**
   * Starts periodic cleanup timer
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.purgeExpiredSessions().catch(() => {});
    }, config.sessionCleanupIntervalMs);

    // Allow process to exit cleanly without waiting for this interval
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stops periodic cleanup (useful for tests and graceful shutdown)
   */
  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all sessions and test storage (for testing purposes)
   */
  public async resetAll(): Promise<void> {
    for (const sessionId of Array.from(this.sessions.keys())) {
      await this.deleteSession(sessionId);
    }
    this.sessions.clear();
  }
}

export const sessionService = new SessionService();
