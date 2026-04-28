const request = require('supertest');
const app = require('../../src/app');

/**
 * Registra un usuario con el rol dado y retorna su token JWT y datos.
 * Usa los endpoints reales — sin mocks, sin jwt.sign manual.
 *
 * @param {string} role   - 'CLIENT' | 'SUPPLIER' | 'ADMIN'
 * @param {string} email  - Email único para este usuario de test
 * @returns {{ token: string, user: object }}
 */
const registerAndLogin = async (role, email) => {
  const userData = {
    name: `Test ${role}`,
    email,
    password: 'password123',
    role,
  };

  const registerRes = await request(app)
    .post('/api/auth/register')
    .send(userData);

  if (registerRes.status !== 201) {
    throw new Error(
      `registerAndLogin falló para ${email}: ${JSON.stringify(registerRes.body)}`
    );
  }

  return {
    token: registerRes.body.token,
    user: registerRes.body.user,
  };
};

module.exports = { registerAndLogin };
