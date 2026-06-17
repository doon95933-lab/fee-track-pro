import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotifProvider } from './context/NotifContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Ledger from './pages/Ledger';
import Upload from './pages/Upload';
import Approvals from './pages/Approvals';

// Lazy placeholders for pages (add full pages as you build them)
import { Spinner } from './components/UI';
import Topbar from './components/Topbar';

function Placeholder({ title }) {
  return (
    <div className="flex-1 flex flex-col">
      <Topbar title={title} />
      <div className="p-6 text-gray-400 text-sm">This page is under construction.</div>
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <Routes>
          <Route path="/dashboard"   element={<Placeholder title="Dashboard" />} />
          <Route path="/upload"      element={<Upload />} />
          <Route path="/ledger"      element={<Ledger />} />
          <Route path="/payments"    element={<Placeholder title="Mark Payment" />} />
          <Route path="/receipts"    element={<Placeholder title="Receipts" />} />
          <Route path="/approvals"   element={<Approvals />} />
          <Route path="/requests"    element={<Placeholder title="My Requests" />} />
          <Route path="/concessions" element={<Placeholder title="Concessions" />} />
          <Route path="/plans"       element={<Placeholder title="Payment Plans" />} />
          <Route path="/defaulters"  element={<Placeholder title="Defaulters" />} />
          <Route path="/audit"       element={<Placeholder title="Audit Trail" />} />
          <Route path="/analytics"   element={<Placeholder title="Analytics" />} />
          <Route path="/users"       element={<Placeholder title="User Management" />} />
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
