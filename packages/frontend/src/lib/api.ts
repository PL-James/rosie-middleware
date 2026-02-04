import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Repository {
  id: string;
  name: string;
  gitUrl: string;
  description?: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  autoScan: boolean;
  scanIntervalMinutes: number;
  lastScanId?: string;
  lastScanAt?: string;
  lastScanStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
  isRosieCompliant: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scan {
  id: string;
  repositoryId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  commitSha?: string;
  commitMessage?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  artifactsFound: number;
  artifactsCreated: number;
  artifactsUpdated: number;
  errorMessage?: string;
  createdAt: string;
}

export interface SystemContext {
  id: string;
  repositoryId: string;
  projectName: string;
  version: string;
  gxpRiskRating: 'HIGH' | 'MEDIUM' | 'LOW';
  validationStatus: 'DRAFT' | 'VALIDATED' | 'DEPRECATED';
  intendedUse?: string;
  regulatory?: string;
  systemOwner?: string;
  technicalContact?: string;
  sections: Record<string, any>;
  createdAt: string;
}

export interface Requirement {
  id: string;
  repositoryId: string;
  gxpId: string;
  title: string;
  description?: string;
  gxpRiskRating?: 'HIGH' | 'MEDIUM' | 'LOW';
  acceptanceCriteria?: string[];
  filePath: string;
  createdAt: string;
}

export interface UserStory {
  id: string;
  repositoryId: string;
  gxpId: string;
  parentId?: string;
  title: string;
  description?: string;
  asA?: string;
  iWant?: string;
  soThat?: string;
  acceptanceCriteria?: string[];
  status?: string;
  filePath: string;
  createdAt: string;
}

export interface Spec {
  id: string;
  repositoryId: string;
  gxpId: string;
  parentId?: string;
  title: string;
  description?: string;
  designApproach?: string;
  implementationNotes?: string;
  verificationTier?: 'IQ' | 'OQ' | 'PQ';
  sourceFiles?: string[];
  testFiles?: string[];
  filePath: string;
  createdAt: string;
}

export interface Evidence {
  id: string;
  repositoryId: string;
  gxpId?: string;
  fileName: string;
  filePath: string;
  verificationTier?: 'IQ' | 'OQ' | 'PQ';
  jwsPayload?: Record<string, any>;
  jwsHeader?: Record<string, any>;
  signature?: string;
  isSignatureValid?: boolean;
  signatureVerifiedAt?: string;
  testResults?: Record<string, any>;
  timestamp?: string;
  createdAt: string;
}

export interface VerificationStatus {
  total: number;
  verified: number;
  unverified: number;
  failed: number;
  byTier: {
    IQ: { total: number; verified: number };
    OQ: { total: number; verified: number };
    PQ: { total: number; verified: number };
  };
}

export interface ComplianceReport {
  repositoryId: string;
  summary: {
    totalArtifacts: number;
    complianceScore: number;
    riskLevel: string;
  };
  cfr21Part11: {
    electronicSignatures: { status: string; count: number };
    auditTrail: { status: string; count: number };
    systemValidation: { status: string };
  };
  evidenceQuality: {
    total: number;
    verified: number;
    byTier: Record<string, number>;
  };
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface RiskAssessment {
  repositoryId: string;
  overallRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  riskDistribution: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  highRiskRequirements: Requirement[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  gtin?: string;
  manufacturerId: string;
  manufacturer?: Manufacturer;
  productType?: string;
  riskLevel?: string;
  regulatoryStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  mah?: string;
  country?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRepository {
  id: string;
  productId: string;
  repositoryId: string;
  version?: string;
  releaseDate?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface AggregatedArtifacts {
  requirements: Requirement[];
  userStories: UserStory[];
  specs: Spec[];
  evidence: Evidence[];
}

export interface ProductCompliance {
  productId: string;
  overallScore: number;
  repositoryScores: Array<{
    repositoryId: string;
    repositoryName: string;
    score: number;
  }>;
  crossRepoTraceability: {
    status: string;
    issues: string[];
  };
}

// API functions
export const repositoriesApi = {
  getAll: () => api.get<Repository[]>('/repositories'),
  getOne: (id: string) => api.get<Repository>(`/repositories/${id}`),
  create: (data: { name: string; gitUrl: string; description?: string }) =>
    api.post<Repository>('/repositories', data),
  triggerScan: (id: string) =>
    api.post<{ scanId: string; message: string }>(`/repositories/${id}/scan`),
};

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export const scansApi = {
  getStatus: (scanId: string) => api.get<Scan>(`/scans/${scanId}`),
  getRepositoryScans: (repositoryId: string, page: number = 1, limit: number = 20) =>
    api.get<PaginatedResponse<Scan>>(`/repositories/${repositoryId}/scans`, {
      params: { page, limit },
    }),
};

export const artifactsApi = {
  getSystemContext: (repositoryId: string) =>
    api.get<SystemContext>(`/repositories/${repositoryId}/system-context`),
  getRequirements: (repositoryId: string) =>
    api.get<Requirement[]>(`/repositories/${repositoryId}/requirements`),
  getUserStories: (repositoryId: string, parentId?: string) =>
    api.get<UserStory[]>(`/repositories/${repositoryId}/user-stories`, {
      params: { parent_id: parentId },
    }),
  getSpecs: (repositoryId: string, parentId?: string, tier?: string) =>
    api.get<Spec[]>(`/repositories/${repositoryId}/specs`, {
      params: { parent_id: parentId, tier },
    }),
  getEvidence: (repositoryId: string, tier?: string) =>
    api.get<Evidence[]>(`/repositories/${repositoryId}/evidence`, {
      params: { tier },
    }),
  getEvidenceById: (repositoryId: string, evidenceId: string) =>
    api.get<Evidence>(`/repositories/${repositoryId}/evidence/${evidenceId}`),
};

// Phase 3: Evidence & Compliance APIs
export const evidenceApi = {
  verifyEvidence: (repositoryId: string, evidenceId: string) =>
    api.post(`/repositories/${repositoryId}/evidence/${evidenceId}/verify`),
  batchVerifyEvidence: (repositoryId: string, evidenceIds: string[]) =>
    api.post(`/repositories/${repositoryId}/evidence/batch-verify`, {
      evidenceIds,
    }),
  getVerificationStatus: (repositoryId: string) =>
    api.get<VerificationStatus>(
      `/repositories/${repositoryId}/evidence/verification-status`,
    ),
  getVerifiedEvidence: (repositoryId: string, tier?: string) =>
    api.get<Evidence[]>(`/repositories/${repositoryId}/evidence/verified`, {
      params: { tier },
    }),
};

export const complianceApi = {
  getComplianceReport: (repositoryId: string) =>
    api.get<ComplianceReport>(`/repositories/${repositoryId}/compliance/report`),
  getAuditTrail: (repositoryId: string) =>
    api.get<AuditLogEntry[]>(`/repositories/${repositoryId}/compliance/audit-trail`),
  getRiskAssessment: (repositoryId: string) =>
    api.get<RiskAssessment>(`/repositories/${repositoryId}/compliance/risk-assessment`),
  exportCompliancePdf: (repositoryId: string) =>
    api.get(`/repositories/${repositoryId}/compliance/export/pdf`, {
      responseType: 'blob',
    }),
  exportAuditTrailCsv: (repositoryId: string) =>
    api.get(`/repositories/${repositoryId}/compliance/export/audit-trail.csv`, {
      responseType: 'blob',
    }),
};

// Phase 4: Products & Manufacturers APIs
export const productsApi = {
  getAll: (filters?: Record<string, any>) =>
    api.get<Product[]>('/products', { params: filters }),
  getOne: (productId: string) => api.get<Product>(`/products/${productId}`),
  create: (data: Partial<Product>) => api.post<Product>('/products', data),
  update: (productId: string, data: Partial<Product>) =>
    api.patch<Product>(`/products/${productId}`, data),
  delete: (productId: string) => api.delete(`/products/${productId}`),
  linkRepository: (
    productId: string,
    repositoryId: string,
    version?: string,
  ) =>
    api.post(`/products/${productId}/repositories`, {
      repositoryId,
      version,
    }),
  unlinkRepository: (productId: string, repositoryId: string) =>
    api.delete(`/products/${productId}/repositories/${repositoryId}`),
  getLinkedRepositories: (productId: string) =>
    api.get<ProductRepository[]>(`/products/${productId}/repositories`),
  getAggregatedArtifacts: (productId: string) =>
    api.get<AggregatedArtifacts>(`/products/${productId}/artifacts`),
  getCompliance: (productId: string) =>
    api.get<ProductCompliance>(`/products/${productId}/compliance`),
  getRisk: (productId: string) =>
    api.get<RiskAssessment>(`/products/${productId}/risk`),
  getTraceability: (productId: string) =>
    api.get(`/products/${productId}/traceability`),
};

export const manufacturersApi = {
  getAll: () => api.get<Manufacturer[]>('/manufacturers'),
  getOne: (manufacturerId: string) =>
    api.get<Manufacturer>(`/manufacturers/${manufacturerId}`),
  create: (data: Partial<Manufacturer>) =>
    api.post<Manufacturer>('/manufacturers', data),
  update: (manufacturerId: string, data: Partial<Manufacturer>) =>
    api.patch<Manufacturer>(`/manufacturers/${manufacturerId}`, data),
  delete: (manufacturerId: string) =>
    api.delete(`/manufacturers/${manufacturerId}`),
  getProducts: (manufacturerId: string) =>
    api.get<Product[]>(`/manufacturers/${manufacturerId}/products`),
};

export default api;
