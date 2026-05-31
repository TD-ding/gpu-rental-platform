const express = require('express');
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { status, page, limit: reqLimit } = req.query;

  if (page || reqLimit) {
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(reqLimit) || 20));
    const offset = (p - 1) * limit;

    let countSql = 'SELECT COUNT(*) as count FROM gpu_resources';
    let dataSql = 'SELECT * FROM gpu_resources';
    const params = [];

    if (status) {
      countSql += ' WHERE status = ?';
      dataSql += ' WHERE status = ?';
      params.push(status);
    }

    dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const total = db.prepare(countSql).get(...params).count;
    const gpus = db.prepare(dataSql).all(...params, limit, offset);
    return res.json({ gpus, page: p, limit, total, totalPages: Math.ceil(total / limit) });
  }

  let sql = 'SELECT * FROM gpu_resources';
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const gpus = db.prepare(sql).all(...params);
  res.json({ gpus });
});

router.get('/:id', (req, res) => {
  const gpu = db.prepare('SELECT * FROM gpu_resources WHERE id = ?').get(req.params.id);
  if (!gpu) return res.status(404).json({ error: 'GPU not found' });
  res.json({ gpu });
});

router.post('/', auth, adminOnly, (req, res) => {
  const { name, model, vram, compute_power, price_per_hour, total_units, description } = req.body;
  if (!name || !model || !vram || !compute_power || !price_per_hour) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  const units = total_units || 1;
  try {
    const info = db.prepare(
      'INSERT INTO gpu_resources (name, model, vram, compute_power, price_per_hour, total_units, available_units, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, model, vram, compute_power, Math.round(price_per_hour), units, units, 'available', description || '');
    res.json({ id: info.lastInsertRowid, message: 'GPU added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add GPU' });
  }
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, model, vram, compute_power, price_per_hour, total_units, available_units, status, description } = req.body;
  try {
    const info = db.prepare(
      'UPDATE gpu_resources SET name=?, model=?, vram=?, compute_power=?, price_per_hour=?, total_units=?, available_units=?, status=?, description=? WHERE id=?'
    ).run(name, model, vram, compute_power, Math.round(price_per_hour), total_units, available_units, status, description, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'GPU not found' });
    res.json({ message: 'GPU updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update GPU' });
  }
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  const linkedOrders = db.prepare('SELECT id FROM orders WHERE gpu_id = ? LIMIT 1').get(req.params.id);
  if (linkedOrders) {
    return res.status(400).json({ error: 'Cannot delete GPU with existing orders. Set status to unavailable instead.' });
  }
  const info = db.prepare('DELETE FROM gpu_resources WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'GPU not found' });
  res.json({ message: 'GPU deleted successfully' });
});

module.exports = router;
