import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScanProgressGateway } from './scan-progress.gateway';

/**
 * @gxp-tag SPEC-005-004-012
 * @trace US-005-001
 * @gxp-criticality HIGH
 * @test-type integration
 * @requirement REQ-005
 */
describe('WebSocket Integration - Real-time Progress', () => {
  let gateway: ScanProgressGateway;
  let mockServer: any;
  let emittedEvents: Array<{ event: string; payload: any }>;

  beforeEach(() => {
    // Track all emitted events
    emittedEvents = [];

    // Create mock server that records emissions
    mockServer = {
      emit: vi.fn((event: string, payload: any) => {
        emittedEvents.push({ event, payload });
      }),
    };

    // Create gateway
    gateway = new ScanProgressGateway();
    gateway.server = mockServer;
  });

  /**
   * @gxp-tag SPEC-005-004-013
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-005
   */
  it('should emit complete scan lifecycle via WebSocket', () => {
    const scanId = 'scan-lifecycle-001';

    // Simulate complete scan lifecycle
    gateway.emitScanProgress(scanId, 10, 'discovery', 'Discovering files');
    gateway.emitScanProgress(scanId, 30, 'fetch', 'Fetching content');
    gateway.emitScanProgress(scanId, 60, 'parse', 'Parsing artifacts');
    gateway.emitScanProgress(scanId, 90, 'persist', 'Persisting to database');
    gateway.emitScanComplete(scanId, {
      status: 'completed',
      artifactsCreated: 42,
      durationMs: 8234,
    });

    // Verify all events emitted
    expect(emittedEvents.length).toBe(5);

    // Verify progress events
    expect(emittedEvents[0]).toMatchObject({
      event: `scan:${scanId}:progress`,
      payload: {
        scanId,
        progress: 10,
        status: 'discovery',
        message: 'Discovering files',
      },
    });

    expect(emittedEvents[1]).toMatchObject({
      event: `scan:${scanId}:progress`,
      payload: {
        scanId,
        progress: 30,
        status: 'fetch',
      },
    });

    expect(emittedEvents[2]).toMatchObject({
      event: `scan:${scanId}:progress`,
      payload: {
        scanId,
        progress: 60,
        status: 'parse',
      },
    });

    expect(emittedEvents[3]).toMatchObject({
      event: `scan:${scanId}:progress`,
      payload: {
        scanId,
        progress: 90,
        status: 'persist',
      },
    });

    // Verify completion event
    expect(emittedEvents[4]).toMatchObject({
      event: `scan:${scanId}:complete`,
      payload: {
        scanId,
        result: {
          status: 'completed',
          artifactsCreated: 42,
        },
      },
    });
  });

  /**
   * @gxp-tag SPEC-005-004-014
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-005
   */
  it('should emit failure event in error scenarios', () => {
    const scanId = 'scan-failure-001';

    // Simulate scan progress then failure
    gateway.emitScanProgress(scanId, 20, 'fetch', 'Fetching content');
    gateway.emitScanFailed(scanId, 'GitHub API rate limit exceeded');

    expect(emittedEvents.length).toBe(2);

    // Verify progress event
    expect(emittedEvents[0]).toMatchObject({
      event: `scan:${scanId}:progress`,
      payload: {
        scanId,
        progress: 20,
      },
    });

    // Verify failure event
    expect(emittedEvents[1]).toMatchObject({
      event: `scan:${scanId}:failed`,
      payload: {
        scanId,
        error: 'GitHub API rate limit exceeded',
      },
    });
  });

  /**
   * @gxp-tag SPEC-005-004-015
   * @gxp-criticality MEDIUM
   * @test-type integration
   * @requirement REQ-005
   */
  it('should handle concurrent scans with isolated events', () => {
    const scan1 = 'scan-concurrent-A';
    const scan2 = 'scan-concurrent-B';

    // Interleave events from two concurrent scans
    gateway.emitScanProgress(scan1, 20, 'fetch', 'Scan A fetching');
    gateway.emitScanProgress(scan2, 30, 'parse', 'Scan B parsing');
    gateway.emitScanProgress(scan1, 50, 'parse', 'Scan A parsing');
    gateway.emitScanComplete(scan2, { status: 'completed' });
    gateway.emitScanProgress(scan1, 80, 'persist', 'Scan A persisting');
    gateway.emitScanComplete(scan1, { status: 'completed' });

    // Verify correct event count
    expect(emittedEvents.length).toBe(6);

    // Verify scan1 events use scan1 channel
    const scan1Events = emittedEvents.filter((e) => e.event.includes(scan1));
    expect(scan1Events.length).toBe(4);
    scan1Events.forEach((event) => {
      expect(event.event).toContain(scan1);
      expect(event.payload.scanId).toBe(scan1);
    });

    // Verify scan2 events use scan2 channel
    const scan2Events = emittedEvents.filter((e) => e.event.includes(scan2));
    expect(scan2Events.length).toBe(2);
    scan2Events.forEach((event) => {
      expect(event.event).toContain(scan2);
      expect(event.payload.scanId).toBe(scan2);
    });
  });

  /**
   * @gxp-tag SPEC-005-004-016
   * @gxp-criticality MEDIUM
   * @test-type integration
   * @requirement REQ-005
   */
  it('should include timestamps in all events', () => {
    const scanId = 'scan-timestamps';

    gateway.emitScanProgress(scanId, 50, 'parse', 'Parsing');
    gateway.emitScanComplete(scanId, { status: 'completed' });
    gateway.emitScanFailed(scanId, 'Error occurred');

    // Verify all events have timestamps
    expect(emittedEvents.length).toBe(3);
    emittedEvents.forEach((event) => {
      expect(event.payload).toHaveProperty('timestamp');
      expect(event.payload.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    // Verify timestamps are chronologically ordered
    const timestamps = emittedEvents.map((e) =>
      new Date(e.payload.timestamp).getTime(),
    );
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  /**
   * @gxp-tag SPEC-005-004-017
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-005
   */
  it('should handle rapid progress updates without data loss', () => {
    const scanId = 'scan-rapid-updates';
    const expectedProgress = [];

    // Emit 50 rapid progress updates
    for (let progress = 10; progress <= 100; progress += 2) {
      gateway.emitScanProgress(scanId, progress, 'processing', `Progress ${progress}%`);
      expectedProgress.push(progress);
    }

    // Verify all events were captured
    expect(emittedEvents.length).toBe(expectedProgress.length);

    // Verify progress values match
    const actualProgress = emittedEvents.map((e) => e.payload.progress);
    expect(actualProgress).toEqual(expectedProgress);

    // Verify progress is monotonically increasing
    for (let i = 1; i < actualProgress.length; i++) {
      expect(actualProgress[i]).toBeGreaterThan(actualProgress[i - 1]);
    }
  });

  /**
   * @gxp-tag SPEC-005-004-018
   * @gxp-criticality MEDIUM
   * @test-type integration
   * @requirement REQ-005
   */
  it('should support optional message field in progress events', () => {
    const scanId = 'scan-optional-message';

    // Emit with message
    gateway.emitScanProgress(scanId, 30, 'fetch', 'Fetching artifacts');

    // Emit without message
    gateway.emitScanProgress(scanId, 60, 'parse');

    expect(emittedEvents.length).toBe(2);

    // First event has message
    expect(emittedEvents[0].payload).toHaveProperty('message');
    expect(emittedEvents[0].payload.message).toBe('Fetching artifacts');

    // Second event has message field (undefined but present)
    expect(emittedEvents[1].payload).toHaveProperty('message');
  });

  /**
   * @gxp-tag SPEC-005-004-019
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-005
   */
  it('should maintain event order under concurrent operations', () => {
    const scanId = 'scan-order-test';
    const operations = [
      { type: 'progress', progress: 10, status: 'init' },
      { type: 'progress', progress: 20, status: 'fetch' },
      { type: 'progress', progress: 40, status: 'parse' },
      { type: 'progress', progress: 60, status: 'validate' },
      { type: 'progress', progress: 80, status: 'persist' },
      { type: 'progress', progress: 95, status: 'finalize' },
      { type: 'complete', result: { status: 'completed' } },
    ];

    // Execute operations
    operations.forEach((op) => {
      if (op.type === 'progress') {
        gateway.emitScanProgress(scanId, op.progress!, op.status!);
      } else if (op.type === 'complete') {
        gateway.emitScanComplete(scanId, op.result!);
      }
    });

    // Verify order preserved
    expect(emittedEvents.length).toBe(operations.length);

    // Verify progress events are in order
    const progressEvents = emittedEvents
      .filter((e) => e.event.includes('progress'))
      .map((e) => e.payload.progress);

    for (let i = 1; i < progressEvents.length; i++) {
      expect(progressEvents[i]).toBeGreaterThan(progressEvents[i - 1]);
    }

    // Verify complete event is last
    expect(emittedEvents[emittedEvents.length - 1].event).toContain('complete');
  });
});
