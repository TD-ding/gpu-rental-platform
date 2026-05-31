import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './utils/AuthContext';
import Sidebar from './components/Sidebar';
import AdminLogin from './pages/Login';
import Dashboard from './pages/Dashboard';
import GpuManage from './pages/GpuManage';
import OrderManage from './pages/OrderManage';
import UserManage from './pages/UserManage';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAdminAuth();
  if (loading) return <div className="loading">验证中...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/dashboard" element={<ProtectedRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
          <Route path="/gpus" element={<ProtectedRoute><AdminLayout><GpuManage /></AdminLayout></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><AdminLayout><OrderManage /></AdminLayout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><AdminLayout><UserManage /></AdminLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
