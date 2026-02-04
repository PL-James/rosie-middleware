import { Product } from '../lib/api';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6 space-y-4"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {product.name}
          </h3>
          {product.manufacturer && (
            <p className="text-sm text-gray-500 mt-1">
              {product.manufacturer.name}
            </p>
          )}
        </div>
        {product.riskLevel && (
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
        )}
      </div>

      {product.description && (
        <p className="text-sm text-gray-600 line-clamp-2">
          {product.description}
        </p>
      )}

      <div className="space-y-2">
        {product.gtin && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">GTIN:</span>
            <span className="font-mono text-gray-900">{product.gtin}</span>
          </div>
        )}
        {product.productType && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Type:</span>
            <span className="text-gray-900">{product.productType}</span>
          </div>
        )}
        {product.regulatoryStatus && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Status:</span>
            <span className="text-gray-900">{product.regulatoryStatus}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="w-full bg-blue-50 text-blue-700 px-4 py-2 rounded hover:bg-blue-100 text-sm font-medium"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
