const express = require('express');
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  let gpus;
  if (status) {
    gpus = db.prepare('SELECT * FROM gpu_resources WHERE status = ? ORDER BY created_at DESC').all(status);
  } else {
    gpus = db.prepare('SELECT * FROM gpu_resources ORDER BY created_at DESC').all();
  }
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
    ).run(name, model, vram, compute_power, price_per_hour, units, units, 'available', description || '');
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
    ).run(name, model, vram, compute_power, price_per_hour, total_units, available_units, status, description, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'GPU not found' });
    res.json({ message: 'GPU updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update GPU' });
  }
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  const info = db.prepare('DELETE FROM gpu_resources WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'GPU not found' });
  res.json({ message: 'GPU deleted successfully' });
});

module.exports = router;
