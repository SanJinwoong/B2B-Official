const prisma = require('../config/prisma');

/**
 * Agrega todos los datos del dashboard de un cliente en una sola query.
 * Devuelve: stats (activos, cotizaciones, pagos vencidos, muestras),
 *           pedidos recientes con fases, y RFQs listos para aprobar.
 */
const getClientDashboard = async (clientId) => {
  const [orders, rfqs, overduePayments] = await Promise.all([
    // Todos los pedidos del cliente con fases y primer ítem
    prisma.order.findMany({
      where: { clientId },
      include: {
        orderItems: {
          take: 1,
          include: { product: { select: { name: true } } },
        },
        phases:   { orderBy: { phaseNumber: 'asc' } },
        payments: { select: { status: true, amount: true, dueDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // RFQs con cotizaciones listas
    prisma.rFQ.findMany({
      where: { clientId, status: 'QUOTED' },
      include: { quotes: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Pagos vencidos
    prisma.payment.findMany({
      where: { order: { clientId }, status: 'OVERDUE' },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  /* ── Stats ─────────────────────────────────────────────────── */
  const activeOrders  = orders.filter(o => o.status !== 'DELIVERED');
  const samplesCount  = orders.filter(o => o.sampleStatus === 'PENDING').length;
  const pendingRFQs   = rfqs.length;
  const overdueAmount = overduePayments.reduce((s, p) => s + p.amount, 0);
  const earliestOverdue = overduePayments[0];

  /* ── Recent orders (up to 4) ────────────────────────────────── */
  const recentOrders = orders.slice(0, 4).map(o => ({
    id:           o.id,
    orderNumber:  o.orderNumber,
    productName:  o.orderItems?.[0]?.product?.name || 'Producto',
    status:       o.status,
    sampleStatus: o.sampleStatus,
    deliveryDate: o.deliveryDate,
    clientAmount: o.clientAmount || 0,
    phases:       o.phases || [],
  }));

  /* ── Ready RFQs (up to 3) ───────────────────────────────────── */
  const readyRFQs = rfqs.slice(0, 3).map(r => ({
    id:          r.id,
    rfqNumber:   r.rfqNumber,
    productName: r.title || r.description || '—',
    quotesCount: r.quotes?.length || 0,
  }));

  return {
    stats: {
      activeOrders:  activeOrders.length,
      samplesCount,
      pendingRFQs,
      overdueAmount,
      overdueDate: earliestOverdue
        ? new Date(earliestOverdue.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
        : null,
    },
    recentOrders,
    readyRFQs,
  };
};

module.exports = { getClientDashboard };
