import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ServicerView from './pages/ServicerView';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/servicer" element={<ServicerView />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:customerId" element={<CustomerDetail />} />
          <Route path="/updates" element={<div>Updates page coming soon...</div>} />
          <Route path="/reports" element={<div>Reports page coming soon...</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;