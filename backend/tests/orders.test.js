const request = require('supertest');
const app = require('../src/app');
const { cleanDatabase, prisma } = require('./helpers/cleanup');
const { registerAndLogin } = require('./helpers/auth');

let clientToken;
let clientId;
let adminToken;
let supplierToken;
let productId;
let orderId;

const INITIAL_STOCK = 10;

beforeEach(async () => {
  await cleanDatabase();

  // Crear usuarios reales con sus roles
  const supplier = await registerAndLogin('SUPPLIER', 'supplier@test.com');
  supplierToken = supplier.token;

  const client = await registerAndLogin('CLIENT', 'client@test.com');
  clientToken = client.token;
  clientId = client.user.id;

  const admin = await registerAndLogin('ADMIN', 'admin@test.com');
  adminToken = admin.token;

  // Crear un producto con stock conocido
  const productRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${supplierToken}`)
    .send({ name: 'Widget Pro', price: 25.0, stock: INITIAL_STOCK });

  productId = productRes.body.data.id;

  // Crear una orden base para los tests de GET y PATCH
  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ items: [{ productId, quantity: 1 }] });

  orderId = orderRes.body.data.id;
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders  —  Solo CLIENT
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/orders', () => {
  it('201 → CLIENT crea una orden con stock suficiente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ items: [{ productId, quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.totalAmount).toBe(50.0); // 2 × 25.0
    expect(res.body.data.orderItems).toHaveLength(1);
  });

  it('201 → la orden reduce el stock del producto en la DB', async () => {
    const quantityOrdered = 3;

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ items: [{ productId, quantity: quantityOrdered }] });

    // Verificar stock directamente en la DB (descontando la orden del beforeEach)
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product.stock).toBe(INITIAL_STOCK - 1 - quantityOrdered);
  });

  it('409 → falla si el stock es insuficiente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ items: [{ productId, quantity: INITIAL_STOCK + 100 }] });

    expect(res.status).toBe(409);
  });

  it('401 → rechaza petición sin token', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(401);
  });

  it('403 → SUPPLIER no puede crear órdenes', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(403);
  });

  it('403 → ADMIN no puede crear órdenes', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(403);
  });

  it('400 → rechaza quantity igual a 0', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ items: [{ productId, quantity: 0 }] });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toMatch(/quantity/);
  });

  it('400 → rechaza quantity negativa', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ items: [{ productId, quantity: -3 }] });

    expect(res.status).toBe(400);
  });

  it('400 → rechaza array de items vacío', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ items: [] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('404 → falla si algún productId no existe', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ items: [{ productId: 99999, quantity: 1 }] });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/my  —  Solo el CLIENT autenticado
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/orders/my', () => {
  it('200 → CLIENT ve solo sus propias órdenes', async () => {
    // Crear otro cliente con otra orden
    const other = await registerAndLogin('CLIENT', 'other_client@test.com');
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${other.token}`)
      .send({ items: [{ productId, quantity: 1 }] });

    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    // Solo ve la suya, no la del otro cliente
    expect(res.body.data.every((o) => o.clientId === clientId)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('401 → rechaza sin token', async () => {
    const res = await request(app).get('/api/orders/my');
    expect(res.status).toBe(401);
  });

  it('403 → SUPPLIER no puede ver órdenes de cliente', async () => {
    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders  —  Solo ADMIN
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/orders', () => {
  it('200 → ADMIN ve todas las órdenes del sistema', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('403 → CLIENT no puede ver todas las órdenes', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(403);
  });

  it('403 → SUPPLIER no puede ver todas las órdenes', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id  —  Ownership por CLIENT
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/orders/:id', () => {
  it('200 → CLIENT puede ver su propia orden por ID', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(orderId);
  });

  it('200 → ADMIN puede ver cualquier orden por ID', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('403 → CLIENT NO puede ver la orden de otro cliente', async () => {
    const other = await registerAndLogin('CLIENT', 'other2@test.com');
    const otherOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${other.token}`)
      .send({ items: [{ productId, quantity: 1 }] });

    const otherOrderId = otherOrderRes.body.data.id;

    const res = await request(app)
      .get(`/api/orders/${otherOrderId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status  —  Solo ADMIN y SUPPLIER
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/orders/:id/status', () => {
  it('200 → ADMIN puede cambiar el estado de una orden', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('200 → SUPPLIER puede cambiar el estado de una orden', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ status: 'SHIPPED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SHIPPED');
  });

  it('403 → CLIENT NO puede cambiar el estado de una orden', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(403);
  });

  it('400 → rechaza un estado que no existe en el enum', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('status');
  });

  it('400 → rechaza body sin campo status', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('401 → rechaza sin token', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(401);
  });
});
