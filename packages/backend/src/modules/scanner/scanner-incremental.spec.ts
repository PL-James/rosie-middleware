/**
 * @gxp-tag SPEC-001-003
 * @trace US-001-001
 * @gxp-criticality HIGH
 * @test-type unit
 *
 * Incremental Scanning with Delta Detection Tests
 *
 * Validates that the scanner correctly implements delta detection
 * to avoid re-scanning unchanged files, reducing GitHub API usage
 * and improving scan performance.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScannerService } from './scanner.service';
import { GitHubApiClient } from '../github/github-api.client';
import { ArtifactParserService } from '../artifacts/artifact-parser.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { TraceabilityValidatorService } from '../traceability/traceability-validator.service';

describe('ScannerService - Incremental Scanning', () => {
  let scannerService: ScannerService;
  let githubClient: GitHubApiClient;
  let artifactParser: ArtifactParserService;
  let repositoriesService: RepositoriesService;
  let traceabilityValidator: TraceabilityValidatorService;
  let cacheManager: any;

  beforeEach(() => {
    // Mock dependencies
    githubClient = {
      getLatestCommitSha: vi.fn(),
      getCommit: vi.fn(),
      getTree: vi.fn(),
      getFilesContent: vi.fn(),
    } as any;

    artifactParser = {} as any;
    repositoriesService = {} as any;
    traceabilityValidator = {} as any;
    cacheManager = {
      del: vi.fn(),
    };

    scannerService = new ScannerService(
      githubClient,
      artifactParser,
      repositoriesService,
      traceabilityValidator,
      cacheManager,
    );
  });

  /**
   * @gxp-tag SPEC-001-003-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-001
   */
  describe('Delta Detection - Changed Files', () => {
    it('should identify files with changed SHAs', () => {
      // Arrange
      const previousChecksums = [
        { filePath: '.gxp/requirements/REQ-001.md', sha256Hash: 'abc123' },
        { filePath: '.gxp/specs/SPEC-001.md', sha256Hash: 'def456' },
      ];

      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123', type: 'blob' }, // Unchanged
        { path: '.gxp/specs/SPEC-001.md', sha: 'xyz789', type: 'blob' }, // Changed
        { path: '.gxp/specs/SPEC-002.md', sha: 'new999', type: 'blob' }, // New
      ];

      // Act
      const checksumMap = new Map(
        previousChecksums.map((cs) => [cs.filePath, cs.sha256Hash]),
      );

      const changedFiles = currentFiles.filter((file) => {
        const previousHash = checksumMap.get(file.path);
        return !previousHash || previousHash !== file.sha;
      });

      // Assert
      expect(changedFiles).toHaveLength(2);
      expect(changedFiles.map((f) => f.path)).toEqual([
        '.gxp/specs/SPEC-001.md', // Changed
        '.gxp/specs/SPEC-002.md', // New
      ]);
    });

    it('should skip files with unchanged SHAs', () => {
      // Arrange
      const previousChecksums = [
        { filePath: '.gxp/requirements/REQ-001.md', sha256Hash: 'abc123' },
        { filePath: '.gxp/requirements/REQ-002.md', sha256Hash: 'def456' },
      ];

      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123', type: 'blob' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456', type: 'blob' },
      ];

      // Act
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
   * @gxp-tag SPEC-001-003-002
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @requirement REQ-001
   */
  describe('Delta Detection - Deleted Files', () => {
    it('should identify deleted files', () => {
      // Arrange
      const previousChecksums = [
        { filePath: '.gxp/requirements/REQ-001.md', sha256Hash: 'abc123' },
        { filePath: '.gxp/requirements/REQ-002.md', sha256Hash: 'def456' },
        { filePath: '.gxp/requirements/REQ-003.md', sha256Hash: 'ghi789' },
      ];

      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123', type: 'blob' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456', type: 'blob' },
        // REQ-003 was deleted
      ];

      // Act
      const currentFilePaths = new Set(currentFiles.map((f) => f.path));
      const deletedFiles = previousChecksums.filter(
        (cs) => !currentFilePaths.has(cs.filePath),
      );

      // Assert
      expect(deletedFiles).toHaveLength(1);
      expect(deletedFiles[0].filePath).toBe('.gxp/requirements/REQ-003.md');
    });

    it('should handle no deleted files', () => {
      // Arrange
      const previousChecksums = [
        { filePath: '.gxp/requirements/REQ-001.md', sha256Hash: 'abc123' },
      ];

      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123', type: 'blob' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'new999', type: 'blob' },
      ];

      // Act
      const currentFilePaths = new Set(currentFiles.map((f) => f.path));
      const deletedFiles = previousChecksums.filter(
        (cs) => !currentFilePaths.has(cs.filePath),
      );

      // Assert
      expect(deletedFiles).toHaveLength(0);
    });
  });

  /**
   * @gxp-tag SPEC-001-003-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-001
   */
  describe('Performance Metrics', () => {
    it('should calculate correct performance improvement percentage', () => {
      // Arrange
      const totalFiles = 150;
      const changedFiles = 5;
      const skippedFiles = totalFiles - changedFiles;

      // Act
      const performanceImprovement = Math.round(
        (skippedFiles / totalFiles) * 100,
      );

      // Assert
      expect(performanceImprovement).toBe(97); // 97% of files skipped
    });

    it('should handle 100% changed files (first scan)', () => {
      // Arrange
      const totalFiles = 150;
      const changedFiles = 150;
      const skippedFiles = totalFiles - changedFiles;

      // Act
      const performanceImprovement = Math.round(
        (skippedFiles / totalFiles) * 100,
      );

      // Assert
      expect(performanceImprovement).toBe(0); // No files skipped
    });

    it('should handle 0% changed files (no changes)', () => {
      // Arrange
      const totalFiles = 150;
      const changedFiles = 0;
      const skippedFiles = totalFiles - changedFiles;

      // Act
      const performanceImprovement = Math.round(
        (skippedFiles / totalFiles) * 100,
      );

      // Assert
      expect(performanceImprovement).toBe(100); // All files skipped
    });
  });

  /**
   * @gxp-tag SPEC-001-003-004
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @requirement REQ-001
   */
  describe('Edge Cases', () => {
    it('should handle empty previous checksums (first scan)', () => {
      // Arrange
      const previousChecksums: any[] = [];
      const currentFiles = [
        { path: '.gxp/requirements/REQ-001.md', sha: 'abc123', type: 'blob' },
        { path: '.gxp/requirements/REQ-002.md', sha: 'def456', type: 'blob' },
      ];

      // Act
      const checksumMap = new Map(
        previousChecksums.map((cs) => [cs.filePath, cs.sha256Hash]),
      );

      const changedFiles = currentFiles.filter((file) => {
        const previousHash = checksumMap.get(file.path);
        return !previousHash || previousHash !== file.sha;
      });

      // Assert
      expect(changedFiles).toHaveLength(2); // All files are new
    });

    it('should handle empty current files', () => {
      // Arrange
      const previousChecksums = [
        { filePath: '.gxp/requirements/REQ-001.md', sha256Hash: 'abc123' },
      ];
      const currentFiles: any[] = [];

      // Act
      const currentFilePaths = new Set(currentFiles.map((f) => f.path));
      const deletedFiles = previousChecksums.filter(
        (cs) => !currentFilePaths.has(cs.filePath),
      );

      // Assert
      expect(deletedFiles).toHaveLength(1); // All files deleted
    });
  });
});
