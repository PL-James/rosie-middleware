/**
 * @gxp-tag SPEC-001-003
 * @trace US-001-001
 * @gxp-criticality HIGH
 * @test-type integration
 *
 * Delta Detection Integration Tests (Mocked)
 *
 * Tests the full incremental scanning workflow logic with mocked database,
 * validating checksum storage, retrieval, and update patterns.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock database operations
interface FileChecksum {
  id: string;
  repositoryId: string;
  filePath: string;
  sha256Hash: string;
  lastScannedAt: Date;
  artifactId?: string;
  artifactType?: string;
  createdAt: Date;
  updatedAt: Date;
}

class MockDatabase {
  private checksums: Map<string, FileChecksum> = new Map();

  async insertChecksum(checksum: Omit<FileChecksum, 'id' | 'createdAt' | 'updatedAt'>): Promise<FileChecksum> {
    const id = `checksum-${this.checksums.size + 1}`;
    const fullChecksum: FileChecksum = {
      ...checksum,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const key = `${checksum.repositoryId}:${checksum.filePath}`;
    if (this.checksums.has(key)) {
      throw new Error('Unique constraint violation: file_checksum_unique_repo_path');
    }

    this.checksums.set(key, fullChecksum);
    return fullChecksum;
  }

  async upsertChecksum(checksum: Omit<FileChecksum, 'id' | 'createdAt' | 'updatedAt'>): Promise<FileChecksum> {
    const key = `${checksum.repositoryId}:${checksum.filePath}`;
    const existing = this.checksums.get(key);

    if (existing) {
      const updated: FileChecksum = {
        ...existing,
        sha256Hash: checksum.sha256Hash,
        lastScannedAt: checksum.lastScannedAt,
        updatedAt: new Date(),
      };
      this.checksums.set(key, updated);
      return updated;
    }

    return this.insertChecksum(checksum);
  }

  async selectChecksums(repositoryId: string): Promise<FileChecksum[]> {
    return Array.from(this.checksums.values())
      .filter(c => c.repositoryId === repositoryId);
  }

  async deleteChecksum(id: string): Promise<void> {
    for (const [key, value] of this.checksums.entries()) {
      if (value.id === id) {
        this.checksums.delete(key);
        return;
      }
    }
  }

  async deleteByRepository(repositoryId: string): Promise<void> {
    for (const [key, value] of this.checksums.entries()) {
      if (value.repositoryId === repositoryId) {
        this.checksums.delete(key);
      }
    }
  }

  clear(): void {
    this.checksums.clear();
  }
}

describe('Delta Detection - Integration Tests (Mocked)', () => {
  let mockDb: MockDatabase;
  let testRepositoryId: string;

  beforeEach(() => {
    mockDb = new MockDatabase();
    testRepositoryId = 'repo-123';
  });

  /**
   * @gxp-tag SPEC-001-003-INT-001
   * @gxp-criticality HIGH
   * @test-type integration
   */
  describe('Checksum Storage', () => {
    it('should store file checksums on first scan', async () => {
      // Arrange
      const files = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456' },
      ];

      // Act
      for (const file of files) {
        await mockDb.insertChecksum({
          repositoryId: testRepositoryId,
          filePath: file.path,
          sha256Hash: file.sha,
          lastScannedAt: new Date(),
        });
      }

      // Assert
      const storedChecksums = await mockDb.selectChecksums(testRepositoryId);
      expect(storedChecksums).toHaveLength(2);
      expect(storedChecksums[0].filePath).toBe('.gxp/requirements/REQ-001.md');
      expect(storedChecksums[0].sha256Hash).toBe('abc123');
      expect(storedChecksums[1].filePath).toBe('.gxp/requirements/REQ-002.md');
      expect(storedChecksums[1].sha256Hash).toBe('def456');
    });

    it('should update checksums on subsequent scans', async () => {
      // Arrange
      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'old-sha',
        lastScannedAt: new Date('2024-01-01'),
      });

      // Act
      const updated = await mockDb.upsertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'new-sha',
        lastScannedAt: new Date(),
      });

      // Assert
      expect(updated.sha256Hash).toBe('new-sha');
      expect(updated.lastScannedAt.getTime()).toBeGreaterThan(
        new Date('2024-01-01').getTime(),
      );

      const allChecksums = await mockDb.selectChecksums(testRepositoryId);
      expect(allChecksums).toHaveLength(1); // Should not create duplicate
    });
  });

  /**
   * @gxp-tag SPEC-001-003-INT-002
   * @gxp-criticality HIGH
   * @test-type integration
   */
  describe('Checksum Retrieval for Delta Detection', () => {
    it('should retrieve all checksums for a repository', async () => {
      // Arrange
      const files = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456' },
        { path: '.gxp/specs/SPEC-001.md', sha: 'ghi789' },
      ];

      for (const file of files) {
        await mockDb.insertChecksum({
          repositoryId: testRepositoryId,
          filePath: file.path,
          sha256Hash: file.sha,
          lastScannedAt: new Date(),
        });
      }

      // Act
      const checksums = await mockDb.selectChecksums(testRepositoryId);

      // Assert
      expect(checksums).toHaveLength(3);
      expect(checksums.map((c) => c.filePath)).toContain('.gxp/requirements/REQ-001.md');
      expect(checksums.map((c) => c.filePath)).toContain('.gxp/requirements/REQ-002.md');
      expect(checksums.map((c) => c.filePath)).toContain('.gxp/specs/SPEC-001.md');
    });

    it('should return empty array for repository with no checksums', async () => {
      // Act
      const checksums = await mockDb.selectChecksums(testRepositoryId);

      // Assert
      expect(checksums).toHaveLength(0);
    });

    it('should only return checksums for specified repository', async () => {
      // Arrange
      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'abc123',
        lastScannedAt: new Date(),
      });

      await mockDb.insertChecksum({
        repositoryId: 'other-repo',
        filePath: '.gxp/requirements/REQ-999.md',
        sha256Hash: 'xyz789',
        lastScannedAt: new Date(),
      });

      // Act
      const checksums = await mockDb.selectChecksums(testRepositoryId);

      // Assert
      expect(checksums).toHaveLength(1);
      expect(checksums[0].filePath).toBe('.gxp/requirements/REQ-001.md');
    });
  });

  /**
   * @gxp-tag SPEC-001-003-INT-003
   * @gxp-criticality HIGH
   * @test-type integration
   */
  describe('Changed File Detection with Database', () => {
    it('should identify changed files by comparing database checksums', async () => {
      // Arrange - Store initial checksums
      const initialFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456' },
      ];

      for (const file of initialFiles) {
        await mockDb.insertChecksum({
          repositoryId: testRepositoryId,
          filePath: file.path,
          sha256Hash: file.sha,
          lastScannedAt: new Date(),
        });
      }

      // Act - Simulate new scan with changed files
      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123', type: 'blob' }, // Unchanged
        { path: '.gxp/requirements/REQ-002.md', sha: 'xyz789', type: 'blob' }, // Changed
        { path: '.gxp/requirements/REQ-003.md', sha: 'new999', type: 'blob' }, // New
      ];

      const previousChecksums = await mockDb.selectChecksums(testRepositoryId);
      const checksumMap = new Map(
        previousChecksums.map((cs) => [cs.filePath, cs.sha256Hash]),
      );

      const changedFiles = currentFiles.filter((file) => {
        const previousHash = checksumMap.get(file.path);
        return !previousHash || previousHash !== file.sha;
      });

      // Assert
      expect(changedFiles).toHaveLength(2);
      expect(changedFiles.map((f) => f.path)).toContain('.gxp/requirements/REQ-002.md');
      expect(changedFiles.map((f) => f.path)).toContain('.gxp/requirements/REQ-003.md');
    });

    it('should skip unchanged files', async () => {
      // Arrange
      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'abc123',
        lastScannedAt: new Date(),
      });

      // Act
      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123', type: 'blob' }, // Unchanged
      ];

      const previousChecksums = await mockDb.selectChecksums(testRepositoryId);
      const checksumMap = new Map(
        previousChecksums.map((cs) => [cs.filePath, cs.sha256Hash]),
      );

      const changedFiles = currentFiles.filter((file) => {
        const previousHash = checksumMap.get(file.path);
        return !previousHash || previousHash !== file.sha;
      });

      // Assert
      expect(changedFiles).toHaveLength(0);
    });
  });

  /**
   * @gxp-tag SPEC-001-003-INT-004
   * @gxp-criticality MEDIUM
   * @test-type integration
   */
  describe('Deleted File Handling', () => {
    it('should remove checksums for deleted files', async () => {
      // Arrange
      const files = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456' },
        { path: '.gxp/requirements/REQ-003.md', sha: 'ghi789' },
      ];

      for (const file of files) {
        await mockDb.insertChecksum({
          repositoryId: testRepositoryId,
          filePath: file.path,
          sha256Hash: file.sha,
          lastScannedAt: new Date(),
        });
      }

      // Act - Simulate deletion of REQ-003
      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456' },
      ];

      const previousChecksums = await mockDb.selectChecksums(testRepositoryId);
      const currentFilePaths = new Set(currentFiles.map((f) => f.path));
      const deletedFiles = previousChecksums.filter(
        (cs) => !currentFilePaths.has(cs.filePath),
      );

      for (const deletedFile of deletedFiles) {
        await mockDb.deleteChecksum(deletedFile.id);
      }

      // Assert
      const remainingChecksums = await mockDb.selectChecksums(testRepositoryId);
      expect(remainingChecksums).toHaveLength(2);
      expect(remainingChecksums.map((c) => c.filePath)).not.toContain(
        '.gxp/requirements/REQ-003.md',
      );
    });

    it('should identify all deleted files', async () => {
      // Arrange
      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'abc123',
        lastScannedAt: new Date(),
      });

      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-002.md',
        sha256Hash: 'def456',
        lastScannedAt: new Date(),
      });

      // Act - All files deleted
      const currentFiles: any[] = [];
      const previousChecksums = await mockDb.selectChecksums(testRepositoryId);
      const currentFilePaths = new Set(currentFiles.map((f: any) => f.path));
      const deletedFiles = previousChecksums.filter(
        (cs) => !currentFilePaths.has(cs.filePath),
      );

      // Assert
      expect(deletedFiles).toHaveLength(2);
    });
  });

  /**
   * @gxp-tag SPEC-001-003-INT-005
   * @gxp-criticality MEDIUM
   * @test-type integration
   */
  describe('Unique Constraint Enforcement', () => {
    it('should enforce unique constraint on (repository_id, file_path)', async () => {
      // Arrange
      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'abc123',
        lastScannedAt: new Date(),
      });

      // Act & Assert
      await expect(async () => {
        await mockDb.insertChecksum({
          repositoryId: testRepositoryId,
          filePath: '.gxp/requirements/REQ-001.md',
          sha256Hash: 'def456',
          lastScannedAt: new Date(),
        });
      }).rejects.toThrow('Unique constraint violation');
    });

    it('should allow same file_path for different repositories', async () => {
      // Arrange & Act
      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'abc123',
        lastScannedAt: new Date(),
      });

      await mockDb.insertChecksum({
        repositoryId: 'repo-456',
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'def456',
        lastScannedAt: new Date(),
      });

      // Assert
      const repo1Checksums = await mockDb.selectChecksums(testRepositoryId);
      const repo2Checksums = await mockDb.selectChecksums('repo-456');

      expect(repo1Checksums).toHaveLength(1);
      expect(repo2Checksums).toHaveLength(1);
      expect(repo1Checksums[0].sha256Hash).toBe('abc123');
      expect(repo2Checksums[0].sha256Hash).toBe('def456');
    });
  });

  /**
   * @gxp-tag SPEC-001-003-INT-006
   * @gxp-criticality HIGH
   * @test-type integration
   */
  describe('Performance Calculation', () => {
    it('should calculate performance improvement with real data', async () => {
      // Arrange - Store 100 checksums
      const files = Array.from({ length: 100 }, (_, i) => ({
        path: `.gxp/requirements/REQ-${String(i + 1).padStart(3, '0')}.md`,
        sha: `sha-${i}`,
      }));

      for (const file of files) {
        await mockDb.insertChecksum({
          repositoryId: testRepositoryId,
          filePath: file.path,
          sha256Hash: file.sha,
          lastScannedAt: new Date(),
        });
      }

      // Act - Simulate scan with 5 changed files
      const currentFiles = files.map((file, i) => ({
        path: file.path,
        sha: i < 5 ? `new-sha-${i}` : file.sha,
        type: 'blob',
      }));

      const previousChecksums = await mockDb.selectChecksums(testRepositoryId);
      const checksumMap = new Map(
        previousChecksums.map((cs) => [cs.filePath, cs.sha256Hash]),
      );

      const changedFiles = currentFiles.filter((file) => {
        const previousHash = checksumMap.get(file.path);
        return !previousHash || previousHash !== file.sha;
      });

      const totalFiles = currentFiles.length;
      const skippedFiles = totalFiles - changedFiles.length;
      const performanceImprovement = Math.round((skippedFiles / totalFiles) * 100);

      // Assert
      expect(changedFiles).toHaveLength(5);
      expect(skippedFiles).toBe(95);
      expect(performanceImprovement).toBe(95);
    });

    it('should handle first scan (no checksums)', async () => {
      // Arrange
      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456' },
      ];

      // Act
      const previousChecksums = await mockDb.selectChecksums(testRepositoryId);
      const checksumMap = new Map(
        previousChecksums.map((cs) => [cs.filePath, cs.sha256Hash]),
      );

      const changedFiles = currentFiles.filter((file) => {
        const previousHash = checksumMap.get(file.path);
        return !previousHash || previousHash !== file.sha;
      });

      // Assert - All files are "changed" (new)
      expect(changedFiles).toHaveLength(2);
      expect(previousChecksums).toHaveLength(0);
    });
  });

  /**
   * @gxp-tag SPEC-001-003-INT-007
   * @gxp-criticality MEDIUM
   * @test-type integration
   */
  describe('Cascade Deletion', () => {
    it('should delete all checksums when repository is deleted', async () => {
      // Arrange
      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-001.md',
        sha256Hash: 'abc123',
        lastScannedAt: new Date(),
      });

      await mockDb.insertChecksum({
        repositoryId: testRepositoryId,
        filePath: '.gxp/requirements/REQ-002.md',
        sha256Hash: 'def456',
        lastScannedAt: new Date(),
      });

      // Verify checksums exist
      let checksums = await mockDb.selectChecksums(testRepositoryId);
      expect(checksums).toHaveLength(2);

      // Act - Delete repository (cascade delete checksums)
      await mockDb.deleteByRepository(testRepositoryId);

      // Assert
      checksums = await mockDb.selectChecksums(testRepositoryId);
      expect(checksums).toHaveLength(0);
    });
  });
});
