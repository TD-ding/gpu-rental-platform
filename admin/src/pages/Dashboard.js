import React, { useState, useEffect } from 'react';
import API from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ gpus: 0, orders: 0, users: 0, revenue: 0 });

  useEffect(() => {
    Promise.all([
      API.get('/gpus'),
      API.get('/orders'),
      API.get('/users'),
    ]).then(([gpus, orders, users]) => {
      setStats({
        gpus: gpus.data.gpus.length,
        orders: orders.data.orders.length,
        users: users.data.users.length,
        revenue: orders.data.orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_price : 0), 0),
      });
    });
  }, []);

  return (
    <div>
      <h1>仪表盘</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.gpus}</div>
          <div className="stat-label">GPU资源</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.orders}</div>
          <div className="stat-label">总订单</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">注册用户</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">¥{stats.revenue.toFixed(2)}</div>
          <div className="stat-label">总收入</div>
        </div>
      </div>
    </div>
  );
}
