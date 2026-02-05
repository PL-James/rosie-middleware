import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RepositoryDetail from './pages/RepositoryDetail';
import Evidence from './pages/Evidence';
import ComplianceReport from './pages/ComplianceReport';
import TraceabilityMatrix from './pages/TraceabilityMatrix';
import AuditTrail from './pages/AuditTrail';
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
          <Route path="/repositories/:id/traceability" element={<TraceabilityMatrix />} />
          <Route path="/repositories/:id/audit-trail" element={<AuditTrail />} />

          {/* Phase 4: Products */}
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
