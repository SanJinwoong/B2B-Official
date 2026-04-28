/**
 * Se ejecuta en el proceso de Jest ANTES de que cualquier módulo se importe.
 * Carga las variables de .env.test, sobreescribiendo cualquier valor previo.
 * Esto asegura que DATABASE_URL apunte a la DB de prueba cuando
 * PrismaClient se instancia.
 */
require('dotenv').config({ path: '.env.test', override: true });
