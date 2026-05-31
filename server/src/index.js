require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./config/db');

const authRoutes = require('./routes/auth');
const gpuRoutes = require('./routes/gpus');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/gpus', gpuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

app.use(express.static(path.join(__dirname, '../../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
