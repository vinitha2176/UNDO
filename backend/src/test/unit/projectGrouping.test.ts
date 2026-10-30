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
});
