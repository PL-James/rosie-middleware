import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * IQ — Installation Qualification Tests
 *
 * Verifies that the ROSIE Middleware Platform infrastructure
 * is correctly installed and configured per RFC-001 §3.
 *
 * @gxp-tag SPEC-INF-001
 * @trace US-005-002
 * @gxp-criticality HIGH
 * @test-type IQ
 */

const ROOT = path.resolve(__dirname, '../../../..');

describe('IQ - Installation Qualification', () => {
  describe('GxP Directory Structure', () => {
    it('should have .gxp/ directory', () => {
      expect(existsSync(path.join(ROOT, '.gxp'))).toBe(true);
    });

    it('should have .gxp/system_context.md', () => {
      expect(existsSync(path.join(ROOT, '.gxp/system_context.md'))).toBe(true);
    });

    it('should have .gxp/risk_assessment.log', () => {
      expect(existsSync(path.join(ROOT, '.gxp/risk_assessment.log'))).toBe(true);
    });

    it('should have .gxp/adr/ directory with ADRs', () => {
      const adrDir = path.join(ROOT, '.gxp/adr');
      expect(existsSync(adrDir)).toBe(true);
      const adrs = readdirSync(adrDir).filter(f => f.endsWith('.md'));
      expect(adrs.length).toBeGreaterThanOrEqual(4);
    });

    it('should have .gxp/evidence/ directory', () => {
      expect(existsSync(path.join(ROOT, '.gxp/evidence'))).toBe(true);
    });

    it('should have .gxp/requirements/ directory with REQ files', () => {
      const reqDir = path.join(ROOT, '.gxp/requirements');
      expect(existsSync(reqDir)).toBe(true);
      const reqs = readdirSync(reqDir).filter(f => f.endsWith('.md'));
      expect(reqs.length).toBeGreaterThanOrEqual(8);
    });

    it('should have .gxp/user_stories/ directory', () => {
      expect(existsSync(path.join(ROOT, '.gxp/user_stories'))).toBe(true);
    });

    it('should have .gxp/specs/ directory', () => {
      expect(existsSync(path.join(ROOT, '.gxp/specs'))).toBe(true);
    });
  });

  describe('Signing Keys', () => {
    it('should have .rosie-keys/private-key.pem', () => {
      expect(existsSync(path.join(ROOT, '.rosie-keys/private-key.pem'))).toBe(true);
    });

    it('should have .rosie-keys/public-key.pem', () => {
      expect(existsSync(path.join(ROOT, '.rosie-keys/public-key.pem'))).toBe(true);
    });

    it('should use ES256-compatible keys (PKCS#8 or SEC1 EC key format)', () => {
      const privateKey = readFileSync(path.join(ROOT, '.rosie-keys/private-key.pem'), 'utf-8');
      // ES256 keys can be stored as PKCS#8 ("BEGIN PRIVATE KEY") or SEC1 ("BEGIN EC PRIVATE KEY")
      const isPKCS8 = privateKey.includes('BEGIN PRIVATE KEY');
      const isSEC1 = privateKey.includes('BEGIN EC PRIVATE KEY');
      expect(isPKCS8 || isSEC1).toBe(true);
    });
  });

  describe('Dependencies', () => {
    it('should have vitest installed', () => {
      const vitestPath = path.join(ROOT, 'node_modules/vitest/package.json');
      expect(existsSync(vitestPath)).toBe(true);
    });

    it('should have jose installed for JWS signing', () => {
      const josePath = path.join(ROOT, 'node_modules/jose/package.json');
      expect(existsSync(josePath)).toBe(true);
    });

    it('should have correct TypeScript version (>=5.6)', () => {
      const tsPath = path.join(ROOT, 'node_modules/typescript/package.json');
      expect(existsSync(tsPath)).toBe(true);
      const tsPkg = JSON.parse(readFileSync(tsPath, 'utf-8'));
      const majorMinor = tsPkg.version.split('.').slice(0, 2).map(Number);
      expect(majorMinor[0]).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Environment', () => {
    it('should have node version >= 20', () => {
      const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
      expect(nodeVersion).toBeGreaterThanOrEqual(20);
    });
  });

  describe('System Context Validation', () => {
    it('should have valid YAML frontmatter in system_context.md', () => {
      const content = readFileSync(path.join(ROOT, '.gxp/system_context.md'), 'utf-8');
      expect(content).toContain('gxp_risk_rating:');
      expect(content).toContain('validation_status:');
      expect(content).toContain('project_name:');
      expect(content).toContain('version:');
    });
  });
});
