const express = require('express');
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

const ALLOWED_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['running', 'cancelled'],
  running: ['completed'],
  completed: [],
  cancelled: [],
};

const MAX_HOURS = 720;
const MAX_ACTIVE_ORDERS_PER_GPU_PER_USER = 1;

const DEFAULT_LIMIT = 20;

const router = express.Router();

router.post('/', auth, (req, res) => {
  const { gpu_id, hours } = req.body;
  if (!gpu_id || !hours || hours <= 0) {
    return res.status(400).json({ error: 'Valid gpu_id and hours are required' });
  }
  if (hours > MAX_HOURS) {
    return res.status(400).json({ error: `Max rental duration is ${MAX_HOURS} hours` });
  }

  const gpu = db.prepare('SELECT * FROM gpu_resources WHERE id = ? AND status = ?').get(gpu_id, 'available');
  if (!gpu) return res.status(404).json({ error: 'GPU not available' });
  if (gpu.available_units <= 0) return res.status(400).json({ error: 'No available units' });

  const activeCount = db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND gpu_id = ? AND status IN ('pending', 'paid', 'running')"
  ).get(req.user.id, gpu_id).count;

  if (activeCount >= MAX_ACTIVE_ORDERS_PER_GPU_PER_USER) {
    return res.status(400).json({ error: 'You already have an active order for this GPU' });
  }

  const total_price = Math.round(gpu.price_per_hour * hours);

  const createOrder = db.transaction(() => {
    const info = db.prepare(
      'INSERT INTO orders (user_id, gpu_id, hours, total_price, status) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, gpu_id, hours, total_price, 'pending');

    const updateResult = db.prepare(
      'UPDATE gpu_resources SET available_units = available_units - 1 WHERE id = ? AND available_units > 0'
    ).run(gpu_id);

    if (updateResult.changes === 0) throw new Error('No available units');
    return info.lastInsertRowid;
  });

  try {
    const orderId = createOrder();
    res.json({ order_id: orderId, total_price, message: 'Order created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create order' });
  }
});

router.get('/my', auth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(req.user.id).count;
  const orders = db.prepare(
    `SELECT o.*, g.name as gpu_name, g.model as gpu_model FROM orders o
     JOIN gpu_resources g ON o.gpu_id = g.id
     WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
  ).all(req.user.id, limit, offset);

  res.json({ orders, page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/', auth, adminOnly, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const orders = db.prepare(
    `SELECT o.*, g.name as gpu_name, g.model as gpu_model, u.username FROM orders o
     JOIN gpu_resources g ON o.gpu_id = g.id
     JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);

  res.json({ orders, page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.put('/:id/status', auth, adminOnly, (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_TRANSITIONS[status]) return res.status(400).json({ error: 'Invalid status' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Cannot change status from ${order.status} to ${status}` });
  }

  const updateOrder = db.transaction(() => {
    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    if (status === 'cancelled' || status === 'completed') {
      db.prepare(
        'UPDATE gpu_resources SET available_units = MIN(available_units + 1, total_units) WHERE id = ?'
      ).run(order.gpu_id);
    }
  });

  try {
    updateOrder();
    res.json({ message: 'Order status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.put('/:id/pay', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'pending') return res.status(400).json({ error: 'Order cannot be paid' });

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('paid', req.params.id);
  res.json({ message: 'Payment successful' });
});

module.exports = router;