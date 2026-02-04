import { Link } from 'react-router-dom';
import { GitBranch, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Repository } from '@/lib/api';
import { formatDate, getStatusColor, cn } from '@/lib/utils';

interface RepositoryCardProps {
  repository: Repository;
}

export default function RepositoryCard({ repository }: RepositoryCardProps) {
  const getStatusIcon = () => {
    if (!repository.lastScanStatus) return null;

    switch (repository.lastScanStatus) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <Link
      to={`/repositories/${repository.id}`}
      className="block bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {repository.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <GitBranch className="w-4 h-4" />
            <span>
              {repository.owner}/{repository.repo}
            </span>
          </div>
        </div>
        {getStatusIcon()}
      </div>

      {repository.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {repository.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {repository.isRosieCompliant ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ROSIE Compliant
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Not Compliant
            </span>
          )}

          {repository.lastScanStatus && (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getStatusColor(repository.lastScanStatus),
              )}
            >
              {repository.lastScanStatus.replace('_', ' ')}
            </span>
          )}
        </div>

        {repository.lastScanAt && (
          <span className="text-xs text-gray-500">
            Scanned {formatDate(repository.lastScanAt)}
          </span>
        )}
      </div>
    </Link>
  );
}
