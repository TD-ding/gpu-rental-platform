import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">GPU算力租赁平台</Link>
      </div>
      <div className="nav-links">
        <Link to="/">首页</Link>
        <Link to="/gpus">GPU列表</Link>
        {user ? (
          <>
            <Link to="/orders">我的订单</Link>
            <span className="nav-user">欢迎, {user.username}</span>
            <button onClick={handleLogout} className="btn btn-outline">退出</button>
          </>
        ) : (
          <>
            <Link to="/login">登录</Link>
            <Link to="/register">注册</Link>
          </>
        )}
      </div>
    </nav>
  );
}
