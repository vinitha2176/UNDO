import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { formatBytes, formatDate, getCategoryBadgeClass } from '../utils/formatters';
import { generateSampleFiles } from '../services/sampleData';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { StepIndicator } from '../components/layout/StepIndicator';

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
    expect(files.length).toBe(9);

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
