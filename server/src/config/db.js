const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/gpu_rental.db');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
console.log('Connected to SQLite database');

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS gpu_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  vram TEXT NOT NULL,
  compute_power TEXT NOT NULL,
  price_per_hour REAL NOT NULL,
  total_units INTEGER DEFAULT 1,
  available_units INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  gpu_id INTEGER NOT NULL,
  hours INTEGER NOT NULL,
  total_price REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (gpu_id) REFERENCES gpu_resources(id)
)`);

// Seed default admin
const adminRow = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminRow) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO users (username, email, password, role) VALUES ('admin', 'admin@gpurental.com', ?, 'admin')").run(hash);
  console.log('Default admin created: admin / admin123');
}

// Seed sample GPU data
const gpuCount = db.prepare("SELECT COUNT(*) as count FROM gpu_resources").get();
if (gpuCount.count === 0) {
  const insert = db.prepare(`INSERT INTO gpu_resources (name, model, vram, compute_power, price_per_hour, total_units, available_units, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const gpus = [
    ['NVIDIA A100', 'A100 80GB', '80GB HBM2e', '312 TFLOPS (FP16)', 15.99, 10, 10, 'available', 'NVIDIA A100 专为AI训练和推理设计，支持多实例GPU(MIG)技术'],
    ['NVIDIA H100', 'H100 80GB', '80GB HBM3', '990 TFLOPS (FP16)', 29.99, 8, 8, 'available', 'NVIDIA H100 基于 Hopper 架构，专为大型语言模型训练优化'],
    ['NVIDIA RTX 4090', 'RTX 4090 24GB', '24GB GDDR6X', '82.6 TFLOPS (FP16)', 4.99, 20, 20, 'available', 'RTX 4090 消费级旗舰，适合推理和小规模训练'],
    ['NVIDIA V100', 'V100 32GB', '32GB HBM2', '125 TFLOPS (FP16)', 8.99, 15, 15, 'available', 'V100 经典数据中心GPU，适合各类深度学习任务'],
    ['NVIDIA A6000', 'A6000 48GB', '48GB GDDR6', '38.7 TFLOPS (FP32)', 6.99, 12, 12, 'available', 'A6000 专业工作站GPU，大显存适合大规模模型推理'],
    ['AMD MI250X', 'MI250X 128GB', '128GB HBM2e', '181 TFLOPS (FP16)', 12.99, 6, 6, 'available', 'AMD Instinct MI250X 高性能计算加速器，双芯片设计'],
  ];
  const insertMany = db.transaction((rows) => {
    for (const g of rows) insert.run(g);
  });
  insertMany(gpus);
  console.log('Sample GPU data seeded');
}

module.exports = db;
