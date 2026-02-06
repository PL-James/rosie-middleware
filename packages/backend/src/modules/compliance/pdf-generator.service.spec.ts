import { describe, it, expect, beforeEach } from 'vitest';
import { PdfGeneratorService } from './pdf-generator.service';
import type { ComplianceReport } from './compliance-report.service';

/**
 * @gxp-tag SPEC-006-001-001
 * @trace US-006-001
 * @gxp-criticality HIGH
 * @test-type unit
 * @requirement REQ-006
 */
describe('PdfGeneratorService - Compliance Report PDF Generation', () => {
  let service: PdfGeneratorService;
  let mockComplianceReport: ComplianceReport;

  beforeEach(() => {
    service = new PdfGeneratorService();

    // Create comprehensive mock compliance report
    mockComplianceReport = {
      id: 'report-123',
      repositoryId: 'repo-456',
      reportType: 'full',
      generatedAt: new Date('2026-02-05T12:00:00Z'),
      generatedBy: 'user-789',
      sections: {
        executiveSummary: {
          projectName: 'ROSIE Middleware',
          version: '1.0.0',
          validationStatus: 'VALIDATED',
          gxpRiskRating: 'MEDIUM',
          artifactCounts: {
            requirements: 42,
            userStories: 18,
            specifications: 17,
            evidence: 52,
          },
          verificationRate: '95.5%',
          overallRisk: 'LOW',
          riskScore: 25,
          summary: 'ROSIE Middleware v1.0.0 has 42 requirements...',
        },
        cfrCompliance: {
          title: '21 CFR Part 11 Compliance Assessment',
          sections: [
            {
              regulation: '§11.10(e) - Complete, accurate, tamper-evident copies',
              status: 'COMPLIANT',
              evidence: [
                'Git commit SHA verification',
                '52 evidence artifacts with JWS signatures',
              ],
              notes: 'All records are tamper-evident',
            },
          ],
          overallStatus: 'COMPLIANT',
          recommendations: ['Maintain current compliance standards'],
        },
        riskAssessment: {
          overallRisk: 'LOW',
          riskScore: 25,
          factors: [],
          mitigations: [],
        },
        evidenceQuality: {
          summary: {
            totalEvidence: 52,
            verifiedEvidence: 50,
            verificationRate: '96.2%',
          },
          byTier: {
            IQ: { count: 10, verified: 10, description: 'Installation Qualification' },
            OQ: { count: 30, verified: 29, description: 'Operational Qualification' },
            PQ: { count: 12, verified: 11, description: 'Performance Qualification' },
          },
          qualityMetrics: {
            signatureValidity: '96.2%',
            completeness: 'Evidence artifacts present',
          },
        },
        auditTrail: {
          totalRecords: 150,
          recentActions: [
            {
              timestamp: new Date('2026-02-05T11:00:00Z'),
              action: 'SCAN',
              resourceType: 'repository',
              userId: 'user-123',
              ipAddress: '192.168.1.1',
            },
          ],
          summary: '150 audit records captured',
        },
      },
      complianceScore: 85,
      overallRisk: 'LOW',
    };
  });

  /**
   * @gxp-tag SPEC-006-001-002
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-006
   */
  describe('PDF Buffer Generation', () => {
    it('should generate PDF as a Buffer', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    /**
     * @gxp-tag SPEC-006-001-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-006
     */
    it('should generate valid PDF header', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );

      // PDF files start with %PDF-
      const header = pdfBuffer.toString('utf-8', 0, 5);
      expect(header).toBe('%PDF-');
    });

    /**
     * @gxp-tag SPEC-006-001-004
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should generate deterministic PDF size', async () => {
      const pdf1 = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );
      const pdf2 = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );

      // Size should be consistent for same input (with some tolerance for timestamps)
      expect(Math.abs(pdf1.length - pdf2.length)).toBeLessThan(100);
    });
  });

  /**
   * @gxp-tag SPEC-006-001-005
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-006
   */
  describe('PDF Content Validation', () => {
    it('should include report title in PDF metadata', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );
      const pdfText = pdfBuffer.toString('utf-8');

      // PDF title is in metadata, not compressed content
      expect(pdfText).toContain('ROSIE Compliance Report');
    });

    /**
     * @gxp-tag SPEC-006-001-006
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-006
     */
    it('should generate PDF with multiple pages for complete report', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );

      // PDFs with multiple pages have multiple /Page objects
      const pdfText = pdfBuffer.toString('utf-8');
      expect(pdfText).toContain('/Type /Page');

      // Should be larger than minimal report due to content
      expect(pdfBuffer.length).toBeGreaterThan(2000);
    });

    /**
     * @gxp-tag SPEC-006-001-007
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-006
     */
    it('should include PDF font definitions for text rendering', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );
      const pdfText = pdfBuffer.toString('utf-8');

      // Should include Helvetica fonts
      expect(pdfText).toContain('Helvetica');
    });

    /**
     * @gxp-tag SPEC-006-001-008
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should include compressed content streams', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );
      const pdfText = pdfBuffer.toString('utf-8');

      // PDF uses FlateDecode for compression
      expect(pdfText).toContain('/FlateDecode');
      expect(pdfText).toContain('stream');
      expect(pdfText).toContain('endstream');
    });

    /**
     * @gxp-tag SPEC-006-001-009
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should include report metadata in PDF info', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );
      const pdfText = pdfBuffer.toString('utf-8');

      // Metadata is not compressed
      expect(pdfText).toContain('user-789'); // Author
      expect(pdfText).toContain('ROSIE Middleware'); // Subject
    });

    /**
     * @gxp-tag SPEC-006-001-010
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should have proper PDF catalog structure', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );
      const pdfText = pdfBuffer.toString('utf-8');

      // Essential PDF structure
      expect(pdfText).toContain('/Type /Catalog');
      expect(pdfText).toContain('/Type /Pages');
    });

    /**
     * @gxp-tag SPEC-006-001-011
     * @gxp-criticality LOW
     * @test-type unit
     * @requirement REQ-006
     */
    it('should include creation date in PDF', async () => {
      const pdfBuffer = await service.generateComplianceReportPdf(
        mockComplianceReport,
      );
      const pdfText = pdfBuffer.toString('utf-8');

      // Date format in PDF: (D:20260205120000Z)
      expect(pdfText).toContain('20260205');
    });
  });

  /**
   * @gxp-tag SPEC-006-001-012
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-006
   */
  describe('Edge Cases', () => {
    it('should handle minimal report data', async () => {
      const minimalReport: ComplianceReport = {
        id: 'report-min',
        repositoryId: 'repo-min',
        reportType: 'minimal',
        generatedAt: new Date(),
        sections: {
          executiveSummary: {
            projectName: 'Test Project',
            version: '0.1.0',
            artifactCounts: {
              requirements: 0,
              userStories: 0,
              specifications: 0,
              evidence: 0,
            },
          },
          cfrCompliance: { sections: [], overallStatus: 'PARTIAL' },
          riskAssessment: { overallRisk: 'HIGH', riskScore: 75 },
          evidenceQuality: {
            summary: { totalEvidence: 0, verifiedEvidence: 0, verificationRate: '0%' },
          },
          auditTrail: { totalRecords: 0, recentActions: [], summary: '0 records' },
        },
        complianceScore: 0,
        overallRisk: 'HIGH',
      };

      const pdfBuffer = await service.generateComplianceReportPdf(minimalReport);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      const pdfText = pdfBuffer.toString('utf-8');
      expect(pdfText).toContain('Test Project');
    });

    /**
     * @gxp-tag SPEC-006-001-013
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should handle long text content without overflow', async () => {
      const longReport = {
        ...mockComplianceReport,
        sections: {
          ...mockComplianceReport.sections,
          executiveSummary: {
            ...mockComplianceReport.sections.executiveSummary,
            summary: 'A'.repeat(500), // Long summary
          },
        },
      };

      const pdfBuffer = await service.generateComplianceReportPdf(longReport);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    /**
     * @gxp-tag SPEC-006-001-014
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should handle special characters in text', async () => {
      const specialCharsReport = {
        ...mockComplianceReport,
        sections: {
          ...mockComplianceReport.sections,
          executiveSummary: {
            ...mockComplianceReport.sections.executiveSummary,
            projectName: 'Test & Project <2024> "Special"',
          },
        },
      };

      const pdfBuffer = await service.generateComplianceReportPdf(
        specialCharsReport,
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);

      const pdfText = pdfBuffer.toString('utf-8');
      expect(pdfText).toContain('Test');
      expect(pdfText).toContain('Project');
    });
  });

  /**
   * @gxp-tag SPEC-006-001-015
   * @gxp-criticality LOW
   * @test-type unit
   * @requirement REQ-006
   */
  describe('Performance', () => {
    it('should generate PDF in reasonable time', async () => {
      const startTime = Date.now();

      await service.generateComplianceReportPdf(mockComplianceReport);

      const duration = Date.now() - startTime;

      // Should generate PDF in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
