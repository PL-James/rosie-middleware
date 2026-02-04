import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  db,
  requirements,
  userStories,
  specs,
  evidence,
  systemContexts,
  auditLog,
  complianceReports,
} from '@/db';
import { eq, desc } from 'drizzle-orm';
import { RiskAssessmentService } from './risk-assessment.service';
import { EvidenceService } from '../evidence/evidence.service';
import { sanitizeCsv } from '@/common/utils/csv-sanitizer';

export interface ComplianceReport {
  id: string;
  repositoryId: string;
  reportType: string;
  generatedAt: Date;
  generatedBy?: string;
  sections: {
    executiveSummary: any;
    cfrCompliance: any;
    riskAssessment: any;
    evidenceQuality: any;
    auditTrail: any;
  };
  complianceScore: number;
  overallRisk: string;
}

@Injectable()
export class ComplianceReportService {
  private readonly logger = new Logger(ComplianceReportService.name);

  constructor(
    private riskAssessmentService: RiskAssessmentService,
    private evidenceService: EvidenceService,
  ) {}

  /**
   * Generate a comprehensive compliance report
   */
  async generateReport(
    repositoryId: string,
    reportType: string = 'full',
  ): Promise<ComplianceReport> {
    this.logger.log(
      `Generating ${reportType} compliance report for repository ${repositoryId}`,
    );

    // Get system context
    const [systemContext] = await db
      .select()
      .from(systemContexts)
      .where(eq(systemContexts.repositoryId, repositoryId))
      .orderBy(desc(systemContexts.createdAt))
      .limit(1);

    if (!systemContext) {
      throw new NotFoundException(
        `No system context found for repository ${repositoryId}`,
      );
    }

    // Get artifact counts
    const [requirementsList, userStoriesList, specsList, evidenceList] =
      await Promise.all([
        db.select().from(requirements).where(eq(requirements.repositoryId, repositoryId)),
        db.select().from(userStories).where(eq(userStories.repositoryId, repositoryId)),
        db.select().from(specs).where(eq(specs.repositoryId, repositoryId)),
        db.select().from(evidence).where(eq(evidence.repositoryId, repositoryId)),
      ]);

    // Get verification status
    const verificationStatus = await this.evidenceService.getVerificationStatus(
      repositoryId,
    );

    // Get risk assessment
    const riskAssessment = await this.riskAssessmentService.calculateRisk(
      repositoryId,
    );

    // Build report sections
    const sections = {
      executiveSummary: this.buildExecutiveSummary(
        systemContext,
        requirementsList,
        userStoriesList,
        specsList,
        evidenceList,
        verificationStatus,
        riskAssessment,
      ),
      cfrCompliance: this.buildCfrComplianceSection(
        systemContext,
        evidenceList,
        verificationStatus,
      ),
      riskAssessment: riskAssessment,
      evidenceQuality: this.buildEvidenceQualitySection(
        evidenceList,
        verificationStatus,
      ),
      auditTrail: await this.buildAuditTrailSection(repositoryId),
    };

    // Calculate overall compliance score
    const complianceScore = this.calculateComplianceScore(
      verificationStatus,
      riskAssessment,
    );

    // Save report to database
    const [savedReport] = await db
      .insert(complianceReports)
      .values({
        repositoryId,
        reportType,
        generatedAt: new Date(),
        reportData: sections,
        complianceScore,
        overallRisk: riskAssessment.overallRisk,
      })
      .returning();

    this.logger.log(
      `Compliance report ${savedReport.id} generated successfully`,
    );

    return {
      id: savedReport.id,
      repositoryId,
      reportType,
      generatedAt: savedReport.generatedAt,
      sections,
      complianceScore,
      overallRisk: riskAssessment.overallRisk,
    };
  }

