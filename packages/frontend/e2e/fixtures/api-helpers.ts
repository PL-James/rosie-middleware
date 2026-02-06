import { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export async function seedRepository(request: APIRequestContext, data?: Partial<{
  name: string;
  gitUrl: string;
  description: string;
}>) {
  const payload = {
    name: data?.name || 'test-repo',
    gitUrl: data?.gitUrl || 'https://github.com/test-org/test-repo',
    description: data?.description || 'Test repository for E2E',
  };

  const response = await request.post(`${API_BASE}/api/v1/repositories`, {
    data: payload,
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed repository: ${response.status()} ${response.statusText()}`);
  }

  return response.json();
}

export async function deleteAllRepositories(request: APIRequestContext) {
  const response = await request.get(`${API_BASE}/api/v1/repositories`);
  if (!response.ok()) {
    throw new Error(`Failed to list repositories: ${response.status()} ${response.statusText()}`);
  }
  const repos = await response.json();

  for (const repo of repos) {
    const deleteResponse = await request.delete(`${API_BASE}/api/v1/repositories/${repo.id}`);
    if (!deleteResponse.ok()) {
      throw new Error(`Failed to delete repository ${repo.id}: ${deleteResponse.status()} ${deleteResponse.statusText()}`);
    }
  }
}

export async function triggerScan(request: APIRequestContext, repoId: string) {
  const response = await request.post(`${API_BASE}/api/v1/repositories/${repoId}/scan`);
  if (!response.ok()) {
    throw new Error(`Failed to trigger scan: ${response.status()} ${response.statusText()}`);
  }
  return response.json();
}
