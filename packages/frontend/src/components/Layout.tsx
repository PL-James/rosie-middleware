import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  ROSIE Middleware
                </h1>
                <p className="text-sm text-gray-500">
                  GxP Artifact Management Platform
                </p>
              </div>
            </Link>

            <nav className="flex gap-6">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Repositories
              </Link>
              <Link
                to="/products"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Products
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          ROSIE Middleware v0.1.0 - PharmaLedger Association
        </div>
      </footer>
    </div>
  );
}
