import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import { formatPrice } from '../utils/format';
import GpuCard from '../components/GpuCard';
import RentModal from '../components/RentModal';

export default function GpuList() {
  const [gpus, setGpus] = useState([]);
  const [selectedGpu, setSelectedGpu] = useState(null);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const loadGpus = (p = 1) => {
    API.get('/gpus', { params: { page: p, limit: 12 } }).then(res => {
      setGpus(res.data.gpus);
      setPage(res.data.page || 1);
      setTotalPages(res.data.totalPages || 1);
    }).catch(() => setMsg('加载失败'));
  };

  useEffect(() => { loadGpus(); }, []);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [msg]);

  const handleRent = (gpu) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setSelectedGpu(gpu);
  };

  const handleSubmit = async (gpuId, hours) => {
    try {
      const res = await API.post('/orders', { gpu_id: gpuId, hours });
      setMsg(`下单成功！订单ID: ${res.data.order_id}，费用: ¥${formatPrice(res.data.total_price)}`);
      setSelectedGpu(null);
      loadGpus(page);
    } catch (err) {
      setMsg(err.response?.data?.error || '下单失败');
    }
  };

  return (
    <div className="page">
      <h1>GPU算力资源</h1>
      {msg && <div className="alert">{msg}</div>}
      <div className="gpu-grid">
        {gpus.map(gpu => (
          <GpuCard key={gpu.id} gpu={gpu} onRent={handleRent} />
        ))}
      </div>
      {selectedGpu && (
        <RentModal gpu={selectedGpu} onClose={() => setSelectedGpu(null)} onSubmit={handleSubmit} />
      )}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => loadGpus(page - 1)}>上一页</button>
          <span className="page-info">{page} / {totalPages}</span>
          <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => loadGpus(page + 1)}>下一页</button>
        </div>
      )}
    </div>
  );
}