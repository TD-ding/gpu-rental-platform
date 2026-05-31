import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { formatPrice, STATUS_MAP, NEXT_STATUS } from '../utils/format';

export default function OrderManage() {
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadOrders(); }, []);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [msg]);

  const loadOrders = async (p = 1) => {
    try {
      const res = await API.get('/orders', { params: { page: p, limit: 10 } });
      setOrders(res.data.orders);
      setPage(res.data.page);
      setTotalPages(res.data.totalPages);
    } catch { setMsg('加载失败'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/orders/${id}/status`, { status });
      setMsg('状态已更新');
      loadOrders(page);
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
              <th>状态</th><th>创建时间</th><th>更新时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>#{o.id}</td><td>{o.username}</td><td>{o.gpu_name}</td>
                <td>{o.hours}h</td><td>¥{formatPrice(o.total_price)}</td>
                <td><span className={`status-badge ${o.status}`}>{STATUS_MAP[o.status]}</span></td>
                <td>{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                <td>{o.updated_at ? new Date(o.updated_at).toLocaleString('zh-CN') : '-'}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={e => updateStatus(o.id, e.target.value)}
                    style={{padding:'4px 8px',background:'var(--bg-input)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:'4px'}}
                  >
                    <option value={o.status}>{STATUS_MAP[o.status]}</option>
                    {NEXT_STATUS[o.status]?.map(s => (
                      <option key={s} value={s}>{STATUS_MAP[s]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => loadOrders(page - 1)}>上一页</button>
          <span className="page-info">{page} / {totalPages}</span>
          <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => loadOrders(page + 1)}>下一页</button>
        </div>
      )}
    </div>
  );
}
