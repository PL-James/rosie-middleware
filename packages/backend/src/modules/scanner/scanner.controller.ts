import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Optional,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScannerService } from './scanner.service';
import { PaginationDto } from '@/common/pagination.dto';
import { RepositoriesService } from '../repositories/repositories.service';
import { db, scans } from '@/db';

@Controller('api/v1')
export class ScannerController {
  private readonly logger = new Logger(ScannerController.name);

  constructor(
    private readonly scannerService: ScannerService,
    private readonly repositoriesService: RepositoriesService,
    @Optional() @InjectQueue('scanner') private readonly scannerQueue?: Queue,
  ) {
    if (!this.scannerQueue) {
      this.logger.warn(
        'BullMQ queue not available - scans will run synchronously. Configure REDIS_HOST to enable async scanning.',
      );
    }
  }

  @Post('repositories/:id/scan')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerScan(@Param('id') id: string) {
    // Get repository details
    const repository = await this.repositoriesService.findOne(id);

    // Create scan record
    const [scan] = await db
      .insert(scans)
      .values({
        repositoryId: id,
        status: this.scannerQueue ? 'queued' : 'in_progress',
      })
      .returning();

    // If queue is available, use async scanning
    if (this.scannerQueue) {
      const job = await this.scannerQueue.add(
        'scan-repository',
        {
          repositoryId: id,
          scanId: scan.id,
          owner: repository.owner,
          repo: repository.repo,
        },
        {
          jobId: scan.id, // Use scanId as jobId for easy lookup
        },
      );

      await this.repositoriesService.updateLastScan(id, scan.id, 'queued');

      return {
        scanId: scan.id,
        jobId: job.id,
        status: 'queued',
        message: 'Scan queued successfully (async mode)',
      };
    }

    // Fallback: Run scan synchronously
    this.logger.log(`Running scan ${scan.id} synchronously (no queue available)`);

    try {
      // Run scan in background (don't await)
      this.scannerService
        .executeScanWithProgress(scan.id, repository.owner, repository.repo)
        .then(() => {
          this.logger.log(`Scan ${scan.id} completed successfully`);
        })
        .catch((error) => {
          this.logger.error(`Scan ${scan.id} failed:`, error);
        });

      await this.repositoriesService.updateLastScan(id, scan.id, 'in_progress');

      return {
        scanId: scan.id,
        status: 'in_progress',
        message: 'Scan started successfully (synchronous mode)',
      };
    } catch (error) {
      this.logger.error(`Failed to start scan ${scan.id}:`, error);
      throw error;
    }
  }

  @Get('scans/:scanId')
  async getScanStatus(@Param('scanId') scanId: string) {
    const scan = await this.scannerService.getScanStatus(scanId);

    // Try to get job progress from BullMQ if available
    let jobProgress = null;
    if (this.scannerQueue) {
      try {
        const job = await this.scannerQueue.getJob(scanId);
        if (job) {
          jobProgress = {
            progress: job.progress,
            state: await job.getState(),
          };
        }
      } catch (error) {
        // Job not found or already completed/removed
      }
    }

    return {
      ...scan,
      jobProgress,
    };
  }

  @Get('scans/:scanId/progress')
  async getScanProgress(@Param('scanId') scanId: string) {
    // If no queue available, return scan status from database
    if (!this.scannerQueue) {
      const scan = await this.scannerService.getScanStatus(scanId);
      return {
        scanId,
        progress: scan.status === 'completed' ? 100 : scan.status === 'failed' ? 0 : 50,
        state: scan.status,
        message: 'Queue not available - using database status',
      };
    }

    try {
      const job = await this.scannerQueue.getJob(scanId);
      if (!job) {
        return {
          scanId,
          progress: 0,
          state: 'not_found',
          message: 'Job not found (may be completed or removed)',
        };
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        scanId,
        jobId: job.id,
        progress: typeof progress === 'number' ? progress : 0,
        state,
      };
    } catch (error) {
      return {
        scanId,
        progress: 0,
        state: 'error',
        message: error.message,
      };
    }
  }

  @Get('repositories/:id/scans')
  getRepositoryScans(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.scannerService.getRepositoryScans(
      id,
      pagination.page,
      pagination.limit,
    );
  }
}
