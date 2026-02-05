import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeSrcTreeHash } from './system-state-hash';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import path from 'path';

/**
 * System State Hash — SHA-256 of /src tree
 *
 * @gxp-tag SPEC-INF-004
 * @trace US-INF-004
 * @gxp-criticality HIGH
 * @test-type OQ
 */
describe('system_state_hash', () => {
  const testDir = path.join(__dirname, '__test_src_tree__');

  beforeEach(() => {
    mkdirSync(path.join(testDir, 'sub'), { recursive: true });
    writeFileSync(path.join(testDir, 'a.ts'), 'const a = 1;');
    writeFileSync(path.join(testDir, 'b.ts'), 'const b = 2;');
    writeFileSync(path.join(testDir, 'sub', 'c.ts'), 'const c = 3;');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return a 64-char hex SHA-256 hash', () => {
    const hash = computeSrcTreeHash(testDir);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should change when a src file changes', () => {
    const hash1 = computeSrcTreeHash(testDir);
    writeFileSync(path.join(testDir, 'a.ts'), 'const a = 999;');
    const hash2 = computeSrcTreeHash(testDir);
    expect(hash1).not.toBe(hash2);
  });

  it('should be deterministic (same input → same hash)', () => {
    const hash1 = computeSrcTreeHash(testDir);
    const hash2 = computeSrcTreeHash(testDir);
    expect(hash1).toBe(hash2);
  });

  it('should hash files sorted by path for reproducibility', () => {
    // Create files that might sort differently on different systems
    writeFileSync(path.join(testDir, 'z.ts'), 'const z = 26;');
    writeFileSync(path.join(testDir, 'a.ts'), 'const a = 1;'); // overwrite
    const hash1 = computeSrcTreeHash(testDir);

    // Delete and recreate in different order
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(path.join(testDir, 'sub'), { recursive: true });
    writeFileSync(path.join(testDir, 'z.ts'), 'const z = 26;');
    writeFileSync(path.join(testDir, 'b.ts'), 'const b = 2;');
    writeFileSync(path.join(testDir, 'a.ts'), 'const a = 1;');
    writeFileSync(path.join(testDir, 'sub', 'c.ts'), 'const c = 3;');
    const hash2 = computeSrcTreeHash(testDir);

    expect(hash1).toBe(hash2);
  });

  it('should include nested directory files', () => {
    const hash1 = computeSrcTreeHash(testDir);
    writeFileSync(path.join(testDir, 'sub', 'c.ts'), 'const c = 999;');
    const hash2 = computeSrcTreeHash(testDir);
    expect(hash1).not.toBe(hash2);
  });

  it('should detect new files', () => {
    const hash1 = computeSrcTreeHash(testDir);
    writeFileSync(path.join(testDir, 'new.ts'), 'const n = 0;');
    const hash2 = computeSrcTreeHash(testDir);
    expect(hash1).not.toBe(hash2);
  });

  it('should detect deleted files', () => {
    const hash1 = computeSrcTreeHash(testDir);
    rmSync(path.join(testDir, 'a.ts'));
    const hash2 = computeSrcTreeHash(testDir);
    expect(hash1).not.toBe(hash2);
  });
});
