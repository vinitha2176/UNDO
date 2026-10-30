/**
 * Generates synthetic sample files for testing UNDO without needing manual test files.
 * Covers 30 files across all major categories, projects (Pathfinder, Medicard),
 * exact duplicates with identical SHA-256 byte arrays, generic filenames, and revisions.
 */
export function generateSampleFiles(): File[] {
  const enc = new TextEncoder();

  // Distinct byte contents
  const resumeBytes = enc.encode('%PDF-1.4\n% Synthetic Resume Document\nApplicant: Alex Mercer\nRole: Lead Engineer\n');
  const resumeUpdatedBytes = enc.encode('%PDF-1.4\n% Synthetic Resume Document (Updated Revision)\nApplicant: Alex Mercer\nRole: Principal Engineer\nSkills: React, Node, Cloud\n');
  const contractBytes = enc.encode('%PDF-1.4\n% Legal Master Service Agreement Contract\nParties: Vendor and Client\n');
  const reportBytes = enc.encode('%PDF-1.4\n% Pathfinder Project Architecture & Status Report\nMilestone: Release Candidate\n');
  const medPolicyBytes = enc.encode('%PDF-1.4\n% Medicard Policy and Health Coverage Agreement\nPlan: Gold Tier Comprehensive\n');
  const invoiceBytes = enc.encode('%PDF-1.4\n% Generic Vendor Invoice for October\nAmount: $1,250.00\n');

  const diagramBytes = enc.encode('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRSynthetic Architecture Flowchart PNG');
  const holidayPhotoBytes = enc.encode('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRSynthetic Holiday Photography PNG');
  const screenshotBytes = enc.encode('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRSynthetic Application Screenshot PNG');
  const bannerBytes = enc.encode('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRSynthetic Web Banner Graphic PNG');

  const deckBytes = enc.encode('Pathfinder Keynote Presentation Deck\nSlide 1: Vision\nSlide 2: Roadmap\n');
  const summaryDeckBytes = enc.encode('Q1 Executive Summary Presentation Slides\nSlide 1: KPIs\n');

  const budgetBytes = enc.encode('Quarter,Department,Allocation\nQ1,Engineering,150000\nQ2,Design,45000\n');
  const financialsBytes = enc.encode('Year,Revenue,NetProfit\n2025,1200000,340000\n2026,1600000,480000\n');

  const formDocBytes = enc.encode('Document Form Body Content: Generic Administrative Form Record');
  const medClaimBytes = enc.encode('Medicard Official Healthcare Reimbursement Claim Document');
  const medEnrollBytes = enc.encode('Medicard Annual Employee Enrollment Application Record');
  const collegeNotesBytes = enc.encode('Lecture notes on Distributed Operating Systems and File Structures');
  const notes1Bytes = enc.encode('Meeting notes from Strategy alignment discussion A');
  const notes2Bytes = enc.encode('Meeting notes from Technical architecture sprint B');
  const logBytes = enc.encode('[2026-10-30 10:00:00] [INFO] System service health check verified successfully');

  const tsCodeBytes = enc.encode('export async function runPathfinderPipeline(input: string[]) { return input.length; }\n');
  const pyMigrationBytes = enc.encode('def migrate_database_records(conn):\n    cursor = conn.cursor()\n    cursor.execute("SELECT 1")\n');
  const pyAnalyticsBytes = enc.encode('def calculate_retention_rate(active, churned):\n    return active / (active + churned)\n');

  const zipArchiveBytes = enc.encode('PK\x03\x04Synthetic ZIP archive container bytes for 2025 archive');
  const tarArchiveBytes = enc.encode('Synthetic TAR.GZ archive container payload for build artifact');

  return [
    // 1-4: Pathfinder Project Group (Distinct Project Identifier)
    new File([reportBytes], 'pathfinder_report.pdf', { type: 'application/pdf' }),
    new File([diagramBytes], 'pathfinder_diagram.png', { type: 'image/png' }),
    new File([deckBytes], 'pathfinder_deck.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }),
    new File([tsCodeBytes], 'pathfinder_worker.ts', { type: 'text/plain' }),

    // 5-7: Medicard Project Group (Distinguishes generic 'FORM' from distinctive 'Medicard')
    new File([medEnrollBytes], 'FORM_Medicard_Enrollment.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    new File([medClaimBytes], 'FORM_Medicard_Claim.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    new File([medPolicyBytes], 'Medicard_Policy_Agreement.pdf', { type: 'application/pdf' }),

    // 8-11: Exact Duplicates (with different names, verified SHA-256 match)
    new File([resumeBytes], 'resume_final.pdf', { type: 'application/pdf' }),
    new File([resumeBytes], 'resume_final_copy.pdf', { type: 'application/pdf' }), // exact dup 1
    new File([contractBytes], 'contract_signed.pdf', { type: 'application/pdf' }),
    new File([contractBytes], 'contract_backup.pdf', { type: 'application/pdf' }), // exact dup 2

    // 12-13: Identical names with different contents (Collision resolution test)
    new File([notes1Bytes], 'notes.txt', { type: 'text/plain' }),
    new File([notes2Bytes], 'meeting_notes_alt.txt', { type: 'text/plain' }),

    // 14-16: Generic document names (Must NOT invent "Form" project)
    new File([formDocBytes], 'FORM_A.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    new File([formDocBytes], 'FORM_B.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    new File([formDocBytes], 'FORM_C.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),

    // 17: Revision file (Must NOT invent "Updated" project)
    new File([resumeUpdatedBytes], 'resume_updated.pdf', { type: 'application/pdf' }),

    // 18: Generic billing file (Must NOT invent "Invoice" project)
    new File([invoiceBytes], 'invoice_october.pdf', { type: 'application/pdf' }),

    // 19-20: Spreadsheets
    new File([budgetBytes], 'budget_2026.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    new File([financialsBytes], 'annual_financials.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),

    // 21-24: Images and graphics
    new File([holidayPhotoBytes], 'holiday_photo.png', { type: 'image/png' }),
    new File([screenshotBytes], 'screenshot_login.png', { type: 'image/png' }),
    new File([bannerBytes], 'app_banner.png', { type: 'image/png' }),
    new File([holidayPhotoBytes], 'photo_beach.jpg', { type: 'image/jpeg' }),

    // 25: Presentation
    new File([summaryDeckBytes], 'q1_summary_deck.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }),

    // 26-27: Source Code
    new File([pyMigrationBytes], 'data_migration.py', { type: 'text/x-python' }),
    new File([pyAnalyticsBytes], 'analytics_script.py', { type: 'text/x-python' }),

    // 28-29: Archives
    new File([zipArchiveBytes], 'archive_backup_2025.zip', { type: 'application/zip' }),
    new File([tarArchiveBytes], 'package_release.tar.gz', { type: 'application/gzip' }),

    // 30: Document / System log
    new File([logBytes], 'system_logs.log', { type: 'text/plain' }),
  ];
}
