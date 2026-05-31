const request = require('supertest');
const { createTestDb, seedTestUser, seedTestGpu, seedTestOrder, authHeader } = require('./setup');

let db, app, user, admin, gpu;

beforeEach(() => {
  db = createTestDb();
  jest.resetModules();
  process.env.JWT_SECRET = require('./setup').TEST_JWT_SECRET;
  jest.doMock('../src/config/db', () => db);
  jest.doMock('../src/middleware/rateLimit', () => ({
    loginLimiter: (req, res, next) => next(),
  }));

  const express = require('express');
  app = express();
  app.use(express.json());
  app.use('/api/users', require('../src/routes/users'));

  user = seedTestUser(db, 'user');
  admin = seedTestUser(db, 'admin');
});

afterEach(() => {
  db.close();
  jest.resetModules();
  delete process.env.JWT_SECRET;
});

describe('User Routes', () => {
  describe('GET /api/users', () => {
    it('should return users for admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should reject non-admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set(authHeader(user));
      expect(res.status).toBe(403);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/users/:id/role', () => {
    it('should update user role', async () => {
      const res = await request(app)
        .put(`/api/users/${user.id}/role`)
        .set(authHeader(admin))
        .send({ role: 'admin' });
      expect(res.status).toBe(200);

      const updated = db.prepare('SELECT role FROM users WHERE id = ?').get(user.id);
      expect(updated.role).toBe('admin');
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .put(`/api/users/${user.id}/role`)
        .set(authHeader(admin))
        .send({ role: 'superadmin' });
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/users/999/role')
        .set(authHeader(admin))
        .send({ role: 'admin' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user without active orders', async () => {
      const res = await request(app)
        .delete(`/api/users/${user.id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });

    it('should reject deleting self', async () => {
      const res = await request(app)
        .delete(`/api/users/${admin.id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/yourself/i);
    });

    it('should reject deleting user with active orders', async () => {
      gpu = seedTestGpu(db);
      seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'pending' });
      const res = await request(app)
        .delete(`/api/users/${user.id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/active/i);
    });

    it('should allow deleting user with completed orders', async () => {
      gpu = seedTestGpu(db);
      seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'completed' });
      const res = await request(app)
        .delete(`/api/users/${user.id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });
  });
});