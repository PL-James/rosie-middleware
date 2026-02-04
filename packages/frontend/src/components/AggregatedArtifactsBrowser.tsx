import { useState } from 'react';
import { AggregatedArtifacts, Repository } from '../lib/api';

interface AggregatedArtifactsBrowserProps {
  artifacts: AggregatedArtifacts;
  repositories: Repository[];
}

export default function AggregatedArtifactsBrowser({
  artifacts,
  repositories,
}: AggregatedArtifactsBrowserProps) {
  const [artifactType, setArtifactType] = useState<
    'requirements' | 'userStories' | 'specs' | 'evidence'
  >('requirements');
  const [repoFilter, setRepoFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getArtifactList = () => {
    switch (artifactType) {
      case 'requirements':
        return artifacts.requirements;
      case 'userStories':
        return artifacts.userStories;
      case 'specs':
        return artifacts.specs;
      case 'evidence':
        return artifacts.evidence;
    }
  };

  const filteredArtifacts = getArtifactList().filter((artifact) => {
    if (repoFilter && artifact.repositoryId !== repoFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const gxpId = 'gxpId' in artifact ? artifact.gxpId : '';
      const title = 'title' in artifact ? artifact.title : '';
      const fileName = 'fileName' in artifact ? artifact.fileName : '';
      return (
        gxpId?.toLowerCase().includes(query) ||
        title?.toLowerCase().includes(query) ||
        fileName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getRepositoryName = (repoId: string) => {
    const repo = repositories.find((r) => r.id === repoId);
    return repo?.name || repoId;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Artifact Type
            </label>
            <select
              value={artifactType}
              onChange={(e) =>
                setArtifactType(
                  e.target.value as
                    | 'requirements'
                    | 'userStories'
                    | 'specs'
                    | 'evidence',
                )
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="requirements">Requirements</option>
              <option value="userStories">User Stories</option>
              <option value="specs">Specs</option>
              <option value="evidence">Evidence</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repository
            </label>
            <select
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Repositories</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by GXP ID, title..."
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Artifacts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {artifactType !== 'evidence' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GXP ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                  </>
                )}
                {artifactType === 'evidence' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GXP ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tier
                    </th>
                  </>
                )}
                {artifactType === 'requirements' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Rating
                  </th>
                )}
                {artifactType === 'specs' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification Tier
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Repository
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredArtifacts.map((artifact) => (
                <tr key={artifact.id} className="hover:bg-gray-50">
                  {artifactType !== 'evidence' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {'gxpId' in artifact ? artifact.gxpId : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {'title' in artifact ? artifact.title : '-'}
                      </td>
                    </>
                  )}
                  {artifactType === 'evidence' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {'fileName' in artifact ? artifact.fileName : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {'gxpId' in artifact ? artifact.gxpId || '-' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {'verificationTier' in artifact ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {artifact.verificationTier || 'N/A'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </>
                  )}
                  {artifactType === 'requirements' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {'gxpRiskRating' in artifact &&
                      artifact.gxpRiskRating ? (
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            artifact.gxpRiskRating === 'HIGH'
                              ? 'bg-red-100 text-red-800'
                              : artifact.gxpRiskRating === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {artifact.gxpRiskRating}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
                  {artifactType === 'specs' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {'verificationTier' in artifact &&
                      artifact.verificationTier ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {artifact.verificationTier}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getRepositoryName(artifact.repositoryId)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredArtifacts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No artifacts found
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Showing {filteredArtifacts.length} of {getArtifactList().length}{' '}
          {artifactType} artifacts
          {repoFilter && ` from ${getRepositoryName(repoFilter)}`}
        </p>
      </div>
    </div>
  );
}
