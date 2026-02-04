import { Module } from '@nestjs/common';
import { ComplianceReportService } from './compliance-report.service';
import { RiskAssessmentService } from './risk-assessment.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ComplianceController } from './compliance.controller';
import { EvidenceModule } from '../evidence/evidence.module';

@Module({
  imports: [EvidenceModule],
  providers: [ComplianceReportService, RiskAssessmentService, PdfGeneratorService],
  controllers: [ComplianceController],
  exports: [ComplianceReportService, RiskAssessmentService, PdfGeneratorService],
})
export class ComplianceModule {}
