const express = require('express');
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, adminOnly, (req, res) => {
  const gpus = db.prepare('SELECT COUNT(*) as count FROM gpu_resources').get().count;
  const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const revenue = db.prepare(
    "SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status != 'cancelled'"
  ).get().total;

  res.json({ stats: { gpus, orders, users, revenue } });
});

module.exports = router;
