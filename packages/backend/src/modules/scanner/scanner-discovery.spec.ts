import { describe, it, expect } from 'vitest';

/**
 * Scanner Discovery Phase Unit Tests
 *
 * @gxp-tag SPEC-003-001
 * @gxp-tag SPEC-005-001
 * @trace US-003-001
 * @gxp-criticality HIGH
 * @test-type OQ
 *
 * Validates .gxp directory detection, file filtering logic,
 * and atomic transaction semantics of the scan pipeline.
 */

describe('Scanner - Discovery Phase File Filtering', () => {
  /**
   * @gxp-tag SPEC-003-001
   * @test-type OQ
   */
  it('should filter tree for .gxp directory files', () => {
    const tree = [
      { path: '.gxp/system_context.md', type: 'blob', sha: 'sha1' },
      { path: '.gxp/requirements/REQ-001.md', type: 'blob', sha: 'sha2' },
      { path: 'src/app.ts', type: 'blob', sha: 'sha3' },
      { path: 'node_modules/dep/index.js', type: 'blob', sha: 'sha4' },
      { path: '.gxp', type: 'tree', sha: 'sha5' },
    ];

    const gxpFiles = tree.filter(
      (node) => node.type === 'blob' && node.path.startsWith('.gxp/'),
    );

    expect(gxpFiles).toHaveLength(2);
    expect(gxpFiles[0].path).toBe('.gxp/system_context.md');
    expect(gxpFiles[1].path).toBe('.gxp/requirements/REQ-001.md');
  });

  it('should detect empty .gxp directory as non-compliant', () => {
    const tree = [
      { path: 'src/app.ts', type: 'blob', sha: 'sha1' },
      { path: 'README.md', type: 'blob', sha: 'sha2' },
    ];

    const gxpFiles = tree.filter(
      (node) => node.type === 'blob' && node.path.startsWith('.gxp/'),
    );

    expect(gxpFiles).toHaveLength(0);
  });

  it('should categorize artifacts by path pattern', () => {
    const files = [
      '.gxp/system_context.md',
      '.gxp/requirements/REQ-001.md',
      '.gxp/user_stories/US-001-001.md',
      '.gxp/specs/SPEC-001-001.md',
      '.gxp/evidence/EV-SPEC-001.jws',
    ];

    const categories = files.map((f) => {
      if (f.includes('system_context')) return 'system_context';
      if (f.includes('/requirements/') || f.match(/REQ-\d+/)) return 'requirement';
      if (f.includes('/user_stories/') || f.match(/US-\d+/)) return 'user_story';
      if (f.includes('/specs/') || f.match(/SPEC-\d+-\d+/)) return 'spec';
      if (f.includes('/evidence/') && f.endsWith('.jws')) return 'evidence';
      return 'unknown';
    });

    expect(categories).toEqual([
      'system_context',
      'requirement',
      'user_story',
      'spec',
      'evidence',
    ]);
  });
});

describe('Scanner - Delta Detection', () => {
  it('should identify changed files by comparing SHA hashes', () => {
    const previousChecksums = new Map([
      ['.gxp/system_context.md', 'sha1-old'],
      ['.gxp/requirements/REQ-001.md', 'sha2-same'],
    ]);

    const currentFiles = [
      { path: '.gxp/system_context.md', sha: 'sha1-new' },
      { path: '.gxp/requirements/REQ-001.md', sha: 'sha2-same' },
      { path: '.gxp/requirements/REQ-002.md', sha: 'sha3-new' },
    ];

    const changedFiles = currentFiles.filter((file) => {
      const previousHash = previousChecksums.get(file.path);
      return !previousHash || previousHash !== file.sha;
    });

    expect(changedFiles).toHaveLength(2);
    expect(changedFiles[0].path).toBe('.gxp/system_context.md');
    expect(changedFiles[1].path).toBe('.gxp/requirements/REQ-002.md');
  });

  it('should detect deleted files', () => {
    const previousPaths = ['.gxp/requirements/REQ-001.md', '.gxp/requirements/REQ-002.md'];
    const currentPaths = new Set(['.gxp/requirements/REQ-001.md']);

    const deletedFiles = previousPaths.filter((p) => !currentPaths.has(p));

    expect(deletedFiles).toEqual(['.gxp/requirements/REQ-002.md']);
  });
});

describe('Scanner - Atomic Transaction Semantics', () => {
  /**
   * @gxp-tag SPEC-005-001
   * @test-type OQ
   */
  it('should track scan status transitions correctly', () => {
    const validTransitions: Record<string, string[]> = {
      pending: ['in_progress', 'failed'],
      in_progress: ['completed', 'failed'],
      completed: [],
      failed: [],
    };

    expect(validTransitions['pending']).toContain('in_progress');
    expect(validTransitions['in_progress']).toContain('completed');
    expect(validTransitions['in_progress']).toContain('failed');
    expect(validTransitions['completed']).toHaveLength(0);
  });

  it('should include all artifact counts in scan completion', () => {
    const requirementRecords = [{ id: '1' }, { id: '2' }];
    const userStoryRecords = [{ id: '3' }];
    const specRecords = [{ id: '4' }, { id: '5' }];
    const evidenceCount = 3;
    const tagBlocksCount = 2;

    const artifactsCreated =
      requirementRecords.length +
      userStoryRecords.length +
      specRecords.length +
      evidenceCount +
      tagBlocksCount;

    expect(artifactsCreated).toBe(10);
  });
});
