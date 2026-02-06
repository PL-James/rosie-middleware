import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScanProgressGateway } from './scan-progress.gateway';
import { Server } from 'socket.io';

/**
 * @gxp-tag SPEC-005-004-001
 * @trace US-005-001
 * @gxp-criticality HIGH
 * @test-type unit
 * @requirement REQ-005
 */
describe('ScanProgressGateway - WebSocket Real-time Updates', () => {
  let gateway: ScanProgressGateway;
  let mockServer: Partial<Server>;

  beforeEach(async () => {
    // Create mock Socket.IO server
    const toMock = vi.fn();
    toMock.mockReturnValue({ emit: vi.fn() });

    mockServer = {
      emit: vi.fn(),
      to: toMock,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ScanProgressGateway],
    }).compile();

    gateway = module.get<ScanProgressGateway>(ScanProgressGateway);
    gateway.server = mockServer as Server;
  });

  /**
   * @gxp-tag SPEC-005-004-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-005
   */
  describe('Connection Management', () => {
    it('should handle client connections', () => {
      const mockClient = {
        id: 'client-123',
      } as any;

      // Should not throw
      expect(() => gateway.handleConnection(mockClient)).not.toThrow();
    });

    /**
     * @gxp-tag SPEC-005-004-002
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-005
     */
    it('should handle client disconnections', () => {
      const mockClient = {
        id: 'client-123',
      } as any;

      // Should not throw
      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  /**
   * @gxp-tag SPEC-005-004-003
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-005
   */
  describe('Scan Progress Events', () => {
    it('should emit scan progress with correct event name and payload', () => {
      const scanId = 'scan-123';
      const progress = 45;
      const status = 'in_progress';
      const message = 'Parsing artifacts';

      gateway.emitScanProgress(scanId, progress, status, message);

      expect(mockServer.emit).toHaveBeenCalledWith(
        `scan:${scanId}:progress`,
        expect.objectContaining({
          scanId,
          progress,
          status,
          message,
          timestamp: expect.any(String),
        }),
      );
    });

    /**
     * @gxp-tag SPEC-005-004-004
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-005
     */
    it('should emit scan progress without optional message', () => {
      const scanId = 'scan-456';
      const progress = 75;
      const status = 'validating';

      gateway.emitScanProgress(scanId, progress, status);

      expect(mockServer.emit).toHaveBeenCalledWith(
        `scan:${scanId}:progress`,
        expect.objectContaining({
          scanId,
          progress,
          status,
          timestamp: expect.any(String),
        }),
      );
    });

    /**
     * @gxp-tag SPEC-005-004-005
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-005
     */
    it('should emit progress updates at different stages', () => {
      const scanId = 'scan-789';
      const stages = [
        { progress: 10, status: 'discovery', message: 'Discovering files' },
        { progress: 30, status: 'fetch', message: 'Fetching content' },
        { progress: 60, status: 'parse', message: 'Parsing artifacts' },
        { progress: 90, status: 'persist', message: 'Persisting data' },
      ];

      stages.forEach((stage) => {
        gateway.emitScanProgress(scanId, stage.progress, stage.status, stage.message);
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(stages.length);
      stages.forEach((stage, index) => {
        expect((mockServer.emit as any).mock.calls[index][0]).toBe(
          `scan:${scanId}:progress`,
        );
        expect((mockServer.emit as any).mock.calls[index][1]).toMatchObject({
          scanId,
          progress: stage.progress,
          status: stage.status,
          message: stage.message,
        });
      });
    });
  });

  /**
   * @gxp-tag SPEC-005-004-006
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-005
   */
  describe('Scan Complete Events', () => {
    it('should emit scan complete with result payload', () => {
      const scanId = 'scan-complete-123';
      const result = {
        scanId,
        status: 'completed',
        artifactsCreated: 42,
        durationMs: 8234,
      };

      gateway.emitScanComplete(scanId, result);

      expect(mockServer.emit).toHaveBeenCalledWith(
        `scan:${scanId}:complete`,
        expect.objectContaining({
          scanId,
          result,
          timestamp: expect.any(String),
        }),
      );
    });

    /**
     * @gxp-tag SPEC-005-004-007
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-005
     */
    it('should include timestamp in ISO format', () => {
      const scanId = 'scan-timestamp-123';
      const result = { status: 'completed' };

      gateway.emitScanComplete(scanId, result);

      const emittedPayload = (mockServer.emit as any).mock.calls[0][1];
      expect(emittedPayload.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  /**
   * @gxp-tag SPEC-005-004-008
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-005
   */
  describe('Scan Failed Events', () => {
    it('should emit scan failed with error message', () => {
      const scanId = 'scan-failed-123';
      const errorMessage = 'Repository not found';

      gateway.emitScanFailed(scanId, errorMessage);

      expect(mockServer.emit).toHaveBeenCalledWith(
        `scan:${scanId}:failed`,
        expect.objectContaining({
          scanId,
          error: errorMessage,
          timestamp: expect.any(String),
        }),
      );
    });

    /**
     * @gxp-tag SPEC-005-004-009
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-005
     */
    it('should handle different error types', () => {
      const scanId = 'scan-error-types';
      const errors = [
        'GitHub API rate limit exceeded',
        'Invalid .gxp directory structure',
        'Database connection failed',
      ];

      errors.forEach((error) => {
        gateway.emitScanFailed(scanId, error);
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(errors.length);
      errors.forEach((error, index) => {
        expect((mockServer.emit as any).mock.calls[index][1]).toMatchObject({
          scanId,
          error,
        });
      });
    });
  });

  /**
   * @gxp-tag SPEC-005-004-010
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-005
   */
  describe('Event Channel Isolation', () => {
    it('should use scan-specific event channels', () => {
      const scan1 = 'scan-A';
      const scan2 = 'scan-B';

      gateway.emitScanProgress(scan1, 50, 'in_progress', 'Scan A progress');
      gateway.emitScanProgress(scan2, 75, 'in_progress', 'Scan B progress');

      expect((mockServer.emit as any).mock.calls[0][0]).toBe(`scan:${scan1}:progress`);
      expect((mockServer.emit as any).mock.calls[1][0]).toBe(`scan:${scan2}:progress`);
    });

    /**
     * @gxp-tag SPEC-005-004-011
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-005
     */
    it('should not interfere between different scan events', () => {
      const scanId = 'scan-isolation';

      gateway.emitScanProgress(scanId, 30, 'fetch', 'Fetching');
      gateway.emitScanComplete(scanId, { status: 'completed' });
      gateway.emitScanFailed(scanId, 'Some error');

      expect(mockServer.emit).toHaveBeenCalledTimes(3);
      expect((mockServer.emit as any).mock.calls[0][0]).toBe(
        `scan:${scanId}:progress`,
      );
      expect((mockServer.emit as any).mock.calls[1][0]).toBe(
        `scan:${scanId}:complete`,
      );
      expect((mockServer.emit as any).mock.calls[2][0]).toBe(`scan:${scanId}:failed`);
    });
  });
});
