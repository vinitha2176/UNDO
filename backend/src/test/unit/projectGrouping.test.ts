import { describe, it, expect } from 'vitest';
import { detectProjectGroups } from '../../services/projectGroupingService';

describe('Project Grouping Unit Tests', () => {
  it('should detect project group when files share a common keyword prefix', () => {
    const files = [
      { id: '1', originalName: 'pathfinder_report.pdf' },
      { id: '2', originalName: 'pathfinder_diagram.png' },
      { id: '3', originalName: 'pathfinder_presentation.pptx' },
      { id: '4', originalName: 'unrelated_invoice.pdf' },
    ];

    const { projectGroups, fileGroupMap } = detectProjectGroups(files);

    expect(projectGroups).toHaveLength(1);
    expect(projectGroups[0].groupName).toBe('Pathfinder');
    expect(projectGroups[0].folderName).toBe('Projects/Pathfinder');
    expect(projectGroups[0].fileCount).toBe(3);
    expect(projectGroups[0].fileIds).toEqual(['1', '2', '3']);

    expect(fileGroupMap.get('1')?.groupName).toBe('Pathfinder');
    expect(fileGroupMap.get('2')?.groupName).toBe('Pathfinder');
    expect(fileGroupMap.get('3')?.groupName).toBe('Pathfinder');
    expect(fileGroupMap.get('4')).toBeUndefined();
  });

  it('should not create a project group if fewer than 2 files share prefix', () => {
    const files = [
      { id: '1', originalName: 'projecta_spec.docx' },
      { id: '2', originalName: 'projectb_notes.txt' },
    ];

    const { projectGroups } = detectProjectGroups(files);
    expect(projectGroups).toHaveLength(0);
  });

  it('should ignore generic prefixes like img_, photo_, dsc_', () => {
    const files = [
      { id: '1', originalName: 'img_001.jpg' },
      { id: '2', originalName: 'img_002.jpg' },
      { id: '3', originalName: 'dsc_4500.png' },
    ];

    const { projectGroups } = detectProjectGroups(files);
    expect(projectGroups).toHaveLength(0);
  });

  describe('Pre-Phase 4 Regression Datasets', () => {
    it('Dataset A — Generic names: FORM_A.docx, FORM_B.docx, FORM_C.docx must not invent a project "Form"', () => {
      const files = [
        { id: 'a1', originalName: 'FORM_A.docx' },
        { id: 'a2', originalName: 'FORM_B.docx' },
        { id: 'a3', originalName: 'FORM_C.docx' },
      ];

      const { projectGroups, fileGroupMap } = detectProjectGroups(files);
      expect(projectGroups).toHaveLength(0);
      expect(fileGroupMap.size).toBe(0);
    });

    it('Dataset B — Meaningful project identifiers: pathfinder files must create a Pathfinder project', () => {
      const files = [
        { id: 'b1', originalName: 'pathfinder_report.pdf' },
        { id: 'b2', originalName: 'pathfinder_diagram.png' },
        { id: 'b3', originalName: 'pathfinder_presentation.pptx' },
      ];

      const { projectGroups, fileGroupMap } = detectProjectGroups(files);
      expect(projectGroups).toHaveLength(1);
      expect(projectGroups[0].groupName).toBe('Pathfinder');
      expect(projectGroups[0].folderName).toBe('Projects/Pathfinder');
      expect(projectGroups[0].fileCount).toBe(3);
      expect(fileGroupMap.get('b1')?.groupName).toBe('Pathfinder');
      expect(fileGroupMap.get('b2')?.groupName).toBe('Pathfinder');
      expect(fileGroupMap.get('b3')?.groupName).toBe('Pathfinder');
    });

    it('Dataset C — Revision names: resume_final.pdf, resume_updated.pdf, resume_copy.pdf must not create projects from revision words', () => {
      const files = [
        { id: 'c1', originalName: 'resume_final.pdf' },
        { id: 'c2', originalName: 'resume_updated.pdf' },
        { id: 'c3', originalName: 'resume_copy.pdf' },
      ];

      const { projectGroups, fileGroupMap } = detectProjectGroups(files);
      expect(projectGroups).toHaveLength(0);
      expect(fileGroupMap.size).toBe(0);
    });

    it('Dataset D — Mixed files: invoice_october.pdf, college_notes.docx, holiday_photo.png, budget.xlsx must not invent project without evidence', () => {
      const files = [
        { id: 'd1', originalName: 'invoice_october.pdf' },
        { id: 'd2', originalName: 'college_notes.docx' },
        { id: 'd3', originalName: 'holiday_photo.png' },
        { id: 'd4', originalName: 'budget.xlsx' },
      ];

      const { projectGroups, fileGroupMap } = detectProjectGroups(files);
      expect(projectGroups).toHaveLength(0);
      expect(fileGroupMap.size).toBe(0);
    });

    it('Observed Case: Disambiguates generic "FORM" prefix from distinctive "Medicard" project', () => {
      const files = [
        { id: 'm1', originalName: 'FORM_Medicard_Enrollment.docx' },
        { id: 'm2', originalName: 'FORM_Medicard_Claim.docx' },
        { id: 'm3', originalName: 'FORM_Medicard_Benefits.docx' },
        { id: 'm4', originalName: 'FORM_Generic_Standard.docx' },
      ];

      const { projectGroups, fileGroupMap } = detectProjectGroups(files);
      // "Form" must NOT be a project; "Medicard" MUST be the project
      expect(projectGroups).toHaveLength(1);
      expect(projectGroups[0].groupName).toBe('Medicard');
      expect(projectGroups[0].folderName).toBe('Projects/Medicard');
      expect(projectGroups[0].fileCount).toBe(3);

      expect(fileGroupMap.get('m1')?.groupName).toBe('Medicard');
      expect(fileGroupMap.get('m2')?.groupName).toBe('Medicard');
      expect(fileGroupMap.get('m3')?.groupName).toBe('Medicard');
      expect(fileGroupMap.get('m4')).toBeUndefined();
    });
  });
});
