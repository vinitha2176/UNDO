import { describe, it, expect } from 'vitest';
import {
  splitDictatedClauses,
  interpretWisprPreferences,
} from '../services/wisprInterpreter';
import { OrganizationPlanItem } from '../types';

const mockTestPlanItems: OrganizationPlanItem[] = [
  {
    fileId: 'f-screen-1',
    originalName: 'screenshot_2026_dashboard.png',
    proposedFilename: 'screenshot_2026_dashboard.png',
    proposedDestinationFolder: 'Images',
    proposedPath: 'Images/screenshot_2026_dashboard.png',
    category: 'images',
    duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
    isIncludedInExport: true,
    groupingReason: 'categorized',
    userModified: false,
  },
  {
    fileId: 'f-pres-1',
    originalName: 'q3_investor_deck.pptx',
    proposedFilename: 'q3_investor_deck.pptx',
    proposedDestinationFolder: 'Documents',
    proposedPath: 'Documents/q3_investor_deck.pptx',
    category: 'presentations',
    duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
    isIncludedInExport: true,
    groupingReason: 'categorized',
    userModified: false,
  },
  {
    fileId: 'f-path-1',
    originalName: 'pathfinder_project_spec.pdf',
    proposedFilename: 'pathfinder_project_spec.pdf',
    proposedDestinationFolder: 'Documents',
    proposedPath: 'Documents/pathfinder_project_spec.pdf',
    category: 'documents',
    suggestedGroup: 'Pathfinder',
    duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
    isIncludedInExport: true,
    groupingReason: 'project group',
    userModified: false,
  },
  {
    fileId: 'f-dup-1',
    originalName: 'budget_sheet_copy.xlsx',
    proposedFilename: 'budget_sheet_copy.xlsx',
    proposedDestinationFolder: 'Spreadsheets',
    proposedPath: 'Spreadsheets/budget_sheet_copy.xlsx',
    category: 'spreadsheets',
    duplicateStatus: { isDuplicate: true, isPrimary: false, duplicateOfFileId: 'f-dup-orig', totalCopies: 2 },
    isIncludedInExport: true,
    groupingReason: 'exact duplicate',
    userModified: false,
  },
  {
    fileId: 'f-inv-1',
    originalName: 'invoice_october_2026.pdf',
    proposedFilename: 'invoice_october_2026.pdf',
    proposedDestinationFolder: 'Documents',
    proposedPath: 'Documents/invoice_october_2026.pdf',
    category: 'documents',
    duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
    isIncludedInExport: true,
    groupingReason: 'categorized',
    userModified: false,
  },
  {
    fileId: 'f-design-1',
    originalName: 'branding_logo_vector.svg',
    proposedFilename: 'branding_logo_vector.svg',
    proposedDestinationFolder: 'Images',
    proposedPath: 'Images/branding_logo_vector.svg',
    category: 'images',
    duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
    isIncludedInExport: true,
    groupingReason: 'categorized',
    userModified: false,
  },
];

