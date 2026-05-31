const request = require('supertest');
const { createTestDb, seedTestUser, seedTestGpu, authHeader } = require('./setup');

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
  app.use('/api/gpus', require('../src/routes/gpus'));

  user = seedTestUser(db, 'user');
  admin = seedTestUser(db, 'admin');
});

afterEach(() => {
  db.close();
  jest.resetModules();
  delete process.env.JWT_SECRET;
});

describe('GPU Routes', () => {
  describe('GET /api/gpus', () => {
    it('should return empty list when no GPUs', async () => {
      const res = await request(app).get('/api/gpus');
      expect(res.status).toBe(200);
      expect(res.body.gpus).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.page).toBe(1);
    });

    it('should return GPUs with pagination', async () => {
      seedTestGpu(db);
      seedTestGpu(db, { name: 'GPU 2' });
      const res = await request(app).get('/api/gpus?page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body.gpus).toHaveLength(1);
      expect(res.body.total).toBe(2);
      expect(res.body.totalPages).toBe(2);
    });

    it('should filter by status', async () => {
      seedTestGpu(db, { status: 'available' });
      seedTestGpu(db, { name: 'Unavailable', status: 'unavailable' });
      const res = await request(app).get('/api/gpus?status=available');
      expect(res.status).toBe(200);
      expect(res.body.gpus).toHaveLength(1);
    });
  });

  describe('GET /api/gpus/:id', () => {
    it('should return a single GPU', async () => {
      const gpu = seedTestGpu(db);
      const res = await request(app).get(`/api/gpus/${gpu.id}`);
      expect(res.status).toBe(200);
      expect(res.body.gpu.name).toBe('Test GPU');
    });

    it('should return 404 for non-existent GPU', async () => {
      const res = await request(app).get('/api/gpus/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/gpus', () => {
    it('should create a GPU as admin', async () => {
      const res = await request(app)
        .post('/api/gpus')
        .set(authHeader(admin))
        .send({ name: 'New GPU', model: 'NG-1', vram: '16GB', compute_power: '50 TF', price_per_hour: 300, total_units: 5 });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/gpus')
        .send({ name: 'New GPU', model: 'NG-1', vram: '16GB', compute_power: '50 TF', price_per_hour: 300 });
      expect(res.status).toBe(401);
    });

    it('should reject non-admin', async () => {
      const res = await request(app)
        .post('/api/gpus')
        .set(authHeader(user))
        .send({ name: 'New GPU', model: 'NG-1', vram: '16GB', compute_power: '50 TF', price_per_hour: 300 });
      expect(res.status).toBe(403);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/gpus')
        .set(authHeader(admin))
        .send({ name: 'New GPU' });
      expect(res.status).toBe(400);
    });

    it('should reject zero or negative price', async () => {
      const res = await request(app)
        .post('/api/gpus')
        .set(authHeader(admin))
        .send({ name: 'New GPU', model: 'NG-1', vram: '16GB', compute_power: '50 TF', price_per_hour: 0 });
      expect(res.status).toBe(400);
    });

    it('should reject negative price', async () => {
      const res = await request(app)
        .post('/api/gpus')
        .set(authHeader(admin))
        .send({ name: 'New GPU', model: 'NG-1', vram: '16GB', compute_power: '50 TF', price_per_hour: -100 });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/gpus/:id', () => {
    it('should update a GPU as admin', async () => {
      const gpu = seedTestGpu(db);
      const res = await request(app)
        .put(`/api/gpus/${gpu.id}`)
        .set(authHeader(admin))
        .send({ name: 'Updated GPU' });
      expect(res.status).toBe(200);

      const updated = await request(app).get(`/api/gpus/${gpu.id}`);
      expect(updated.body.gpu.name).toBe('Updated GPU');
      expect(updated.body.gpu.model).toBe('TEST-100');
    });

    it('should reject zero price on update', async () => {
      const gpu = seedTestGpu(db);
      const res = await request(app)
        .put(`/api/gpus/${gpu.id}`)
        .set(authHeader(admin))
        .send({ price_per_hour: 0 });
      expect(res.status).toBe(400);
    });

    it('should cap available_units at total_units', async () => {
      const gpu = seedTestGpu(db, { total_units: 5, available_units: 3 });
      const res = await request(app)
        .put(`/api/gpus/${gpu.id}`)
        .set(authHeader(admin))
        .send({ available_units: 100 });
      expect(res.status).toBe(200);

      const updated = await request(app).get(`/api/gpus/${gpu.id}`);
      expect(updated.body.gpu.available_units).toBe(5);
    });

    it('should return 404 for non-existent GPU', async () => {
      const res = await request(app)
        .put('/api/gpus/999')
        .set(authHeader(admin))
        .send({ name: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/gpus/:id', () => {
    it('should delete a GPU without orders', async () => {
      const gpu = seedTestGpu(db);
      const res = await request(app)
        .delete(`/api/gpus/${gpu.id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);

      const check = await request(app).get(`/api/gpus/${gpu.id}`);
      expect(check.status).toBe(404);
    });

    it('should reject delete with linked orders', async () => {
      const gpu = seedTestGpu(db);
      db.prepare('INSERT INTO orders (user_id, gpu_id, hours, total_price, status) VALUES (?, ?, ?, ?, ?)')
        .run(user.id, gpu.id, 10, 5000, 'pending');
      const res = await request(app)
        .delete(`/api/gpus/${gpu.id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/order/i);
    });

    it('should return 404 for non-existent GPU', async () => {
      const res = await request(app)
        .delete('/api/gpus/999')
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });
  });
});