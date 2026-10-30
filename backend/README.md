# Undo Backend — Intelligent Reversible File Organization Engine

> **Core Principle:** The application **never** deletes, renames, moves, or overwrites files in the user's original source folders. All analysis and organization planning operate on isolated temporary sessions and return non-destructive proposals.

---

## Phase 2: Smart File Organization, Editable Plans & Organized ZIP Export

Phase 2 turns the Undo file analysis backend into a complete, reliable, and reversible organization engine.

### Key Capabilities:
- **Editable Organization Plans:** Rename proposed filenames, reassign destination folders, modify categories, adjust project groups, and toggle export inclusion per file.
- **Defensive Filename & Path Validation:** Extension preservation by default, strict directory traversal defense (`..`), Windows reserved name checks (`CON`, `PRN`, `AUX`, `NUL`), trailing dot/space guards, and deterministic collision resolution.
- **Duplicate Retention Management:** Inspect duplicate clusters with redundant storage estimation, choose between retaining all copies, retaining one recommended copy, or custom selective inclusion.
- **Virtual Folder Tree Preview:** Render a complete virtual folder hierarchy showing proposed directory structures, aggregate file sizes, and file counts without creating physical folders.
- **Real Streaming ZIP Export:** Generate an organized ZIP archive on disk using `archiver`, preserving byte-for-byte file fidelity.
- **Machine-Readable Change Manifest (`undo-manifest.json`):** Packaged at the root of every export archive, providing complete traceability without leaking server filesystem paths.
- **Plan Change History & Reset:** In-memory session history tracking every user modification with full rollback to initial proposed plan.

---

## Architecture & Technology Stack

- **Runtime:** Node.js 20+ LTS compatible (tested on Node v24 LTS)
- **Language:** TypeScript 5.7+ (strict mode enabled)
- **Web Framework:** Express.js 4.21+
- **File Upload Engine:** Multer with isolated per-session disk storage and streaming hashes
- **Archive Generation:** Archiver (streaming ZIP engine with maximum compression)
- **Archive Verification:** Adm-Zip (used in automated end-to-end extraction tests)
- **Validation:** Zod schemas
- **Testing:** Vitest 3.0+ & Supertest for end-to-end integration tests

### Directory Structure

```
backend/
├── src/
│   ├── app.ts                  # Express application setup, security headers, CORS, error handling
│   ├── server.ts               # HTTP server bootstrap and graceful shutdown hooks
│   ├── controllers/
│   │   └── sessionController.ts # REST controllers for sessions, uploads, plans, tree, and exports
│   ├── routes/
│   │   ├── healthRoutes.ts      # GET /api/v1/health
│   │   └── sessionRoutes.ts     # /api/v1/sessions routes
│   ├── services/
│   │   ├── sessionService.ts    # Session lifecycle, isolated temp storage, active plan state
│   │   ├── categorizationService.ts # Deterministic file categorization with explicit reasons
│   │   ├── projectGroupingService.ts# Filename keyword prefix analysis for project grouping
│   │   ├── analysisService.ts   # Exact SHA-256 duplicate detection and session summary
│   │   ├── organizationPlanService.ts # Editable plan manager, collision resolver & virtual tree
│   │   └── exportService.ts     # Streaming ZIP generator & undo-manifest.json producer
│   ├── middleware/
│   │   ├── uploadMiddleware.ts  # Multer configuration with size/count limits & safe naming
│   │   └── errorHandler.ts      # Centralized error handler preventing path disclosure
│   ├── utils/
│   │   ├── config.ts            # Environment and application configuration
│   │   ├── hasher.ts            # Streaming SHA-256 calculation (memory-efficient)
│   │   └── sanitizer.ts         # Path traversal defense, filename & folder path sanitizers
│   ├── schemas/
│   │   └── validationSchemas.ts # Zod schemas for parameter and payload validation
│   ├── types/
│   │   └── index.ts             # Domain types, records, duplicate, plan, tree & manifest models
│   └── test/
│       ├── demo.ts              # 12-step end-to-end Phase 2 demonstration runner
│       ├── unit/
│       │   ├── categorization.test.ts
│       │   ├── projectGrouping.test.ts
│       │   ├── sanitizer.test.ts
│       │   ├── organizationPlan.test.ts
│       │   └── phase2Plan.test.ts
│       └── integration/
│           ├── api.test.ts
│           └── phase2Export.test.ts
├── storage/                     # Isolated session uploads & exports (in .gitignore; never committed)
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher

### Installation

```bash
cd backend
npm install
```

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Default variables:
```env
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
STORAGE_DIR=storage
MAX_FILES_PER_UPLOAD=100
MAX_FILE_SIZE_BYTES=20971520      # 20 MB per file
MAX_TOTAL_SESSION_BYTES=104857600  # 100 MB per session
SESSION_TTL_MS=7200000             # 2 hours
SESSION_CLEANUP_INTERVAL_MS=900000 # 15 minutes
```

### Running Locally

```bash
# Start development server with live reload
npm run dev

