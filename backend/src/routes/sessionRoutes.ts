import { Router, Request, Response, NextFunction } from 'express';
import { sessionController } from '../controllers/sessionController';
import { uploadMiddleware } from '../middleware/uploadMiddleware';
import { SessionIdParamSchema } from '../schemas/validationSchemas';
import { sessionCreationLimiter, fileUploadLimiter } from '../middleware/rateLimiter';

export const sessionRouter = Router();

// Middleware to validate sessionId route parameter format before reaching upload or handler
const validateSessionId = (req: Request, res: Response, next: NextFunction) => {
  try {
    SessionIdParamSchema.parse(req.params);
    next();
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/sessions - Create an isolated upload session (protected with IP rate limiting)
sessionRouter.post('/sessions', sessionCreationLimiter, (req, res, next) => {
  sessionController.createSession(req, res, next);
});

// POST /api/v1/sessions/:sessionId/files - Upload files into the session (protected with IP rate limiting)
sessionRouter.post(
  '/sessions/:sessionId/files',
  fileUploadLimiter,
  validateSessionId,
  uploadMiddleware.array('files'),
  (req, res, next) => {
    sessionController.uploadFiles(req, res, next);
  }
);

// GET /api/v1/sessions/:sessionId/files - Return metadata of uploaded files
sessionRouter.get('/sessions/:sessionId/files', validateSessionId, (req, res, next) => {
  sessionController.getSessionFiles(req, res, next);
});

// GET /api/v1/sessions/:sessionId/analysis - Return full file analysis, duplicate groups, project groups
sessionRouter.get('/sessions/:sessionId/analysis', validateSessionId, (req, res, next) => {
  sessionController.getSessionAnalysis(req, res, next);
});

// GET /api/v1/sessions/:sessionId/plan - Return proposed organization plan
sessionRouter.get('/sessions/:sessionId/plan', validateSessionId, (req, res, next) => {
  sessionController.getSessionPlan(req, res, next);
});

// PATCH /api/v1/sessions/:sessionId/plan/files/:fileId - Update an individual file's organization settings
sessionRouter.patch(
  '/sessions/:sessionId/plan/files/:fileId',
  validateSessionId,
  (req, res, next) => {
    sessionController.updatePlanFile(req, res, next);
  }
);

// POST /api/v1/sessions/:sessionId/plan/reset - Restore the initial generated plan
sessionRouter.post('/sessions/:sessionId/plan/reset', validateSessionId, (req, res, next) => {
  sessionController.resetPlan(req, res, next);
});

// GET /api/v1/sessions/:sessionId/plan/tree - Return the virtual folder hierarchy and statistics
sessionRouter.get('/sessions/:sessionId/plan/tree', validateSessionId, (req, res, next) => {
  sessionController.getPlanTree(req, res, next);
});

// GET /api/v1/sessions/:sessionId/duplicates - Return exact duplicate groups and related retention choices
sessionRouter.get('/sessions/:sessionId/duplicates', validateSessionId, (req, res, next) => {
  sessionController.getDuplicateGroups(req, res, next);
});

// PATCH /api/v1/sessions/:sessionId/duplicates/:groupId - Update duplicate-retention choices for a group
sessionRouter.patch(
  '/sessions/:sessionId/duplicates/:groupId',
  validateSessionId,
  (req, res, next) => {
    sessionController.updateDuplicateGroup(req, res, next);
  }
);

// GET /api/v1/sessions/:sessionId/changes - Return plan change history for the session
sessionRouter.get('/sessions/:sessionId/changes', validateSessionId, (req, res, next) => {
  sessionController.getPlanChanges(req, res, next);
});

// POST /api/v1/sessions/:sessionId/exports - Validate the plan and create an organized ZIP export
sessionRouter.post('/sessions/:sessionId/exports', validateSessionId, (req, res, next) => {
  sessionController.createExport(req, res, next);
});

// GET /api/v1/sessions/:sessionId/exports/:exportId/download - Stream and download generated ZIP archive
sessionRouter.get(
  '/sessions/:sessionId/exports/:exportId/download',
  validateSessionId,
  (req, res, next) => {
    sessionController.downloadExport(req, res, next);
  }
);
