import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { sessionService } from '../../services/sessionService';

describe('Undo Backend REST API Integration Tests', () => {
  beforeAll(async () => {
    await sessionService.resetAll();
  });

  afterAll(async () => {
    sessionService.stopCleanup();
    await sessionService.resetAll();
  });

  it('GET /api/v1/health - should return healthy server status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });

  it('POST /api/v1/sessions - should create a new isolated session with UUID', async () => {
    const res = await request(app).post('/api/v1/sessions');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('sessionId');
    expect(res.body.data).toHaveProperty('createdAt');
    expect(res.body.data).toHaveProperty('expiresAt');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(res.body.data.sessionId).toMatch(uuidRegex);
  });

  it('POST /api/v1/sessions/:sessionId/files - should reject invalid session ID', async () => {
    const res = await request(app)
      .post('/api/v1/sessions/not-a-valid-uuid/files')
      .attach('files', Buffer.from('test content'), 'test.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/sessions/:sessionId/files - should reject non-existent session ID', async () => {
    const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .post(`/api/v1/sessions/${nonExistentUuid}/files`)
      .attach('files', Buffer.from('test content'), 'test.txt');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('POST /api/v1/sessions/:sessionId/files - should reject empty upload', async () => {
    const sessRes = await request(app).post('/api/v1/sessions');
    const sessionId = sessRes.body.data.sessionId;

    const res = await request(app).post(`/api/v1/sessions/${sessionId}/files`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMPTY_UPLOAD');
  });

  it('POST /api/v1/sessions/:sessionId/files - should safely sanitize path traversal attempts in filenames', async () => {
    const sessRes = await request(app).post('/api/v1/sessions');
    const sessionId = sessRes.body.data.sessionId;

    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/files`)
      .attach('files', Buffer.from('harmless content'), '../../etc/passwd.txt');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.files[0].sanitizedName).toBe('passwd.txt');
    // Ensure no filesystem paths leaked
    expect(res.body.data.files[0]).not.toHaveProperty('storagePath');
  });

  it('Full workflow: Upload multiple files, exact duplicate detection, project grouping, analysis & planning', async () => {
    // 1. Create isolated session
    const sessRes = await request(app).post('/api/v1/sessions');
    const sessionId = sessRes.body.data.sessionId;

    const exactDuplicateContent = Buffer.from('Exact identical content for duplicate detection testing 12345');
    const differentContent = Buffer.from('Completely different content for duplicate name testing');

    // 2. Upload multiple synthetic files:
    // - Two files with IDENTICAL content (exact duplicates): invoice_jan.pdf and invoice_copy.pdf
    // - A file with the same filename 'invoice_jan.pdf' but DIFFERENT content (filename collision, not exact duplicate)
    // - Two project files: pathfinder_report.pdf and pathfinder_diagram.png (project grouping)
    // - A source code file: calculator.ts
    const uploadRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/files`)
      .attach('files', exactDuplicateContent, 'invoice_jan.pdf')
      .attach('files', exactDuplicateContent, 'invoice_copy.pdf') // exact duplicate
      .attach('files', differentContent, 'invoice_jan.pdf') // same name, different content
      .attach('files', Buffer.from('Report text'), 'pathfinder_report.pdf') // project prefix
      .attach('files', Buffer.from('Diagram image'), 'pathfinder_diagram.png') // project prefix
      .attach('files', Buffer.from('export const add = (a, b) => a + b;'), 'calculator.ts');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.data.uploadedCount).toBe(6);
    expect(uploadRes.body.data.totalSessionFiles).toBe(6);

    const uploadedFiles = uploadRes.body.data.files;
    expect(uploadedFiles).toHaveLength(6);

    // Verify SHA-256 hashes
    const hash1 = uploadedFiles[0].sha256;
    const hash2 = uploadedFiles[1].sha256;
    const hash3 = uploadedFiles[2].sha256;
    expect(hash1).toBe(hash2); // Identical content -> identical SHA256
    expect(hash1).not.toBe(hash3); // Different content -> different SHA256

    // Verify categories
    expect(uploadedFiles.find((f: any) => f.originalName === 'calculator.ts').category).toBe('source code');
    expect(uploadedFiles.find((f: any) => f.originalName === 'pathfinder_diagram.png').category).toBe('images');

    // 3. GET /api/v1/sessions/:sessionId/files
    const listRes = await request(app).get(`/api/v1/sessions/${sessionId}/files`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.count).toBe(6);
    for (const f of listRes.body.data.files) {
      expect(f).not.toHaveProperty('storagePath');
    }

    // 4. GET /api/v1/sessions/:sessionId/analysis
    const analysisRes = await request(app).get(`/api/v1/sessions/${sessionId}/analysis`);
    expect(analysisRes.status).toBe(200);
    const analysis = analysisRes.body.data;

    expect(analysis.totalFiles).toBe(6);
    expect(analysis.duplicateGroups).toHaveLength(1);
    expect(analysis.duplicateGroups[0].fileCount).toBe(2);
    expect(analysis.duplicateGroups[0].sha256).toBe(hash1);

    // Verify project groups
    expect(analysis.suggestedProjectGroups).toHaveLength(2);
    const groupNames = analysis.suggestedProjectGroups.map((g: any) => g.groupName);
    expect(groupNames).toContain('Pathfinder');
    expect(groupNames).toContain('Invoice');

    // 5. GET /api/v1/sessions/:sessionId/plan
    const planRes = await request(app).get(`/api/v1/sessions/${sessionId}/plan`);
    expect(planRes.status).toBe(200);
    const planSummary = planRes.body.data;

    expect(planSummary.totalFiles).toBe(6);
    // Phase 3 requirement: All files (including exact duplicates) are included by default until user explicitly decides
    expect(planSummary.includedInExport).toBe(6);
    expect(planSummary.excludedDuplicates).toBe(0);

    // Check project folder routing
    const pathfinderReportPlan = planSummary.plan.find((p: any) => p.originalName === 'pathfinder_report.pdf');
    expect(pathfinderReportPlan.proposedDestinationFolder).toBe('Projects/Pathfinder');

    // Check filename collision resolution (invoice_jan.pdf was uploaded twice with different content)
    const invoicePlans = planSummary.plan.filter((p: any) => p.originalName === 'invoice_jan.pdf');
    expect(invoicePlans).toHaveLength(2);
    const proposedNames = invoicePlans.map((p: any) => p.proposedFilename);
    expect(proposedNames).toContain('invoice_jan.pdf');
    expect(proposedNames).toContain('invoice_jan (1).pdf');

    // Check duplicate detection (detected as duplicate, but included by default until user action)
    const duplicateCopyPlan = planSummary.plan.find((p: any) => p.originalName === 'invoice_copy.pdf');
    expect(duplicateCopyPlan.duplicateStatus.isDuplicate).toBe(true);
    expect(duplicateCopyPlan.isIncludedInExport).toBe(true);
  });

  it('Files without extension should be safely handled and categorized into others', async () => {
    const sessRes = await request(app).post('/api/v1/sessions');
    const sessionId = sessRes.body.data.sessionId;

    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/files`)
      .attach('files', Buffer.from('FROM node:20'), 'Dockerfile')
      .attach('files', Buffer.from('just notes'), 'NOTES');

    expect(res.status).toBe(200);
    const files = res.body.data.files;
    expect(files[0].extension).toBe('');
    expect(files[0].category).toBe('others');
    expect(files[1].extension).toBe('');
    expect(files[1].category).toBe('others');
  });

  it('Undefined routes should return standard 404 JSON', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('Malformed JSON in body should return standard 400 error', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Content-Type', 'application/json')
      .send('{ bad json: true ');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });

  it('Unexpected upload form field should return 400 UNEXPECTED_FIELD', async () => {
    const sessRes = await request(app).post('/api/v1/sessions');
    const sessionId = sessRes.body.data.sessionId;

    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/files`)
      .attach('wrongField', Buffer.from('test data'), 'test.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNEXPECTED_FIELD');
  });

  describe('Boundary & Negative Error Handling Tests', () => {
    it('Invalid sessionId UUID format returns 400 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/v1/sessions/not-a-valid-uuid/plan');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Nonexistent sessionId UUID returns 404 SESSION_NOT_FOUND', async () => {
      const res = await request(app).get('/api/v1/sessions/00000000-0000-0000-0000-000000000000/plan');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('Nonexistent fileId in plan update returns 404 FILE_NOT_FOUND', async () => {
      const sessRes = await request(app).post('/api/v1/sessions');
      const sessionId = sessRes.body.data.sessionId;

      const res = await request(app)
        .patch(`/api/v1/sessions/${sessionId}/plan/files/00000000-0000-0000-0000-000000000000`)
        .send({ proposedFilename: 'rename.pdf' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('Attempting to create export when 0 files are included returns 400 EXPORT_ERROR', async () => {
      const sessRes = await request(app).post('/api/v1/sessions');
      const sessionId = sessRes.body.data.sessionId;

      // Upload 1 file
      const upRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/files`)
        .attach('files', Buffer.from('hello test'), 'hello.txt');
      const fileId = upRes.body.data.files[0].id;

      // Exclude it from plan
      await request(app)
        .patch(`/api/v1/sessions/${sessionId}/plan/files/${fileId}`)
        .send({ isIncludedInExport: false });

      // Attempt export
      const expRes = await request(app).post(`/api/v1/sessions/${sessionId}/exports`);
      expect(expRes.status).toBe(400);
      expect(expRes.body.success).toBe(false);
      expect(expRes.body.error.code).toBe('EMPTY_EXPORT');
    });

    it('Downloading nonexistent export returns 404 EXPORT_NOT_FOUND', async () => {
      const sessRes = await request(app).post('/api/v1/sessions');
      const sessionId = sessRes.body.data.sessionId;

      const res = await request(app).get(
        `/api/v1/sessions/${sessionId}/exports/00000000-0000-0000-0000-000000000000/download`
      );
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EXPORT_NOT_FOUND');
    });
  });
});
