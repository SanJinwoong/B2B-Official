const prisma = require('../config/prisma');

/**
 * Retorna todos los pagos de los pedidos del cliente autenticado.
 */
const getMyPayments = async (clientId) => {
  return prisma.payment.findMany({
    where: { order: { clientId } },
    include: {
      order: { select: { id: true, orderNumber: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Resumen financiero del cliente (totales por estado).
 */
const getPaymentSummary = async (clientId) => {
  const payments = await prisma.payment.findMany({
    where: { order: { clientId } },
  });

  const totalPaid    = payments.filter(p => p.status === 'PAID')   .reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'PENDING') .reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'OVERDUE') .reduce((s, p) => s + p.amount, 0);

  const paidCount    = payments.filter(p => p.status === 'PAID').length;
  const pendingCount = payments.filter(p => p.status === 'PENDING').length;

  return { totalPaid, totalPending, totalOverdue, paidCount, pendingCount };
};

/**
 * Marca un pago como pagado (simulado — en producción sería una pasarela).
 */
const markAsPaid = async (paymentId, clientId) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { select: { clientId: true } } },
  });
  if (!payment) {
    const e = new Error('Pago no encontrado.'); e.statusCode = 404; throw e;
  }
  if (payment.order.clientId !== clientId) {
    const e = new Error('No tienes acceso a este pago.'); e.statusCode = 403; throw e;
  }
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'PAID', paidAt: new Date() },
  });
};

module.exports = { getMyPayments, getPaymentSummary, markAsPaid };
