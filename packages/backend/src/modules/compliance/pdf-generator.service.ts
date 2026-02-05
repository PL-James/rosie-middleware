import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ComplianceReport } from './compliance-report.service';

/**
 * PDF Generator Service
 *
 * Generates professional PDF documents for compliance reports using PDFKit.
 * Supports executive summaries, CFR compliance sections, risk assessments,
 * evidence quality metrics, and audit trail summaries.
 */
@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Generate a compliance report PDF
   *
   * @param report - Compliance report data
   * @returns PDF as Buffer
   */
  async generateComplianceReportPdf(
    report: ComplianceReport,
  ): Promise<Buffer> {
    this.logger.log(`Generating PDF for compliance report ${report.id}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'ROSIE Compliance Report',
          Author: report.generatedBy || 'ROSIE Middleware',
          Subject: `Compliance Report for ${report.sections.executiveSummary?.projectName}`,
          CreationDate: report.generatedAt,
        },
      });

      const chunks: Buffer[] = [];

      // Collect PDF data chunks
      doc.on('data', (chunk) => chunks.push(chunk));

      // Resolve promise when PDF is complete
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        this.logger.log(
          `PDF generated successfully (${pdfBuffer.length} bytes)`,
        );
        resolve(pdfBuffer);
      });

      // Handle errors
      doc.on('error', (error) => {
        this.logger.error('PDF generation failed', error);
        reject(error);
      });

      // Build PDF content
      this.buildPdfContent(doc, report);

      // Finalize PDF
      doc.end();
    });
  }

  /**
   * Build PDF content structure
   */
  private buildPdfContent(doc: PDFKit.PDFDocument, report: ComplianceReport) {
    // Header
    this.addHeader(doc, report);

    // Executive Summary
    this.addExecutiveSummary(doc, report);

    // 21 CFR Part 11 Compliance
    this.addCfrCompliance(doc, report);

    // Risk Assessment
    this.addRiskAssessment(doc, report);

    // Evidence Quality
    this.addEvidenceQuality(doc, report);

    // Audit Trail Summary
    this.addAuditTrailSummary(doc, report);

    // Footer
    this.addFooter(doc, report);
  }

  /**
   * Add PDF header
   */
  private addHeader(doc: PDFKit.PDFDocument, report: ComplianceReport) {
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ROSIE Compliance Report', { align: 'center' });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(
        `Generated: ${report.generatedAt.toISOString().split('T')[0]}`,
        { align: 'center' },
      );

    if (report.generatedBy) {
      doc.text(`By: ${report.generatedBy}`, { align: 'center' });
    }

    doc.moveDown(2);
  }

  /**
   * Add Executive Summary section
   */
  private addExecutiveSummary(
    doc: PDFKit.PDFDocument,
    report: ComplianceReport,
  ) {
    const summary = report.sections.executiveSummary;
    if (!summary) return;

    this.addSectionTitle(doc, 'Executive Summary');

    doc.fontSize(10).font('Helvetica');

    // Project Info
    doc.text(`Project: ${summary.projectName || 'N/A'}`, { continued: true });
    doc.text(` | Version: ${summary.version || 'N/A'}`);

    doc.text(
      `Validation Status: ${summary.validationStatus || 'N/A'}`,
      { continued: true },
    );
    doc.text(` | Risk Rating: ${summary.gxpRiskRating || 'N/A'}`);

    doc.moveDown(0.5);

    // Compliance Score (large, prominent)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`Compliance Score: ${report.complianceScore}%`, {
        align: 'center',
      });

    doc.fontSize(10).font('Helvetica');
    doc.moveDown(0.5);

    // Artifact Counts
    if (summary.artifactCounts) {
      doc.font('Helvetica-Bold').text('Artifact Counts:');
      doc.font('Helvetica');
      doc.text(
        `  • Requirements: ${summary.artifactCounts.requirements || 0}`,
      );
      doc.text(
        `  • User Stories: ${summary.artifactCounts.userStories || 0}`,
      );
      doc.text(
        `  • Specifications: ${summary.artifactCounts.specifications || 0}`,
      );
      doc.text(`  • Evidence: ${summary.artifactCounts.evidence || 0}`);
    }

    doc.moveDown(0.5);

    // Verification and Risk
    doc.text(
      `Verification Rate: ${summary.verificationRate || 'N/A'} | Overall Risk: ${report.overallRisk}`,
    );

    if (summary.summary) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Summary:');
      doc.font('Helvetica').text(summary.summary, { width: 500 });
    }

    doc.moveDown(1.5);
  }

  /**
   * Add 21 CFR Part 11 Compliance section
   */
  private addCfrCompliance(doc: PDFKit.PDFDocument, report: ComplianceReport) {
    const cfr = report.sections.cfrCompliance;
    if (!cfr) return;

    this.addSectionTitle(doc, '21 CFR Part 11 Compliance Assessment');

    doc.fontSize(10).font('Helvetica');

    // Overall status
    doc
      .font('Helvetica-Bold')
      .text(`Overall Status: ${cfr.overallStatus || 'N/A'}`);
    doc.moveDown(0.5);

    // Individual sections
    if (cfr.sections && Array.isArray(cfr.sections)) {
      cfr.sections.forEach((section: any, index: number) => {
        if (index > 0) doc.moveDown(0.5);

        doc.font('Helvetica-Bold').text(section.regulation || 'N/A');
        doc
          .font('Helvetica')
          .text(`Status: ${section.status || 'N/A'}`, { indent: 10 });

        if (section.notes) {
          doc.text(`Notes: ${section.notes}`, { indent: 10 });
        }
      });
    }

    // Recommendations
    if (cfr.recommendations && cfr.recommendations.length > 0) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Recommendations:');
      cfr.recommendations.forEach((rec: string) => {
        doc.font('Helvetica').text(`  • ${rec}`);
      });
    }

    doc.moveDown(1.5);
  }

  /**
   * Add Risk Assessment section
   */
  private addRiskAssessment(
    doc: PDFKit.PDFDocument,
    report: ComplianceReport,
  ) {
    const risk = report.sections.riskAssessment;
    if (!risk) return;

    this.addSectionTitle(doc, 'Risk Assessment');

    doc.fontSize(10).font('Helvetica');

    doc.text(`Overall Risk: ${risk.overallRisk || 'N/A'}`);
    doc.text(`Risk Score: ${risk.riskScore || 0}/100`);

    doc.moveDown(1.5);
  }

  /**
   * Add Evidence Quality section
   */
  private addEvidenceQuality(
    doc: PDFKit.PDFDocument,
    report: ComplianceReport,
  ) {
    const evidence = report.sections.evidenceQuality;
    if (!evidence) return;

    this.addSectionTitle(doc, 'Evidence Quality');

    doc.fontSize(10).font('Helvetica');

    // Summary
    if (evidence.summary) {
      doc.text(
        `Total Evidence: ${evidence.summary.totalEvidence || 0}`,
      );
      doc.text(
        `Verified: ${evidence.summary.verifiedEvidence || 0}`,
      );
      doc.text(
        `Verification Rate: ${evidence.summary.verificationRate || 'N/A'}`,
      );
    }

    // By tier
    if (evidence.byTier) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Evidence by Tier:');
      doc.font('Helvetica');

      if (evidence.byTier.IQ) {
        doc.text(
          `  • IQ: ${evidence.byTier.IQ.count} (${evidence.byTier.IQ.verified} verified)`,
        );
      }
      if (evidence.byTier.OQ) {
        doc.text(
          `  • OQ: ${evidence.byTier.OQ.count} (${evidence.byTier.OQ.verified} verified)`,
        );
      }
      if (evidence.byTier.PQ) {
        doc.text(
          `  • PQ: ${evidence.byTier.PQ.count} (${evidence.byTier.PQ.verified} verified)`,
        );
      }
    }

    doc.moveDown(1.5);
  }

  /**
   * Add Audit Trail Summary section
   */
  private addAuditTrailSummary(
    doc: PDFKit.PDFDocument,
    report: ComplianceReport,
  ) {
    const audit = report.sections.auditTrail;
    if (!audit) return;

    this.addSectionTitle(doc, 'Audit Trail Summary');

    doc.fontSize(10).font('Helvetica');

    doc.text(`Total Audit Records: ${audit.totalRecords || 0}`);

    if (audit.summary) {
      doc.text(audit.summary);
    }

    doc.moveDown(1.5);
  }

  /**
   * Add section title with consistent styling
   */
  private addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
    // Check if we need a new page
    if (doc.y > 650) {
      doc.addPage();
    }

    doc.fontSize(14).font('Helvetica-Bold').text(title, { underline: true });
    doc.moveDown(0.5);
  }

  /**
   * Add footer with metadata
   */
  private addFooter(doc: PDFKit.PDFDocument, report: ComplianceReport) {
    const range = doc.bufferedPageRange();
    const pageCount = range.count;

    // PDFKit uses 0-based page indexing, but range.start might not be 0
    for (let i = range.start; i < range.start + pageCount; i++) {
      doc.switchToPage(i);

      const pageNumber = i - range.start + 1;
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Report ID: ${report.id} | Page ${pageNumber} of ${pageCount}`,
          50,
          doc.page.height - 50,
          { align: 'center', lineBreak: false },
        );
    }
  }

  /**
   * DEPRECATED: Legacy method for backward compatibility
   * Use generateComplianceReportPdf instead
   * @deprecated
   */
  async generateCompliancePdf(_data: any): Promise<any> {
    this.logger.warn(
      'generateCompliancePdf is deprecated. Use generateComplianceReportPdf instead.',
    );
    throw new Error(
      'This method is deprecated. Please use generateComplianceReportPdf instead.',
    );
  }
}
