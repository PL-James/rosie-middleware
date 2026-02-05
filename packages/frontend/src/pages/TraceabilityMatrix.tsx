import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { artifactsApi, Requirement, UserStory, Spec, Evidence } from '../lib/api';
import { ArrowLeft, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export default function TraceabilityMatrix() {
  const { id: repositoryId } = useParams<{ id: string }>();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repositoryId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [reqRes, usRes, specRes, evRes] = await Promise.all([
          artifactsApi.getRequirements(repositoryId),
          artifactsApi.getUserStories(repositoryId),
          artifactsApi.getSpecs(repositoryId),
          artifactsApi.getEvidence(repositoryId),
        ]);

        setRequirements(reqRes.data.data);
        setUserStories(usRes.data.data);
        setSpecs(specRes.data.data);
        setEvidence(evRes.data.data);
      } catch (err) {
        console.error('Failed to load traceability data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [repositoryId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-lg text-gray-600">Loading traceability matrix...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/repositories/${repositoryId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Repository
        </Link>
        <h1 className="text-2xl font-bold">Traceability Matrix</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">
          ROSIE Traceability Chain
        </h3>
        <p className="text-xs text-blue-700">
          REQ → User Story → Spec → Evidence
        </p>
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Requirement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Stories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requirements.map((req) => {
                const linkedUS = userStories.filter((us) => us.parentId === req.gxpId);
                const linkedSpecs = specs.filter((spec) =>
                  linkedUS.some((us) => us.gxpId === spec.parentId)
                );
                const linkedEvidence = evidence.filter((ev) =>
                  linkedSpecs.some((spec) => spec.gxpId === ev.gxpId)
                );

                const hasUserStories = linkedUS.length > 0;
                const hasSpecs = linkedSpecs.length > 0;
                const isFullyCovered = hasUserStories && hasSpecs;

                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                      <div>
                        <code className="text-sm font-medium text-blue-600">
                          {req.gxpId}
                        </code>
                        <p className="text-sm text-gray-900 mt-1">{req.title}</p>
                        {req.gxpRiskRating && (
                          <span
                            className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded ${
                              req.gxpRiskRating === 'HIGH'
                                ? 'bg-red-100 text-red-800'
                                : req.gxpRiskRating === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {req.gxpRiskRating}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {linkedUS.length > 0 ? (
                        <div className="space-y-1">
                          {linkedUS.map((us) => (
                            <div key={us.id}>
                              <code className="text-xs text-green-600 font-medium">
                                {us.gxpId}
                              </code>
                              <p className="text-xs text-gray-600">{us.title}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No user stories</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {linkedSpecs.length > 0 ? (
                        <div className="space-y-1">
                          {linkedSpecs.map((spec) => (
                            <div key={spec.id}>
                              <code className="text-xs text-purple-600 font-medium">
                                {spec.gxpId}
                              </code>
                              <p className="text-xs text-gray-600">{spec.title}</p>
                              {spec.verificationTier && (
                                <span className="inline-block text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                  {spec.verificationTier}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No specs</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {linkedEvidence.length > 0 ? (
                        <div className="space-y-1">
                          {linkedEvidence.map((ev) => (
                            <div key={ev.id}>
                              <code className="text-xs text-orange-600 font-medium">
                                {ev.fileName}
                              </code>
                              {ev.isSignatureValid !== undefined && (
                                <span
                                  className={`ml-2 inline-block text-xs px-1 rounded ${
                                    ev.isSignatureValid
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {ev.isSignatureValid ? 'Verified' : 'Unverified'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No evidence</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {isFullyCovered ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-xs font-medium text-green-600">Complete</span>
                          </>
                        ) : hasUserStories ? (
                          <>
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <span className="text-xs font-medium text-yellow-600">Partial</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-5 h-5 text-gray-400" />
                            <span className="text-xs font-medium text-gray-400">Missing</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Requirements</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{requirements.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500">User Stories</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{userStories.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500">Specifications</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{specs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500">Evidence</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{evidence.length}</p>
        </div>
      </div>
    </div>
  );
}
