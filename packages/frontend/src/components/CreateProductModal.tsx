import { useState } from 'react';
import { Product, Manufacturer } from '../lib/api';

interface CreateProductModalProps {
  manufacturers: Manufacturer[];
  onClose: () => void;
  onCreate: (product: Partial<Product>) => void;
}

export default function CreateProductModal({
  manufacturers,
  onClose,
  onCreate,
}: CreateProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    gtin: '',
    manufacturerId: manufacturers.length > 0 ? manufacturers[0].id : '',
    productType: '',
    riskLevel: 'MEDIUM',
    regulatoryStatus: 'DRAFT',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create New Product</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g., Aspirin 500mg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Product description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GTIN
              </label>
              <input
                type="text"
                value={formData.gtin}
                onChange={(e) =>
                  setFormData({ ...formData, gtin: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="14-digit GTIN"
                maxLength={14}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer *
              </label>
              <select
                required
                value={formData.manufacturerId}
                onChange={(e) =>
                  setFormData({ ...formData, manufacturerId: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Type
              </label>
              <input
                type="text"
                value={formData.productType}
                onChange={(e) =>
                  setFormData({ ...formData, productType: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="e.g., Pharmaceutical"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risk Level
              </label>
              <select
                value={formData.riskLevel}
                onChange={(e) =>
                  setFormData({ ...formData, riskLevel: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Regulatory Status
            </label>
            <select
              value={formData.regulatoryStatus}
              onChange={(e) =>
                setFormData({ ...formData, regulatoryStatus: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create Product
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
