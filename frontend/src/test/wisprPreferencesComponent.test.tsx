import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WisprPreferences } from '../components/organizer/WisprPreferences';
import { OrganizationPlanItem } from '../types';

const mockPlanItems: OrganizationPlanItem[] = [
  {
    fileId: 'f1',
    originalName: 'screenshot_annual_report.png',
    proposedFilename: 'screenshot_annual_report.png',
    proposedDestinationFolder: 'Images',
    proposedPath: 'Images/screenshot_annual_report.png',
    category: 'images',
    duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
    isIncludedInExport: true,
    groupingReason: 'categorized',
    userModified: false,
  },
  {
    fileId: 'f2',
    originalName: 'pathfinder_q4_plan.docx',
    proposedFilename: 'pathfinder_q4_plan.docx',
    proposedDestinationFolder: 'Documents',
    proposedPath: 'Documents/pathfinder_q4_plan.docx',
    category: 'documents',
    suggestedGroup: 'Pathfinder',
    duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
    isIncludedInExport: true,
    groupingReason: 'project group',
    userModified: false,
  },
  {
    fileId: 'f3',
    originalName: 'pathfinder_q4_plan_copy.docx',
    proposedFilename: 'pathfinder_q4_plan_copy.docx',
    proposedDestinationFolder: 'Documents',
    proposedPath: 'Documents/pathfinder_q4_plan_copy.docx',
    category: 'documents',
    suggestedGroup: 'Pathfinder',
    duplicateStatus: { isDuplicate: true, isPrimary: false, duplicateOfFileId: 'f2', totalCopies: 2 },
    isIncludedInExport: true,
    groupingReason: 'exact duplicate',
    userModified: false,
  },
  {
    fileId: 'f4',
    originalName: 'keynote_pitch_final.pptx',
    proposedFilename: 'keynote_pitch_final.pptx',
    proposedDestinationFolder: 'Documents',
    proposedPath: 'Documents/keynote_pitch_final.pptx',
    category: 'presentations',
    duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
    isIncludedInExport: true,
    groupingReason: 'categorized',
    userModified: false,
  },
];

describe('WisprPreferences Voice-First Component & Safety Tests', () => {
  it('renders the voice-first heading, subtitle, and transparent Wispr Flow desktop note', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    expect(
      screen.getByText('Just tell UNDO how you want your files organized.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use Wispr Flow to dictate your preferences/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Voice Dictation Ready')).toBeInTheDocument();
    expect(screen.getByText(/Wispr Flow is an external desktop application/i)).toBeInTheDocument();
    expect(screen.getByText(/Transparency Note/i)).toBeInTheDocument();
  });

  it('renders editable transcript area and allows user manual editing', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Put all screenshots in a Screenshots folder' } });
    expect(textarea.value).toBe('Put all screenshots in a Screenshots folder');

    // User can manually edit/correct
    fireEvent.change(textarea, { target: { value: 'Put all screenshots in a Screenshots folder and group Pathfinder files together' } });
    expect(textarea.value).toBe('Put all screenshots in a Screenshots folder and group Pathfinder files together');
  });

  it('generates multi-rule interpretation preview with actual matched files', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: {
        value:
          'Put screenshots in a Screenshots folder, group Pathfinder files together, and keep all duplicate copies.',
      },
    });

    expect(screen.getByText(/Interpreted Organization Rule:/i)).toBeInTheDocument();
    expect(screen.getByText(/3 instruction rule\(s\) recognized/i)).toBeInTheDocument();
    expect(screen.getByText('Organize Screenshots')).toBeInTheDocument();
    expect(screen.getByText('Group Pathfinder Project Files')).toBeInTheDocument();
    expect(screen.getByText('Retain All Duplicate Copies')).toBeInTheDocument();

    // Actual matched files are visible in the preview
    expect(screen.getByText('screenshot_annual_report.png')).toBeInTheDocument();
    expect(screen.getByText('pathfinder_q4_plan.docx')).toBeInTheDocument();
  });

  it('does NOT apply changes automatically when typing or previewing (Explicit confirmation safety)', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Exclude exact duplicate copies from the organized download' } });

    // Changes should not be applied yet
    expect(handleApply).not.toHaveBeenCalled();
    expect(screen.getByText('No changes are applied until you confirm.')).toBeInTheDocument();
  });

  it('applies changes only after explicit user confirmation ("Confirm & Apply Rule")', async () => {
    const handleApply = vi.fn().mockResolvedValue(undefined);
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Exclude exact duplicate copies from the organized download' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Apply Rule/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleApply).toHaveBeenCalledTimes(1);
    });

    const appliedUpdates = handleApply.mock.calls[0][0];
    expect(appliedUpdates).toHaveLength(1);
    expect(appliedUpdates[0].fileId).toBe('f3');
    expect(appliedUpdates[0].isIncluded).toBe(false);
  });

  it('displays duplicate safety reassurance badge (originals remain untouched)', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Exclude exact duplicate copies from the organized download' } });

    expect(
      screen.getByText(/Original files on your computer remain completely untouched/i)
    ).toBeInTheDocument();
  });

  it('supports "Preview Instructions" button action', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Keep presentations separate from documents' } });

    const previewBtn = screen.getByRole('button', { name: /Preview Instructions/i });
    fireEvent.click(previewBtn);

    expect(screen.getByText('Separate Presentations from Documents')).toBeInTheDocument();
    expect(screen.getByText('keynote_pitch_final.pptx')).toBeInTheDocument();
  });

  it('provides a "Clear Transcript" button that resets preview state', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Put all screenshots in a Screenshots folder' } });
    expect(screen.getByText(/Interpreted Organization Rule:/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /Clear Transcript/i });
    fireEvent.click(clearBtn);

    expect(textarea.value).toBe('');
    expect(screen.queryByText(/Interpreted Organization Rule:/i)).not.toBeInTheDocument();
  });
});

