# UNDO — Challenge Submission Notes

**WeMakeDevs No Hands Challenge**  
**Project:** UNDO — An Intelligent, Reversible File Organization Assistant  
**Developed with:** Google Antigravity & Wispr Flow  
**Target Architecture:** Node.js, Express, React, TypeScript, Tailwind CSS  

---

## 1. Project Overview & Problem Statement

### The Problem
Almost everyone's computer contains messy file collections: bloated `Downloads` folders, desktop clutter, mixed project archives, and duplicate copies scattered across nested directories.

Existing file management tools fall into two unsatisfactory extremes:
1. **Destructive Automated Cleaners:** Tools that delete or rename files in-place with high risk of data loss.
2. **Cloud AI Upload Tools:** Services that require uploading sensitive personal documents to external cloud APIs, violating user privacy and security.

### The UNDO Solution
**UNDO** is an intelligent, reversible, and non-destructive file organization assistant. It helps users organize messy file collections into clean, structured folder hierarchies without ever modifying original files.

**The Golden Rule of UNDO:**
> **The user's original source files on disk are 100% immutable and untouched.**  
- **Original Files vs. Session Copies:** When files are imported, isolated temporary session copies are stored in `backend/storage/sessions/<sessionId>/uploads` strictly for content extraction and analysis, and are purged upon session cleanup.
- **Localhost vs. Remote Deployments:** When running locally (`localhost:3000` / `localhost:3001`), all file parsing, hashing, and organization calculations occur entirely on your local machine (`127.0.0.1`). In a remote deployment, files are sent over HTTP to the backend server. While the backend processes files using self-contained Node.js libraries with **zero external cloud AI API calls** (no OpenAI, Gemini, or Anthropic), files in a remote deployment do travel across the network to that server. UNDO is not a browser-only client application.

---

## 2. Key Features

1. **Flexible Ingestion & Instant Evaluation:**
   - Drag-and-drop file collections or entire directory trees (`webkitdirectory`).
   - One-click **"Try with Sample Files"** mode staging 30 synthetic multi-format files for immediate evaluation by hackathon judges.
2. **Content-Aware Document Extraction:**
   - Modular text extraction across PDF (text layer), DOCX, PPTX, XLSX, CSV, TXT, and Markdown.
   - Enforces strict safety guardrails (25 MB max file size, 100,000 char truncation, passive data processing).
   - Honest format handling: raster images (JPEG/PNG) are explicitly flagged as requiring OCR. Detecting scanned documents in arbitrary PDFs is an unverified heuristic (flagged when text length < 25 chars) and true OCR is not implemented.
3. **Statistical Vector Clustering (TF-IDF + Term Overlap):**
   - 100% local content analysis using sublinear Term Frequency–Inverse Document Frequency vector space modeling with cosine distance and concept overlap (not a neural embedding model).
   - Groups related files by shared topical vocabulary even when filenames are missing, randomized, or misleading.
   - Evaluated on a 20-document synthetic multi-format benchmark (see Section 6 for exact precision, recall, and false-negative metrics).
4. **Exact Cryptographic Duplicate Detection:**
   - Streaming SHA-256 byte hashing across all uploaded files to identify exact duplicate content under different filenames.
5. **Conservative Revision & Version Detection:**
   - Identifies revised drafts and near-duplicate files sharing $\ge 80\%$ content similarity without deleting either copy.
6. **Interactive Organization Studio:**
   - Live virtual folder tree preview showing proposed folder hierarchy and aggregate sizes.
   - Dual-column Before & After transformation diff.
   - In-place file renaming with path-traversal sanitization and extension preservation.
   - Dynamic folder reassignment.
7. **Wispr Flow Voice-First Workflow:**
   - Designed for voice dictation using the external Wispr Flow desktop application: users dictate text into the editable transcript area.
   - Multi-instruction clause parser splits compound spoken preferences (e.g. *"Put screenshots in Screenshots, group Pathfinder files together, and keep all duplicates"*) into discrete, previewable rules before applying.
   - UNDO does not integrate via proprietary in-browser audio APIs. Automated tests verify UNDO's transcript parsing and rule execution; desktop voice dictation was verified manually.
