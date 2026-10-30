# UNDO — Intelligent, Reversible File Organization Assistant

> **"Your files, finally in order."**  
> Built for the **WeMakeDevs No Hands Challenge** using **Google Antigravity** & **Wispr Flow**.

---

## 🌟 The Core Principle

**The application NEVER deletes, renames, moves, or overwrites files in your original source folders.**  
All analysis, categorization, collision resolution, and duplicate decisions operate inside isolated temporary sessions and generate non-destructive organization proposals. The user reviews and customizes the plan before downloading a clean, organized ZIP archive containing a machine-readable change manifest (`undo-manifest.json`).

---

## 🚀 Key Features

1. **Effortless File & Folder Import:**
   - Drag-and-drop multiple files or dropped folders (`webkitdirectory`).
   - Synthetic **"Try with Sample Files"** mode for instant 90-second evaluation by hackathon judges.
   - Enforces configurable limits (100 files, 20 MB per file, 100 MB per session).

2. **Intelligent File Analysis:**
   - Real-time categorization (documents, spreadsheets, presentations, images, audio, video, archives, source code).
   - Exact SHA-256 duplicate detection across different filenames.
   - Project group suggestions based on common prefix conventions (e.g. `pathfinder_*`).
   - Calculation of potential redundant storage savings.

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

6. **Wispr Flow Dictation Ready:**
   - Voice-friendly organization preference interpreter supporting spoken instructions such as *"Put all screenshots into Assets and keep presentations separate"*.
   - Transparent preview of interpreted rules before applying changes through the backend.

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
│   │   ├── services/         # File analysis, plan management, deduplication, streaming ZIP export
│   │   ├── middleware/       # Multer isolated upload storage & validation
│   │   ├── utils/            # Streaming SHA-256 hasher, path traversal sanitizer
│   │   ├── schemas/          # Zod validation schemas
│   │   └── test/             # 50 automated tests (unit + integration) + live demo script
│   └── storage/              # Isolated session uploads & temporary exports (.gitignored)
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
    │   ├── services/         # Typed API client & synthetic sample dataset
    │   ├── utils/            # Byte formatters, date formatters, category badge helpers
    │   └── test/             # 11 unit & end-to-end integration tests
    └── dist/                 # Production-ready static bundle
```

---

## ⚡ Quick Start

### 1. Start the Backend API (Port 3001)

```bash
cd backend
npm install
npm run dev
```

*Backend runs on `http://localhost:3001/api/v1`*

### 2. Start the Frontend Application (Port 3000)

```bash
cd frontend
npm install
npm run dev
```

*Open your browser at `http://localhost:3000`*

---

## 🧪 Running Automated Tests

Both the backend and frontend include automated test suites:

### Run Backend Tests (50 Tests)

```bash
cd backend
npm test
```

### Run Frontend Tests (11 Tests)

```bash
cd frontend
npm test
```

### Run the Interactive Phase 2 Demo

```bash
cd backend
npm run demo
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

