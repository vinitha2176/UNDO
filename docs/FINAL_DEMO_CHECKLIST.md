# UNDO — Final Hackathon Demonstration Checklist

This document provides the exact, step-by-step instructions for demonstrating **UNDO** live during evaluation.

---

## 1. Pre-Flight Preparation & Environment Setup

### Prerequisites
- Node.js 20+ LTS or 22+ LTS installed.
- Modern browser (Google Chrome, Edge, or Brave).
- Optional: Wispr Flow desktop app running (with your dictation shortcut configured).

### Port Availability Check
Ensure ports `3000` (frontend) and `3001` (backend) are free.

---

## 2. Starting the Application (Windows PowerShell)

Open **two separate Windows PowerShell terminal windows**:

### Terminal 1 — Start the Backend Server (Port 3001)
```powershell
cd backend
npm run dev
```
*Expected Console Output:*
```
[Server] UNDO backend server running on http://localhost:3001
[Server] Environment: development | CORS Origin: http://localhost:3000
[Storage] Initialized temporary session directories at storage/sessions
```

### Terminal 2 — Start the Frontend Application (Port 3000)
```powershell
cd frontend
npm run dev
```
*Expected Console Output:*
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

## 3. Step-by-Step Demonstration Sequence (3 to 5 Minutes)

### Step 1: Open UNDO and Verify Connection (30 Seconds)
1. Open your browser and navigate to `http://localhost:3000`.
2. Look at the top right of the navigation header:
   - **Expected:** Green badge displaying **"Backend Connected"** with a green pulse dot.
3. Show the tagline: *"Your files, finally in order."*
4. Highlight the core safety commitment:
   - **Point to make:** *"UNDO never modifies, deletes, moves, or overwrites your original source files on disk. Isolated temporary working copies are created in `backend/storage/sessions/` strictly for analysis and are purged upon session cleanup. All organization applies strictly to the generated export ZIP archive."*

---

### Step 2: Load Sample Dataset or Custom Folder (30 Seconds)
1. On the landing upload screen, click the **"Try with Sample Files"** button (or drag-and-drop a messy folder).
2. **Expected:**
   - 30 synthetic files appear immediately in the staging area.
   - Shows diverse file types: Markdown reports, Word documents, Excel sheets, PowerPoint slides, CSV tables, duplicate images, and PDFs.
   - Counter indicates: `Selected Files (30)`.
3. Click the primary button: **"Analyze & Organize Files →"**.

---

### Step 3: Demonstrate Content Intelligence & File Analysis (60 Seconds)
1. The app transitions to Step 2: **File Analysis Summary**.
2. **Point out the Stat Cards:**
   - Total Imported Files: `30`
   - Total Session Storage: `~12.8 KB` (synthetic) or actual bytes.
   - Exact Duplicate Groups: `2` (highlighting redundant storage).
   - Project Groups / Clusters: `2` (`Pathfinder`, `Medicard`).
3. **Show Content-Aware Local Intelligence Banner:**
   - Emphasize: *"100% Local Processing & Zero External Cloud APIs"*.
   - Point out that text was extracted across PDF (text layer), DOCX, PPTX, TXT, CSV, and XLSX using Node.js without sending any document data to 3rd-party cloud providers.
   - *Technical Note for Presenters:* The clustering engine uses statistical TF-IDF vector space modeling with cosine distance and concept overlap, not a neural embedding model. Detecting scanned documents in arbitrary PDFs is an unverified heuristic (text length < 25 chars) and true OCR is not implemented.
4. **Show Transparent Inspector:**
   - Click on any file in the table (e.g. `medicard_form.docx` or `pathfinder_deck.pptx`).
   - Notice the top banner: *"Why did UNDO place this here?"*
   - Shows the exact grouping reason and extracted word/page counts.
5. Click **"Open Organization Studio →"** at the top right.

---

### Step 4: Organization Studio & Virtual Folder Tree (45 Seconds)
1. The app transitions to Step 3: **Organization Studio**.
2. **Show Virtual Folder Tree (Left Pane):**
   - Click to expand folders: `Projects/Pathfinder/`, `Projects/Medicard/`, `Presentations/`, `Documents/`.
   - Explain: *"This is a virtual in-memory folder tree. Physical folders have not been created yet."*
3. **Show Before & After Transformation Tab (Center):**
   - Click the **"Before & After"** tab.
   - Notice the side-by-side comparison:
     - Left column: Original filename and original directory path.
     - Right column: Proposed clean destination folder and proposed filename.