8. **Validated Streaming ZIP Export & Change Manifest:**
   - Streams an organized ZIP archive with embedded `undo-manifest.json` recording every file's original name, SHA-256 hash, renamed path, and duplicate exclusion status.

---

## 3. Technology Stack & Architecture

### Frontend (User Interface)
- **Framework:** React 18 + TypeScript + Vite 6
- **Styling:** Tailwind CSS + Lucide React icons
- **State & Architecture:** Component-driven workspace (Landing $\rightarrow$ Analysis $\rightarrow$ Studio $\rightarrow$ Export)
- **Testing:** Vitest 3.0 + React Testing Library (42 passing automated tests)

### Backend (REST API & Organization Engine)
- **Runtime:** Node.js 20+ LTS / 22+ LTS (tested on Node v24)
- **Framework:** Express 4.21 + TypeScript (Strict mode enabled)
- **Upload & Storage:** Multer with per-session disk isolation
- **Deduplication:** Node.js native `crypto` streaming SHA-256
- **Document Extractors:**
  - PDF: `pdf-parse` (v2.4.5)
  - Word: `mammoth` (v1.13.0)
  - PowerPoint: `adm-zip` (v0.5.8) XML slide parser
  - Excel: `xlsx` / SheetJS (v0.18.5)
  - CSV / TXT / Markdown: Native Node.js UTF-8 streaming parser
- **Archive Generation:** `archiver` streaming ZIP engine with maximum compression
- **Validation:** Zod schemas for all parameters and payloads
- **Testing:** Vitest 3.0 + Supertest (73 passing automated tests)
- **E2E Automation:** Playwright-Core running real Google Chrome (13-step full journey)

---

## 4. Document-Processing Workflow

```
[ User Files / Folder ] 
        │
        ▼
[ Isolated Session Ingestion ] (UUID-partitioned temporary storage)
        │
        ├──> [ Streaming SHA-256 Hasher ] ───> Exact Duplicate Groups
        │
        └──> [ Modular Document Extractor ] 
                 ├── PDF (pdf-parse)
                 ├── Word (mammoth)
                 ├── PowerPoint (adm-zip)
                 ├── Excel (xlsx)
                 └── CSV / TXT / MD (native)
                         │
                         ▼
             [ Clean Extracted Text ] (Oversized & empty guardrails)
                         │
                         ▼
             [ Sublinear TF-IDF Vectorizer & IDF Smoother ]
                         │
                         ▼
             [ Hybrid Similarity: Cosine + Concept Overlap ]
                         │
                         ├──> [ Density-Based Clustering ] ───> Semantic Project Folders
                         │                                       (with evidence terms)
                         │
                         └──> [ Version Detection (>=80%) ] ───> Revisions & Near-Duplicates
                                                                  (with draft explanations)
                         │
                         ▼
             [ Organization Studio ] (Editable Plan, Renaming, Folders, Duplicates)
                         │
                         ├──> [ Wispr Flow Voice Preference Interpreter ]
                         │
                         ▼
             [ Streaming ZIP Exporter ] ───> [ undo-organized-files.zip ]
                                              ├── [ Clean Folder Structure ]
                                              └── [ undo-manifest.json ]
```

---

## 5. What Makes UNDO Useful & Different

1. **Zero External Cloud AI Dependencies:** Unlike cloud-based AI sorters that stream files to OpenAI, Gemini, or Anthropic, UNDO executes its content analysis and document parsing locally inside Node.js.
   - *Localhost vs. Remote Deployments:* In a local setup (`localhost:3000` / `localhost:3001`), processing stays on `127.0.0.1`. In a remote backend deployment, files are sent over HTTP to that backend server. UNDO is not a browser-only client application.
2. **True Non-Destructive Design:** Many tools permanently move or rename files on disk; if an algorithm makes a mistake, your filesystem is scrambled. UNDO never modifies, moves, or deletes original files on your computer. Isolated temporary working copies are created in `backend/storage/sessions/` strictly for analysis and are purged upon session cleanup. You receive a cleanly organized ZIP archive to inspect before replacing any existing folders.
3. **Transparent & Explainable:** UNDO displays visible keyword evidence and similarity metrics explaining why every file was grouped where it was.
4. **Voice-First Dictation via Wispr Flow:** Instead of complex filter dialogs, users dictate natural compound preferences. Wispr Flow operates as an external desktop dictation tool inputting text into the transcript area without proprietary audio APIs. UNDO deterministically parses and previews the resulting rules before applying them.

