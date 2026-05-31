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
  app.use('/api/orders', require('../src/routes/orders'));

  user = seedTestUser(db, 'user');
  admin = seedTestUser(db, 'admin');
  gpu = seedTestGpu(db);
});

afterEach(() => {
  db.close();
  jest.resetModules();
  delete process.env.JWT_SECRET;
});

describe('Order Routes', () => {
  describe('POST /api/orders', () => {
    it('should create an order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set(authHeader(user))
        .send({ gpu_id: gpu.id, hours: 10 });
      expect(res.status).toBe(200);
      expect(res.body.order_id).toBeDefined();
      expect(res.body.total_price).toBe(500 * 10);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ gpu_id: gpu.id, hours: 10 });
      expect(res.status).toBe(401);
    });

    it('should reject invalid hours', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set(authHeader(user))
        .send({ gpu_id: gpu.id, hours: -1 });
      expect(res.status).toBe(400);
    });

    it('should reject hours exceeding max', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set(authHeader(user))
        .send({ gpu_id: gpu.id, hours: 721 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/720/);
    });

    it('should reject non-existent GPU', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set(authHeader(user))
        .send({ gpu_id: 999, hours: 10 });
      expect(res.status).toBe(404);
    });

    it('should enforce per-user per-GPU order limit', async () => {
      seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'pending' });
      const res = await request(app)
        .post('/api/orders')
        .set(authHeader(user))
        .send({ gpu_id: gpu.id, hours: 10 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/active order/i);
    });

    it('should allow second order if first is completed', async () => {
      seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'completed' });
      const res = await request(app)
        .post('/api/orders')
        .set(authHeader(user))
        .send({ gpu_id: gpu.id, hours: 10 });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/orders/my', () => {
    it('should return user orders with pagination', async () => {
      seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id });
      const res = await request(app)
        .get('/api/orders/my')
        .set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/api/orders/my');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/orders', () => {
    it('should return all orders for admin', async () => {
      seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id });
      const res = await request(app)
        .get('/api/orders')
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(1);
    });

    it('should reject non-admin', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set(authHeader(user));
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should allow valid status transition', async () => {
      const order = seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'pending' });
      const res = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set(authHeader(admin))
        .send({ status: 'paid' });
      expect(res.status).toBe(200);
    });

    it('should reject invalid status transition', async () => {
      const order = seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'pending' });
      const res = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set(authHeader(admin))
        .send({ status: 'completed' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid status value', async () => {
      const order = seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'pending' });
      const res = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set(authHeader(admin))
        .send({ status: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should restore GPU units on cancel', async () => {
      const order = seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'paid' });
      // Seed inserts directly, so available_units wasn't decremented. Decrement manually.
      db.prepare('UPDATE gpu_resources SET available_units = available_units - 1 WHERE id = ?').run(gpu.id);
      await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set(authHeader(admin))
        .send({ status: 'cancelled' });

      const updatedGpu = db.prepare('SELECT available_units FROM gpu_resources WHERE id = ?').get(gpu.id);
      expect(updatedGpu.available_units).toBe(gpu.available_units);
    });

    it('should cap restored units at total_units', async () => {
      db.prepare('UPDATE gpu_resources SET total_units = 5, available_units = 5 WHERE id = ?').run(gpu.id);
      const order = seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'paid' });
      await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set(authHeader(admin))
        .send({ status: 'cancelled' });

      const updatedGpu = db.prepare('SELECT available_units, total_units FROM gpu_resources WHERE id = ?').get(gpu.id);
      expect(updatedGpu.available_units).toBeLessThanOrEqual(updatedGpu.total_units);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .put('/api/orders/999/status')
        .set(authHeader(admin))
        .send({ status: 'paid' });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/orders/:id/pay', () => {
    it('should pay a pending order', async () => {
      const order = seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'pending' });
      const res = await request(app)
        .put(`/api/orders/${order.id}/pay`)
        .set(authHeader(user));
      expect(res.status).toBe(200);
    });

    it('should reject paying non-pending order', async () => {
      const order = seedTestOrder(db, { user_id: user.id, gpu_id: gpu.id, status: 'paid' });
      const res = await request(app)
        .put(`/api/orders/${order.id}/pay`)
        .set(authHeader(user));
      expect(res.status).toBe(400);
    });

    it('should reject paying another users order', async () => {
      const order = seedTestOrder(db, { user_id: admin.id, gpu_id: gpu.id, status: 'pending' });
      const res = await request(app)
        .put(`/api/orders/${order.id}/pay`)
        .set(authHeader(user));
      expect(res.status).toBe(404);
    });
  });
});