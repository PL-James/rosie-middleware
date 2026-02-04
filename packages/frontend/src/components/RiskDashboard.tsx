import { RiskAssessment } from '../lib/api';

interface RiskDashboardProps {
  riskAssessment: RiskAssessment;
}

export default function RiskDashboard({ riskAssessment }: RiskDashboardProps) {
  const { overallRisk, riskDistribution, highRiskRequirements } = riskAssessment;

  const total =
    riskDistribution.HIGH + riskDistribution.MEDIUM + riskDistribution.LOW;

  return (
    <div className="space-y-6">
      {/* Overall Risk */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Overall Risk Level</h2>
        <div className="flex items-center justify-center">
          <div
            className={`text-6xl font-bold ${
              overallRisk === 'HIGH'
                ? 'text-red-600'
                : overallRisk === 'MEDIUM'
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}
          >
            {overallRisk}
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Risk Distribution</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {riskDistribution.HIGH}
            </div>
            <div className="text-sm text-gray-500 mt-1">High Risk</div>
            <div className="text-xs text-gray-400">
              {total > 0 ? ((riskDistribution.HIGH / total) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {riskDistribution.MEDIUM}
            </div>
            <div className="text-sm text-gray-500 mt-1">Medium Risk</div>
            <div className="text-xs text-gray-400">
              {total > 0 ? ((riskDistribution.MEDIUM / total) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {riskDistribution.LOW}
            </div>
            <div className="text-sm text-gray-500 mt-1">Low Risk</div>
            <div className="text-xs text-gray-400">
              {total > 0 ? ((riskDistribution.LOW / total) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        {/* Simple bar chart visualization */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm font-medium text-gray-700">High</span>
            <div className="flex-1 bg-gray-200 rounded-full h-6">
              <div
                className="bg-red-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${total > 0 ? (riskDistribution.HIGH / total) * 100 : 0}%`,
                  minWidth: riskDistribution.HIGH > 0 ? '30px' : '0',
                }}
              >
                <span className="text-white text-xs font-semibold">
                  {riskDistribution.HIGH}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm font-medium text-gray-700">
              Medium
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-6">
              <div
                className="bg-yellow-500 h-6 rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${total > 0 ? (riskDistribution.MEDIUM / total) * 100 : 0}%`,
                  minWidth: riskDistribution.MEDIUM > 0 ? '30px' : '0',
                }}
              >
                <span className="text-white text-xs font-semibold">
                  {riskDistribution.MEDIUM}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm font-medium text-gray-700">Low</span>
            <div className="flex-1 bg-gray-200 rounded-full h-6">
              <div
                className="bg-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${total > 0 ? (riskDistribution.LOW / total) * 100 : 0}%`,
                  minWidth: riskDistribution.LOW > 0 ? '30px' : '0',
                }}
              >
                <span className="text-white text-xs font-semibold">
                  {riskDistribution.LOW}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High Risk Requirements */}
      {highRiskRequirements && highRiskRequirements.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">High Risk Requirements</h2>
          <div className="space-y-3">
            {highRiskRequirements.map((req) => (
              <div
                key={req.id}
                className="border border-red-200 bg-red-50 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-900">
                        {req.gxpId}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-red-200 text-red-800">
                        {req.gxpRiskRating}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mt-1">
                      {req.title}
                    </h3>
                    {req.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {req.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
