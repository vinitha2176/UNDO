# UNDO — Intelligent, Reversible File Organization Assistant

> **"Your files, finally in order."**  
> Built for the **WeMakeDevs No Hands Challenge** using **Google Antigravity** & **Wispr Flow**.

---

## 🌟 The Core Principle & Privacy Boundaries

**The application NEVER deletes, renames, moves, or overwrites original files in your computer's folders.**  
- **Original Local Files vs. Session Copies:** Original files on your computer remain completely untouched and immutable. When files are imported, isolated temporary working copies are stored in `backend/storage/sessions/<sessionId>/uploads` strictly for content extraction and analysis, and are purged upon session cleanup.
- **Localhost vs. Remote Deployments:** In the standard local setup (`localhost:3000` / `localhost:3001`), all file parsing, hashing, and organization calculations occur entirely on your local machine (`127.0.0.1`). In a remote deployment, files are uploaded over HTTP to the backend server. While the backend processes files using self-contained Node.js libraries with **zero external cloud AI API calls** (no OpenAI, Gemini, or Anthropic), files in a remote deployment do travel across the network to that server. UNDO is not a browser-only client application.

---

## 🚀 Key Features

1. **Effortless File & Folder Import:**
   - Drag-and-drop multiple files or dropped folders (`webkitdirectory`).
   - Synthetic **"Try with Sample Files"** mode for instant 90-second evaluation by hackathon judges.
   - Enforces configurable limits (100 files, 20 MB per file, 100 MB per session).

2. **Content-Aware Document Analysis & Clustering:**
   - Modular text extraction across PDF (text layer), DOCX, PPTX, XLSX, CSV, TXT, and Markdown using self-contained Node.js libraries (zero external AI APIs).
   - Statistical TF-IDF vector space modeling with cosine similarity and lexical concept term overlap (not a neural embedding model).
   - Explainable folder suggestions with visible content evidence terms and confidence badges.
   - Exact SHA-256 duplicate detection across different filenames.
   - Conservative near-duplicate and revision detection (≥80% content similarity threshold).
   - **Benchmark Evaluation Results:** On our specific 20-document synthetic multi-format benchmark:
     - **Pairwise Precision:** 100.0% (0 false positives — zero cross-topic contamination).
     - **Pairwise Recall:** 62.5% (9 false negatives — 3 compact single-table CSV files were missed because sparse tabular headers fell below the 0.15 threshold against narrative prose).
     - **F1-Score:** 76.9%.
     - **Rename Invariance:** 100.0% (groupings remained identical after renaming all 20 files).
   - *Limitations Note:* Raster images (JPEG/PNG) are explicitly flagged as requiring OCR. Detecting scanned documents in arbitrary PDFs using text length heuristics is an unverified limitation and true OCR inspection is not implemented.

3. **Interactive Organization Studio:**
   - **Virtual Folder Tree Preview:** Live hierarchical view of proposed folders with file counts and aggregate sizes.
   - **Safe File Renaming:** Rejection of directory traversal (`..`), path separators, Windows reserved names (`CON`, `PRN`, `AUX`, `NUL`), control characters, and trailing dots/spaces. Extension preservation by default with explicit confirmation for changes.
   - **Collision Resolution:** Automatic, predictable conflict resolution (e.g. `notes (1).txt`).
   - **Move to Folder:** Flexible reassignment to any proposed project or category folder.

4. **Dedicated Duplicate Review Center:**
   - Inspect duplicate clusters with SHA-256 byte verification.
   - One-click actions: **Keep All Copies**, **Retain 1 Recommended Copy**, or custom checkbox inclusion.
   - Safe deduplication: excluded copies are omitted from the export archive only; originals remain untouched.

5. **Before & After Visual Comparison:**
   - Side-by-side audit of original files vs proposed destination paths, highlighting renames, reassignments, and exclusions.

6. **Wispr Flow Voice-First Preferences:**
   - Designed for voice dictation using the **external Wispr Flow desktop app**: click inside the instruction box, press your desktop dictation hotkey (e.g. `Fn` or `Caps Lock`), and speak naturally.
   - Multi-instruction clause parser supporting compound spoken preferences such as *"Put all screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies"*.
   - Transparent preview of interpreted rules before applying changes through the backend.
   - *Integration Clarification:* UNDO does not integrate via proprietary in-browser audio APIs; voice input relies on the external Wispr Flow application dictating text into the editable transcript area. Automated tests verify UNDO's transcript parsing and rule execution; desktop voice dictation was verified manually.

