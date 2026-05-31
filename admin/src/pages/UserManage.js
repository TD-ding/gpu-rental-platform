import React, { useState, useEffect } from 'react';
import API from '../utils/api';

export default function UserManage() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [msg]);

  const loadUsers = async (p = 1) => {
    try {
      const res = await API.get('/users', { params: { page: p, limit: 10 } });
      setUsers(res.data.users);
      setPage(res.data.page);
      setTotalPages(res.data.totalPages);
    } catch { setMsg('加载失败'); }
  };

  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await API.put(`/users/${id}/role`, { role: newRole });
      setMsg('角色已更新');
      loadUsers(page);
    } catch (err) {
      setMsg(err.response?.data?.error || '更新失败');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('确认删除此用户？')) return;
    try {
      await API.delete(`/users/${id}`);
      setMsg('用户已删除');
      loadUsers(page);
    } catch (err) {
      setMsg(err.response?.data?.error || '删除失败');
    }
  };

  return (
    <div>
      <h1>用户管理</h1>
      {msg && <div className="alert">{msg}</div>}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>用户名</th><th>邮箱</th><th>角色</th><th>注册时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td><td>{u.username}</td><td>{u.email}</td>
                <td><span className={`status-badge ${u.role}`}>{u.role === 'admin' ? '管理员' : '用户'}</span></td>
                <td>{new Date(u.created_at).toLocaleString('zh-CN')}</td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => toggleRole(u.id, u.role)} style={{marginRight:8}}>
                    {u.role === 'admin' ? '降为用户' : '升为管理员'}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => loadUsers(page - 1)}>上一页</button>
          <span className="page-info">{page} / {totalPages}</span>
          <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => loadUsers(page + 1)}>下一页</button>
        </div>
      )}
    </div>
  );
}
