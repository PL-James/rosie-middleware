import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { PaginationDto } from '@/common/pagination.dto';

@Controller('api/v1')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('repositories/:id/scan')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerScan(@Param('id') id: string) {
    const scanId = await this.scannerService.scanRepository(id);
    return {
      scanId,
      message: 'Scan initiated',
    };
  }

  @Get('scans/:scanId')
  getScanStatus(@Param('scanId') scanId: string) {
    return this.scannerService.getScanStatus(scanId);
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
