import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { repositoriesApi } from '@/lib/api';

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddRepositoryModal({
  isOpen,
  onClose,
}: AddRepositoryModalProps) {
  const [name, setName] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [description, setDescription] = useState('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { name: string; gitUrl: string; description?: string }) =>
      repositoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      onClose();
      setName('');
      setGitUrl('');
      setDescription('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, gitUrl, description });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Repository
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Repository Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="my-rosie-repo"
            />
          </div>

          <div>
            <label
              htmlFor="gitUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              GitHub URL
            </label>
            <input
              type="url"
              id="gitUrl"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://github.com/owner/repo"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="A brief description of this repository"
            />
          </div>

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'Failed to add repository'}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Adding...' : 'Add Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
