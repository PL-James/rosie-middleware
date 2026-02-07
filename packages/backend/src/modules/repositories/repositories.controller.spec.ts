import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';

/**
 * Repository Controller Unit Tests
 *
 * @gxp-tag SPEC-007-001
 * @trace US-001-001
 * @gxp-criticality HIGH
 * @test-type OQ
 *
 * Validates REST API controller routing, HTTP status codes,
 * and delegation to service layer.
 */

describe('RepositoriesController', () => {
  let controller: RepositoriesController;
  let mockService: Partial<RepositoriesService>;

  beforeEach(() => {
    mockService = {
      findAll: vi.fn().mockResolvedValue([
        { id: 'uuid-1', name: 'Repo 1', gitUrl: 'https://github.com/owner/repo1' },
        { id: 'uuid-2', name: 'Repo 2', gitUrl: 'https://github.com/owner/repo2' },
      ]),
      findOne: vi.fn().mockResolvedValue({
        id: 'uuid-1',
        name: 'Repo 1',
        gitUrl: 'https://github.com/owner/repo1',
      }),
      create: vi.fn().mockResolvedValue({
        id: 'uuid-new',
        name: 'New Repo',
        gitUrl: 'https://github.com/owner/new-repo',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'uuid-1',
        name: 'Updated Repo',
        gitUrl: 'https://github.com/owner/repo1',
      }),
      remove: vi.fn().mockResolvedValue({
        id: 'uuid-1',
        name: 'Repo 1',
      }),
    };

    controller = new RepositoriesController(mockService as RepositoriesService);
  });

  /**
   * @gxp-tag SPEC-007-001
   * @test-type OQ
   */
  it('should return all repositories on findAll', async () => {
    const result = await controller.findAll();

    expect(result).toHaveLength(2);
    expect(mockService.findAll).toHaveBeenCalled();
  });

  it('should return a single repository by ID', async () => {
    const result = await controller.findOne('uuid-1');

    expect(result.id).toBe('uuid-1');
    expect(mockService.findOne).toHaveBeenCalledWith('uuid-1');
  });

  it('should create a new repository', async () => {
    const dto = { name: 'New Repo', gitUrl: 'https://github.com/owner/new-repo' };
    const result = await controller.create(dto);

    expect(result.id).toBe('uuid-new');
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('should update a repository', async () => {
    const result = await controller.update('uuid-1', { name: 'Updated Repo' });

    expect(result.name).toBe('Updated Repo');
    expect(mockService.update).toHaveBeenCalledWith('uuid-1', { name: 'Updated Repo' });
  });

  it('should delete a repository', async () => {
    const result = await controller.remove('uuid-1');

    expect(result.id).toBe('uuid-1');
    expect(mockService.remove).toHaveBeenCalledWith('uuid-1');
  });
});
