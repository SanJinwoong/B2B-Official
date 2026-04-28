/**
 * Se ejecuta UNA sola vez después de que TODOS los tests terminan.
 * Cierra la conexión de Prisma para que el proceso de Node no quede colgado.
 *
 * Nota: globalTeardown corre en un proceso separado de Jest,
 * por eso necesita su propio PrismaClient.
 */
module.exports = async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.$disconnect();
};
