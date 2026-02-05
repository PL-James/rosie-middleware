import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScannerService } from './scanner.service';
import { PaginationDto } from '@/common/pagination.dto';
import { RepositoriesService } from '../repositories/repositories.service';
import { db, scans } from '@/db';

@Controller('api/v1')
export class ScannerController {
  constructor(
    private readonly scannerService: ScannerService,
    private readonly repositoriesService: RepositoriesService,
    @InjectQueue('scanner') private readonly scannerQueue: Queue,
  ) {}

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
        status: 'queued',
      })
      .returning();

    // Queue the scan job
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

    // Update repository last scan
    await this.repositoriesService.updateLastScan(id, scan.id, 'queued');

    return {
      scanId: scan.id,
      jobId: job.id,
      status: 'queued',
      message: 'Scan queued successfully',
    };
  }

  @Get('scans/:scanId')
  async getScanStatus(@Param('scanId') scanId: string) {
    const scan = await this.scannerService.getScanStatus(scanId);

    // Try to get job progress from BullMQ
    let jobProgress = null;
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

    return {
      ...scan,
      jobProgress,
    };
  }

  @Get('scans/:scanId/progress')
  async getScanProgress(@Param('scanId') scanId: string) {
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
