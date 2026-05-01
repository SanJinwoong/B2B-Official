const prisma = require('../config/prisma');

// ── Público: listar scouters activos (para el registro de clientes) ──────────
const listActive = async () => {
  return prisma.scouter.findMany({
    where: { isActive: true },
    orderBy: { avgRating: 'desc' },
    select: { id: true, name: true, avgRating: true, ratingCount: true },
  });
};

// ── Admin: listar todos con ranking ─────────────────────────────────────────
const listAll = async () => {
  return prisma.scouter.findMany({
    orderBy: [{ avgRating: 'desc' }, { ratingCount: 'desc' }],
    include: { _count: { select: { clients: true } } },
  });
};

// ── Admin: crear scouter ─────────────────────────────────────────────────────
const create = async ({ name, email, phone }) => {
  return prisma.scouter.create({ data: { name, email, phone } });
};

// ── Admin: actualizar scouter ────────────────────────────────────────────────
const update = async (id, data) => {
  return prisma.scouter.update({ where: { id }, data });
};

// ── Admin: eliminar scouter ──────────────────────────────────────────────────
const remove = async (id) => {
  return prisma.scouter.delete({ where: { id } });
};

// ── Público: votar al scouter durante el registro ────────────────────────────
// Se llama DENTRO del flujo de registro, así que recibe prisma tx o usa el global.
const submitRating = async ({ scouterId, stars, comment, clientUserId }) => {
  if (stars < 1 || stars > 5) throw Object.assign(new Error('Calificación inválida (1-5).'), { statusCode: 400 });

  // Upsert del rating (un cliente, un voto)
  await prisma.scouterRating.upsert({
    where: { clientUserId },
    create: { scouterId, stars, comment: comment || null, clientUserId },
    update: { scouterId, stars, comment: comment || null },
  });

  // Recalcular promedio en el scouter
  const agg = await prisma.scouterRating.aggregate({
    where: { scouterId },
    _avg: { stars: true },
    _count: { stars: true },
  });

  await prisma.scouter.update({
    where: { id: scouterId },
    data: {
      avgRating:   Math.round((agg._avg.stars || 0) * 10) / 10,
      ratingCount: agg._count.stars,
    },
  });
};

module.exports = { listActive, listAll, create, update, remove, submitRating };
