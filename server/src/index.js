require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret_change_in_production') {
  console.error('ERROR: JWT_SECRET is not set or uses the default value. Please set a secure JWT_SECRET in your .env file.');
  process.exit(1);
}

require('./config/db');

const authRoutes = require('./routes/auth');
const gpuRoutes = require('./routes/gpus');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const { auth, adminOnly } = require('./middleware/auth');
const db = require('./config/db');

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',');
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/gpus', gpuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Serve static files in production
app.use(express.static(path.join(__dirname, '../../client/build')));

// API 404 handler - must be before the SPA catch-all
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception - exiting:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection - exiting:', reason);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});