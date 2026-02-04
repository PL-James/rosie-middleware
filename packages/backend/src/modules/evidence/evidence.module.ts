import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceController } from './evidence.controller';
import { JwsVerificationService } from './jws-verification.service';

@Module({
  providers: [EvidenceService, JwsVerificationService],
  controllers: [EvidenceController],
  exports: [EvidenceService, JwsVerificationService],
})
export class EvidenceModule {}
