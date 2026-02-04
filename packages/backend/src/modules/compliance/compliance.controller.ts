import {
  Controller,
  Get,
  Param,
  Query,
  Header,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ComplianceReportService } from './compliance-report.service';
import { RiskAssessmentService } from './risk-assessment.service';
import { PdfGeneratorService } from './pdf-generator.service';

@ApiTags('compliance')
@Controller('api/v1/repositories/:repositoryId/compliance')
export class ComplianceController {
  constructor(
    private complianceReportService: ComplianceReportService,
    private riskAssessmentService: RiskAssessmentService,
    private pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Get('report')
  @ApiOperation({ summary: 'Generate compliance report for repository' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Report type (full, summary, audit)',
  })
  @ApiResponse({ status: 200, description: 'Compliance report generated' })
  async generateReport(
    @Param('repositoryId') repositoryId: string,
    @Query('type') reportType: string = 'full',
  ) {
    return this.complianceReportService.generateReport(
      repositoryId,
      reportType,
    );
  }

  @Get('audit-trail')
  @ApiOperation({ summary: 'Get audit trail for repository' })
  @ApiResponse({ status: 200, description: 'Audit trail retrieved' })
  async getAuditTrail(@Param('repositoryId') repositoryId: string) {
    return this.complianceReportService.exportAuditTrailToCsv(repositoryId);
  }

  @Get('risk-assessment')
  @ApiOperation({ summary: 'Get risk assessment for repository' })
  @ApiResponse({ status: 200, description: 'Risk assessment calculated' })
  async getRiskAssessment(@Param('repositoryId') repositoryId: string) {
    return this.riskAssessmentService.calculateRisk(repositoryId);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export compliance report as PDF' })
  @ApiQuery({
    name: 'reportId',
    required: true,
    description: 'Report ID to export',
  })
  @ApiResponse({ status: 200, description: 'PDF export URL returned' })
  async exportPdf(
    @Param('repositoryId') repositoryId: string,
    @Query('reportId') reportId: string,
  ) {
    const pdfUrl = await this.complianceReportService.exportToPdf(reportId);
    return { pdfUrl };
  }

  @Get('export/pdf/download')
  @ApiOperation({ summary: 'Download compliance report as PDF (direct stream)' })
  @ApiResponse({
    status: 200,
    description: 'PDF file',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': {
        description: 'attachment; filename="compliance-report.pdf"',
      },
    },
  })
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(
    @Param('repositoryId') repositoryId: string,
    @Res() res: Response,
  ) {
    // Generate the compliance report data
    const reportData = await this.complianceReportService.generateReport(
      repositoryId,
      'full',
    );

    // Generate PDF stream
    const pdfStream = await this.pdfGeneratorService.generateCompliancePdf(
      reportData,
    );

    // Set headers
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="compliance-report-${repositoryId}.pdf"`,
    );

    // Pipe the stream to the response
    pdfStream.pipe(res);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export audit trail as CSV' })
  @ApiResponse({
    status: 200,
    description: 'CSV file',
    headers: {
      'Content-Type': { description: 'text/csv' },
      'Content-Disposition': {
        description: 'attachment; filename="audit-trail.csv"',
      },
    },
  })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-trail.csv"')
  async exportCsv(
    @Param('repositoryId') repositoryId: string,
    @Res() res: Response,
  ) {
    const csv = await this.complianceReportService.exportAuditTrailToCsv(
      repositoryId,
    );
    res.send(csv);
  }
}
