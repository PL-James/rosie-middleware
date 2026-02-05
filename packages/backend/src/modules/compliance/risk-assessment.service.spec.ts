import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskAssessmentService } from './risk-assessment.service';

/**
 * Risk Assessment Service Unit Tests
 *
 * @gxp-tag REQ-RA-003
 * @trace US-006-001
 * @gxp-criticality HIGH
 * @test-type unit
 *
 * Validates proper ROSIE traceability chain traversal (REQ → User Story → Spec)
 * and broken link detection.
 */

describe('RiskAssessmentService - Traceability Chain', () => {
  let service: RiskAssessmentService;

  beforeEach(() => {
    service = new RiskAssessmentService();
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies requirements coverage traverses REQ → US → Spec chain correctly
   */
  it('should calculate coverage via proper REQ → US → Spec chain', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
      { gxpId: 'REQ-002', title: 'Requirement 2' },
      { gxpId: 'REQ-003', title: 'Requirement 3' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' }, // Links to REQ-001
      { gxpId: 'US-002', parentId: 'REQ-001' }, // Also links to REQ-001
      { gxpId: 'US-003', parentId: 'REQ-002' }, // Links to REQ-002
      // REQ-003 has no user stories
    ];

    const specsList = [
      { gxpId: 'SPEC-001', parentId: 'US-001' }, // Links to US-001 (which links to REQ-001)
      { gxpId: 'SPEC-002', parentId: 'US-002' }, // Links to US-002 (which links to REQ-001)
      { gxpId: 'SPEC-003', parentId: 'US-003' }, // Links to US-003 (which links to REQ-002)
      // US-003 has no specs → REQ-002 not fully covered
    ];

    // Call private method via type assertion
    const coverage = (service as any).calculateRequirementsCoverage(
      requirementsList,
      userStoriesList,
      specsList,
    );

    // REQ-001 has US-001/US-002 with specs → covered
    // REQ-002 has US-003 with spec → covered
    // REQ-003 has no user stories → NOT covered
    expect(coverage).toBe((2 / 3) * 100); // 66.67%
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies uncovered requirements are detected (no user stories)
   */
  it('should detect requirements with no user stories as uncovered', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
      { gxpId: 'REQ-002', title: 'Requirement 2' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' },
    ];

    const specsList = [
      { gxpId: 'SPEC-001', parentId: 'US-001' },
    ];

    const coverage = (service as any).calculateRequirementsCoverage(
      requirementsList,
      userStoriesList,
      specsList,
    );

    // Only REQ-001 is covered (has US with spec)
    // REQ-002 has no user stories
    expect(coverage).toBe(50);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies requirements with user stories but no specs are uncovered
   */
  it('should detect requirements with user stories but no specs as uncovered', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
      { gxpId: 'REQ-002', title: 'Requirement 2' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' },
      { gxpId: 'US-002', parentId: 'REQ-002' }, // Has user story but no spec
    ];

    const specsList = [
      { gxpId: 'SPEC-001', parentId: 'US-001' },
      // No spec for US-002
    ];

    const coverage = (service as any).calculateRequirementsCoverage(
      requirementsList,
      userStoriesList,
      specsList,
    );

    // Only REQ-001 is covered (has full chain)
    // REQ-002 has user story but no spec
    expect(coverage).toBe(50);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies 100% coverage when all requirements have complete chains
   */
  it('should return 100% coverage when all requirements have complete chains', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
      { gxpId: 'REQ-002', title: 'Requirement 2' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' },
      { gxpId: 'US-002', parentId: 'REQ-002' },
    ];

    const specsList = [
      { gxpId: 'SPEC-001', parentId: 'US-001' },
      { gxpId: 'SPEC-002', parentId: 'US-002' },
    ];

    const coverage = (service as any).calculateRequirementsCoverage(
      requirementsList,
      userStoriesList,
      specsList,
    );

    expect(coverage).toBe(100);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @description Verifies empty requirements list returns 0% coverage
   */
  it('should return 0 when no requirements exist', () => {
    const coverage = (service as any).calculateRequirementsCoverage([], [], []);

    expect(coverage).toBe(0);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies traceability integrity detects broken US → REQ links
   */
  it('should detect broken user story to requirement links', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' }, // Valid link
      { gxpId: 'US-002', parentId: 'REQ-999' }, // Broken link (REQ-999 doesn't exist)
    ];

    const specsList: any[] = [];

    const integrity = (service as any).calculateTraceabilityIntegrity(
      requirementsList,
      userStoriesList,
      specsList,
    );

    // 1 valid link, 1 broken link = 50%
    expect(integrity).toBe(50);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies traceability integrity detects broken Spec → US links
   */
  it('should detect broken spec to user story links', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' },
    ];

    const specsList = [
      { gxpId: 'SPEC-001', parentId: 'US-001' }, // Valid link
      { gxpId: 'SPEC-002', parentId: 'US-999' }, // Broken link (US-999 doesn't exist)
    ];

    const integrity = (service as any).calculateTraceabilityIntegrity(
      requirementsList,
      userStoriesList,
      specsList,
    );

    // 1 valid US link + 1 valid spec link + 1 broken spec link = 2/3 = 66.67%
    expect(Math.round(integrity)).toBe(67);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies traceability integrity detects missing parent IDs
   */
  it('should detect missing parent IDs as broken links', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' }, // Valid
      { gxpId: 'US-002', parentId: null }, // Missing parent
    ];

    const specsList = [
      { gxpId: 'SPEC-001', parentId: 'US-001' }, // Valid
      { gxpId: 'SPEC-002', parentId: null }, // Missing parent
    ];

    const integrity = (service as any).calculateTraceabilityIntegrity(
      requirementsList,
      userStoriesList,
      specsList,
    );

    // 1 valid US + 1 broken US + 1 valid spec + 1 broken spec = 2/4 = 50%
    expect(integrity).toBe(50);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies 100% integrity when all links are valid
   */
  it('should return 100% integrity when all chain links are valid', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
      { gxpId: 'REQ-002', title: 'Requirement 2' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' },
      { gxpId: 'US-002', parentId: 'REQ-002' },
    ];

    const specsList = [
      { gxpId: 'SPEC-001', parentId: 'US-001' },
      { gxpId: 'SPEC-002', parentId: 'US-002' },
    ];

    const integrity = (service as any).calculateTraceabilityIntegrity(
      requirementsList,
      userStoriesList,
      specsList,
    );

    expect(integrity).toBe(100);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @description Verifies empty artifact lists return 100% integrity
   */
  it('should return 100% integrity when no artifacts exist', () => {
    const integrity = (service as any).calculateTraceabilityIntegrity([], [], []);

    expect(integrity).toBe(100);
  });

  /**
   * @gxp-tag REQ-RA-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies complex multi-level chain with mixed valid/broken links
   */
  it('should handle complex multi-level chains with mixed validity', () => {
    const requirementsList = [
      { gxpId: 'REQ-001', title: 'Requirement 1' },
      { gxpId: 'REQ-002', title: 'Requirement 2' },
    ];

    const userStoriesList = [
      { gxpId: 'US-001', parentId: 'REQ-001' }, // Valid
      { gxpId: 'US-002', parentId: 'REQ-001' }, // Valid
      { gxpId: 'US-003', parentId: 'REQ-002' }, // Valid
      { gxpId: 'US-004', parentId: 'REQ-999' }, // Broken (invalid parent)
    ];

    const specsList = [
      { gxpId: 'SPEC-001', parentId: 'US-001' }, // Valid
      { gxpId: 'SPEC-002', parentId: 'US-002' }, // Valid
      { gxpId: 'SPEC-003', parentId: 'US-999' }, // Broken (invalid parent)
      { gxpId: 'SPEC-004', parentId: null }, // Broken (missing parent)
    ];

    const integrity = (service as any).calculateTraceabilityIntegrity(
      requirementsList,
      userStoriesList,
      specsList,
    );

    // US: 3 valid + 1 broken = 75%
    // Spec: 2 valid + 2 broken = 50%
    // Total: (3+2) / (4+4) = 5/8 = 62.5%
    expect(Math.round(integrity)).toBe(63);
  });
});