# Compile TypeScript to dist/
npm run build

# Start production server
npm start

# Run the live interactive Phase 2 end-to-end demo
npm run demo
```

### Running Automated Tests

```bash
# Run complete test suite (unit + integration - 50 tests)
npm test

# Run tests in watch mode
npm run test:watch
```

---

## REST API Reference

All API routes are versioned under `/api/v1`.

### 1. Health Status
- **Method:** `GET`
- **Path:** `/api/v1/health`
- **Response:** `200 OK`
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "timestamp": "2026-10-29T18:00:00.000Z",
    "uptimeSeconds": 15,
    "service": "Undo Backend File Organization Engine"
  }
  ```

---

### 2. Create Upload Session
- **Method:** `POST`
- **Path:** `/api/v1/sessions`
- **Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "4bb4df12-58e1-4c62-8178-5dbf713e2df4",
      "createdAt": "2026-10-29T18:00:00.000Z",
      "expiresAt": "2026-10-29T20:00:00.000Z"
    }
  }
  ```

---

### 3. Upload Files into Session
- **Method:** `POST`
- **Path:** `/api/v1/sessions/:sessionId/files`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `files`: One or more files
  - `relativePaths` (optional): JSON mapping or array of relative paths from directory drops
- **Response:** `200 OK`

---

### 4. Retrieve Current Organization Plan
- **Method:** `GET`
- **Path:** `/api/v1/sessions/:sessionId/plan`
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "4bb4df12-58e1-4c62-8178-5dbf713e2df4",
      "totalFiles": 3,
      "includedInExport": 2,
      "excludedDuplicates": 1,
      "targetFolders": ["Documents", "Images"],
      "plan": [
        {
          "fileId": "7acfa421-2f3b-410a-bdf3-ecdbff128912",
          "originalName": "report.pdf",
          "proposedFilename": "report.pdf",
          "proposedDestinationFolder": "Documents",
          "proposedPath": "Documents/report.pdf",
          "category": "documents",
          "groupingReason": "Assigned to 'Documents' based on .pdf extension",
          "duplicateStatus": {
            "isDuplicate": false,
            "isPrimary": true,
            "totalCopies": 2
          },
          "isIncludedInExport": true,
          "userModified": false
        }
      ]
    }
  }
  ```

---

### 5. Update Plan Item (Rename, Move, Include/Exclude)
- **Method:** `PATCH`
- **Path:** `/api/v1/sessions/:sessionId/plan/files/:fileId`
- **Body:**
  ```json
  {
    "proposedFilename": "q1_financial_report.pdf",
    "proposedDestinationFolder": "Projects/Finance/Reports",
    "isIncludedInExport": true,
    "allowExtensionChange": false
  }
  ```
- **Response:** `200 OK` with updated plan item.

---

### 6. Reset Plan to Initial State
- **Method:** `POST`
- **Path:** `/api/v1/sessions/:sessionId/plan/reset`
- **Response:** `200 OK` with restored organization plan summary.

---

