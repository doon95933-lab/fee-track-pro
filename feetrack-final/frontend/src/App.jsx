import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotifProvider } from './context/NotifContext';
import Sidebar from './components/Sidebar';
import { Spinner } from './components/UI';

import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Upload     from './pages/Upload';
import Ledger     from './pages/Ledger';
import Approvals  from './pages/Approvals';
import Requests   from './pages/Requests';
import Plans      from './pages/Plans';
import Defaulters from './pages/Defaulters';
import Receipts   from './pages/Receipts';
import Audit      from './pages/Audit';
import Analytics  from './pages/Analytics';
import Users      from './pages/Users';

function AppShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <Routes>
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/upload"      element={<Upload />} />
          <Route path="/ledger"      element={<Ledger />} />
          <Route path="/payments"    element={<Ledger />} />
          <Route path="/receipts"    element={<Receipts />} />
          <Route path="/approvals"   element={<Approvals />} />
          <Route path="/requests"    element={<Requests />} />
          <Route path="/concessions" element={<Requests />} />
          <Route path="/plans"       element={<Plans />} />
          <Route path="/defaulters"  element={<Defaulters />} />
          <Route path="/audit"       element={<Audit />} />
          <Route path="/analytics"   element={<Analytics />} />
          <Route path="/users"       element={<Users />} />
          <Route path="*"            element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotifProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*"    element={<AppShell />} />
          </Routes>
        </NotifProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
