import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface ComplianceReportData {
  repositoryName: string;
  generatedAt: Date;
  complianceScore: number;
  overallRisk: string;
  sections: {
    executiveSummary: any;
    cfr21Part11: any;
    riskAssessment: any;
    evidenceQuality: any;
    auditTrail: any;
  };
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Generate PDF report from compliance data
   * Returns a readable stream that can be piped to response or saved to file
   */
  async generateCompliancePdf(data: ComplianceReportData): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        // Collect chunks to return as stream
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          const stream = Readable.from(pdfBuffer);
          resolve(stream);
        });
        doc.on('error', reject);

        // Header
        this.addHeader(doc, data);

        // Executive Summary
        this.addExecutiveSummary(doc, data);

        // 21 CFR Part 11 Compliance
        this.add21CFRSection(doc, data);

        // Risk Assessment
        this.addRiskAssessment(doc, data);

        // Evidence Quality
        this.addEvidenceQuality(doc, data);

        // Audit Trail Summary
        this.addAuditTrail(doc, data);

        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        this.logger.error('PDF generation failed:', error);
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, data: ComplianceReportData) {
    doc.fontSize(20).text('ROSIE Compliance Report', { align: 'center' });
    doc.fontSize(12).text(`Repository: ${data.repositoryName}`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${data.generatedAt.toISOString()}`, { align: 'center' });
    doc.moveDown(2);
  }

  private addExecutiveSummary(doc: PDFKit.PDFDocument, data: ComplianceReportData) {
    doc.fontSize(16).text('Executive Summary', { underline: true });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Compliance Score: ${data.complianceScore}/100`);
    doc.text(`Overall Risk: ${data.overallRisk}`);
    doc.moveDown();

    // Add summary metrics
    if (data.sections.executiveSummary) {
      const summary = data.sections.executiveSummary;
      doc.fontSize(11);
      doc.text(`Total Requirements: ${summary.totalRequirements || 0}`);
      doc.text(`Total Specifications: ${summary.totalSpecs || 0}`);
      doc.text(`Total Evidence: ${summary.totalEvidence || 0}`);
      doc.text(`Verification Rate: ${summary.verificationRate || 0}%`);
    }

    doc.moveDown(2);
  }

  private add21CFRSection(doc: PDFKit.PDFDocument, data: ComplianceReportData) {
    doc.fontSize(16).text('21 CFR Part 11 Compliance', { underline: true });
    doc.moveDown();

    const cfr = data.sections.cfr21Part11 || {};
    doc.fontSize(11);

    const sections = [
      { code: '§11.10(e)', desc: 'Tamper-evident copies', status: cfr.section11_10e },
      { code: '§11.10(c)', desc: 'Audit trails', status: cfr.section11_10c },
      { code: '§11.50', desc: 'Non-repudiation', status: cfr.section11_50 },
    ];

    sections.forEach((section) => {
      const status = section.status ? '✓' : '✗';
      doc.text(`${status} ${section.code}: ${section.desc}`);
    });

    doc.moveDown(2);
  }

  private addRiskAssessment(doc: PDFKit.PDFDocument, data: ComplianceReportData) {
    doc.fontSize(16).text('Risk Assessment', { underline: true });
    doc.moveDown();

    const risk = data.sections.riskAssessment || {};
    doc.fontSize(11);

    doc.text(`HIGH Risk Items: ${risk.highRiskCount || 0}`);
    doc.text(`MEDIUM Risk Items: ${risk.mediumRiskCount || 0}`);
    doc.text(`LOW Risk Items: ${risk.lowRiskCount || 0}`);

    doc.moveDown(2);
  }

  private addEvidenceQuality(doc: PDFKit.PDFDocument, data: ComplianceReportData) {
    doc.fontSize(16).text('Evidence Quality', { underline: true });
    doc.moveDown();

    const evidence = data.sections.evidenceQuality || {};
    doc.fontSize(11);

    doc.text(`IQ Evidence: ${evidence.iqCount || 0}`);
    doc.text(`OQ Evidence: ${evidence.oqCount || 0}`);
    doc.text(`PQ Evidence: ${evidence.pqCount || 0}`);
    doc.text(`Valid Signatures: ${evidence.validSignatures || 0}/${evidence.totalEvidence || 0}`);

    doc.moveDown(2);
  }

  private addAuditTrail(doc: PDFKit.PDFDocument, data: ComplianceReportData) {
    doc.fontSize(16).text('Audit Trail Summary', { underline: true });
    doc.moveDown();

    doc.fontSize(11);
    doc.text('Complete audit trail available in CSV export.');
    doc.text('All operations logged with timestamps and user attribution.');

    doc.moveDown(2);
  }

  private addFooter(doc: PDFKit.PDFDocument) {
    doc.fontSize(8).text(
      'Generated by ROSIE Middleware - https://github.com/rosie-middleware',
      50,
      doc.page.height - 50,
      { align: 'center', lineBreak: false }
    );
  }
}
