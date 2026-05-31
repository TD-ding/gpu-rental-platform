import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import GpuCard from '../components/GpuCard';
import RentModal from '../components/RentModal';

export default function GpuList() {
  const [gpus, setGpus] = useState([]);
  const [selectedGpu, setSelectedGpu] = useState(null);
  const [msg, setMsg] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/gpus').then(res => setGpus(res.data.gpus)).catch(() => setMsg('加载失败'));
  }, []);

  const handleRent = (gpu) => {
    if (!user) { navigate('/login'); return; }
    setSelectedGpu(gpu);
  };

  const handleSubmit = async (gpuId, hours) => {
    try {
      const res = await API.post('/orders', { gpu_id: gpuId, hours });
      setMsg(`下单成功！订单ID: ${res.data.order_id}，费用: ¥${res.data.total_price}`);
      setSelectedGpu(null);
      const list = await API.get('/gpus');
      setGpus(list.data.gpus);
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
    </div>
  );
}
