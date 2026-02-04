import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScannerService } from './scanner.service';

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
  getRepositoryScans(@Param('id') id: string) {
    return this.scannerService.getRepositoryScans(id);
  }
}
