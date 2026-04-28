/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  // Carga el .env.test ANTES de que cualquier módulo se importe.
  // Esto garantiza que DATABASE_URL apunte a la DB de prueba
  // cuando PrismaClient se instancia por primera vez.
  setupFiles: ['<rootDir>/tests/setup/loadEnv.js'],

  // Limpieza global después de TODOS los archivos de test
  globalTeardown: '<rootDir>/tests/setup/teardown.js',

  // Patrón de archivos de test
  testMatch: ['<rootDir>/tests/**/*.test.js'],

  // Tiempo máximo por test (útil para operaciones con DB)
  testTimeout: 15000,

  // Mostrar nombre de cada test
  verbose: true,
};
