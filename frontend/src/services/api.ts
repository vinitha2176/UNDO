import {
  DuplicateGroupDetail,
  ExportRecord,
  OrganizationPlanItem,
  OrganizationPlanSummary,
  PlanChangeRecord,
  SafeFileMetadata,
  SessionAnalysisSummary,
  VirtualTreeResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  code?: string;
  status: number;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // not JSON
    }
    const message = errorData.error?.message || errorData.message || response.statusText || 'Request failed';
    const code = errorData.error?.code || errorData.code;
    throw new ApiError(message, response.status, code, errorData.error?.details);
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Health
  checkHealth: async () => {
    return request<{ status: string; version: string }>('/health');
  },

  // Sessions
  createSession: async () => {
    return request<{ sessionId: string; createdAt: string; expiresAt: string }>('/sessions', {
      method: 'POST',
    });
  },

  // Files Upload
  uploadFiles: async (sessionId: string, files: File[], relativePaths?: Record<string, string>) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    if (relativePaths && Object.keys(relativePaths).length > 0) {
      formData.append('relativePaths', JSON.stringify(relativePaths));
    }

    return request<{
      sessionId: string;
      uploadedCount: number;
      totalSessionFiles: number;
      files: SafeFileMetadata[];
    }>(`/sessions/${sessionId}/files`, {
      method: 'POST',
      body: formData,
    });
  },

  getSessionFiles: async (sessionId: string) => {
    const res = await request<{ sessionId: string; count: number; files: SafeFileMetadata[] }>(
      `/sessions/${sessionId}/files`
    );
    return res.files;
  },

  // Analysis
  getSessionAnalysis: async (sessionId: string) => {
    return request<SessionAnalysisSummary>(`/sessions/${sessionId}/analysis`);
  },

  // Organization Plan
  getSessionPlan: async (sessionId: string) => {
    return request<OrganizationPlanSummary>(`/sessions/${sessionId}/plan`);
  },

  updatePlanFile: async (
    sessionId: string,
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
    return request<OrganizationPlanItem>(`/sessions/${sessionId}/plan/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  resetSessionPlan: async (sessionId: string) => {
    return request<OrganizationPlanSummary>(`/sessions/${sessionId}/plan/reset`, {
      method: 'POST',
    });
  },

  getPlanTree: async (sessionId: string) => {
    return request<VirtualTreeResponse>(`/sessions/${sessionId}/plan/tree`);
  },

  // Duplicates
  getDuplicateGroups: async (sessionId: string) => {
    const res = await request<{
      sessionId: string;
      count: number;
      duplicateGroups: DuplicateGroupDetail[];
    }>(`/sessions/${sessionId}/duplicates`);
    return res.duplicateGroups;
  },

  updateDuplicateGroup: async (
    sessionId: string,
    groupId: string,
    data: {
      action: 'keep_all' | 'retain_one' | 'exclude_selected' | 'include_selected';
      primaryFileId?: string;
      fileIds?: string[];
    }
  ) => {
    return request<DuplicateGroupDetail>(`/sessions/${sessionId}/duplicates/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // History / Changes
  getPlanChanges: async (sessionId: string) => {
    const res = await request<{ sessionId: string; count: number; history: PlanChangeRecord[] }>(
      `/sessions/${sessionId}/changes`
    );
    return res.history;
  },

  // Exports
  createExport: async (sessionId: string) => {
    return request<ExportRecord>(`/sessions/${sessionId}/exports`, {
      method: 'POST',
    });
  },

  downloadExport: async (sessionId: string, exportId: string, suggestedFilename = 'undo-organized-files.zip') => {
    const url = `${BASE_URL}/sessions/${sessionId}/exports/${exportId}/download`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new ApiError('Failed to download archive', response.status);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = suggestedFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
