const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const TEST_JWT_SECRET = 'test_jwt_secret_for_unit_tests';

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  db.exec(`CREATE TABLE schema_version (version INTEGER PRIMARY KEY)`);
  db.exec(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE gpu_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    vram TEXT NOT NULL,
    compute_power TEXT NOT NULL,
    price_per_hour INTEGER NOT NULL CHECK(price_per_hour > 0),
    total_units INTEGER DEFAULT 1 CHECK(total_units >= 0),
    available_units INTEGER DEFAULT 1 CHECK(available_units >= 0),
    status TEXT DEFAULT 'available',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    gpu_id INTEGER NOT NULL,
    hours INTEGER NOT NULL CHECK(hours > 0),
    total_price INTEGER NOT NULL CHECK(total_price > 0),
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (gpu_id) REFERENCES gpu_resources(id)
  )`);

  return db;
}

function seedTestUser(db, role = 'user') {
  const hash = bcrypt.hashSync('password123', 10);
  const username = role === 'admin' ? 'admin1' : 'user1';
  const info = db.prepare(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(username, `${username}@test.com`, hash, role);
  return { id: info.lastInsertRowid, username, role };
}

function seedTestGpu(db, overrides = {}) {
  const defaults = {
    name: 'Test GPU',
    model: 'TEST-100',
    vram: '24GB',
    compute_power: '100 TFLOPS',
    price_per_hour: 500,
    total_units: 10,
    available_units: 10,
    status: 'available',
    description: 'Test GPU',
  };
  const g = { ...defaults, ...overrides };
  const info = db.prepare(
    'INSERT INTO gpu_resources (name, model, vram, compute_power, price_per_hour, total_units, available_units, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(g.name, g.model, g.vram, g.compute_power, g.price_per_hour, g.total_units, g.available_units, g.status, g.description);
  return { id: info.lastInsertRowid, ...g };
}

function seedTestOrder(db, overrides = {}) {
  const defaults = {
    user_id: 1,
    gpu_id: 1,
    hours: 10,
    total_price: 5000,
    status: 'pending',
  };
  const o = { ...defaults, ...overrides };
  const info = db.prepare(
    'INSERT INTO orders (user_id, gpu_id, hours, total_price, status) VALUES (?, ?, ?, ?, ?)'
  ).run(o.user_id, o.gpu_id, o.hours, o.total_price, o.status);
  return { id: info.lastInsertRowid, ...o };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function authHeader(user) {
  return { Authorization: `Bearer ${generateToken(user)}` };
}

module.exports = {
  createTestDb,
  seedTestUser,
  seedTestGpu,
  seedTestOrder,
  generateToken,
  authHeader,
  TEST_JWT_SECRET,
};
