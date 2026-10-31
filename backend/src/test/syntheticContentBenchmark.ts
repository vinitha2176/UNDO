import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import * as xlsx from 'xlsx';
import { extractDocumentContent } from '../services/contentExtractor';
import { analyzeDocumentSemantics } from '../services/semanticAnalysisService';
import { UploadedFileRecord, DocumentExtractionResult } from '../types';

const BENCHMARK_DIR = path.join(__dirname, 'temp_synthetic_benchmark');

interface BenchmarkDocumentDef {
  id: string;
  filename: string;
  renamedFilename: string;
  topic: string; // Ground truth topic
  format: 'md' | 'txt' | 'csv' | 'docx' | 'xlsx' | 'jpg';
  content: string;
  isVersionOf?: string; // Optional ground truth version relationship
}

function createDocxFile(destPath: string, text: string) {
  const zip = new AdmZip();
  const paragraphs = text
    .split('\n\n')
    .map((p) => `<w:p><w:r><w:t>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`)
    .join('');

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`;
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

  zip.addFile('word/document.xml', Buffer.from(docXml, 'utf8'));
  zip.addFile('_rels/.rels', Buffer.from(relsXml, 'utf8'));
  zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml, 'utf8'));
  zip.writeZip(destPath);
}

function createXlsxFile(destPath: string, rows: Array<Record<string, any>>) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'DataSheet');
  xlsx.writeFile(wb, destPath);
}

// 20 synthetic documents across 5 ground-truth topics with misleading/random filenames
const BENCHMARK_DATASET: BenchmarkDocumentDef[] = [
  // --- Topic 1: Mars Avionics & Aerospace Telemetry ---
  {
    id: 'doc-01',
    filename: 'temp_log_982.md',
    renamedFilename: 'zeta_kernel_01.md',
    topic: 'Aerospace_Avionics',
    format: 'md',
    content: `# Mars Pathfinder Descent Telemetry Architecture\n\nAvionics flight computer telemetry tracking atmospheric entry interface. Real-time altitude radar telemetry and pulsed hydrazine thruster propulsion deceleration profile. Subsystem guidance control for landing telemetry.`,
  },
  {
    id: 'doc-02',
    filename: 'notes_unnamed_84.txt',
    renamedFilename: 'omega_var_02.txt',
    topic: 'Aerospace_Avionics',
    format: 'txt',
    content: `Spacecraft flight guidance and trajectory navigation for Mars exploration mission. Radiation hardened avionics telemetry interface communicating with Deep Space Network. Hydrazine propulsion thruster firing duration and telemetry sensor calibration.`,
  },
  {
    id: 'doc-03',
    filename: 'export_raw_032.docx',
    renamedFilename: 'delta_batch_03.docx',
    topic: 'Aerospace_Avionics',
    format: 'docx',
    content: `Mars Pathfinder Autonomous Flight Software Specifications\n\nEmbedded avionics telemetry kernel managing thruster propulsion valves. Attitude determination and star tracker sensor telemetry integration for deep space trajectory alignment.`,
  },
  {
    id: 'doc-04',
    filename: 'table_dump_110.csv',
    renamedFilename: 'sigma_tab_04.csv',
    topic: 'Aerospace_Avionics',
    format: 'csv',
    content: `telemetry_channel,sensor_type,propulsion_valve,altitude_km,thruster_psi\navionics_bus_1,radiation_sensor,hydrazine_main,125.4,450.2\navionics_bus_2,guidance_radar,thruster_aux,84.1,448.9\navionics_bus_3,flight_telemetry,propulsion_rcs,22.0,451.0`,
  },

  // --- Topic 2: Healthcare & Medical Insurance Reimbursement ---
  {
    id: 'doc-05',
    filename: 'invoice_draft_09.docx',
    renamedFilename: 'phi_doc_05.docx',
    topic: 'Healthcare_Insurance',
    format: 'docx',
    content: `Medicard Health Insurance Comprehensive Reimbursement Schedule\n\nPatient clinical healthcare coverage guidelines for inpatient medical hospitalization. Policy deductible thresholds, copayment percentages, and outpatient prescription drug reimbursement claims procedure.`,
  },
  {
    id: 'doc-06',
    filename: 'random_scan_44.txt',
    renamedFilename: 'gamma_txt_06.txt',
    topic: 'Healthcare_Insurance',
    format: 'txt',
    content: `Patient medical insurance policy documentation. Medicard diagnostic claim form for inpatient hospitalization copayment and clinical prescription reimbursement. Healthcare benefit limits for physician consultations and surgery coverage.`,
  },
  {
    id: 'doc-07',
    filename: 'misc_memo_71.md',
    renamedFilename: 'lambda_md_07.md',
    topic: 'Healthcare_Insurance',
    format: 'md',
    content: `# Healthcare Provider Insurance Claims Handbook\n\nGuidelines for medical insurance reimbursement and patient copayment eligibility. Standard Medicard claim forms submission for diagnostic clinical procedures, inpatient hospital stays, and pharmacy benefits.`,
  },
  {
    id: 'doc-08',
    filename: 'sheet_beta_88.xlsx',
    renamedFilename: 'theta_xls_08.xlsx',
    topic: 'Healthcare_Insurance',
    format: 'xlsx',
    content: 'Medicard Patient Claim Records: Patient hospitalization medical insurance copayment and reimbursement',
  },

  // --- Topic 3: Machine Learning Model Benchmarks & Latency ---
  {
    id: 'doc-09',
    filename: 'benchmark_run_21.md',
    renamedFilename: 'epsilon_run_09.md',
    topic: 'Machine_Learning',
    format: 'md',
    content: `# Transformer Inference Throughput and Latency Benchmarks\n\nEvaluation of floating point 16-bit quantized neural weights on GPU clusters. Measure token generation throughput per second, attention matrix compute latency, and memory bandwidth utilization.`,
  },
  {
    id: 'doc-10',
    filename: 'stats_out_005.csv',
    renamedFilename: 'kappa_stat_10.csv',
    topic: 'Machine_Learning',
    format: 'csv',
    content: `model_name,quantization,inference_latency_ms,tokens_per_second,gpu_vram_gb\ntransformer_7b,fp16,14.2,70.4,14.8\ntransformer_7b,int8,8.1,123.5,8.2\ntransformer_13b,fp16,28.7,34.8,26.4\nneural_benchmark,int4,5.2,192.3,4.5`,
  },
  {
    id: 'doc-11',
    filename: 'draft_summary_91.txt',
    renamedFilename: 'rho_txt_11.txt',
    topic: 'Machine_Learning',
    format: 'txt',
    content: `Neural network benchmark analysis for transformer model inference. Quantized weights drastically reduce memory bandwidth and inference latency while maintaining token generation throughput on GPU hardware.`,
  },
  {
    id: 'doc-12',
    filename: 'notes_dev_33.docx',
    renamedFilename: 'psi_doc_12.docx',
    topic: 'Machine_Learning',
    format: 'docx',
    content: `Large Language Model Inference Optimization Whitepaper\n\nComparative benchmarks of transformer attention layers. Quantized neural network execution profiles, measuring floating-point latency and throughput scaling across multi-GPU distributed clusters.`,
  },

  // --- Topic 4: Corporate Quarterly Financial Audit & Tax Filing ---
  {
    id: 'doc-13',
    filename: 'form_signed_q3.docx',
    renamedFilename: 'chi_form_13.docx',
    topic: 'Financial_Audit',
    format: 'docx',
    content: `Corporate Quarterly Financial Audit and Compliance Review\n\nAudited balance sheet statement, consolidated liabilities, revenue recognition, and corporate tax provisions. Independent auditor opinion on internal accounting controls and fiscal regulatory compliance.`,
  },
  {
    id: 'doc-14',
    filename: 'ledger_batch_40.xlsx',
    renamedFilename: 'mu_ledger_14.xlsx',
    topic: 'Financial_Audit',
    format: 'xlsx',
    content: 'Corporate Quarterly Balance Sheet: Audited revenue recognition liabilities and income tax compliance',
  },
  {
    id: 'doc-15',
    filename: 'memo_internal_02.txt',
    renamedFilename: 'nu_memo_15.txt',
    topic: 'Financial_Audit',
    format: 'txt',
    content: `Fiscal year quarterly financial audit notes. Reconciled general ledger balance sheet accounts, tax liability depreciation, and revenue compliance audit procedures requested by certified public accountants.`,
  },
  {
    id: 'doc-16',
    filename: 'records_clean_99.csv',
    renamedFilename: 'xi_rec_16.csv',
    topic: 'Financial_Audit',
    format: 'csv',
    content: `account_id,ledger_category,quarterly_balance,audit_status,tax_deductible\n1001_revenue,operating_income,4850000.00,audited_ok,false\n2002_liability,tax_provision,1240000.00,under_review,true\n3003_depreciation,capital_assets,320000.00,audited_ok,true`,
  },

  // --- Topic 5: Diverse Noise / Singletons (Unrelated topics that must NOT group) ---
  {
    id: 'doc-17',
    filename: 'baking_recipe_7.txt',
    renamedFilename: 'culinary_77.txt',
    topic: 'Noise_Recipe',
    format: 'txt',
    content: `Traditional Hawaiian Guava Chiffon Pie Recipe. Preheat oven to 350 degrees Fahrenheit. Whip egg whites to stiff peaks with cream of tartar and cane sugar. Fold into guava puree gelatin mixture and chill in pie crust for four hours.`,
  },
  {
    id: 'doc-18',
    filename: 'garden_tips_12.md',
    renamedFilename: 'botany_88.md',
    topic: 'Noise_Gardening',
    format: 'md',
    content: `# Hydrangea Pruning and Soil pH Management\n\nPrune mophead hydrangeas immediately after summer flowering. Add aluminum sulfate to acidic soil to produce blue blooms, or apply agricultural lime for alkaline pink sepals. Mulch with pine bark.`,
  },
  {
    id: 'doc-19',
    filename: 'dotfiles_setup.txt',
    renamedFilename: 'terminal_99.txt',
    topic: 'Noise_Dotfiles',
    format: 'txt',
    content: `Shell configuration script for zsh and tmux keybindings. Set vim leader key to comma, enable syntax highlighting, fuzzy finder search shortcuts, and git prompt aliases for terminal developer ergonomics.`,
  },
  {
    id: 'doc-20',
    filename: 'holiday_sunset.jpg',
    renamedFilename: 'photo_beach.jpg',
    topic: 'Noise_Image',
    format: 'jpg',
    content: 'BINARY_JPEG_IMAGE_DATA_EXCLUDED',
  },
];