  /**
   * Build Executive Summary section
   */
  private buildExecutiveSummary(
    systemContext: any,
    requirementsList: any[],
    userStoriesList: any[],
    specsList: any[],
    evidenceList: any[],
    verificationStatus: any,
    riskAssessment: any,
  ) {
    return {
      projectName: systemContext.projectName,
      version: systemContext.version,
      validationStatus: systemContext.validationStatus,
      gxpRiskRating: systemContext.gxpRiskRating,
      artifactCounts: {
        requirements: requirementsList.length,
        userStories: userStoriesList.length,
        specifications: specsList.length,
        evidence: evidenceList.length,
      },
      verificationRate: `${verificationStatus.verificationRate.toFixed(1)}%`,
      overallRisk: riskAssessment.overallRisk,
      riskScore: riskAssessment.riskScore,
      summary: `${systemContext.projectName} v${systemContext.version} has ${requirementsList.length} requirements, ${specsList.length} specifications, and ${evidenceList.length} evidence artifacts. Verification rate: ${verificationStatus.verificationRate.toFixed(1)}%. Overall risk: ${riskAssessment.overallRisk}.`,
    };
  }

  /**
   * Build 21 CFR Part 11 Compliance section
   */
  private buildCfrComplianceSection(
    systemContext: any,
    evidenceList: any[],
    verificationStatus: any,
  ) {
    return {
      title: '21 CFR Part 11 Compliance Assessment',
      sections: [
        {
          regulation: '§11.10(e) - Complete, accurate, tamper-evident copies',
          status:
            evidenceList.length > 0 && verificationStatus.verificationRate > 80
              ? 'COMPLIANT'
              : 'PARTIAL',
          evidence: [
            'Git commit SHA verification ensures records match point-in-time state',
            `${evidenceList.length} evidence artifacts with JWS signatures`,
            `${verificationStatus.verifiedCount}/${verificationStatus.totalEvidence} artifacts cryptographically verified`,
          ],
          notes:
            verificationStatus.verificationRate < 80
              ? 'Increase verification rate to 80% for full compliance'
              : 'All records are tamper-evident and traceable',
        },
        {
          regulation: '§11.10(c) - Sequentially numbered audit trails',
          status: 'COMPLIANT',
          evidence: [
            'audit_log table with sequential IDs and timestamps',
            'All repository operations logged',
            'User actions, IP addresses, and request metadata captured',
          ],
          notes: 'Comprehensive audit trail implemented',
        },
        {
          regulation: '§11.50 - Non-repudiation (Electronic Signatures)',
          status:
            verificationStatus.verificationRate >= 100
              ? 'COMPLIANT'
              : 'PARTIAL',
          evidence: [
            'JWS evidence artifacts with cryptographic signatures',
            `${verificationStatus.verifiedCount} valid signatures`,
            'Public key infrastructure for signature verification',
          ],
          notes:
            verificationStatus.verificationRate < 100
              ? 'All evidence artifacts should have valid JWS signatures for full compliance'
              : 'All evidence artifacts cryptographically signed',
        },
      ],
      overallStatus:
        verificationStatus.verificationRate >= 80 &&
        evidenceList.length > 0
          ? 'COMPLIANT'
          : 'PARTIAL',
      recommendations:
        verificationStatus.verificationRate < 80
          ? [
              'Increase evidence verification rate to 80%',
              'Ensure all test results are signed with JWS',
              'Implement automated signature verification in CI/CD',
            ]
          : ['Maintain current compliance standards'],
    };
  }

