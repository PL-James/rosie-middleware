import { Module } from '@nestjs/common';
import { ComplianceReportService } from './compliance-report.service';
import { RiskAssessmentService } from './risk-assessment.service';
import { ComplianceController } from './compliance.controller';
import { EvidenceModule } from '../evidence/evidence.module';

@Module({
  imports: [EvidenceModule],
  providers: [ComplianceReportService, RiskAssessmentService],
  controllers: [ComplianceController],
  exports: [ComplianceReportService, RiskAssessmentService],
})
export class ComplianceModule {}
