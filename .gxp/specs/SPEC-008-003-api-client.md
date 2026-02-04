---
gxp_id: SPEC-008-003
title: "Frontend API Client Library"
parent_id: US-008-001
verification_tier: OQ
design_approach: |
  Implement frontend API client using Fetch API with custom wrapper. Provide
  typed methods for all backend endpoints.
source_files:
  - packages/frontend/src/api/client.ts
  - packages/frontend/src/api/repositories.ts
test_files: []
validation_status: DRAFT
---

## Operational Qualification (OQ)

Verifies API client correctly communicates with backend.

## Implementation

```typescript
class ApiClient {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return await response.json();
  }

  async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return await response.json();
  }
}

export const api = new ApiClient();

// Typed methods
export const repositoriesApi = {
  getAll: () => api.get<Repository[]>('/repositories'),
  getOne: (id: string) => api.get<Repository>(`/repositories/${id}`),
  create: (dto: CreateRepositoryDto) => api.post<Repository>('/repositories', dto),
  triggerScan: (id: string) => api.post<{ scanId: string }>(`/repositories/${id}/scan`, {}),
};
```

## Verification Method

**Tests:**
- GET /repositories → Returns repository array
- POST /repositories → Creates repository
- Error handling → Throws error on 4xx/5xx

## Implementation Files

- `packages/frontend/src/api/client.ts`
- `packages/frontend/src/api/repositories.ts`
