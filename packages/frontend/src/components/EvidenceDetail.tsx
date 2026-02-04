import { Evidence } from '../lib/api';

interface EvidenceDetailProps {
  evidence: Evidence;
  onClose: () => void;
  onVerify: (evidenceId: string) => void;
}

export default function EvidenceDetail({
  evidence,
  onClose,
  onVerify,
}: EvidenceDetailProps) {
  const handleDownload = () => {
    // Create a blob from the JWS content
    const jwsContent = `${JSON.stringify(evidence.jwsHeader)}.${JSON.stringify(evidence.jwsPayload)}.${evidence.signature}`;
    const blob = new Blob([jwsContent], { type: 'application/jose' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = evidence.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Evidence Detail</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">File Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{evidence.fileName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">GXP ID</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {evidence.gxpId || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Verification Tier
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {evidence.verificationTier || 'N/A'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {evidence.timestamp
                    ? new Date(evidence.timestamp).toLocaleString()
                    : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Signature Status */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Signature Status</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {evidence.isSignatureValid === true && (
                  <>
                    <svg
                      className="h-8 w-8 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-800">
                        Signature Valid
                      </p>
                      <p className="text-sm text-gray-600">
                        Verified at:{' '}
                        {evidence.signatureVerifiedAt
                          ? new Date(evidence.signatureVerifiedAt).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
                {evidence.isSignatureValid === false && (
                  <>
                    <svg
                      className="h-8 w-8 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-red-800">
                        Signature Invalid
                      </p>
                      <p className="text-sm text-gray-600">
                        Verification failed
                      </p>
                    </div>
                  </>
                )}
                {(evidence.isSignatureValid === undefined ||
                  evidence.isSignatureValid === null) && (
                  <>
                    <svg
                      className="h-8 w-8 text-yellow-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-yellow-800">
                        Not Yet Verified
                      </p>
                      <p className="text-sm text-gray-600">
                        Click verify to check signature
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* JWS Header */}
          {evidence.jwsHeader && (
            <div>
              <h3 className="text-lg font-semibold mb-3">JWS Header</h3>
              <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-xs">
                {JSON.stringify(evidence.jwsHeader, null, 2)}
              </pre>
            </div>
          )}

          {/* JWS Payload */}
          {evidence.jwsPayload && (
            <div>
              <h3 className="text-lg font-semibold mb-3">JWS Payload</h3>
              <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-xs">
                {JSON.stringify(evidence.jwsPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Test Results */}
          {evidence.testResults && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Test Results</h3>
              <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-xs">
                {JSON.stringify(evidence.testResults, null, 2)}
              </pre>
            </div>
          )}

          {/* Signature */}
          {evidence.signature && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Signature</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <code className="text-xs break-all">{evidence.signature}</code>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {(evidence.isSignatureValid === undefined ||
              evidence.isSignatureValid === null ||
              evidence.isSignatureValid === false) && (
              <button
                onClick={() => onVerify(evidence.id)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Re-verify Signature
              </button>
            )}
            <button
              onClick={handleDownload}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Download JWS
            </button>
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
