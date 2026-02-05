import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { complianceApi, type AuditLogEntry } from '../lib/api';

export default function AuditTrail() {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    action: '',
    resourceType: '',
  });

  useEffect(() => {
    if (!id) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await complianceApi.getAuditTrail(id);
        setLogs(response.data);
      } catch (err: any) {
        console.error('Failed to load audit trail', err);
        setError(err.response?.data?.message || 'Failed to load audit trail');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [id]);

  const filteredLogs = logs.filter((log) => {
    if (filter.action && log.action !== filter.action) return false;
    if (filter.resourceType && log.resourceType !== filter.resourceType)
      return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'SCAN':
        return 'bg-purple-100 text-purple-800';
      case 'READ':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));
  const uniqueResourceTypes = Array.from(
    new Set(logs.map((log) => log.resourceType).filter(Boolean)),
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/repositories/${id}`}
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← Back to Repository
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">
            Complete audit log of all repository actions
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="action-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Action
              </label>
              <select
                id="action-filter"
                value={filter.action}
                onChange={(e) =>
                  setFilter({ ...filter, action: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="resource-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Resource Type
              </label>
              <select
                id="resource-filter"
                value={filter.resourceType}
                onChange={(e) =>
                  setFilter({ ...filter, resourceType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Resources</option>
                {uniqueResourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {(filter.action || filter.resourceType) && (
              <div className="flex items-end">
                <button
                  onClick={() => setFilter({ action: '', resourceType: '' })}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading audit trail...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Audit Log Table */}
        {!loading && !error && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        {logs.length === 0
                          ? 'No audit logs found'
                          : 'No logs match the selected filters'}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getActionBadgeColor(log.action)}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {log.resourceType || 'N/A'}
                            </div>
                            {log.resourceId && (
                              <div className="text-gray-500 text-xs font-mono">
                                {log.resourceId.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.userId || 'System'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.metadata?.ipAddress && (
                            <div className="text-xs">
                              IP: {log.metadata.ipAddress}
                            </div>
                          )}
                          {log.metadata?.userAgent && (
                            <div className="text-xs truncate max-w-xs">
                              {log.metadata.userAgent}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!loading && !error && filteredLogs.length > 0 && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Showing {filteredLogs.length} of {logs.length} audit log entries
              </div>
              {(filter.action || filter.resourceType) && (
                <div className="text-blue-600">Filters active</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
