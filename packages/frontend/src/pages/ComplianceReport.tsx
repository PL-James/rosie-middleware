import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  complianceApi,
  evidenceApi,
  ComplianceReport as ComplianceReportType,
  AuditLogEntry,
  RiskAssessment,
  VerificationStatus,
} from '../lib/api';
import RiskDashboard from '../components/RiskDashboard';

export default function ComplianceReport() {
  const { id: repositoryId } = useParams<{ id: string }>();
  const [report, setReport] = useState<ComplianceReportType | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(
    null,
  );
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'summary' | 'audit' | 'risk' | 'evidence'
  >('summary');

  useEffect(() => {
    if (!repositoryId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all compliance data
        const [reportRes, auditRes, riskRes, verifyRes] = await Promise.allSettled([
          complianceApi.getComplianceReport(repositoryId),
          complianceApi.getAuditTrail(repositoryId),
          complianceApi.getRiskAssessment(repositoryId),
          evidenceApi.getVerificationStatus(repositoryId),
        ]);

        if (reportRes.status === 'fulfilled') {
          setReport(reportRes.value.data);
        }
        if (auditRes.status === 'fulfilled') {
          setAuditLog(auditRes.value.data);
        }
        if (riskRes.status === 'fulfilled') {
          setRiskAssessment(riskRes.value.data);
        }
        if (verifyRes.status === 'fulfilled') {
          setVerificationStatus(verifyRes.value.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load compliance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [repositoryId]);

  const handleExportPdf = async () => {
    if (!repositoryId) return;
    try {
      const response = await complianceApi.exportCompliancePdf(repositoryId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${repositoryId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleExportAuditCsv = async () => {
    if (!repositoryId) return;
    try {
      const response = await complianceApi.exportAuditTrailCsv(repositoryId);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${repositoryId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">
          Loading compliance report...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Compliance Report</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportAuditCsv}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Export Audit Trail (CSV)
          </button>
          <button
            onClick={handleExportPdf}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Export Report (PDF)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('summary')}
            className={`${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Executive Summary
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`${
              activeTab === 'evidence'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Evidence Quality
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`${
              activeTab === 'risk'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Risk Assessment
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Audit Trail
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && report && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">
                Total Artifacts
              </h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {Object.values(report.sections.executiveSummary.artifactCounts).reduce((a, b) => a + b, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">
                Compliance Score
              </h3>
              <p className="mt-2 text-3xl font-semibold text-green-600">
                {report.complianceScore}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Risk Level</h3>
              <p
                className={`mt-2 text-3xl font-semibold ${
                  report.overallRisk === 'HIGH'
                    ? 'text-red-600'
                    : report.overallRisk === 'MEDIUM'
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {report.overallRisk}
              </p>
            </div>
          </div>

          {/* 21 CFR Part 11 Checklist */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              {report.sections.cfrCompliance.title}
            </h2>
            <div className="space-y-4">
              {report.sections.cfrCompliance.sections.map((section, idx) => (
                <div key={idx} className="border-b border-gray-200 pb-3 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{section.regulation}</span>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        section.status === 'COMPLIANT'
                          ? 'bg-green-100 text-green-800'
                          : section.status === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {section.status}
                    </span>
                  </div>
                  {section.notes && (
                    <p className="text-xs text-gray-600 mt-1">{section.notes}</p>
                  )}
                </div>
              ))}
            </div>
            {report.sections.cfrCompliance.recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  {report.sections.cfrCompliance.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'evidence' && verificationStatus && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">
                Total Evidence
              </h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {verificationStatus.total}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Verified</h3>
              <p className="mt-2 text-3xl font-semibold text-green-600">
                {verificationStatus.verified}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Unverified</h3>
              <p className="mt-2 text-3xl font-semibold text-yellow-600">
                {verificationStatus.unverified}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Failed</h3>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {verificationStatus.failed}
              </p>
            </div>
          </div>

          {/* By Tier */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Evidence by Tier</h2>
            <div className="space-y-4">
              {Object.entries(verificationStatus.byTier).map(([tier, data]) => (
                <div key={tier} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{tier}</span>
                    <span className="text-sm text-gray-500">
                      {data.verified} / {data.total} verified
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${data.total > 0 ? (data.verified / data.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risk' && riskAssessment && (
        <RiskDashboard riskAssessment={riskAssessment} />
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Audit Trail</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.userId || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.resourceType} {entry.resourceId ? `(${entry.resourceId})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
