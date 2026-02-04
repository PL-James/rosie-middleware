import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  GitBranch,
  PlayCircle,
  Loader2,
  FileText,
  Users,
  FileCode,
  Shield,
  Clock,
} from 'lucide-react';
import {
  repositoriesApi,
  scansApi,
  artifactsApi,
} from '@/lib/api';
import { formatDate, getStatusColor, getRiskColor, cn, formatDuration } from '@/lib/utils';

export default function RepositoryDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'requirements' | 'user-stories' | 'specs' | 'evidence'
  >('overview');

  const queryClient = useQueryClient();

  const { data: repository, isLoading: repoLoading } = useQuery({
    queryKey: ['repository', id],
    queryFn: async () => {
      const response = await repositoriesApi.getOne(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: systemContext } = useQuery({
    queryKey: ['systemContext', id],
    queryFn: async () => {
      const response = await artifactsApi.getSystemContext(id!);
      return response.data;
    },
    enabled: !!id && repository?.isRosieCompliant,
  });

  const { data: requirements } = useQuery({
    queryKey: ['requirements', id],
    queryFn: async () => {
      const response = await artifactsApi.getRequirements(id!);
      return response.data;
    },
    enabled: !!id && repository?.isRosieCompliant,
  });

  const { data: userStories } = useQuery({
    queryKey: ['userStories', id],
    queryFn: async () => {
      const response = await artifactsApi.getUserStories(id!);
      return response.data;
    },
    enabled: !!id && repository?.isRosieCompliant,
  });

  const { data: specs } = useQuery({
    queryKey: ['specs', id],
    queryFn: async () => {
      const response = await artifactsApi.getSpecs(id!);
      return response.data;
    },
    enabled: !!id && repository?.isRosieCompliant,
  });

  const { data: evidence } = useQuery({
    queryKey: ['evidence', id],
    queryFn: async () => {
      const response = await artifactsApi.getEvidence(id!);
      return response.data;
    },
    enabled: !!id && repository?.isRosieCompliant,
  });

  const { data: scans } = useQuery({
    queryKey: ['scans', id],
    queryFn: async () => {
      const response = await scansApi.getRepositoryScans(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const scanMutation = useMutation({
    mutationFn: () => repositoriesApi.triggerScan(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repository', id] });
      queryClient.invalidateQueries({ queryKey: ['scans', id] });
    },
  });

  if (repoLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Repository not found</p>
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Repositories
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {repository.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <GitBranch className="w-4 h-4" />
              <span>
                {repository.owner}/{repository.repo}
              </span>
            </div>
          </div>
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {scanMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            Scan Now
          </button>
        </div>

        {repository.description && (
          <p className="text-gray-600 mb-4">{repository.description}</p>
        )}

        <div className="flex items-center gap-4">
          {repository.isRosieCompliant ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ROSIE Compliant
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Not Compliant
            </span>
          )}

          {repository.lastScanStatus && (
            <span
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                getStatusColor(repository.lastScanStatus),
              )}
            >
              {repository.lastScanStatus.replace('_', ' ')}
            </span>
          )}

          {repository.lastScanAt && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Last scanned {formatDate(repository.lastScanAt)}
            </span>
          )}
        </div>
      </div>

      {repository.isRosieCompliant && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Phase 3 & 4 Features
              </h3>
              <p className="text-xs text-blue-700">
                Access evidence verification and compliance reports
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/repositories/${id}/evidence`}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                View Evidence
              </Link>
              <Link
                to={`/repositories/${id}/compliance`}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Compliance Report
              </Link>
            </div>
          </div>
        </div>
      )}

      {systemContext && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Context
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Project Name</p>
              <p className="font-medium text-gray-900">
                {systemContext.projectName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Version</p>
              <p className="font-medium text-gray-900">{systemContext.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Risk Rating</p>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                  getRiskColor(systemContext.gxpRiskRating),
                )}
              >
                {systemContext.gxpRiskRating}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Validation Status</p>
              <p className="font-medium text-gray-900">
                {systemContext.validationStatus}
              </p>
            </div>
          </div>
        </div>
      )}

      {repository.isRosieCompliant && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-500">Requirements</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {requirements?.length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-500">User Stories</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {userStories?.length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileCode className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-500">Specs</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {specs?.length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-gray-500">Evidence</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {evidence?.length || 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex gap-4 px-6">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'requirements', label: 'Requirements' },
                  { key: 'user-stories', label: 'User Stories' },
                  { key: 'specs', label: 'Specs' },
                  { key: 'evidence', label: 'Evidence' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={cn(
                      'py-4 px-2 border-b-2 text-sm font-medium transition-colors',
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && scans && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Scan History
                  </h3>
                  <div className="space-y-3">
                    {scans.slice(0, 10).map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                                getStatusColor(scan.status),
                              )}
                            >
                              {scan.status}
                            </span>
                            {scan.commitSha && (
                              <code className="text-xs text-gray-600">
                                {scan.commitSha.substring(0, 7)}
                              </code>
                            )}
                          </div>
                          {scan.commitMessage && (
                            <p className="text-sm text-gray-700">
                              {scan.commitMessage}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>{formatDate(scan.createdAt)}</p>
                          {scan.durationMs && (
                            <p>{formatDuration(scan.durationMs)}</p>
                          )}
                          {scan.artifactsCreated > 0 && (
                            <p>{scan.artifactsCreated} artifacts</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'requirements' && requirements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Requirements ({requirements.length})
                  </h3>
                  <div className="space-y-3">
                    {requirements.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-medium text-blue-600">
                            {req.gxpId}
                          </code>
                          {req.gxpRiskRating && (
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                                getRiskColor(req.gxpRiskRating),
                              )}
                            >
                              {req.gxpRiskRating}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {req.title}
                        </h4>
                        {req.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {req.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'user-stories' && userStories && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    User Stories ({userStories.length})
                  </h3>
                  <div className="space-y-3">
                    {userStories.map((us) => (
                      <div key={us.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-medium text-green-600">
                            {us.gxpId}
                          </code>
                          {us.parentId && (
                            <code className="text-xs text-gray-500">
                              → {us.parentId}
                            </code>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {us.title}
                        </h4>
                        {us.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {us.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'specs' && specs && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Specs ({specs.length})
                  </h3>
                  <div className="space-y-3">
                    {specs.map((spec) => (
                      <div key={spec.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-medium text-purple-600">
                            {spec.gxpId}
                          </code>
                          <div className="flex items-center gap-2">
                            {spec.parentId && (
                              <code className="text-xs text-gray-500">
                                → {spec.parentId}
                              </code>
                            )}
                            {spec.verificationTier && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {spec.verificationTier}
                              </span>
                            )}
                          </div>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {spec.title}
                        </h4>
                        {spec.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {spec.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'evidence' && evidence && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Evidence ({evidence.length})
                  </h3>
                  <div className="space-y-3">
                    {evidence.map((ev) => (
                      <div key={ev.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-medium text-orange-600">
                            {ev.fileName}
                          </code>
                          {ev.verificationTier && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {ev.verificationTier}
                            </span>
                          )}
                        </div>
                        {ev.gxpId && (
                          <p className="text-sm text-gray-600 mb-1">
                            Linked to: <code>{ev.gxpId}</code>
                          </p>
                        )}
                        {ev.timestamp && (
                          <p className="text-xs text-gray-500">
                            Created {formatDate(ev.timestamp)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
