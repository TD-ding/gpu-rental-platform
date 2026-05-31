import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AdminLogin from './pages/Login';
import Dashboard from './pages/Dashboard';
import GpuManage from './pages/GpuManage';
import OrderManage from './pages/OrderManage';
import UserManage from './pages/UserManage';
import API from './utils/api';
import './App.css';

function ProtectedRoute({ children }) {
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setAuthed(false); return; }
    API.get('/auth/me').then(res => {
      if (res.data.user.role === 'admin') {
        setAuthed(true);
      } else {
        localStorage.removeItem('admin_token');
        setAuthed(false);
      }
    }).catch(() => {
      localStorage.removeItem('admin_token');
      setAuthed(false);
    });
  }, []);

  if (authed === null) return <div className="loading">验证中...</div>;
  if (!authed) return <Navigate to="/login" />;
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
  );
}
