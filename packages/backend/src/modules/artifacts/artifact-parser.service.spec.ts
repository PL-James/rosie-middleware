import { describe, it, expect } from 'vitest';
import { ArtifactParserService } from './artifact-parser.service';

/**
 * Artifact Parser Service Unit Tests
 *
 * @gxp-tag SPEC-004-001
 * @gxp-tag SPEC-004-002
 * @gxp-tag SPEC-004-003
 * @trace US-004-001
 * @gxp-criticality HIGH
 * @test-type OQ
 *
 * Validates YAML frontmatter parsing, JWS evidence parsing,
 * and artifact type detection from file paths.
 */

describe('ArtifactParserService - YAML Frontmatter Parsing', () => {
  const parser = new ArtifactParserService();

  /**
   * @gxp-tag SPEC-004-001
   * @test-type OQ
   */
  it('should parse system_context.md with YAML frontmatter', () => {
    const content = `---
project_name: Test Project
version: 1.0.0
gxp_risk_rating: HIGH
validation_status: DRAFT
intended_use: Testing
system_owner: Owner
technical_contact: owner@example.com
---

# System Context

Description here.
`;
    const result = parser.parseSystemContext(content);

    expect(result.projectName).toBe('Test Project');
    expect(result.version).toBe('1.0.0');
    expect(result.gxpRiskRating).toBe('HIGH');
    expect(result.validationStatus).toBe('DRAFT');
    expect(result.systemOwner).toBe('Owner');
  });

  it('should parse requirement with YAML frontmatter', () => {
    const content = `---
gxp_id: REQ-001
title: Test Requirement
gxp_risk_rating: HIGH
---

# Requirement

Description.
`;
    const result = parser.parseRequirement(content, '.gxp/requirements/REQ-001.md');

    expect(result.gxpId).toBe('REQ-001');
    expect(result.title).toBe('Test Requirement');
    expect(result.gxpRiskRating).toBe('HIGH');
  });

  it('should handle malformed YAML gracefully', () => {
    const content = 'No frontmatter here, just plain markdown.';
    const result = parser.parseRequirement(content, '.gxp/requirements/REQ-002.md');

    expect(result.rawContent).toBe(content);
    expect(result.gxpId).toBe('REQ-002');
  });

  it('should parse user story with As A / I Want / So That', () => {
    const content = `---
gxp_id: US-001-001
parent_id: REQ-001
title: Test User Story
---

**As a** developer
**I want** to parse artifacts
**So that** I can validate compliance
`;
    const result = parser.parseUserStory(content, '.gxp/user_stories/US-001-001.md');

    expect(result.gxpId).toBe('US-001-001');
    expect(result.parentId).toBe('REQ-001');
    expect(result.asA).toBe('developer');
    expect(result.iWant).toBe('to parse artifacts');
    expect(result.soThat).toBe('I can validate compliance');
  });

  it('should parse spec with verification tier', () => {
    const content = `---
gxp_id: SPEC-001-001
parent_id: US-001-001
title: Test Spec
verification_tier: OQ
---

# Specification
`;
    const result = parser.parseSpec(content, '.gxp/specs/SPEC-001-001.md');

    expect(result.gxpId).toBe('SPEC-001-001');
    expect(result.verificationTier).toBe('OQ');
  });
});

describe('ArtifactParserService - JWS Evidence Parsing', () => {
  const parser = new ArtifactParserService();

  /**
   * @gxp-tag SPEC-004-002
   * @test-type OQ
   */
  it('should parse valid JWS evidence with 3 parts', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      spec_id: 'SPEC-001',
      verification_tier: 'OQ',
      test_results: { passed: 5, failed: 0 },
      system_state: 'abc123',
      timestamp: '2026-01-01T00:00:00Z',
    })).toString('base64url');
    const signature = 'mock-signature';

    const jws = `${header}.${payload}.${signature}`;
    const result = parser.parseEvidence(jws, 'EV-SPEC-001.jws');

    expect(result.gxpId).toBe('SPEC-001');
    expect(result.verificationTier).toBe('OQ');
    expect(result.jwsHeader).toEqual({ alg: 'ES256', typ: 'JWT' });
    expect(result.signature).toBe('mock-signature');
  });

  it('should handle invalid JWS format gracefully', () => {
    const result = parser.parseEvidence('not-a-jws', 'invalid.jws');

    expect(result.rawContent).toBe('not-a-jws');
    expect(result.gxpId).toBeUndefined();
  });
});

describe('ArtifactParserService - Artifact Type Detection', () => {
  const parser = new ArtifactParserService();

  /**
   * @gxp-tag SPEC-004-003
   * @test-type OQ
   */
  it('should detect requirement type from path', () => {
    expect(parser.getArtifactType('.gxp/requirements/REQ-001.md')).toBe('requirement');
  });

  it('should detect user_story type from path', () => {
    expect(parser.getArtifactType('.gxp/user_stories/US-001-001.md')).toBe('user_story');
  });

  it('should detect spec type from path', () => {
    expect(parser.getArtifactType('.gxp/specs/SPEC-001-001.md')).toBe('spec');
  });

  it('should detect evidence type from .jws files', () => {
    expect(parser.getArtifactType('.gxp/evidence/EV-SPEC-001.jws')).toBe('evidence');
  });

  it('should return unknown for non-ROSIE files', () => {
    expect(parser.getArtifactType('src/app.ts')).toBe('unknown');
    expect(parser.getArtifactType('README.md')).toBe('unknown');
  });
});
