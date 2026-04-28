const request = require('supertest');
const app = require('../src/app');
const { cleanDatabase } = require('./helpers/cleanup');
const { registerAndLogin } = require('./helpers/auth');

let supplierToken;
let supplierId;
let anotherSupplierToken;
let clientToken;
let productId;

const validProduct = {
  name: 'Laptop Pro',
  description: 'Laptop de alto rendimiento',
  price: 1500.0,
  stock: 50,
};

beforeEach(async () => {
  await cleanDatabase();

  // Crear usuarios reales con tokens reales
  const supplier = await registerAndLogin('SUPPLIER', 'supplier@test.com');
  supplierToken = supplier.token;
  supplierId = supplier.user.id;

  const another = await registerAndLogin('SUPPLIER', 'other_supplier@test.com');
  anotherSupplierToken = another.token;

  const client = await registerAndLogin('CLIENT', 'client@test.com');
  clientToken = client.token;

  // Crear un producto base para los tests de edición/eliminación
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${supplierToken}`)
    .send(validProduct);

  productId = res.body.data.id;
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products  —  Público
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/products', () => {
  it('200 → cualquier usuario puede ver la lista de productos', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('200 → puede verse sin token (endpoint público)', async () => {
    const res = await request(app).get('/api/products');
    // No enviamos Authorization header
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products  —  Solo SUPPLIER
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/products', () => {
  it('201 → SUPPLIER crea un producto con datos válidos', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ name: 'Mouse Gamer', price: 45.99, stock: 100 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Mouse Gamer', price: 45.99 });
    expect(res.body.data.supplierId).toBe(supplierId);
  });

  it('401 → rechaza petición sin token', async () => {
    const res = await request(app).post('/api/products').send(validProduct);

    expect(res.status).toBe(401);
  });

  it('403 → CLIENT no puede crear productos', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(validProduct);

    expect(res.status).toBe(403);
  });

  it('400 → rechaza price negativo o cero', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ ...validProduct, price: -100 });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('price');
  });

  it('400 → rechaza stock negativo', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ ...validProduct, stock: -5 });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('stock');
  });

  it('400 → rechaza body vacío', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/products/:id  —  Solo el SUPPLIER dueño
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/products/:id', () => {
  it('200 → el SUPPLIER dueño puede editar su producto', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ price: 2000.0 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(2000.0);
  });

  it('403 → un SUPPLIER diferente NO puede editar el producto de otro', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${anotherSupplierToken}`)
      .send({ price: 1.0 });

    expect(res.status).toBe(403);
  });

  it('401 → rechaza petición sin token', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .send({ price: 999 });

    expect(res.status).toBe(401);
  });

  it('403 → CLIENT no puede editar productos', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ price: 999 });

    expect(res.status).toBe(403);
  });

  it('400 → rechaza price negativo en actualización', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ price: -1 });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('price');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/:id  —  Solo el SUPPLIER dueño
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/products/:id', () => {
  it('200 → el SUPPLIER dueño puede eliminar su producto', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(res.status).toBe(200);
  });

  it('403 → un SUPPLIER diferente NO puede eliminar el producto de otro', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${anotherSupplierToken}`);

    expect(res.status).toBe(403);
  });

  it('401 → rechaza petición sin token', async () => {
    const res = await request(app).delete(`/api/products/${productId}`);

    expect(res.status).toBe(401);
  });

  it('403 → CLIENT no puede eliminar productos', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(403);
  });
});