describe('Wispr Flow Instruction Interpreter Unit Tests', () => {
  describe('Clause Splitting logic (splitDictatedClauses)', () => {
    it('splits combined multi-instruction sentences separated by commas and conjunctions', () => {
      const input =
        'Put screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies.';
      const clauses = splitDictatedClauses(input);
      expect(clauses).toHaveLength(3);
      expect(clauses[0]).toBe('Put screenshots in a Screenshots folder');
      expect(clauses[1]).toBe('group Pathfinder files together');
      expect(clauses[2]).toBe('keep all duplicate copies');
    });

    it('splits on periods and semicolons cleanly', () => {
      const input =
        'Keep presentations separate from documents; organize files by year and month. Also keep all duplicates.';
      const clauses = splitDictatedClauses(input);
      expect(clauses).toHaveLength(3);
      expect(clauses[0]).toBe('Keep presentations separate from documents');
      expect(clauses[1]).toBe('organize files by year and month');
      expect(clauses[2]).toBe('keep all duplicates');
    });

    it('preserves multi-word idioms like "year and month" without splitting on the internal "and"', () => {
      const input = 'Organize files by year and month and put all invoices in Finance/2026';
      const clauses = splitDictatedClauses(input);
      expect(clauses).toHaveLength(2);
      expect(clauses[0]).toBe('Organize files by year and month');
      expect(clauses[1]).toBe('put all invoices in Finance/2026');
    });
  });

  describe('Individual Instruction Interpretation', () => {
    it('Rule 1: "Put all screenshots in a Screenshots folder"', () => {
      const result = interpretWisprPreferences(
        'Put all screenshots in a Screenshots folder',
        mockTestPlanItems
      );
      expect(result.subRules).toHaveLength(1);
      const rule = result.subRules[0];
      expect(rule.isSupported).toBe(true);
      expect(rule.targetFolder).toBe('Screenshots');
      expect(rule.matchedFiles).toHaveLength(1);
      expect(rule.matchedFiles[0].originalName).toBe('screenshot_2026_dashboard.png');
      expect(rule.updates[0].destinationFolder).toBe('Screenshots');
    });

    it('Rule 2: "Keep presentations separate from documents"', () => {
      const result = interpretWisprPreferences(
        'Keep presentations separate from documents',
        mockTestPlanItems
      );
      expect(result.subRules).toHaveLength(1);
      const rule = result.subRules[0];
      expect(rule.isSupported).toBe(true);
      expect(rule.targetFolder).toBe('Presentations');
      expect(rule.matchedFiles).toHaveLength(1);
      expect(rule.matchedFiles[0].originalName).toBe('q3_investor_deck.pptx');
    });

    it('Rule 3: "Group all Pathfinder files into one project folder"', () => {
      const result = interpretWisprPreferences(
        'Group all Pathfinder files into one project folder',
        mockTestPlanItems
      );
      expect(result.subRules).toHaveLength(1);
      const rule = result.subRules[0];
      expect(rule.isSupported).toBe(true);
      expect(rule.targetFolder).toBe('Projects/Pathfinder');
      expect(rule.matchedFiles).toHaveLength(1);
      expect(rule.matchedFiles[0].originalName).toBe('pathfinder_project_spec.pdf');
    });

    it('Rule 4: "Keep all duplicate copies"', () => {
      const result = interpretWisprPreferences(
        'Keep all duplicate copies',
        mockTestPlanItems
      );
      expect(result.subRules).toHaveLength(1);
      const rule = result.subRules[0];
      expect(rule.isSupported).toBe(true);
      expect(rule.actionType).toBe('include_duplicates');
      expect(rule.updates[0].isIncluded).toBe(true);
      expect(rule.matchedFiles[0].originalName).toBe('budget_sheet_copy.xlsx');
    });

    it('Rule 5: "Exclude exact duplicate copies from the organized download"', () => {
      const result = interpretWisprPreferences(
        'Exclude exact duplicate copies from the organized download',
        mockTestPlanItems
      );
      expect(result.subRules).toHaveLength(1);
      const rule = result.subRules[0];
      expect(rule.isSupported).toBe(true);
      expect(rule.actionType).toBe('exclude_duplicates');
      expect(rule.updates[0].isIncluded).toBe(false);
      expect(rule.matchedFiles[0].originalName).toBe('budget_sheet_copy.xlsx');
      expect(rule.description).toContain('original files on your computer remain untouched');
    });

    it('Rule 6: "Organize files by year and month"', () => {
      const result = interpretWisprPreferences(
        'Organize files by year and month',
        mockTestPlanItems
      );
      expect(result.subRules[0].isSupported).toBe(true);
      expect(result.subRules[0].description).toContain('chronologically by Year & Month');
      expect(result.allUpdates).toHaveLength(mockTestPlanItems.length);
    });

    it('Rule 7: "Group design files into a branding folder"', () => {
      const result = interpretWisprPreferences(
        'Group design files into a branding folder',
        mockTestPlanItems
      );
      expect(result.subRules[0].isSupported).toBe(true);
      expect(result.subRules[0].targetFolder).toBe('Branding');
    });

    it('Rule 8: "Put all invoices in Finance/2026"', () => {
      const result = interpretWisprPreferences(
        'Put all invoices in Finance/2026',
        mockTestPlanItems
      );
      expect(result.subRules[0].isSupported).toBe(true);
      expect(result.subRules[0].targetFolder).toBe('Finance/2026');
      expect(result.subRules[0].matchedFiles[0].originalName).toBe('invoice_october_2026.pdf');
    });
  });

  describe('Multi-Instruction Combined Commands', () => {
    it('executes combined command: "Put screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies."', () => {
      const input =
        'Put screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies.';
      const result = interpretWisprPreferences(input, mockTestPlanItems);

      expect(result.subRules).toHaveLength(3);
      expect(result.subRules[0].targetFolder).toBe('Screenshots');
      expect(result.subRules[1].targetFolder).toBe('Projects/Pathfinder');
      expect(result.subRules[2].actionType).toBe('include_duplicates');
      expect(result.hasUnsupportedSubRules).toBe(false);
      expect(result.hasSupportedSubRules).toBe(true);

      // Verify updates merged properly
      const screenshotUpdate = result.allUpdates.find((u) => u.fileId === 'f-screen-1');
      const pathfinderUpdate = result.allUpdates.find((u) => u.fileId === 'f-path-1');
      const dupUpdate = result.allUpdates.find((u) => u.fileId === 'f-dup-1');

      expect(screenshotUpdate?.destinationFolder).toBe('Screenshots');
      expect(pathfinderUpdate?.destinationFolder).toBe('Projects/Pathfinder');
      expect(dupUpdate?.isIncluded).toBe(true);
    });

    it('handles mixed supported and unsupported sub-clauses gracefully', () => {
      const input = 'Put screenshots in Screenshots, and launch rocket to the moon';
      const result = interpretWisprPreferences(input, mockTestPlanItems);

      expect(result.subRules).toHaveLength(2);
      expect(result.subRules[0].isSupported).toBe(true);
      expect(result.subRules[1].isSupported).toBe(false);
      expect(result.hasUnsupportedSubRules).toBe(true);
      expect(result.hasSupportedSubRules).toBe(true);
    });
  });

  describe('Punctuation, Capitalization & Wording Variations', () => {
    it('handles ALL CAPS input', () => {
      const result = interpretWisprPreferences(
        'PUT ALL SCREENSHOTS IN A SCREENSHOTS FOLDER',
        mockTestPlanItems
      );
      expect(result.subRules[0].isSupported).toBe(true);
      expect(result.subRules[0].targetFolder).toBe('Screenshots');
    });

    it('handles casual spoken wording: "separate presentations from documents"', () => {
      const result = interpretWisprPreferences(
        'separate presentations from documents',
        mockTestPlanItems
      );
      expect(result.subRules[0].isSupported).toBe(true);
      expect(result.subRules[0].targetFolder).toBe('Presentations');
    });

    it('handles casual spoken wording: "group pathfinder files together"', () => {
      const result = interpretWisprPreferences(
        'group pathfinder files together',
        mockTestPlanItems
      );
      expect(result.subRules[0].isSupported).toBe(true);
      expect(result.subRules[0].targetFolder).toBe('Projects/Pathfinder');
    });
  });

  describe('Unsupported & Ambiguous Commands', () => {
    it('reports clear failure for completely unsupported requests', () => {
      const result = interpretWisprPreferences(
        'Order a hot pizza and make it fly to Mars',
        mockTestPlanItems
      );
      expect(result.hasSupportedSubRules).toBe(false);
      expect(result.hasUnsupportedSubRules).toBe(true);
      expect(result.subRules[0].unsupportedReason).toContain('UNDO could not deterministically map');
    });
  });
});
