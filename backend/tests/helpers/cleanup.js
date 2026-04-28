const prisma = require('../../src/config/prisma');

/**
 * Limpia todas las tablas en el orden correcto (respetando FK).
 * Se llama en beforeEach para que cada test empiece con una DB vacía.
 *
 * Orden obligatorio por las foreign keys:
 *   orderItem → order → product → user
 */
const cleanDatabase = async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
};

module.exports = { cleanDatabase, prisma };
