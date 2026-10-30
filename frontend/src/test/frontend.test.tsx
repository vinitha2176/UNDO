import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { formatBytes, formatDate, getCategoryBadgeClass } from '../utils/formatters';
import { generateSampleFiles } from '../services/sampleData';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { StepIndicator } from '../components/layout/StepIndicator';
import { WisprPreferences } from '../components/organizer/WisprPreferences';
import { OrganizationPlanItem } from '../types';

describe('Frontend Utilities & Formatters Unit Tests', () => {
  it('formatBytes converts bytes into human-readable strings', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
  });

  it('getCategoryBadgeClass returns proper styling classes', () => {
    expect(getCategoryBadgeClass('documents')).toContain('bg-blue-50');
    expect(getCategoryBadgeClass('spreadsheets')).toContain('bg-emerald-50');
    expect(getCategoryBadgeClass('images')).toContain('bg-purple-50');
  });

  it('generateSampleFiles returns realistic synthetic files with exact duplicates', () => {
    const files = generateSampleFiles();
    expect(files.length).toBe(30);

    const resume1 = files.find((f) => f.name === 'resume_final.pdf');
    const resume2 = files.find((f) => f.name === 'resume_final_copy.pdf');

    expect(resume1).toBeDefined();
    expect(resume2).toBeDefined();

    // Verify exact duplicate size and MIME type
    expect(resume1!.size).toBe(resume2!.size);
    expect(resume1!.type).toBe(resume2!.type);
    expect(resume1!.size).toBeGreaterThan(0);
  });
});

describe('Frontend UI Components Tests', () => {
  it('renders Badge with custom variants', () => {
    render(<Badge variant="success">Organized</Badge>);
    expect(screen.getByText('Organized')).toBeInTheDocument();
  });

  it('renders Button and handles loading state', () => {
    render(
      <Button variant="primary" isLoading={true}>
        Submit
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('renders StepIndicator with correct step navigation', () => {
    render(
      <StepIndicator
        currentStep="analysis"
        hasFiles={true}
        onStepChange={() => {}}
      />
    );
    expect(screen.getByText('1. Upload Files')).toBeInTheDocument();
    expect(screen.getByText('2. File Analysis')).toBeInTheDocument();
    expect(screen.getByText('3. Organization Studio')).toBeInTheDocument();
    expect(screen.getByText('4. Export Review')).toBeInTheDocument();
  });
});

describe('Wispr Flow Natural Language Preferences Unit Tests', () => {
  const mockPlanItems: OrganizationPlanItem[] = [
    {
      fileId: 'f1',
      originalName: 'invoice_2026_q1.pdf',
      proposedFilename: 'invoice_2026_q1.pdf',
      proposedDestinationFolder: 'Documents',
      proposedPath: 'Documents/invoice_2026_q1.pdf',
      category: 'documents',
      duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
      isIncludedInExport: true,
      groupingReason: 'categorized',
      userModified: false,
    },
    {
      fileId: 'f2',
      originalName: 'logo_design_vector.png',
      proposedFilename: 'logo_design_vector.png',
      proposedDestinationFolder: 'Images',
      proposedPath: 'Images/logo_design_vector.png',
      category: 'images',
      duplicateStatus: { isDuplicate: false, isPrimary: true, totalCopies: 1 },
      isIncludedInExport: true,
      groupingReason: 'categorized',
      userModified: false,
    },
    {
      fileId: 'f3',
      originalName: 'invoice_2026_q1_copy.pdf',
      proposedFilename: 'invoice_2026_q1_copy.pdf',
      proposedDestinationFolder: 'Documents',
      proposedPath: 'Documents/invoice_2026_q1_copy.pdf',
      category: 'documents',
      duplicateStatus: { isDuplicate: true, isPrimary: false, duplicateOfFileId: 'f1', totalCopies: 2 },
      isIncludedInExport: true,
      groupingReason: 'exact duplicate',
      userModified: false,
    },
  ];

  it('correctly interprets "Organize files by year and month"', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByPlaceholderText(/Put all project screenshots/i);
    fireEvent.change(textarea, { target: { value: 'Organize files by year and month' } });

    expect(screen.getByText(/Interpreted Organization Rule:/i)).toBeInTheDocument();
    expect(screen.getByText(/chronologically by Year & Month/i)).toBeInTheDocument();
  });

  it('correctly interprets "Group design files into a branding folder"', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByPlaceholderText(/Put all project screenshots/i);
    fireEvent.change(textarea, { target: { value: 'Group design files into a branding folder' } });

    expect(screen.getByText(/Interpreted Organization Rule:/i)).toBeInTheDocument();
    expect(screen.getByText(/Group 1 design and creative asset/i)).toBeInTheDocument();
  });

  it('correctly interprets "Put all invoices in Finance/2026"', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByPlaceholderText(/Put all project screenshots/i);
    fireEvent.change(textarea, { target: { value: 'Put all invoices in Finance/2026' } });

    expect(screen.getByText(/Interpreted Organization Rule:/i)).toBeInTheDocument();
    expect(screen.getByText(/Move 2 invoice and financial document/i)).toBeInTheDocument();
  });

  it('correctly interprets "Keep all duplicates"', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByPlaceholderText(/Put all project screenshots/i);
    fireEvent.change(textarea, { target: { value: 'Keep all duplicates' } });

    expect(screen.getByText(/Interpreted Organization Rule:/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep and retain all 1 duplicate copy/i)).toBeInTheDocument();
  });

  it('correctly interprets "Exclude all duplicate copies"', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByPlaceholderText(/Put all project screenshots/i);
    fireEvent.change(textarea, { target: { value: 'Exclude all duplicate copies' } });

    expect(screen.getByText(/Interpreted Organization Rule:/i)).toBeInTheDocument();
    expect(screen.getByText(/Exclude all 1 duplicate copy/i)).toBeInTheDocument();
  });

  it('handles unsupported instructions gracefully with clear feedback', () => {
    const handleApply = vi.fn();
    render(<WisprPreferences planItems={mockPlanItems} onApplyRules={handleApply} />);

    const textarea = screen.getByPlaceholderText(/Put all project screenshots/i);
    fireEvent.change(textarea, { target: { value: 'Random gibberish that does not match any rule' } });

    expect(screen.getByText(/Rule could not be deterministically matched/i)).toBeInTheDocument();
  });
});
