import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  productsApi,
  Product,
  ProductRepository,
  AggregatedArtifacts,
  ProductCompliance,
  RiskAssessment,
  repositoriesApi,
  Repository,
} from '../lib/api';
import AggregatedArtifactsBrowser from '../components/AggregatedArtifactsBrowser';
import RiskDashboard from '../components/RiskDashboard';

export default function ProductDetail() {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [linkedRepos, setLinkedRepos] = useState<ProductRepository[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [artifacts, setArtifacts] = useState<AggregatedArtifacts | null>(null);
  const [compliance, setCompliance] = useState<ProductCompliance | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'artifacts' | 'compliance' | 'risk'
  >('overview');

  useEffect(() => {
    if (!productId) return;
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    if (!productId) return;

    try {
      setLoading(true);

      const [productRes, linkedRes, reposRes] = await Promise.all([
        productsApi.getOne(productId),
        productsApi.getLinkedRepositories(productId),
        repositoriesApi.getAll(),
      ]);

      setProduct(productRes.data);
      setLinkedRepos(linkedRes.data);
      setRepositories(reposRes.data);

      // Fetch optional data
      const [artifactsRes, complianceRes, riskRes] = await Promise.allSettled([
        productsApi.getAggregatedArtifacts(productId),
        productsApi.getCompliance(productId),
        productsApi.getRisk(productId),
      ]);

      if (artifactsRes.status === 'fulfilled') {
        setArtifacts(artifactsRes.value.data);
      }
      if (complianceRes.status === 'fulfilled') {
        setCompliance(complianceRes.value.data);
      }
      if (riskRes.status === 'fulfilled') {
        setRisk(riskRes.value.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkRepository = async () => {
    if (!productId) return;

    const repoId = prompt('Enter Repository ID to link:');
    if (!repoId) return;

    const version = prompt('Enter version (optional):');

    try {
      await productsApi.linkRepository(productId, repoId, version || undefined);
      fetchData();
    } catch (err: any) {
      alert(`Failed to link repository: ${err.message}`);
    }
  };

  const handleUnlinkRepository = async (repositoryId: string) => {
    if (!productId) return;

    if (!confirm('Are you sure you want to unlink this repository?')) return;

    try {
      await productsApi.unlinkRepository(productId, repositoryId);
      fetchData();
    } catch (err: any) {
      alert(`Failed to unlink repository: ${err.message}`);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productId || !product) return;

    if (
      !confirm(
        `Are you sure you want to delete product "${product.name}"? This cannot be undone.`,
      )
    )
      return;

    try {
      await productsApi.delete(productId);
      navigate('/products');
    } catch (err: any) {
      alert(`Failed to delete product: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Product not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.manufacturer && (
            <p className="text-gray-600 mt-1">{product.manufacturer.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/products')}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Back to Products
          </button>
          <button
            onClick={handleDeleteProduct}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete Product
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('artifacts')}
            className={`${
              activeTab === 'artifacts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Artifacts
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`${
              activeTab === 'compliance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Compliance
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
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Product Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              {product.gtin && (
                <>
                  <dt className="text-sm font-medium text-gray-500">GTIN</dt>
                  <dd className="text-sm text-gray-900 font-mono">
                    {product.gtin}
                  </dd>
                </>
              )}
              {product.productType && (
                <>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="text-sm text-gray-900">{product.productType}</dd>
                </>
              )}
              {product.riskLevel && (
                <>
                  <dt className="text-sm font-medium text-gray-500">
                    Risk Level
                  </dt>
                  <dd className="text-sm text-gray-900">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        product.riskLevel === 'HIGH'
                          ? 'bg-red-100 text-red-800'
                          : product.riskLevel === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {product.riskLevel}
                    </span>
                  </dd>
                </>
              )}
              {product.regulatoryStatus && (
                <>
                  <dt className="text-sm font-medium text-gray-500">
                    Regulatory Status
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {product.regulatoryStatus}
                  </dd>
                </>
              )}
            </dl>
            {product.description && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* Linked Repositories */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Linked Repositories</h2>
              <button
                onClick={handleLinkRepository}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Link Repository
              </button>
            </div>

            {linkedRepos.length > 0 ? (
              <div className="space-y-3">
                {linkedRepos.map((link) => {
                  const repo = repositories.find((r) => r.id === link.repositoryId);
                  return (
                    <div
                      key={link.id}
                      className="flex justify-between items-center border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {repo?.name || link.repositoryId}
                        </h3>
                        {link.version && (
                          <p className="text-sm text-gray-500">
                            Version: {link.version}
                          </p>
                        )}
                        {link.isPrimary && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            navigate(`/repositories/${link.repositoryId}`)
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleUnlinkRepository(link.repositoryId)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No repositories linked yet
              </p>
            )}
          </div>

          {/* Aggregated Stats */}
          {artifacts && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Aggregated Artifact Counts
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {artifacts.requirements.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Requirements</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {artifacts.userStories.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">User Stories</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {artifacts.specs.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Specs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {artifacts.evidence.length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Evidence</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'artifacts' && artifacts && (
        <AggregatedArtifactsBrowser
          artifacts={artifacts}
          repositories={repositories}
        />
      )}

      {activeTab === 'compliance' && compliance && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Consolidated Compliance Dashboard
            </h2>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600">
                {compliance.overallScore}%
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Overall Compliance Score
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Per-Repository Compliance
            </h2>
            <div className="space-y-3">
              {compliance.repositoryScores.map((repoScore) => (
                <div
                  key={repoScore.repositoryId}
                  className="flex items-center gap-4"
                >
                  <span className="flex-1 text-sm font-medium text-gray-900">
                    {repoScore.repositoryName}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${repoScore.score}%` }}
                    >
                      <span className="text-white text-xs font-semibold">
                        {repoScore.score}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {compliance.crossRepoTraceability && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Cross-Repo Traceability
              </h2>
              <div
                className={`px-4 py-3 rounded ${
                  compliance.crossRepoTraceability.status === 'valid'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-yellow-50 text-yellow-800'
                }`}
              >
                <p className="font-medium">
                  Status: {compliance.crossRepoTraceability.status}
                </p>
                {compliance.crossRepoTraceability.issues.length > 0 && (
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {compliance.crossRepoTraceability.issues.map(
                      (issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ),
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'risk' && risk && <RiskDashboard riskAssessment={risk} />}

      {activeTab === 'risk' && !risk && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Risk assessment not available</p>
        </div>
      )}
    </div>
  );
}