---

## 6. Actual Technical Capabilities Verified in QA

- **Total Automated Tests:** **115 passing tests** (73 backend tests, 42 frontend tests). No critical bugs were found in the tested scenarios.
- **TypeScript & Build Health:** 100% zero-error compilation on both backend (`tsc`) and frontend (`vite build`).
- **Real Browser E2E:** 13 out of 13 interactive steps passed in automated real Google Chrome browser testing.
- **Filename Invariance:** Evaluated across 20 synthetic multi-format documents with completely random/misleading filenames. Achieved **100.0% cluster invariance** when files were renamed.
- **20-Document Synthetic Multi-Format Benchmark Evaluation:**
  - *Scope:* Evaluated specifically on a 20-document synthetic benchmark across 5 distinct topics and 7 file formats (PDF, DOCX, PPTX, XLSX, CSV, TXT, MD). We do not claim all document formats cluster accurately in general.
  - **Pairwise Precision:** **100.0%** (0 false positives — zero cross-topic merges or false groupings).
  - **Pairwise Recall:** **62.5%** (9 false negatives).
  - **Pairwise F1-Score:** **76.9%**.
  - **False Positives:** **0**.
  - **False Negatives:** **9**. All 9 false negative pairs occurred because three short single-table CSV documents (`doc-04`, `doc-10`, `doc-16`) had sparse tabular content with fewer than 10 total tokens, falling below the 0.15 similarity threshold against long narrative prose documents.
- **Exact Cryptographic Deduplication:** Streaming SHA-256 byte hashing verified across identical content under divergent names.
- **Conservative Revision Detection:** Accurately flags near-duplicate files sharing $\ge 80\%$ content similarity without deleting either copy.

---

## 7. Known Limitations & Future Roadmap

1. **Raster Images & Scanned Documents:**
   - *Current Status:* Text-layer extraction is fully tested and verified for digital PDFs, DOCX, PPTX, XLSX, CSV, TXT, and Markdown.
   - *Current Limitation:* Detecting scanned PDFs in arbitrary documents is an unverified heuristic (flagged when extracted text length < 25 characters) and true OCR is not implemented. Raster images (JPEG/PNG) and scanned PDFs cannot have their text extracted without an OCR engine.
   - *Current Handling:* The engine honestly identifies image formats with `status: 'unsupported'` and alerts the user that OCR is required.
   - *Roadmap:* Integrate an optional local WebAssembly Tesseract OCR pipeline for scanned receipts and screenshots.
2. **Lexical Synonym Gap (Bag-of-Words):**
   - *Current Limitation:* Because UNDO uses statistical TF-IDF vector space modeling rather than neural transformer embeddings, documents describing identical concepts using completely disjoint vocabularies (e.g. `automobile engine` vs `motorcar powertrain`) have 0 shared tokens and will not cluster together.
   - *Roadmap:* Integrate a lightweight, offline local ONNX embedding model (e.g. `all-MiniLM-L6-v2`) when running in desktop environments where model weight caching is supported.
3. **Single-Table Compact CSVs:**
   - *Current Limitation:* CSV files containing fewer than 10 total tokens have lower vector density and may fall below the 0.15 threshold against long prose documents.
   - *Roadmap:* Add table structure weighting and column header boosting.

---

## 8. Windows PowerShell Instructions

### Running in Development (Two Separate Terminals)

**Terminal 1 — Backend API (Port 3001):**
```powershell
cd backend
npm run dev
```

**Terminal 2 — Frontend App (Port 3000):**
```powershell
cd frontend
npm run dev
```

### Production Build Verification (Windows PowerShell)

**Backend Build Verification:**
```powershell
cd backend
npm run build
```

**Frontend Build Verification:**
```powershell
cd frontend
npm run build
```