// Document Revision definition to test >= 80% similarity version detection
const VERSION_TEST_PAIR = {
  original: {
    id: 'ver-doc-orig',
    filename: 'project_brief_v1.md',
    format: 'md' as const,
    content: `# Mars Rover Mission Operational Guidelines\n\nAutonomous navigation software protocols for robotic planetary rovers. Includes telemetry logging, solar array power management, surface soil spectrographic sampling, and satellite link communication windows.`,
  },
  revision: {
    id: 'ver-doc-rev',
    filename: 'notes_unnamed_update.md',
    format: 'md' as const,
    content: `# Mars Rover Mission Operational Guidelines Rev 2\n\nAutonomous navigation software protocols for robotic planetary rovers. Includes telemetry logging, solar array power management, surface soil spectrographic sampling, and high-gain satellite link communication windows with updated thermal bounds.`,
  },
};

async function setupBenchmarkFiles(useRenamed = false): Promise<UploadedFileRecord[]> {
  if (fs.existsSync(BENCHMARK_DIR)) {
    await fs.promises.rm(BENCHMARK_DIR, { recursive: true, force: true });
  }
  await fs.promises.mkdir(BENCHMARK_DIR, { recursive: true });

  const records: UploadedFileRecord[] = [];

  for (const doc of BENCHMARK_DATASET) {
    const filename = useRenamed ? doc.renamedFilename : doc.filename;
    const filePath = path.join(BENCHMARK_DIR, filename);

    if (doc.format === 'docx') {
      createDocxFile(filePath, doc.content);
    } else if (doc.format === 'xlsx') {
      createXlsxFile(filePath, [
        { record_id: 1, title: doc.content, status: 'verified', amount: 1250 },
        { record_id: 2, title: `${doc.content} Sub-Item`, status: 'processed', amount: 3400 },
      ]);
    } else if (doc.format === 'jpg') {
      // Create minimal JPEG binary header
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      await fs.promises.writeFile(filePath, jpegHeader);
    } else {
      await fs.promises.writeFile(filePath, doc.content, 'utf8');
    }

    const stat = await fs.promises.stat(filePath);
    records.push({
      id: doc.id,
      sessionId: 'benchmark-session',
      originalName: filename,
      sanitizedName: filename,
      extension: path.extname(filename).replace(/^\./, ''),
      mimeType: 'application/octet-stream',
      size: stat.size,
      sha256: crypto.createHash('sha256').update(doc.content).digest('hex'),
      category: 'documents',
      categoryReason: 'benchmark',
      suggestedGroup: null,
      groupingReason: null,
      originalRelativePath: null,
      storagePath: filePath,
      uploadedAt: new Date().toISOString(),
    });
  }

  return records;
}

