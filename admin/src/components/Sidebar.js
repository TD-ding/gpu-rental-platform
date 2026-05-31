import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../utils/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">GPU管理面板</div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className="sidebar-link">仪表盘</NavLink>
        <NavLink to="/gpus" className="sidebar-link">GPU资源</NavLink>
        <NavLink to="/orders" className="sidebar-link">订单管理</NavLink>
        <NavLink to="/users" className="sidebar-link">用户管理</NavLink>
      </nav>
      <button className="sidebar-logout" onClick={handleLogout}>退出登录</button>
    </aside>
  );
}
