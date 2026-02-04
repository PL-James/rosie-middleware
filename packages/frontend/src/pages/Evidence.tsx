import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { artifactsApi, evidenceApi, Evidence as EvidenceType } from '../lib/api';
import EvidenceDetail from '../components/EvidenceDetail';

export default function Evidence() {
  const { id: repositoryId } = useParams<{ id: string }>();
  const [evidence, setEvidence] = useState<EvidenceType[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (!repositoryId) return;

    const fetchEvidence = async () => {
      try {
        setLoading(true);
        const response = await artifactsApi.getEvidence(repositoryId, tierFilter || undefined);
        setEvidence(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load evidence');
      } finally {
        setLoading(false);
      }
    };

    fetchEvidence();
  }, [repositoryId, tierFilter]);

  const filteredEvidence = evidence.filter((e) => {
    if (statusFilter === 'verified') return e.isSignatureValid === true;
    if (statusFilter === 'unverified') return e.isSignatureValid === false;
    if (statusFilter === 'pending') return e.isSignatureValid === undefined || e.isSignatureValid === null;
    return true;
  });

  const handleVerify = async (evidenceId: string) => {
    if (!repositoryId) return;
    try {
      await evidenceApi.verifyEvidence(repositoryId, evidenceId);
      // Refresh evidence list
      const response = await artifactsApi.getEvidence(repositoryId);
      setEvidence(response.data);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  const handleBatchVerify = async () => {
    if (!repositoryId) return;
    const pendingIds = evidence
      .filter((e) => e.isSignatureValid === undefined || e.isSignatureValid === null)
      .map((e) => e.id);

    if (pendingIds.length === 0) {
      alert('No pending evidence to verify');
      return;
    }

    try {
      await evidenceApi.batchVerifyEvidence(repositoryId, pendingIds);
      // Refresh evidence list
      const response = await artifactsApi.getEvidence(repositoryId);
      setEvidence(response.data);
      alert(`Verified ${pendingIds.length} evidence artifacts`);
    } catch (err: any) {
      alert(`Batch verification failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading evidence...</div>
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
        <h1 className="text-2xl font-bold">Evidence Artifacts</h1>
        <button
          onClick={handleBatchVerify}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Batch Verify All
        </button>
      </div>

      <div className="flex gap-4">
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">All Tiers</option>
          <option value="IQ">IQ - Installation Qualification</option>
          <option value="OQ">OQ - Operational Qualification</option>
          <option value="PQ">PQ - Performance Qualification</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="verified">Verified</option>
          <option value="unverified">Failed Verification</option>
          <option value="pending">Pending Verification</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GXP ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEvidence.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {e.fileName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {e.gxpId || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {e.verificationTier || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {e.isSignatureValid === true && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Verified
                    </span>
                  )}
                  {e.isSignatureValid === false && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Failed
                    </span>
                  )}
                  {(e.isSignatureValid === undefined || e.isSignatureValid === null) && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {e.timestamp ? new Date(e.timestamp).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setSelectedEvidence(e)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Details
                  </button>
                  {(e.isSignatureValid === undefined || e.isSignatureValid === null || e.isSignatureValid === false) && (
                    <button
                      onClick={() => handleVerify(e.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEvidence.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No evidence artifacts found
          </div>
        )}
      </div>

      {selectedEvidence && (
        <EvidenceDetail
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
          onVerify={handleVerify}
        />
      )}
    </div>
  );
}
