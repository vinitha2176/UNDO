# UNDO Backend Specification & Instructions

We are building Undo, an intelligent reversible file organization assistant.
Core Principle: The application must never delete, rename, move or overwrite files in the user's original folders. Our initial backend will handle file analysis and organization planning. Do not implement the frontend yet.

## Technology Stack
- Node.js 20+ LTS compatible runtime
- TypeScript
- Express.js
- Keep dependencies minimal

## 1. Backend Folder Structure
Create a project with the backend directory and suggested structure:
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── utils/
│   ├── types/
│   ├── schemas/
│   └── test/
├── storage/ (isolated temp session storage; must be in .gitignore)
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md

The storage directory must not be committed to git.

## 2. File Upload Engine
Implement support for importing multiple files:
- Accept multipart uploads.
- Support PDF, DOCX, TXT, CSV, XLSX, PNG, JPEG, ZIP, and common development files as ordinary files.
- Preserve safe metadata such as original file name, extension, size, and relative folder path if supplied.
- Generate an internal unique file identifier.
- Never trust client-provided paths. Prevent directory traversal.
- Enforce configurable limits on file count, per-file size, and total upload size.
- Reject invalid or oversized files with meaningful errors.
- Keep uploaded files in isolated temporary session directories.
- Never extract uploaded ZIP archives during this phase.
- Never execute uploaded scripts or documents.
- Never modify the user's source folder.
- Reasonable limits for MVP: 100 files, 20 MB per file, configurable total limit (e.g. 100 MB).
- Handle duplicate file names. Each newly uploaded file cannot overwrite another.
- Implement cleanup for expired temporary sessions.

## 3. File Analysis Engine
For every uploaded file extract:
- Unique file ID
- Original file name
- Extension
- MIME type when available
- File size
- SHA256 hash
- File category
- Suggested group
- Original relative path when available

Calculate SHA256 using streaming where practical without unnecessarily loading entire files into memory.
Use the hash to detect exact duplicate files. Files with identical SHA256 hashes should be grouped as potential exact duplicates.
Do not claim different files are duplicates merely because their names are similar.
Show which files are duplicates and which file could be retained in the exported collection, and which duplicates to exclude.
Code must remain under user control.

## 4. Automatic File Categorization
Implement a deterministic categorization engine.
Initial categories:
- documents
- images
- videos
- audio
- spreadsheets
- presentations
- archives
- source code
- others

Use file extensions and validated metadata for basic categorization.
Additionally implement simple project group suggestions using file name keywords (e.g., `pathfinder_report.pdf`, `pathfinder_diagram.png`, `pathfinder_presentation.pptx` belonging to project "pathfinder").
Avoid overconfident categorization. Do not pretend the system has read or understood the internal contents.
Return a reason for each categorization or suggested grouping.

## 5. Organization Plan
Generate a proposed folder structure from the analysis.
Example: organized files -> documents, images, spreadsheets, source code, archives, etc.
When a meaningful project group is detected, suggest a project-based folder instead.
Do not automatically change original files.
Return a structured organization plan containing:
- File ID
- Original file name
- Proposed filename
- Proposed destination folder
- Category
- Grouping reason
- Duplicate status (isDuplicate, duplicateOf, isPrimary)
- Whether the file is included in the proposed export

Ensure proposed paths are safe and unique. If two files produce the same destination path, resolve conflict predictably without overwriting (e.g. appending counter: `report (1).pdf`).
The plan should be editable through the API in a later phase.

## 6. REST API
Implement versioned REST endpoints:
- `GET /api/v1/health`: Return backend health status.
- `POST /api/v1/sessions`: Create an isolated upload session.
- `POST /api/v1/sessions/:sessionId/files`: Upload files into the session.
- `GET /api/v1/sessions/:sessionId/files`: Return file metadata list for session.
- `GET /api/v1/sessions/:sessionId/analysis`: Return total files, total size, file categories summary, duplicate groups, suggested project groups, and individual file metadata.
- `GET /api/v1/sessions/:sessionId/plan`: Return the initial proposed organization plan.

Use consistent JSON response structures and meaningful HTTP status codes.
Validate all IDs, request inputs, filenames, and metadata.
Do not expose absolute server filesystem paths.

