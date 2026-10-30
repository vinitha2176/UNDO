/**
 * Generates synthetic sample files for hackathon judges to test UNDO without preparing messy files.
 * Exact duplicates have genuine identical byte arrays.
 */
export function generateSampleFiles(): File[] {
  // Shared identical PDF content for exact duplicates
  const resumeBytes = new TextEncoder().encode(
    '%PDF-1.4\n% Synthetic Resume Document for Demo\nApplicant: Alex Mercer\nRole: Lead Software Engineer\nSkills: React, TypeScript, Node.js\n'
  );

  const reportBytes = new TextEncoder().encode(
    '%PDF-1.4\n% Pathfinder Project Status Report\nStatus: On Track\nMilestone: Phase 3 Hackathon Release\n'
  );

  const diagramBytes = new TextEncoder().encode(
    '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRSynthetic PNG Architecture Diagram Data'
  );

  const presentationBytes = new TextEncoder().encode(
    'Pathfinder Keynote Deck\nSlide 1: Problem Definition\nSlide 2: Proposed Solution\nSlide 3: Impact\n'
  );

  const budgetBytes = new TextEncoder().encode(
    'Quarter,Category,Amount\nQ1,Engineering,45000\nQ1,Design,15000\nQ2,Marketing,20000\n'
  );

  const notesBytes = new TextEncoder().encode(
    'Meeting notes:\n- Review organization plan\n- Confirm duplicate exclusion\n- Download organized ZIP\n'
  );

  const codeBytes = new TextEncoder().encode(
    '// Pathfinder Pipeline Worker\nexport function processFiles(files: string[]) {\n  return files.map(f => f.trim());\n}\n'
  );

  const archiveBytes = new TextEncoder().encode(
    'PK\x03\x04Synthetic zip archive contents for mock legacy bundle'
  );

  return [
    new File([resumeBytes], 'resume_final.pdf', { type: 'application/pdf' }),
    new File([resumeBytes], 'resume_final_copy.pdf', { type: 'application/pdf' }), // exact duplicate
    new File([reportBytes], 'pathfinder_report.pdf', { type: 'application/pdf' }),
    new File([diagramBytes], 'pathfinder_diagram.png', { type: 'image/png' }),
    new File([presentationBytes], 'pathfinder_deck.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }),
    new File([budgetBytes], 'q1_budget.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    new File([notesBytes], 'notes.txt', { type: 'text/plain' }),
    new File([codeBytes], 'worker.ts', { type: 'text/plain' }),
    new File([archiveBytes], 'legacy_bundle.zip', { type: 'application/zip' }),
  ];
}