7. **Validated Streaming ZIP Export:**
   - Real streaming archive creation with `archiver` and maximum compression.
   - Generates and embeds `undo-manifest.json` at the archive root for complete auditability.
   - Zero path leakage: server filesystem paths are never exposed.

---

## 🏗️ Architecture & Technology Stack

```
UNDO/
├── backend/                  # Node.js 20+ / Express / TypeScript REST API
│   ├── src/
│   │   ├── app.ts            # Express setup, CORS, security headers, centralized error handler
│   │   ├── server.ts         # Server bootstrap & graceful shutdown
│   │   ├── routes/           # Versioned API routes (/api/v1)
│   │   ├── controllers/      # REST endpoint controllers
│   │   ├── services/         # Content extraction, TF-IDF analysis, plan management, deduplication, ZIP export
│   │   ├── middleware/       # Multer isolated upload storage & validation
│   │   ├── utils/            # Streaming SHA-256 hasher, path traversal sanitizer
│   │   ├── schemas/          # Zod validation schemas
│   │   └── test/             # 73 automated tests (unit + integration) + synthetic benchmark
│   └── storage/              # Isolated temporary session uploads & exports (.gitignored)
│
└── frontend/                 # React 18 / Vite / TypeScript / Tailwind CSS Single Page App
    ├── src/
    │   ├── components/
    │   │   ├── layout/       # Header, StepIndicator, Footer
    │   │   ├── upload/       # Drag & drop upload zone + sample files loader
    │   │   ├── analysis/     # Statistics cards, category distribution, search & filter table
    │   │   ├── organizer/    # Virtual folder tree, Before & After audit, file edit modal
    │   │   ├── duplicates/   # Duplicate review center with redundant storage estimation
    │   │   ├── export/       # Export confirmation, ZIP downloader & manifest inspector
    │   │   └── common/       # Button, Badge, Modal, Toast
    │   ├── services/         # Typed API client, Wispr preference interpreter, synthetic sample dataset
    │   ├── utils/            # Byte formatters, date formatters, category badge helpers
    │   └── test/             # 42 automated tests (unit + component + integration)
    └── dist/                 # Production-ready static bundle
```

---

## ⚡ Quick Start (Windows PowerShell)

Open **two separate Windows PowerShell terminal windows**:

### Terminal 1 — Start the Backend API (Port 3001)

```powershell
cd backend
npm install
npm run dev
```

*Expected output: `[Server] UNDO backend server running on http://localhost:3001`*

### Terminal 2 — Start the Frontend Application (Port 3000)

```powershell
cd frontend
npm install
npm run dev
```

*Expected output: `VITE ready in ... ms -> Local: http://localhost:3000/`*  
*Open your browser at `http://localhost:3000`*

---

## 🧪 Running Automated Tests

Both the backend and frontend include automated test suites (115 total automated tests + 13 browser E2E steps). No critical bugs were found in the tested scenarios:

### Run Backend Tests (73 Tests)

```powershell
cd backend
npm test
```

### Run Frontend Tests (42 Tests)

```powershell
cd frontend
npm test
```

### Run Content Intelligence Synthetic Benchmark (20 Files)

```powershell
cd backend
npx tsx src/test/syntheticContentBenchmark.ts
```

### Run Real Chrome Browser E2E Automation (13 Steps)

```powershell
cd backend
npx tsx src/test/realBrowserE2E.ts
```

---

## 📦 Production Build Verification (Windows PowerShell)

Verify clean production builds with zero TypeScript errors:

### Backend Production Build
```powershell
cd backend
npm run build
```

### Frontend Production Build
```powershell
cd frontend
npm run build
```

---

## 📋 Hackathon Evaluation Journey (90 Seconds)

1. Open `http://localhost:3000`.
2. Click **"Try with Sample Files"** on the upload screen (loads synthetic reports, duplicate resumes, diagrams, and project assets).
3. Click **"Analyze & Organize Files"** to see automatic categorization and duplicate detection.
4. Click **"Open Organization Studio"** to browse the **Virtual Folder Studio** and inspect the proposed folder tree.
5. In **"Before & After"**, review proposed destinations or click any file to rename it or move it to a project subfolder.
6. In **"Duplicates"**, switch duplicate retention to *"Retain 1 Copy Only"* to save redundant storage.
7. Click **"Review & Export"** and click **"Download Organized Files"** to receive `undo-organized-files.zip`.
8. Unzip the downloaded archive to inspect the clean folder structure and view `undo-manifest.json`!

