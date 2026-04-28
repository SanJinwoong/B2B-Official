const request = require('supertest');
const app = require('../src/app');
const { cleanDatabase } = require('./helpers/cleanup');

beforeEach(async () => {
  await cleanDatabase();
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const validPayload = {
    name: 'Juan Pérez',
    email: 'juan@test.com',
    password: 'password123',
    role: 'CLIENT',
  };

  it('201 → registra un usuario con datos válidos y retorna token', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      email: validPayload.email,
      name: validPayload.name,
      role: 'CLIENT',
    });
    // La contraseña jamás debe aparecer en la respuesta
    expect(res.body.user.password).toBeUndefined();
  });

  it('201 → rol por defecto es CLIENT si no se envía role', async () => {
    const { role, ...withoutRole } = validPayload;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...withoutRole, email: 'noRole@test.com' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('CLIENT');
  });

  it('409 → falla si el email ya está registrado', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(409);
  });

  it('400 → falla si el email no tiene formato válido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'no-es-un-email' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors[0].field).toBe('email');
  });

  it('400 → falla si la contraseña tiene menos de 6 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('password');
  });

  it('400 → falla si el nombre está ausente', async () => {
    const { name, ...withoutName } = validPayload;
    const res = await request(app).post('/api/auth/register').send(withoutName);

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('name');
  });

  it('400 → falla si el rol no es un valor permitido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, role: 'SUPERADMIN', email: 'role@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('role');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  const user = {
    name: 'Ana García',
    email: 'ana@test.com',
    password: 'password123',
    role: 'CLIENT',
  };

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(user);
  });

  it('200 → login exitoso retorna token válido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.password).toBeUndefined();
  });

  it('401 → falla con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'contraseña-incorrecta' });

    expect(res.status).toBe(401);
  });

  it('401 → falla con email no registrado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('400 → falla si el email no tiene formato válido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notAnEmail', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('email');
  });
});
