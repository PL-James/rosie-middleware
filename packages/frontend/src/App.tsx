import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RepositoryDetail from './pages/RepositoryDetail';
import Evidence from './pages/Evidence';
import ComplianceReport from './pages/ComplianceReport';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/repositories/:id" element={<RepositoryDetail />} />

          {/* Phase 3: Evidence & Compliance */}
          <Route path="/repositories/:id/evidence" element={<Evidence />} />
          <Route path="/repositories/:id/compliance" element={<ComplianceReport />} />

          {/* Phase 4: Products */}
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