## 7. Security Requirements
- Safe path handling (sanitize filenames, strip directory traversal `../`, null bytes, control chars).
- Upload size restrictions (max files, max file size, max total size).
- Strict session isolation.
- Random, unguessable session identifiers (UUID v4 / crypto random).
- Safe temporary file naming (storage by internal ID, not raw client filename).
- Request validation.
- Centralized error handling.
- No arbitrary filesystem access.
- No shell command execution based on filenames.
- No automatic deletion of user source files.
- No automatic opening or execution of uploaded files.
- No hardcoded secrets.
- CORS configured for known local development origins.
- No public exposure of temporary upload directories.
- Treat filenames and client-supplied relative paths as untrusted data.
- Local-development only for MVP; identify production authentication/isolation/retention requirements in docs.

## 8. Error Handling
Handle:
- Empty upload request
- Unsupported or malformed request
- Invalid session IDs
- Expired sessions
- Oversized files
- Duplicate file names in upload
- Files without extension
- File reading error
- Storage failures
- Unexpected server exceptions
Errors should be understandable and never leak internal file system paths.

## 9. Testing
Write automated tests for:
- Successful session creation
- Successful multiple-file upload
- Correct file metadata extraction
- Correct SHA-256 hashing
- Detection of exact duplicates
- Different files sharing the same filename
- Correct categorization
- Project grouping suggestions
- Safe destination path generation
- Path traversal attempts
- Upload size limits
- Empty uploads
- Invalid session IDs
- Error handling
Create safe, synthetic test files. Do not use or modify personal user directories.

## 10. Development Instructions
1. Work incrementally.
2. Inspect the current workspace.
3. Create the package structure.
4. Install necessary dependencies.
5. Configure TypeScript and development server.
6. Implement file upload and session handling.
7. Implement metadata extraction and hashing.
8. Implement duplicate detection.
9. Implement categorization.
10. Implement organization planning.
11. Add API routes and validation.
12. Write automated tests.
13. Run the tests and fix failures.
Do not create the frontend. Do not implement zip export yet. Do not add AI integrations.
Demonstrate the API with actual local test requests.
Produce clear summary and README.

# UNDO — PHASE 2: Smart File Organization, Editable Plans & ZIP Export

Act as a senior backend engineer, TypeScript developer, software architect, and security-focused QA engineer.

We are continuing development of **UNDO — An Intelligent, Reversible File Organization Assistant**, built for the WeMakeDevs No Hands Challenge using Google Antigravity and Wispr Flow.

Phase 1 established the backend for file uploads, file metadata extraction, SHA-256 duplicate detection, file categorization, project grouping, and organization-plan generation.

Now implement **Phase 2: Editable Organization Plans, Safe Duplicate Management, ZIP Export, and Change History.**

Our goal is to turn the existing backend into a complete, reliable file organization engine.

## 1. IMPORTANT: CONTINUE THE EXISTING PROJECT

Before implementing anything:

1. Inspect the current backend project.
2. Review the Phase 1 folder structure, routes, services, schemas, and tests.
3. Run existing automated tests.
4. Identify what is already implemented and what is incomplete.
5. Reuse existing working code.
6. Do not recreate the application from scratch.
7. Do not overwrite existing functionality unnecessarily.
8. Preserve API compatibility wherever practical.

If Phase 1 has unresolved defects affecting file integrity, fix those before implementing Phase 2.

Do not build the frontend yet.

Do not introduce AI APIs or unnecessary cloud services.

## 2. PRIMARY OBJECTIVE

The backend must support this complete workflow:

Upload Files → Analyze Files → Generate Organization Plan → Review and Modify Plan → Detect Destination Conflicts → Generate Organized ZIP → Download Result → Review Change Manifest.

The user's original files must remain untouched.

All organization actions apply only to a proposed output collection, never directly to the original folder.

## 3. FEATURE 1 — EDITABLE ORGANIZATION PLAN

Extend the existing organization-plan engine.

For each uploaded file, maintain:

- Unique file ID.
- Original filename.
- Original relative path, when available.
- SHA-256 hash.
- File category.
- Suggested project group.
- Proposed filename.
- Proposed destination directory.
- Whether the file should be included in export.
- Duplicate group ID, if applicable.
- Reason for the suggested organization.

Create APIs allowing users to modify individual plan entries.

Supported actions:

1. Rename a file in the proposed output.
2. Change its destination folder.
3. Change its category.
4. Assign it to a different project group.
5. Exclude it from export.
6. Include a previously excluded file.
7. Restore its original proposed organization.

All changes must be validated.

Never rename or move the uploaded source files during these operations.

Changes should update the stored organization plan only.

Use stable file IDs rather than filenames to identify files.

### Example

Original files:

- report.pdf
- diagram.png
- presentation.pptx
- notes.txt

Proposed output:

Organized Files/
- Documents/report.pdf
- Images/diagram.png
- Presentations/presentation.pptx
- Documents/notes.txt

