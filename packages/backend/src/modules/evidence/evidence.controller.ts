import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EvidenceService } from './evidence.service';

@ApiTags('evidence')
@Controller('api/v1/repositories/:repositoryId/evidence')
export class EvidenceController {
  constructor(private evidenceService: EvidenceService) {}

  @Post(':evidenceId/verify')
  @ApiOperation({ summary: 'Verify a single evidence artifact signature' })
  @ApiResponse({ status: 200, description: 'Evidence verified successfully' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  async verifyEvidence(
    @Param('repositoryId') repositoryId: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.evidenceService.verifyEvidence(repositoryId, evidenceId);
  }

  @Post('batch-verify')
  @ApiOperation({ summary: 'Batch verify multiple evidence artifacts' })
  @ApiResponse({
    status: 200,
    description: 'Batch verification completed',
  })
  async batchVerifyEvidence(
    @Param('repositoryId') repositoryId: string,
    @Body() body: { evidenceIds: string[] },
  ) {
    return this.evidenceService.batchVerifyEvidence(
      repositoryId,
      body.evidenceIds,
    );
  }

  @Get('verification-status')
  @ApiOperation({
    summary: 'Get verification status summary for repository',
  })
  @ApiResponse({ status: 200, description: 'Verification status retrieved' })
  async getVerificationStatus(@Param('repositoryId') repositoryId: string) {
    return this.evidenceService.getVerificationStatus(repositoryId);
  }

  @Get('verified')
  @ApiOperation({ summary: 'Get all verified evidence for repository' })
  @ApiQuery({
    name: 'tier',
    required: false,
    enum: ['IQ', 'OQ', 'PQ'],
  })
  @ApiResponse({ status: 200, description: 'Verified evidence retrieved' })
  async getVerifiedEvidence(
    @Param('repositoryId') repositoryId: string,
    @Query('tier') tier?: 'IQ' | 'OQ' | 'PQ',
  ) {
    return this.evidenceService.getVerifiedEvidence(repositoryId, tier);
  }
}
