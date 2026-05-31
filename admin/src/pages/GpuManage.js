import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { formatPrice, GPU_STATUS_MAP } from '../utils/format';

const emptyGpu = { name: '', model: '', vram: '', compute_power: '', price_per_hour: '', total_units: 1, status: 'available', description: '' };

export default function GpuManage() {
  const [gpus, setGpus] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyGpu);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadGpus(); }, []);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [msg]);

  const loadGpus = async (p = 1) => {
    const res = await API.get('/gpus', { params: { page: p, limit: 10 } });
    setGpus(res.data.gpus);
    setPage(res.data.page);
    setTotalPages(res.data.totalPages);
  };

  const handleEdit = (gpu) => {
    setEditing(gpu.id);
    setForm({ ...gpu, price_per_hour: formatPrice(gpu.price_per_hour) });
  };

  const handleNew = () => {
    setEditing('new');
    setForm(emptyGpu);
  };

  const handlePriceChange = (e) => {
    let v = e.target.value;
    // Allow at most 2 decimal places
    if (v.includes('.') && v.split('.')[1].length > 2) return;
    setForm({...form, price_per_hour: v});
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price_per_hour: Math.round(parseFloat(form.price_per_hour) * 100), total_units: +form.total_units };
      if (editing === 'new') {
        payload.available_units = payload.total_units;
        await API.post('/gpus', payload);
      } else {
        payload.available_units = +form.available_units;
        await API.put(`/gpus/${editing}`, payload);
      }
      setMsg('保存成功');
      setEditing(null);
      loadGpus(page);
    } catch (err) {
      setMsg(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确认删除此GPU？')) return;
    try {
      await API.delete(`/gpus/${id}`);
      setMsg('删除成功');
      loadGpus(page);
    } catch (err) {
      setMsg(err.response?.data?.error || '删除失败');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>GPU资源管理</h1>
        <button className="btn btn-primary" onClick={handleNew}>添加GPU</button>
      </div>
      {msg && <div className="alert">{msg}</div>}

      {editing && (
        <div className="card">
          <h2>{editing === 'new' ? '添加GPU' : '编辑GPU'}</h2>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group">
                <label>名称</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>型号</label>
                <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>显存</label>
                <input value={form.vram} onChange={e => setForm({...form, vram: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>算力</label>
                <input value={form.compute_power} onChange={e => setForm({...form, compute_power: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>单价(元/小时，最多2位小数)</label>
                <input type="number" step="0.01" value={form.price_per_hour} onChange={handlePriceChange} required />
              </div>
              <div className="form-group">
                <label>总数量</label>
                <input type="number" value={form.total_units} onChange={e => setForm({...form, total_units: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>状态</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="available">可用</option>
                  <option value="unavailable">不可用</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{marginTop:12}}>
              <label>描述</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div style={{marginTop:16, display:'flex', gap:12}}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>取消</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>名称</th><th>型号</th><th>显存</th><th>算力</th>
              <th>单价</th><th>可用/总数</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {gpus.map(g => (
              <tr key={g.id}>
                <td>{g.id}</td><td>{g.name}</td><td>{g.model}</td><td>{g.vram}</td><td>{g.compute_power}</td>
                <td>¥{formatPrice(g.price_per_hour)}/h</td><td>{g.available_units}/{g.total_units}</td>
                <td><span className={`status-badge ${g.status}`}>{GPU_STATUS_MAP[g.status] || g.status}</span></td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => handleEdit(g)} style={{marginRight:8}}>编辑</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(g.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
