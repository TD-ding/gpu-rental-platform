import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { formatPrice } from '../utils/format';

export default function Dashboard() {
  const [stats, setStats] = useState({ gpus: 0, orders: 0, users: 0, revenue: 0 });

  useEffect(() => {
    API.get('/stats').then(res => {
      setStats(res.data.stats);
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
          <div className="stat-value">¥{formatPrice(stats.revenue)}</div>
          <div className="stat-label">总收入</div>
        </div>
      </div>
    </div>
  );
}
