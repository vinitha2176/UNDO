import React, { useState, useEffect } from 'react';
import {
  WorkflowStep,
  SessionAnalysisSummary,
  OrganizationPlanSummary,
  VirtualTreeResponse,
  SafeFileMetadata,
  DuplicateGroupDetail,
  ToastMessage,
  ExportRecord,
} from './types';
import { api } from './services/api';
import { Header } from './components/layout/Header';
import { StepIndicator } from './components/layout/StepIndicator';
import { Footer } from './components/layout/Footer';
import { DropZone } from './components/upload/DropZone';
import { AnalysisOverview } from './components/analysis/AnalysisOverview';
import { OrganizationStudio } from './components/organizer/OrganizationStudio';
import { ExportReview } from './components/export/ExportReview';
import { ToastContainer } from './components/common/Toast';

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Core Data State
  const [uploadedFiles, setUploadedFiles] = useState<SafeFileMetadata[]>([]);
  const [analysis, setAnalysis] = useState<SessionAnalysisSummary | null>(null);
  const [planSummary, setPlanSummary] = useState<OrganizationPlanSummary | null>(null);
  const [virtualTree, setVirtualTree] = useState<VirtualTreeResponse | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroupDetail[]>([]);

  // Toast Notification State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check Backend Health on Mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await api.checkHealth();
        setBackendHealthy(true);
      } catch {
        setBackendHealthy(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all session data after upload or state update
  const refreshSessionData = async (activeSessionId: string) => {
    const [files, analysisData, planData, treeData, dupsData] = await Promise.all([
      api.getSessionFiles(activeSessionId),
      api.getSessionAnalysis(activeSessionId),
      api.getSessionPlan(activeSessionId),
      api.getPlanTree(activeSessionId),
      api.getDuplicateGroups(activeSessionId),
    ]);

    setUploadedFiles(files);
    setAnalysis(analysisData);
    setPlanSummary(planData);
    setVirtualTree(treeData);
    setDuplicateGroups(dupsData);
  };

  // Step 1: Upload Handler
  const handleFilesSelected = async (files: File[], relativePaths?: Record<string, string>) => {
    setIsUploading(true);
    try {
      // 1. Create a real backend session
      const session = await api.createSession();
      setSessionId(session.sessionId);

      // 2. Upload files via multipart request
      await api.uploadFiles(session.sessionId, files, relativePaths);

      // 3. Retrieve analysis, plan, and virtual tree from backend
      await refreshSessionData(session.sessionId);

      addToast('success', `Successfully analyzed ${files.length} files.`, 'Upload Complete');
      setCurrentStep('analysis');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to upload and analyze files.', 'Upload Error');
    } finally {
      setIsUploading(false);
    }
  };

  // Step 3: Update Individual Plan Item
  const handleUpdatePlanItem = async (
    fileId: string,
    updates: {
      proposedFilename?: string;
      proposedDestinationFolder?: string;
      category?: string;
      suggestedGroup?: string | null;
      isIncludedInExport?: boolean;
      allowExtensionChange?: boolean;
    }
  ) => {
    if (!sessionId) return;
    try {
      await api.updatePlanFile(sessionId, fileId, updates);
      // Refresh plan, tree, and duplicates
      const [updatedPlan, updatedTree, updatedDups] = await Promise.all([
        api.getSessionPlan(sessionId),
        api.getPlanTree(sessionId),
        api.getDuplicateGroups(sessionId),
      ]);
      setPlanSummary(updatedPlan);
      setVirtualTree(updatedTree);
      setDuplicateGroups(updatedDups);
      addToast('success', 'File organization settings updated.', 'Plan Updated');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update file.', 'Update Failed');
      throw err;
    }
  };

  // Step 3: Reset Organization Plan
  const handleResetPlan = async () => {
    if (!sessionId) return;
    try {
      const resetPlan = await api.resetSessionPlan(sessionId);
      const resetTree = await api.getPlanTree(sessionId);
      const resetDups = await api.getDuplicateGroups(sessionId);
      setPlanSummary(resetPlan);
      setVirtualTree(resetTree);
      setDuplicateGroups(resetDups);
      addToast('info', 'Organization plan restored to initial suggestions.', 'Plan Reset');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to reset plan.', 'Reset Error');
    }
  };

  // Step 3 & 4: Duplicate Group Update
  const handleUpdateDuplicateGroup = async (
    groupId: string,
    action: 'keep_all' | 'retain_one' | 'exclude_selected' | 'include_selected',
    primaryFileId?: string,
    fileIds?: string[]
  ) => {
    if (!sessionId) return;
    try {
      await api.updateDuplicateGroup(sessionId, groupId, { action, primaryFileId, fileIds });
      const [updatedPlan, updatedTree, updatedDups] = await Promise.all([
        api.getSessionPlan(sessionId),
        api.getPlanTree(sessionId),
        api.getDuplicateGroups(sessionId),
      ]);
      setPlanSummary(updatedPlan);
      setVirtualTree(updatedTree);
      setDuplicateGroups(updatedDups);
      addToast('success', 'Duplicate retention choices saved.', 'Duplicates Updated');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update duplicates.', 'Update Failed');
    }
  };

  // Step 4: Generate and Download ZIP Export
  const handleGenerateAndDownload = async (): Promise<ExportRecord> => {
    if (!sessionId) throw new Error('No active session');
    try {
      const exportRecord = await api.createExport(sessionId);
      await api.downloadExport(sessionId, exportRecord.exportId, exportRecord.filename);
      addToast('success', 'Your organized archive has been downloaded.', 'Export Successful');
      return exportRecord;
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create export.', 'Export Failed');
      throw err;
    }
  };

  // Start New Session
  const handleNewSession = () => {
    if (uploadedFiles.length > 0) {
      if (!confirm('Start a new session? Your current organization proposals will be cleared.')) {
        return;
      }
    }
    setSessionId(null);
    setUploadedFiles([]);
    setAnalysis(null);
    setPlanSummary(null);
    setVirtualTree(null);
    setDuplicateGroups([]);
    setCurrentStep('upload');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Header
        sessionId={sessionId}
        backendHealthy={backendHealthy}
        onNewSession={handleNewSession}
      />

      <StepIndicator
        currentStep={currentStep}
        hasFiles={uploadedFiles.length > 0}
        onStepChange={(step) => setCurrentStep(step)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <DropZone
            onFilesSelected={handleFilesSelected}
            isUploading={isUploading}
          />
        )}

        {/* Step 2: File Analysis */}
        {currentStep === 'analysis' && analysis && (
          <AnalysisOverview
            analysis={analysis}
            onProceedToStudio={() => setCurrentStep('organize')}
          />
        )}

        {/* Step 3: Organization Studio */}
        {currentStep === 'organize' && planSummary && virtualTree && (
          <OrganizationStudio
            planSummary={planSummary}
            virtualTree={virtualTree}
            fileMetadata={uploadedFiles}
            duplicateGroups={duplicateGroups}
            onUpdatePlanItem={handleUpdatePlanItem}
            onResetPlan={handleResetPlan}
            onUpdateDuplicateGroup={handleUpdateDuplicateGroup}
            onProceedToExport={() => setCurrentStep('export')}
          />
        )}

        {/* Step 4: Export Review */}
        {currentStep === 'export' && planSummary && virtualTree && (
          <ExportReview
            planSummary={planSummary}
            virtualTree={virtualTree}
            fileMetadata={uploadedFiles}
            onGenerateAndDownload={handleGenerateAndDownload}
            onBackToStudio={() => setCurrentStep('organize')}
          />
        )}
      </main>

      <Footer />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
export default App;

