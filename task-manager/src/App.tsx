import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ServicerView from './pages/ServicerView';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Updates from './pages/Updates';
import Reports from './pages/Reports';
import UpNext from './pages/UpNext';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/servicer" element={<ServicerView />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:customerId" element={<CustomerDetail />} />
          <Route path="/up-next" element={<UpNext />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;