import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';

const STATUS_MAP = {
  pending: '待支付',
  paid: '已支付',
  running: '运行中',
  completed: '已完成',
  cancelled: '已取消',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login'); return; }
    API.get('/orders/my').then(res => setOrders(res.data.orders)).catch(() => setMsg('加载失败'));
  }, [user, loading]);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [msg]);

  if (loading) return <div className="page"><p className="empty">加载中...</p></div>;
  if (!user) return null;

  const handlePay = async (id) => {
    try {
      await API.put(`/orders/${id}/pay`);
      setMsg('支付成功');
      const res = await API.get('/orders/my');
      setOrders(res.data.orders);
    } catch (err) {
      setMsg(err.response?.data?.error || '支付失败');
    }
  };

  return (
    <div className="page">
      <h1>我的订单</h1>
      {msg && <div className="alert">{msg}</div>}
      {orders.length === 0 ? (
        <p className="empty">暂无订单</p>
      ) : (
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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.gpu_name}</td>
                  <td>{o.hours}小时</td>
                  <td>¥{o.total_price}</td>
                  <td><span className={`status-badge ${o.status}`}>{STATUS_MAP[o.status]}</span></td>
                  <td>{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                  <td>
                    {o.status === 'pending' && (
                      <button className="btn btn-sm btn-primary" onClick={() => handlePay(o.id)}>支付</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}