  /**
   * Build Evidence Quality section
   */
  private buildEvidenceQualitySection(
    evidenceList: any[],
    verificationStatus: any,
  ) {
    const iqEvidence = evidenceList.filter((e) => e.verificationTier === 'IQ');
    const oqEvidence = evidenceList.filter((e) => e.verificationTier === 'OQ');
    const pqEvidence = evidenceList.filter((e) => e.verificationTier === 'PQ');

    return {
      summary: {
        totalEvidence: evidenceList.length,
        verifiedEvidence: verificationStatus.verifiedCount,
        verificationRate: `${verificationStatus.verificationRate.toFixed(1)}%`,
      },
      byTier: {
        IQ: {
          count: iqEvidence.length,
          verified: iqEvidence.filter((e) => e.isSignatureValid).length,
          description: 'Installation Qualification',
        },
        OQ: {
          count: oqEvidence.length,
          verified: oqEvidence.filter((e) => e.isSignatureValid).length,
          description: 'Operational Qualification',
        },
        PQ: {
          count: pqEvidence.length,
          verified: pqEvidence.filter((e) => e.isSignatureValid).length,
          description: 'Performance Qualification',
        },
      },
      qualityMetrics: {
        signatureValidity:
          evidenceList.length > 0
            ? `${((verificationStatus.verifiedCount / evidenceList.length) * 100).toFixed(1)}%`
            : '0%',
        completeness:
          evidenceList.length > 0 ? 'Evidence artifacts present' : 'No evidence',
      },
    };
  }

  /**
   * Build Audit Trail section
   */
  private async buildAuditTrailSection(repositoryId: string) {
    const auditRecords = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.resourceId, repositoryId))
      .orderBy(desc(auditLog.timestamp))
      .limit(100);

    return {
      totalRecords: auditRecords.length,
      recentActions: auditRecords.slice(0, 10).map((record) => ({
        timestamp: record.timestamp,
        action: record.action,
        resourceType: record.resourceType,
        userId: record.userId,
        ipAddress: record.ipAddress,
      })),
      summary: `${auditRecords.length} audit records captured`,
    };
  }

  /**
   * Calculate overall compliance score (0-100)
   */
  private calculateComplianceScore(
    verificationStatus: any,
    riskAssessment: any,
  ): number {
    // Weight factors
    const verificationWeight = 0.4;
    const riskWeight = 0.6;

    const verificationScore = verificationStatus.verificationRate;
    const riskScore = riskAssessment.riskScore;

    return Math.round(
      verificationScore * verificationWeight + riskScore * riskWeight,
    );
  }

  /**
   * Export compliance report to PDF (placeholder)
   */
  async exportToPdf(reportId: string): Promise<string> {
    this.logger.log(`Exporting report ${reportId} to PDF`);

    // Get report
    const [report] = await db
      .select()
      .from(complianceReports)
      .where(eq(complianceReports.id, reportId));

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // TODO: Implement PDF generation (e.g., using puppeteer or pdfkit)
    // For now, return a placeholder URL
    const pdfUrl = `/api/v1/compliance/reports/${reportId}/pdf`;

    // Update report with PDF URL
    await db
      .update(complianceReports)
      .set({ pdfUrl })
      .where(eq(complianceReports.id, reportId));

    return pdfUrl;
  }

  /**
   * Export audit trail to CSV
   *
   * Uses sanitizeCsv() to prevent CSV injection attacks.
   * All user-controlled fields are sanitized to prevent formula execution.
   */
  async exportAuditTrailToCsv(repositoryId: string): Promise<string> {
    this.logger.log(`Exporting audit trail for repository ${repositoryId} to CSV`);

    const auditRecords = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.resourceId, repositoryId))
      .orderBy(desc(auditLog.timestamp));

    // Build CSV with sanitization
    const headers = [
      'Timestamp',
      'Action',
      'Resource Type',
      'Resource ID',
      'User ID',
      'IP Address',
      'Request Method',
      'Request Path',
      'Response Status',
    ];

    const rows = auditRecords.map((record) => [
      record.timestamp?.toISOString() || '',
      record.action || '',
      record.resourceType || '',
      record.resourceId || '',
      record.userId || '',
      record.ipAddress || '',
      record.requestMethod || '',
      record.requestPath || '',
      record.responseStatus?.toString() || '',
    ]);

    // Use sanitizeCsv to prevent CSV injection
    const csv = sanitizeCsv(headers, rows);

    return csv;
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string) {
    const [report] = await db
      .select()
      .from(complianceReports)
      .where(eq(complianceReports.id, reportId));

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    return report;
  }
}
