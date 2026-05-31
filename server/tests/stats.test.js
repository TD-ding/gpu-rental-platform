const request = require('supertest');
const { createTestDb, seedTestUser, seedTestGpu, seedTestOrder, authHeader } = require('./setup');

let db, app, user, admin;

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
  app.use('/api/stats', require('../src/routes/stats'));

  user = seedTestUser(db, 'user');
  admin = seedTestUser(db, 'admin');
});

afterEach(() => {
  db.close();
  jest.resetModules();
  delete process.env.JWT_SECRET;
});

describe('Stats Routes', () => {
  it('should return dashboard stats for admin', async () => {
    seedTestGpu(db);
    seedTestGpu(db, { name: 'GPU 2' });
    seedTestOrder(db, { user_id: user.id, gpu_id: 1, total_price: 5000, status: 'paid' });
    seedTestOrder(db, { user_id: user.id, gpu_id: 2, total_price: 3000, status: 'cancelled' });

    const res = await request(app)
      .get('/api/stats')
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.stats.gpus).toBe(2);
    expect(res.body.stats.orders).toBe(2);
    expect(res.body.stats.users).toBeGreaterThanOrEqual(2);
    expect(res.body.stats.revenue).toBe(5000);
  });

  it('should reject non-admin', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set(authHeader(user));
    expect(res.status).toBe(403);
  });

  it('should reject without auth', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(401);
  });
});