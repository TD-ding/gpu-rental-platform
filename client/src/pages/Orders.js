import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatPrice, STATUS_MAP } from '../utils/format';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [payingId, setPayingId] = useState(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const loadOrders = (p = 1) => {
    API.get('/orders/my', { params: { page: p, limit: 10 } }).then(res => {
      setOrders(res.data.orders);
      setPage(res.data.page);
      setTotalPages(res.data.totalPages);
    }).catch(() => setMsg('加载失败'));
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login'); return; }
    loadOrders();
  }, [user, loading]);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [msg]);

  if (loading) return <div className="page"><p className="empty">加载中...</p></div>;
  if (!user) return null;

  const handlePay = async (id) => {
    setPayingId(id);
    try {
      await API.put(`/orders/${id}/pay`);
      setMsg('支付成功');
      loadOrders(page);
    } catch (err) {
      setMsg(err.response?.data?.error || '支付失败');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="page">
      <h1>我的订单</h1>
      {msg && <div className="alert">{msg}</div>}
      {orders.length === 0 ? (
        <p className="empty">暂无订单</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>订单ID</th>
                  <th>GPU</th>
                  <th>时长</th>
                  <th>费用</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{o.gpu_name}</td>
                    <td>{o.hours}小时</td>
                    <td>¥{formatPrice(o.total_price)}</td>
                    <td><span className={`status-badge ${o.status}`}>{STATUS_MAP[o.status]}</span></td>
                    <td>{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                    <td>{o.updated_at ? new Date(o.updated_at).toLocaleString('zh-CN') : '-'}</td>
                    <td>
                      {o.status === 'pending' && (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={payingId === o.id}
                          onClick={() => handlePay(o.id)}
                        >
                          {payingId === o.id ? '支付中...' : '支付'}
                        </button>
                      )}
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
        </>
      )}
    </div>
  );
}