4. **Demonstrate Interactive Renaming & Reassignment:**
   - Click on `pathfinder_deck.pptx` in the list to open the **Customize Organization Modal**.
   - Change proposed filename to: `pathfinder_keynote_deck.pptx`.
   - Change destination folder to: `Presentations/Keynotes`.
   - Click **"Save Changes"**.
   - Notice that the virtual tree and Before & After table instantly update.

---

### Step 5: Dedicated Duplicate Review Center (45 Seconds)
1. Click the **"Duplicates"** tab in the Organization Studio.
2. Observe the duplicate groups:
   - Shows exact SHA-256 cryptographic duplicate files (e.g. `pathfinder_spec.md` vs `pathfinder_spec_copy.md`).
   - Shows redundant storage calculation.
3. **Demonstrate Deduplication Decision:**
   - Click **"Retain 1 Copy Only"** on the duplicate group.
   - Point out that the secondary copy is marked with a red tag: *"Excluded from export"*.
   - Reiterate safety: *"The copy is excluded from the downloaded ZIP archive only. The original copy on your computer remains 100% untouched."*

---

### Step 6: Wispr Flow Voice-First Preferences (60 Seconds)
1. Click the **"Wispr Dictation"** tab.
2. Note the guidance box:
   - Explain: *"Wispr Flow is an external desktop application. UNDO does not have a proprietary direct audio API. Instead, click inside the box, press your Wispr Flow desktop dictation hotkey (e.g. Fn or Caps Lock), and speak naturally. Your words appear directly in the box as editable text."*
   - Note for Presenters: Automated tests verify UNDO's multi-instruction clause parser and rule execution; actual microphone speech was validated manually through the desktop app.
3. **Test the Multi-Instruction Spoken Command:**
   - Type or speak into the transcript area:
     `Put all screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies.`
   - Notice the live interpretation panel immediately breaks this into **3 discrete sub-rules**:
     1. `Rule 1: Organize Screenshots` (matches screenshot images)
     2. `Rule 2: Group Pathfinder Project Files` (matches pathfinder documents)
     3. `Rule 3: Retain All Duplicate Copies` (resets duplicate exclusion)
4. Click **"Confirm & Apply Rule"**.
   - Watch the live toast notification confirm the updates.

---

### Step 7: Review & Export Organized ZIP Archive (45 Seconds)
1. Click **"Review & Export →"** at the top right.
2. The app transitions to Step 4: **Export Review**.
3. **Show the undo-manifest.json Audit Preview:**
   - Click **"Preview undo-manifest.json"**.
   - Show the clean JSON structure displaying every file's original name, original SHA-256 hash, renamed status, reassigned folder, and duplicate exclusion status.
   - Click **"Close"**.
4. **Trigger Download:**
   - Click **"Download Organized Files (ZIP)"**.
   - Browser downloads `undo-organized-files.zip`.
5. **Inspect the Downloaded ZIP:**
   - Open or unzip the archive in Windows File Explorer / Mac Finder.
   - Verify the clean folder structure:
     - `Projects/Pathfinder/`
     - `Presentations/Keynotes/pathfinder_keynote_deck.pptx`
     - `Screenshots/`
     - `undo-manifest.json` at the root.

---

## 4. Final Verification Checklist Before Live Presentation

- [ ] Backend is running on port `3001` with zero console errors.
- [ ] Frontend is running on port `3000`.
- [ ] Navigation header shows green `"Backend Connected"` indicator.
- [ ] Clicking `"Try with Sample Files"` loads 30 synthetic files.
- [ ] Analysis overview displays category breakdown and content extractions.
- [ ] File renaming and folder reassignment modal saves successfully.
- [ ] Wispr dictation tab parses compound instructions into discrete rules.
- [ ] ZIP export downloads and contains valid `undo-manifest.json`.
- [ ] Local storage in `backend/storage/sessions/` is active and isolated.

---

## 5. Technical Pre-Demo Verification Commands (Windows PowerShell)

Run these checks in PowerShell before starting your presentation:

### Production Builds (0 Errors)
```powershell
# Backend
cd backend
npm run build

# Frontend
cd ..\frontend
npm run build
```

### Automated Tests (115 Tests Passing)
```powershell
# Backend (73 tests)
cd ..\backend
npm test

# Frontend (42 tests)
cd ..\frontend
npm test
```

### Real Browser E2E Automation (13 Steps)
```powershell
cd ..\backend
npx tsx src/test/realBrowserE2E.ts
```