User changes:

Move `diagram.png` into `Project Alpha/Assets/`.

Expected output:

Organized Files/
- Documents/report.pdf
- Project Alpha/Assets/diagram.png
- Presentations/presentation.pptx
- Documents/notes.txt

The original uploaded files must remain unchanged.

## 4. FEATURE 2 — SAFE FILE RENAMING

Implement a robust filename validation and renaming engine.

Requirements:

- Preserve extensions by default.
- Allow intentional extension changes only through an explicit, validated operation.
- Prevent directory traversal attacks.
- Reject absolute paths.
- Reject null bytes.
- Reject path separator characters inside filenames.
- Handle Unicode filenames safely.
- Reject reserved or unsafe names.
- Handle Windows reserved names such as CON, PRN, AUX, and NUL.
- Prevent trailing-dot and trailing-space filename conflicts on Windows.
- Detect case-insensitive filename collisions for cross-platform ZIP compatibility.
- Enforce sensible filename and path length limits.
- Reject invalid or empty filenames.
- Never overwrite another file silently.

If two files would have the same destination filename, generate a safe alternative.

Example:

report.pdf
report.pdf

Possible output:

report.pdf
report (2).pdf

Do not rename files unpredictably.

Use deterministic conflict-resolution rules.

Return clear validation errors if a requested rename cannot be applied.

## 5. FEATURE 3 — DUPLICATE FILE MANAGEMENT

Extend Phase 1 SHA-256 duplicate detection.

Detect files containing identical data, even when their filenames differ.

For each duplicate group, return:

- Duplicate group ID.
- File IDs.
- Original filenames.
- File sizes.
- SHA-256 hash.
- Number of copies.
- Estimated redundant storage.

Example:

report.pdf — 2 MB
report_copy.pdf — 2 MB
report_final.pdf — 2 MB

If their SHA-256 hashes match, identify them as an exact duplicate group.

Estimated redundant storage:

4 MB, assuming only one copy is retained.

### Duplicate actions

Allow the user to:

1. Keep every copy.
2. Select one copy to retain.
3. Exclude selected duplicate copies from export.
4. Restore previously excluded copies.
5. View which files belong to each duplicate group.

**Critical requirement:**

Never permanently delete duplicate files.

Duplicate exclusion only affects the generated ZIP.

Never assume that the first or newest file is automatically the correct copy to retain.

Provide a recommended copy, but make the selection explicit.

Deduplication is optional. Without user action, retain all imported files.

## 6. FEATURE 4 — ORGANIZATION PLAN PREVIEW

Create an API that returns a complete virtual folder tree.

The tree should show how the exported collection will look.

Example:

Organized Files/
├── Documents/
│   ├── report.pdf
│   └── notes.txt
├── Project Alpha/
│   ├── diagram.png
│   └── presentation.pptx
├── Spreadsheets/
│   └── budget.xlsx
└── Archives/
    └── source.zip

Return structured JSON rather than a plain text tree.

Each node should have:

- Name.
- Type: file or folder.
- Relative path.
- Child nodes, where applicable.
- Associated file ID for file nodes.
- File count for folders, where useful.
- Aggregate size, where useful.

Include summary statistics:

- Total imported files.
- Included files.
- Excluded files.
- Duplicate groups.
- Estimated output size.
- Number of proposed folders.
- Number of renamed files.
- Number of reassigned files.
- Unresolved conflicts.

The folder tree must update whenever the organization plan changes.

No physical folders should be created during preview.

## 7. FEATURE 5 — ORGANIZED ZIP GENERATION

This is the most important Phase 2 feature.

Implement a real ZIP export engine using Archiver or another suitable maintained Node.js library.

### Expected workflow

1. User uploads files.
2. Backend stores files within an isolated session.
3. User reviews the proposed organization.
4. Backend validates the final plan.
5. User requests ZIP export.
6. Backend creates the archive from the selected session files.
7. User downloads the organized ZIP.

### ZIP requirements

- Preserve original file contents exactly.
- Use the proposed names and destination folders.
- Respect excluded files.
- Include only the files belonging to the current session.
- Never access arbitrary local filesystem paths.
- Stream files into the archive where possible.
- Avoid loading every file into memory.
- Prevent duplicate ZIP entry paths.
- Prevent path traversal and ZIP-slip vulnerabilities.
- Reject unsafe names and destination paths.
- Handle compression errors.
- Handle aborted downloads safely.
- Never return a partially generated archive as a successful export.
- Do not overwrite uploaded source files.

