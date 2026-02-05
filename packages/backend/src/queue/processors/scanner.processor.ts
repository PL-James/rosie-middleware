import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScannerService } from '@/modules/scanner/scanner.service';
import { ScanProgressGateway } from '@/websocket/scan-progress.gateway';
import { db, scans } from '@/db';
import { eq } from 'drizzle-orm';

export interface ScanJobData {
  repositoryId: string;
  scanId: string;
  owner: string;
  repo: string;
}

@Processor('scanner', {
  concurrency: 3, // Process up to 3 scans concurrently
})
export class ScannerProcessor extends WorkerHost {
  private readonly logger = new Logger(ScannerProcessor.name);

  constructor(
    @Inject(forwardRef(() => ScannerService))
    private readonly scannerService: ScannerService,
    private readonly scanProgressGateway: ScanProgressGateway,
  ) {
    super();
    this.logger.log('✅ ScannerProcessor initialized - worker ready to process jobs');
  }

  async process(job: Job<ScanJobData>): Promise<void> {
    const { repositoryId, scanId, owner, repo } = job.data;

    this.logger.log(
      `Processing scan job ${job.id} for repository ${owner}/${repo} (scanId: ${scanId})`,
    );

    try {
      // Update job progress - Starting
      await job.updateProgress(5);
      this.scanProgressGateway.emitScanProgress(scanId, 5, 'queued', 'Scan starting');

      // Execute the scan using the existing executeScan method
      // We need to expose executeScan as a public method in ScannerService
      await this.scannerService.executeScanWithProgress(
        scanId,
        owner,
        repo,
        async (progress: number, phase: string) => {
          // Update BullMQ job progress
          await job.updateProgress(progress);
          await job.log(`Phase: ${phase} (${progress}%)`);

          // Emit WebSocket progress update
          this.scanProgressGateway.emitScanProgress(scanId, progress, phase, `Phase: ${phase}`);
        },
      );

      // Mark job as complete
      await job.updateProgress(100);
      this.logger.log(`Scan job ${job.id} completed successfully`);

      // Get final scan result
      const [completedScan] = await db
        .select()
        .from(scans)
        .where(eq(scans.id, scanId));

      // Emit WebSocket completion event
      this.scanProgressGateway.emitScanComplete(scanId, {
        scanId: completedScan.id,
        status: completedScan.status,
        artifactsCreated: completedScan.artifactsCreated,
        durationMs: completedScan.durationMs,
      });
    } catch (error) {
      this.logger.error(`Scan job ${job.id} failed:`, error.stack);

      // Update scan status to failed (if not already done by executeScan)
      await db
        .update(scans)
        .set({
          status: 'failed',
          errorMessage: error.message,
          errorStack: error.stack,
          completedAt: new Date(),
        })
        .where(eq(scans.id, scanId));

      // Emit WebSocket failure event
      this.scanProgressGateway.emitScanFailed(scanId, error.message);

      throw error; // Re-throw to mark the job as failed
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ScanJobData>) {
    this.logger.log(
      `Job ${job.id} completed for scan ${job.data.scanId}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ScanJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for scan ${job.data.scanId}: ${error.message}`,
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job<ScanJobData>) {
    this.logger.log(
      `Job ${job.id} started for scan ${job.data.scanId}`,
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<ScanJobData>, progress: number | object) {
    this.logger.debug(
      `Job ${job.id} progress: ${JSON.stringify(progress)}`,
    );
  }
}