### 7. Virtual Folder Tree Preview
- **Method:** `GET`
- **Path:** `/api/v1/sessions/:sessionId/plan/tree`
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "4bb4df12-58e1-4c62-8178-5dbf713e2df4",
      "summary": {
        "totalImportedFiles": 3,
        "includedFiles": 2,
        "excludedFiles": 1,
        "duplicateGroups": 1,
        "estimatedOutputSize": 45200,
        "folderCount": 2,
        "renamedCount": 1,
        "reassignedCount": 1,
        "unresolvedConflicts": 0
      },
      "tree": {
        "name": "Organized Files",
        "type": "folder",
        "relativePath": "",
        "fileCount": 2,
        "aggregateSize": 45200,
        "children": [
          {
            "name": "Documents",
            "type": "folder",
            "relativePath": "Documents",
            "fileCount": 1,
            "aggregateSize": 15420,
            "children": [
              {
                "name": "q1_financial_report.pdf",
                "type": "file",
                "relativePath": "Documents/q1_financial_report.pdf",
                "fileId": "7acfa421-2f3b-410a-bdf3-ecdbff128912",
                "aggregateSize": 15420
              }
            ]
          }
        ]
      }
    }
  }
  ```

---

### 8. View Duplicate Groups
- **Method:** `GET`
- **Path:** `/api/v1/sessions/:sessionId/duplicates`
- **Response:** `200 OK` with duplicate groups, redundant storage estimation, and per-copy inclusion status.

---

### 9. Update Duplicate Retention Choices
- **Method:** `PATCH`
- **Path:** `/api/v1/sessions/:sessionId/duplicates/:groupId`
- **Actions:**
  - `keep_all`: Retain every duplicate copy in the export.
  - `retain_one`: Retain primary copy and exclude all other copies.
  - `exclude_selected`: Exclude specific `fileIds`.
  - `include_selected`: Include specific `fileIds`.
- **Body Example:**
  ```json
  {
    "action": "retain_one",
    "primaryFileId": "7acfa421-2f3b-410a-bdf3-ecdbff128912"
  }
  ```

---

### 10. View Plan Change History
- **Method:** `GET`
- **Path:** `/api/v1/sessions/:sessionId/changes`
- **Response:** `200 OK` with list of recorded modifications (`FILE_RENAMED`, `DESTINATION_CHANGED`, `PLAN_RESET`, etc.).

---

### 11. Generate Organized ZIP Export
- **Method:** `POST`
- **Path:** `/api/v1/sessions/:sessionId/exports`
- **Description:** Streams selected session files and `undo-manifest.json` into an isolated archive on disk.
- **Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "exportId": "f98c21a4-98e2-4ef1-b542-ecdbff128912",
      "sessionId": "4bb4df12-58e1-4c62-8178-5dbf713e2df4",
      "filename": "undo-organized-4bb4df12.zip",
      "sizeBytes": 42100,
      "fileCount": 2,
      "createdAt": "2026-10-29T18:15:00.000Z",
      "expiresAt": "2026-10-29T20:15:00.000Z"
    }
  }
  ```

---

### 12. Download Export Archive
- **Method:** `GET`
- **Path:** `/api/v1/sessions/:sessionId/exports/:exportId/download`
- **Response:** Binary ZIP download stream with `Content-Type: application/zip`.

---

## Change Manifest Structure (`undo-manifest.json`)

Included inside the root of every exported ZIP:

```json
{
  "application": "UNDO",
  "manifestVersion": "1.0",
  "exportTimestamp": "2026-10-29T18:15:00.000Z",
  "sessionReference": "4bb4df12-58e1-4c62-8178-5dbf713e2df4",
  "totalImportedFiles": 3,
  "totalExportedFiles": 2,
  "totalExcludedFiles": 1,
  "files": [
    {
      "fileId": "7acfa421-2f3b-410a-bdf3-ecdbff128912",
      "originalFilename": "report.pdf",
      "originalRelativePath": "Downloads/report.pdf",
      "exportedPath": "Projects/Finance/q1_financial_report.pdf",
      "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "fileSizeBytes": 15420,
      "renamed": true,
      "reassigned": true,
      "isDuplicate": false,
      "duplicateOfFileId": null,
      "excluded": false,
      "exclusionReason": null,
      "category": "documents",
      "group": "Finance"
    }
  ]
}
```

---

## Security Implementation

1. **Zero Original Modification:** Original files are never modified, renamed, moved, or deleted.
2. **Defensive Validation:** Rejects directory traversal (`..`), absolute paths, Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`), control characters, and trailing dots/spaces.
3. **ZIP-Slip Protection:** Validates and normalizes entry paths prior to writing into the archive.
4. **No Direct Path Disclosure:** Absolute server filesystem paths are systematically stripped from all JSON responses, manifests, and error messages.
5. **Session Isolation:** Uploads and exports are quarantined under UUID v4 subdirectories in temporary storage and cleaned up on expiration.