If archive generation fails, return a meaningful error and clean up temporary export artifacts.

For the hackathon MVP, prefer generating a validated temporary ZIP before returning it, so incomplete archives are not served as successful downloads.

Do not extract ZIP files.

Treat uploaded ZIP archives as ordinary files.

### Important

The output must be a real ZIP archive.

Do not simulate ZIP export by returning JSON metadata or a fake download URL.

Verify the archive by extracting it into an isolated temporary test directory and comparing its contents against the expected files.

Never extract test archives into the user's original directories.

## 8. FEATURE 6 — CHANGE MANIFEST

Every generated ZIP must include a machine-readable file named:

`undo-manifest.json`

The manifest should contain:

- Application name.
- Manifest version.
- Export timestamp.
- Session reference.
- Number of imported files.
- Number of exported files.
- Number of excluded files.
- File-by-file organization history.
- Original filename.
- Original relative path, if available.
- Final exported path, if included.
- Original SHA-256 hash.
- Renamed status.
- Reassigned status.
- Duplicate status.
- Excluded status.
- Relevant exclusion reason.

Example:

{
  "application": "UNDO",
  "manifestVersion": "1.0",
  "files": [
    {
      "fileId": "example-id",
      "originalFilename": "report.pdf",
      "originalPath": "Downloads/report.pdf",
      "exportedPath": "Documents/report.pdf",
      "renamed": false,
      "reassigned": true,
      "excluded": false
    }
  ]
}

This is an illustrative structure. Extend it appropriately.

Never include server absolute paths, API secrets, or internal storage paths.

If the source relative path is not available, record null instead of inventing a path.

### Important distinction

The manifest provides traceability and makes the transformation understandable.

Since this MVP does not modify source files, do not claim that it supports fully automatic reversal of operations on a user's actual filesystem.

The original files remain untouched, so the user can discard the exported collection or revise the plan and export again.

## 9. FEATURE 7 — PLAN CHANGE HISTORY

Implement a lightweight change history for the active session.

Track:

- File ID.
- Change type.
- Previous value.
- New value.
- Timestamp.

Supported changes:

- File renamed.
- Destination changed.
- Category changed.
- File excluded.
- File included.
- Duplicate selection changed.
- Plan restored to its initial state.

Provide an endpoint for retrieving this history.

Implement a reliable reset-to-original-plan operation.

If practical, add undo for the most recent plan modification, but prioritize reset functionality first.

Do not build an unnecessarily complex event-sourcing system.

Do not treat this history as a substitute for real source-file backups.

## 10. REST API ENDPOINTS

Extend the existing `/api/v1` API.

Keep the Phase 1 endpoints working.

Implement endpoints equivalent to:

**GET /api/v1/sessions/:sessionId/plan**

Retrieve the current editable plan.

**PATCH /api/v1/sessions/:sessionId/plan/files/:fileId**

Update an individual file's organization settings.

**POST /api/v1/sessions/:sessionId/plan/reset**

Restore the initial generated plan.

**GET /api/v1/sessions/:sessionId/plan/tree**

Return the virtual folder hierarchy.

**GET /api/v1/sessions/:sessionId/duplicates**

Return exact duplicate groups and related metadata.

**PATCH /api/v1/sessions/:sessionId/duplicates/:groupId**

Update duplicate-retention choices.

**GET /api/v1/sessions/:sessionId/changes**

Return plan change history.

**POST /api/v1/sessions/:sessionId/exports**

Validate the plan and create an organized ZIP export.

**GET /api/v1/sessions/:sessionId/exports/:exportId/download**

Download the generated archive.

Use appropriate REST semantics, clear status codes, and Zod request validation.

Do not expose direct server filesystem paths.

If the existing codebase uses a different but consistent API structure, adapt rather than duplicating routes.

## 11. SECURITY AND FILE SAFETY

This application processes arbitrary user-provided filenames and file content.

Implement defensive validation throughout.

Mandatory protections:

1. Verify session and file ownership within the local session model.
2. Never allow a file ID from one session to access another session's files.
3. Validate every supplied filename.
4. Validate every proposed destination path.
5. Reject `../`, absolute paths, drive paths, null bytes, and unsafe path components.
6. Prevent symlink-based escapes from the managed storage area.
7. Prevent duplicate archive entry names.
8. Enforce per-session file count and storage limits.
9. Enforce export-size and temporary-storage limits.
10. Never execute uploaded files.
11. Never extract uploaded archives during normal operation.
12. Keep user uploads and generated exports outside the web-served static directory.
13. Handle concurrent plan edits and exports safely.
14. Clean up expired exports and sessions.
15. Avoid leaking sensitive filenames or file metadata through logs.