async function runBenchmark() {
  console.log('='.repeat(75));
  console.log('UNDO CONTENT-AWARE SEMANTIC INTELLIGENCE VERIFICATION BENCHMARK');
  console.log('='.repeat(75));
  console.log('Test dataset: 20 synthetic files across 5 distinct ground-truth topics');
  console.log('Filenames: Randomized / misleading with zero filename keyword hints\n');

  // STEP 1: Run with original random filenames
  const recordsPhase1 = await setupBenchmarkFiles(false);
  console.log(`[Phase 1] Extracting document content for ${recordsPhase1.length} files...`);

  const extractionsPhase1: DocumentExtractionResult[] = [];
  for (const record of recordsPhase1) {
    const ext = await extractDocumentContent(record);
    extractionsPhase1.push(ext);
  }

  const successCount = extractionsPhase1.filter((e) => e.status === 'success').length;
  const unsupportedCount = extractionsPhase1.filter((e) => e.status === 'unsupported').length;
  console.log(`Extraction results: ${successCount} successfully parsed, ${unsupportedCount} unsupported (JPG image).`);

  // Run Semantic Analysis
  console.log('[Phase 1] Performing TF-IDF Vectorization, Cosine Similarity & Clustering...');
  const resultPhase1 = analyzeDocumentSemantics(extractionsPhase1);

  console.log(`\nDetected ${resultPhase1.clusters.length} Semantic Clusters:`);
  for (const cluster of resultPhase1.clusters) {
    console.log(`  • Cluster [${cluster.suggestedFolderName}] (Confidence: ${cluster.confidence}, Avg Sim: ${(cluster.averageSimilarity * 100).toFixed(1)}%)`);
    console.log(`    Topic: "${cluster.topicSummary}"`);
    console.log(`    Evidence: [${cluster.contentEvidence.join(', ')}]`);
    console.log(`    Files (${cluster.fileIds.length}): ${cluster.fileNames.join(', ')}`);
  }

  // STEP 2: Ground Truth Precision, Recall & F1 Evaluation
  const docTopicMap = new Map<string, string>();
  for (const d of BENCHMARK_DATASET) {
    docTopicMap.set(d.id, d.topic);
  }

  // Build cluster membership map
  const fileToClusterMap = new Map<string, string>();
  for (const cluster of resultPhase1.clusters) {
    for (const fId of cluster.fileIds) {
      fileToClusterMap.set(fId, cluster.clusterId);
    }
  }

  // Evaluate all valid pairwise combinations among extractable documents (19 documents)
  const evaluatedDocs = recordsPhase1.filter((r) => r.extension !== 'jpg');
  let tp = 0; // In same ground-truth topic AND in same cluster
  let fp = 0; // In different ground-truth topics BUT in same cluster
  let fn = 0; // In same ground-truth topic BUT in different or no cluster
  let tn = 0; // In different ground-truth topics AND in different or no cluster

  for (let i = 0; i < evaluatedDocs.length; i++) {
    const idA = evaluatedDocs[i].id;
    const topicA = docTopicMap.get(idA)!;
    const clusterA = fileToClusterMap.get(idA);

    for (let j = i + 1; j < evaluatedDocs.length; j++) {
      const idB = evaluatedDocs[j].id;
      const topicB = docTopicMap.get(idB)!;
      const clusterB = fileToClusterMap.get(idB);

      const sameTopic = topicA === topicB && !topicA.startsWith('Noise_');
      const sameCluster = clusterA !== undefined && clusterB !== undefined && clusterA === clusterB;

      if (sameTopic && sameCluster) tp++;
      else if (!sameTopic && sameCluster) fp++;
      else if (sameTopic && !sameCluster) fn++;
      else tn++;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1.0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1.0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log('\n--- QUANTITATIVE EVALUATION METRICS ---');
  console.log(`True Positives (Correctly grouped same-topic pairs): ${tp}`);
  console.log(`False Positives (Incorrectly merged different-topic pairs): ${fp}`);
  console.log(`False Negatives (Missed same-topic pairs): ${fn}`);
  console.log(`True Negatives (Correctly kept apart): ${tn}`);
  console.log(`Pairwise Precision: ${(precision * 100).toFixed(1)}%`);
  console.log(`Pairwise Recall:    ${(recall * 100).toFixed(1)}%`);
  console.log(`F1-Score:           ${(f1 * 100).toFixed(1)}%`);

  // STEP 3: RENAME INVARIANCE VERIFICATION (Rename files without changing contents)
  console.log('\n[Phase 2] Verifying Filename Invariance (Requirement 9)...');
  console.log('Renaming all 20 files to completely different random names:');
  const recordsPhase2 = await setupBenchmarkFiles(true);
  for (const r of recordsPhase2) {
    console.log(`  -> ${r.originalName}`);
  }

  const extractionsPhase2: DocumentExtractionResult[] = [];
  for (const record of recordsPhase2) {
    const ext = await extractDocumentContent(record);
    extractionsPhase2.push(ext);
  }

  const resultPhase2 = analyzeDocumentSemantics(extractionsPhase2);

  // Compare clusters between Phase 1 and Phase 2 by file IDs
  let invariantClusterCount = 0;
  for (const c1 of resultPhase1.clusters) {
    const matchingC2 = resultPhase2.clusters.find((c2) => {
      if (c2.fileIds.length !== c1.fileIds.length) return false;
      const set2 = new Set(c2.fileIds);
      return c1.fileIds.every((id) => set2.has(id));
    });

    if (matchingC2) {
      invariantClusterCount++;
    }
  }

  const invarianceRatio =
    resultPhase1.clusters.length > 0
      ? (invariantClusterCount / resultPhase1.clusters.length) * 100
      : 100;

  console.log(`\nCluster Invariance Score after renaming: ${invarianceRatio.toFixed(1)}%`);
  console.log(`Phase 1 Clusters: ${resultPhase1.clusters.length}, Phase 2 Clusters: ${resultPhase2.clusters.length}`);

  // STEP 4: VERSION & NEAR-DUPLICATE DETECTION (sim >= 0.80)
  console.log('\n[Phase 3] Testing Version & Near-Duplicate Detection (Requirement 2 & Section 6)...');
  const v1Path = path.join(BENCHMARK_DIR, VERSION_TEST_PAIR.original.filename);
  const v2Path = path.join(BENCHMARK_DIR, VERSION_TEST_PAIR.revision.filename);
  await fs.promises.writeFile(v1Path, VERSION_TEST_PAIR.original.content, 'utf8');
  await fs.promises.writeFile(v2Path, VERSION_TEST_PAIR.revision.content, 'utf8');

  const v1Record: UploadedFileRecord = {
    id: VERSION_TEST_PAIR.original.id,
    sessionId: 'benchmark-session',
    originalName: VERSION_TEST_PAIR.original.filename,
    sanitizedName: VERSION_TEST_PAIR.original.filename,
    extension: 'md',
    mimeType: 'text/markdown',
    size: Buffer.byteLength(VERSION_TEST_PAIR.original.content),
    sha256: crypto.createHash('sha256').update(VERSION_TEST_PAIR.original.content).digest('hex'),
    category: 'documents',
    categoryReason: 'test',
    suggestedGroup: null,
    groupingReason: null,
    originalRelativePath: null,
    storagePath: v1Path,
    uploadedAt: new Date().toISOString(),
  };

  const v2Record: UploadedFileRecord = {
    id: VERSION_TEST_PAIR.revision.id,
    sessionId: 'benchmark-session',
    originalName: VERSION_TEST_PAIR.revision.filename,
    sanitizedName: VERSION_TEST_PAIR.revision.filename,
    extension: 'md',
    mimeType: 'text/markdown',
    size: Buffer.byteLength(VERSION_TEST_PAIR.revision.content),
    sha256: crypto.createHash('sha256').update(VERSION_TEST_PAIR.revision.content).digest('hex'),
    category: 'documents',
    categoryReason: 'test',
    suggestedGroup: null,
    groupingReason: null,
    originalRelativePath: null,
    storagePath: v2Path,
    uploadedAt: new Date().toISOString(),
  };

  const v1Ext = await extractDocumentContent(v1Record);
  const v2Ext = await extractDocumentContent(v2Record);
  const versionAnalysis = analyzeDocumentSemantics([v1Ext, v2Ext]);

  console.log(`Version Relationships Detected: ${versionAnalysis.versionRelationships.length}`);
  if (versionAnalysis.versionRelationships.length > 0) {
    const rel = versionAnalysis.versionRelationships[0];
    console.log(`  • Found: ${rel.sourceFileName} <-> ${rel.targetFileName}`);
    console.log(`    Similarity Score: ${(rel.similarityScore * 100).toFixed(1)}%`);
    console.log(`    Type: ${rel.relationshipType}`);
    console.log(`    Explanation: "${rel.explanation}"`);
    console.log(`    Evidence: [${rel.contentEvidence.join(', ')}]`);
  }

  // STEP 5: EDGE CASES & GUARDRAILS (Extraction failures, empty, corrupted, oversized)
  console.log('\n[Phase 4] Testing Guardrails, Corrupted Files & Unsupported Formats (Requirement 11)...');

  // Corrupted DOCX (Not a zip)
  const corruptPath = path.join(BENCHMARK_DIR, 'corrupt.docx');
  await fs.promises.writeFile(corruptPath, 'INVALID_ZIP_SIGNATURE', 'utf8');
  const corruptRecord = { ...v1Record, id: 'corrupt-1', originalName: 'corrupt.docx', extension: 'docx', storagePath: corruptPath, size: 21 };
  const corruptExt = await extractDocumentContent(corruptRecord);
  console.log(`  • Corrupted DOCX status: "${corruptExt.status}" (Expected: failed)`);

  // Empty document
  const emptyPath = path.join(BENCHMARK_DIR, 'empty.txt');
  await fs.promises.writeFile(emptyPath, '   \n  \t  ', 'utf8');
  const emptyRecord = { ...v1Record, id: 'empty-1', originalName: 'empty.txt', extension: 'txt', storagePath: emptyPath, size: 7 };
  const emptyExt = await extractDocumentContent(emptyRecord);
  console.log(`  • Empty TXT status: "${emptyExt.status}" (Expected: empty)`);

  // Unsupported raster image
  const imgPath = path.join(BENCHMARK_DIR, 'photo.png');
  await fs.promises.writeFile(imgPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const imgRecord = { ...v1Record, id: 'img-1', originalName: 'photo.png', extension: 'png', storagePath: imgPath, size: 4 };
  const imgExt = await extractDocumentContent(imgRecord);
  console.log(`  • Raster PNG status: "${imgExt.status}" (Expected: unsupported with OCR warning)`);

  // Oversized document (>25MB)
  const oversizedRecord = { ...v1Record, id: 'big-1', originalName: 'huge.pdf', extension: 'pdf', size: 30 * 1024 * 1024 };
  const oversizedExt = await extractDocumentContent(oversizedRecord);
  console.log(`  • Oversized PDF status: "${oversizedExt.status}" (Expected: oversized)`);

  // Clean up
  try {
    await fs.promises.rm(BENCHMARK_DIR, { recursive: true, force: true });
  } catch {}

  console.log('\n' + '='.repeat(75));
  console.log('BENCHMARK COMPLETE');
  console.log('='.repeat(75));
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

