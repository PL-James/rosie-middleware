import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvidenceService } from './evidence.service';
import { JwsVerificationService } from './jws-verification.service';

/**
 * Evidence Service Unit Tests
 *
 * @gxp-tag REQ-EV-002
 * @trace US-005-003
 * @gxp-criticality HIGH
 * @test-type unit
 *
 * Validates batch verification resilience and graceful error handling.
 */

describe('EvidenceService - Batch Verification', () => {
  let service: EvidenceService;
  let mockJwsService: JwsVerificationService;

  beforeEach(() => {
    mockJwsService = {
      verifySignature: vi.fn(),
    } as any;

    service = new EvidenceService(mockJwsService);
  });

  /**
   * @gxp-tag REQ-EV-002
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies batch verification continues when one evidence fails
   */
  it('should continue batch verification when one evidence fails', async () => {
    // Mock verifyEvidence to fail on second item
    const verifyEvidenceSpy = vi.spyOn(service, 'verifyEvidence');

    verifyEvidenceSpy
      .mockResolvedValueOnce({
        evidenceId: 'ev-1',
        isValid: true,
        verifiedAt: new Date(),
        payload: {},
        error: undefined,
      })
      .mockRejectedValueOnce(new Error('Signature verification failed'))
      .mockResolvedValueOnce({
        evidenceId: 'ev-3',
        isValid: true,
        verifiedAt: new Date(),
        payload: {},
        error: undefined,
      });

    const evidenceIds = ['ev-1', 'ev-2', 'ev-3'];

    // Should NOT throw even though one verification fails
    const result = await service.batchVerifyEvidence('repo-1', evidenceIds);

    expect(result.totalProcessed).toBe(3);
    expect(result.successCount).toBe(2); // ev-1 and ev-3 succeeded
    expect(result.failureCount).toBe(1); // ev-2 failed
    expect(result.results).toHaveLength(3);

    // First result should be successful
    expect(result.results[0].isValid).toBe(true);
    expect(result.results[0].evidenceId).toBe('ev-1');

    // Second result should be error (graceful failure)
    expect(result.results[1].isValid).toBe(false);
    expect(result.results[1].evidenceId).toBe('ev-2');
    expect(result.results[1].error).toContain('Signature verification failed');

    // Third result should be successful
    expect(result.results[2].isValid).toBe(true);
    expect(result.results[2].evidenceId).toBe('ev-3');
  });

  /**
   * @gxp-tag REQ-EV-002
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies batch verification handles all failures gracefully
   */
  it('should handle batch verification when all items fail', async () => {
    const verifyEvidenceSpy = vi.spyOn(service, 'verifyEvidence');

    verifyEvidenceSpy
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockRejectedValueOnce(new Error('Invalid JWS format'))
      .mockRejectedValueOnce(new Error('Missing public key'));

    const evidenceIds = ['ev-1', 'ev-2', 'ev-3'];

    const result = await service.batchVerifyEvidence('repo-1', evidenceIds);

    expect(result.totalProcessed).toBe(3);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(3);

    // All results should be error results
    result.results.forEach((r, index) => {
      expect(r.isValid).toBe(false);
      expect(r.evidenceId).toBe(evidenceIds[index]);
      expect(r.error).toBeDefined();
    });
  });

  /**
   * @gxp-tag REQ-EV-002
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @description Verifies batch verification succeeds when all items are valid
   */
  it('should handle batch verification when all items succeed', async () => {
    const verifyEvidenceSpy = vi.spyOn(service, 'verifyEvidence');

    verifyEvidenceSpy
      .mockResolvedValueOnce({
        evidenceId: 'ev-1',
        isValid: true,
        verifiedAt: new Date(),
        payload: {},
        error: undefined,
      })
      .mockResolvedValueOnce({
        evidenceId: 'ev-2',
        isValid: true,
        verifiedAt: new Date(),
        payload: {},
        error: undefined,
      })
      .mockResolvedValueOnce({
        evidenceId: 'ev-3',
        isValid: true,
        verifiedAt: new Date(),
        payload: {},
        error: undefined,
      });

    const evidenceIds = ['ev-1', 'ev-2', 'ev-3'];

    const result = await service.batchVerifyEvidence('repo-1', evidenceIds);

    expect(result.totalProcessed).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(0);

    result.results.forEach((r) => {
      expect(r.isValid).toBe(true);
      expect(r.error).toBeUndefined();
    });
  });

  /**
   * @gxp-tag REQ-EV-002
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @description Verifies batch verification handles empty evidence list
   */
  it('should handle empty evidence list', async () => {
    const result = await service.batchVerifyEvidence('repo-1', []);

    expect(result.totalProcessed).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  /**
   * @gxp-tag REQ-EV-002
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @description Verifies error messages are captured in failed verifications
   */
  it('should capture error messages for failed verifications', async () => {
    const verifyEvidenceSpy = vi.spyOn(service, 'verifyEvidence');

    const customError = new Error('Custom verification error');
    verifyEvidenceSpy.mockRejectedValueOnce(customError);

    const result = await service.batchVerifyEvidence('repo-1', ['ev-1']);

    expect(result.results[0].isValid).toBe(false);
    expect(result.results[0].error).toBe('Custom verification error');
  });

  /**
   * @gxp-tag REQ-EV-002
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies mixed success/failure scenarios are handled correctly
   */
  it('should handle mixed valid and invalid evidence in batch', async () => {
    const verifyEvidenceSpy = vi.spyOn(service, 'verifyEvidence');

    verifyEvidenceSpy
      .mockResolvedValueOnce({
        evidenceId: 'ev-1',
        isValid: true,
        verifiedAt: new Date(),
        payload: {},
        error: undefined,
      })
      .mockResolvedValueOnce({
        evidenceId: 'ev-2',
        isValid: false, // Valid verification but signature is invalid
        verifiedAt: new Date(),
        payload: null,
        error: 'Invalid signature',
      })
      .mockRejectedValueOnce(new Error('Evidence not found')) // Verification throws
      .mockResolvedValueOnce({
        evidenceId: 'ev-4',
        isValid: true,
        verifiedAt: new Date(),
        payload: {},
        error: undefined,
      });

    const evidenceIds = ['ev-1', 'ev-2', 'ev-3', 'ev-4'];

    const result = await service.batchVerifyEvidence('repo-1', evidenceIds);

    expect(result.totalProcessed).toBe(4);
    expect(result.successCount).toBe(2); // ev-1 and ev-4
    expect(result.failureCount).toBe(2); // ev-2 (invalid) and ev-3 (error)

    // First: successful verification
    expect(result.results[0].isValid).toBe(true);

    // Second: verification succeeded but signature invalid
    expect(result.results[1].isValid).toBe(false);

    // Third: verification threw error (gracefully handled)
    expect(result.results[2].isValid).toBe(false);
    expect(result.results[2].error).toContain('Evidence not found');

    // Fourth: successful verification
    expect(result.results[3].isValid).toBe(true);
  });
});
