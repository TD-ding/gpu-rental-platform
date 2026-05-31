const express = require('express');
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

router.put('/:id/role', auth, adminOnly, (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const info = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User role updated' });
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

  const activeOrders = db.prepare(
    "SELECT id FROM orders WHERE user_id = ? AND status IN ('pending', 'paid', 'running')"
  ).all(req.params.id);

  if (activeOrders.length > 0) {
    return res.status(400).json({
      error: `User has ${activeOrders.length} active order(s). Please cancel or complete them before deleting.`,
    });
  }

  const deleteUser = db.transaction(() => {
    db.prepare('DELETE FROM orders WHERE user_id = ?').run(req.params.id);
    const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    return info;
  });

  try {
    const result = deleteUser();
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
