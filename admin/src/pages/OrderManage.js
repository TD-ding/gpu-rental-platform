import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const STATUS_MAP = { pending: '待支付', paid: '已支付', running: '运行中', completed: '已完成', cancelled: '已取消' };

export default function OrderManage() {
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    API.get('/orders').then(res => setOrders(res.data.orders)).catch(() => setMsg('加载失败'));
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/orders/${id}/status`, { status });
      setMsg('状态已更新');
      const res = await API.get('/orders');
      setOrders(res.data.orders);
    } catch (err) {
      setMsg(err.response?.data?.error || '更新失败');
    }
  };

  return (
    <div>
      <h1>订单管理</h1>
      {msg && <div className="alert">{msg}</div>}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>用户</th><th>GPU</th><th>时长</th><th>费用</th>
              <th>状态</th><th>创建时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>#{o.id}</td><td>{o.username}</td><td>{o.gpu_name}</td>
                <td>{o.hours}h</td><td>¥{o.total_price}</td>
                <td><span className={`status-badge ${o.status}`}>{STATUS_MAP[o.status]}</span></td>
                <td>{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={e => updateStatus(o.id, e.target.value)}
                    style={{padding:'4px 8px',background:'var(--bg-input)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:'4px'}}
                  >
                    {Object.entries(STATUS_MAP).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
