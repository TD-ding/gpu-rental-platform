const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createTestDb, seedTestUser, TEST_JWT_SECRET } = require('./setup');

let db, app;

beforeEach(() => {
  db = createTestDb();
  jest.resetModules();
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  jest.doMock('../src/config/db', () => db);
  jest.doMock('../src/middleware/rateLimit', () => ({
    loginLimiter: (req, res, next) => next(),
  }));

  const express = require('express');
  app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/auth'));
});

afterEach(() => {
  db.close();
  jest.resetModules();
  delete process.env.JWT_SECRET;
});

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'new@test.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.user.role).toBe('user');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'invalid', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'new@test.com', password: '12345' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/6/i);
    });

    it('should reject invalid username format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'a!b', email: 'new@test.com', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/username/i);
    });

    it('should reject duplicate username', async () => {
      seedTestUser(db);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'user1', email: 'another@test.com', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should reject duplicate email', async () => {
      seedTestUser(db);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'different', email: 'user1@test.com', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      seedTestUser(db);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user1', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('user1');
    });

    it('should reject wrong password', async () => {
      seedTestUser(db);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user1', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password123' });
      expect(res.status).toBe(401);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info', async () => {
      const user = seedTestUser(db);
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('user1');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });
  });
});