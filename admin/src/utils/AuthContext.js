import React, { createContext, useContext, useState, useEffect } from 'react';
import API from './api';

const AuthContext = createContext();

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setLoading(false); return; }
    API.get('/auth/me').then(res => {
      if (res.data.user.role === 'admin') {
        setUser(res.data.user);
      } else {
        localStorage.removeItem('admin_token');
      }
    }).catch(() => {
      localStorage.removeItem('admin_token');
    }).finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await API.post('/auth/login', { username, password });
    if (res.data.user.role !== 'admin') throw new Error('Admin access required');
    localStorage.setItem('admin_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AuthContext);