The backend must not be publicly deployed with unrestricted anonymous file upload access.

For production deployment, document required rate limiting, access control, storage isolation, retention, and privacy protections.

Do not introduce public deployment before these risks are addressed.

## 12. TESTING — MANDATORY

Use Vitest and Supertest where appropriate.

Add automated tests for:

### Plan modification
- Rename a valid file.
- Reject an invalid filename.
- Update destination folder.
- Reject unsafe paths.
- Exclude and reinclude files.
- Reset the plan.
- Verify plan changes persist within the active session.

### Duplicate management
- Detect identical file contents.
- Identify duplicate files with different names.
- Keep all duplicate files by default.
- Exclude one selected duplicate.
- Restore excluded duplicates.
- Calculate redundant storage correctly.

### Folder tree
- Generate the correct folder hierarchy.
- Update the tree after a rename.
- Update the tree after a folder reassignment.
- Exclude omitted files.
- Handle filename conflicts.

### ZIP export
- Generate a valid ZIP.
- Include the expected files.
- Preserve the correct file bytes.
- Preserve directory hierarchy.
- Exclude deselected files.
- Include the manifest.
- Verify every exported file's SHA-256 against its uploaded source.
- Verify archive integrity.
- Reject unsafe archive paths.
- Prevent duplicate entries.
- Handle empty exports.
- Handle export errors and cleanup.

### Security
- Reject path traversal.
- Reject attempts to access another session.
- Reject invalid file IDs.
- Reject invalid export IDs.
- Reject unsafe rename operations.
- Handle expired sessions.
- Handle conflicting export operations.

Test with synthetic files only.

Do not access or modify any real personal folders.

## 13. API DEMONSTRATION

After implementing the features, run a genuine end-to-end backend demonstration.

Use a synthetic sample dataset containing:

- Two identical PDFs with different filenames.
- Two images with different content.
- Three files belonging to one fictional project.
- One spreadsheet.
- One source code file.
- Two files that would create a destination name conflict.

Demonstrate:

1. Upload the sample files.
2. Retrieve the generated organization plan.
3. Identify exact duplicates.
4. Rename a file.
5. Change its destination folder.
6. Exclude one duplicate.
7. Retrieve the updated virtual folder tree.
8. Generate the ZIP.
9. Download and validate the ZIP.
10. Extract the ZIP in a controlled temporary test directory.
11. Verify the exported files against their original SHA-256 hashes.
12. Confirm the uploaded source files were not modified.

Report real outcomes only.

Do not claim success unless these operations have been executed.

## 14. DEVELOPMENT ORDER

Implement incrementally.

**Step 1:** Review Phase 1 and run its tests.

**Step 2:** Implement editable organization plans.

**Step 3:** Implement secure filename and destination validation.

**Step 4:** Implement duplicate-retention management.

**Step 5:** Implement the virtual folder tree.

**Step 6:** Implement the change manifest.

**Step 7:** Implement ZIP generation and download.

**Step 8:** Implement change history and plan reset.

**Step 9:** Add automated tests.

**Step 10:** Execute a complete end-to-end test.

Avoid major architecture changes unless they are necessary.

Do not spend excessive time on optional optimizations while core functionality remains incomplete.

## 15. DEFINITION OF DONE

Phase 2 is complete only when:

- Phase 1 functionality still works.
- Users can edit the organization plan.
- Files can be renamed in the proposed output.
- Files can be reassigned to other folders.
- Duplicate files can be selectively excluded.
- A correct virtual folder hierarchy is generated.
- A valid ZIP archive can be downloaded.
- The ZIP contains the expected files and directory structure.
- File bytes remain unchanged.
- A complete change manifest is included.
- Source files remain untouched.
- Unsafe paths are rejected.
- Automated tests pass.
- No critical file-safety issues remain.

## 16. FINAL OUTPUT

After implementation, provide:

1. Summary of completed features.
2. Updated project structure.
3. List of API endpoints.
4. Automated test results.
5. End-to-end ZIP verification results.
6. Known limitations.
7. Instructions to start and test the backend locally.
8. Recommendations for Phase 3 frontend development.

Do not begin Phase 3 automatically.

Do not create placeholder frontend components.

Do not invent test results.

Do not claim that incomplete functionality is working.

**The central promise of UNDO:**

"Organize your files intelligently, review every change, and keep your originals safe."

Build Phase 2 to make that promise real.

Start by inspecting the existing Phase 1 implementation and verifying its tests, then implement Phase 2.
