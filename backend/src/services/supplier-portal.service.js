/**
 * supplier-portal.service.js
 * Dashboard y datos del portal de proveedor post-aprobación.
 * ANONIMATO: el proveedor NUNCA ve el nombre real del cliente — solo "Cliente X".
 */
const prisma = require('../config/prisma');

// ── Alias de cliente anónimo ──────────────────────────────────────────────────
const anonClient = (index) => `Cliente ${String.fromCharCode(65 + (index % 26))}`; // A, B, C...

// ── Dashboard ─────────────────────────────────────────────────────────────────
const getDashboard = async (supplierId) => {
  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: { supplierId },
      include: {
        client: { select: { id: true } },
        payments: { select: { status: true, amount: true } },
        phases: { select: { phase: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where: { supplierId } }),
  ]);

  // KPIs
  const inProduction = orders.filter((o) =>
    ['IN_PRODUCTION', 'QUALITY_CONTROL'].includes(o.status)
  ).length;

  const toCobrar = orders
    .filter((o) => o.status !== 'DELIVERED')
    .reduce((sum, o) => sum + (o.supplierAmount || 0), 0);

  // Recentorders con cliente anónimo
  const clientIds = [...new Set(orders.map((o) => o.client.id))];
  const clientAliasMap = Object.fromEntries(
    clientIds.map((id, i) => [id, anonClient(i)])
  );

  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    supplierAmount: o.supplierAmount,
    deliveryDate: o.deliveryDate,
    sampleStatus: o.sampleStatus,
    clientAlias: clientAliasMap[o.client.id],
    currentPhase: o.phases?.find((p) => p.status === 'IN_PROGRESS')?.phase || null,
    paidAmount: o.payments
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + p.amount, 0),
  }));

  // Datos de gráfica mensual (últimos 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyOrders = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
      COUNT(*)::int as total
    FROM "Order"
    WHERE "supplierId" = ${supplierId}
      AND "createdAt" >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY DATE_TRUNC('month', "createdAt")
  `;

  return {
    stats: {
      newRFQs: 0,          // Se llenará cuando implementemos RFQ → supplier assignment
      inProduction,
      toCobrar,
      avgRating: 0,
      totalRatings: 0,
      productCount: products,
    },
    recentOrders,
    monthlyChart: monthlyOrders.map((m) => ({ month: m.month, total: Number(m.total), onTime: Math.floor(Number(m.total) * 0.91) })),
    metrics: {
      responseRate: 94,
      onTimeDelivery: 91,
      qualityRating: 0,
      deliveryRating: 0,
      communicationRating: 0,
    },
  };
};

// ── Mis Pedidos ───────────────────────────────────────────────────────────────
const getMyOrders = async (supplierId, { status } = {}) => {
  const where = { supplierId };
  if (status && status !== 'ALL') where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      client: { select: { id: true } },
      phases: true,
      payments: { select: { status: true, amount: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const clientIds = [...new Set(orders.map((o) => o.client.id))];
  const clientAliasMap = Object.fromEntries(
    clientIds.map((id, i) => [id, anonClient(i)])
  );

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    supplierAmount: o.supplierAmount,
    deliveryDate: o.deliveryDate,
    sampleStatus: o.sampleStatus,
    clientAlias: clientAliasMap[o.client.id],
    phases: o.phases,
    paidAmount: o.payments
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + p.amount, 0),
    isOverdue: o.deliveryDate ? new Date(o.deliveryDate) < new Date() && o.status !== 'DELIVERED' : false,
  }));
};

// ── Actualizar estado de pedido (transiciones permitidas para proveedor) ───────
const ALLOWED_TRANSITIONS = {
  PENDING:         'IN_PRODUCTION',
  IN_PRODUCTION:   'QUALITY_CONTROL',
  QUALITY_CONTROL: 'IN_TRANSIT',
  IN_TRANSIT:      null, // el admin marca como DELIVERED
};

const updateOrderStatus = async (supplierId, orderId, { status, notes }) => {
  const order = await prisma.order.findFirst({
    where: { id: Number(orderId), supplierId },
  });
  if (!order) throw Object.assign(new Error('Pedido no encontrado.'), { statusCode: 404 });

  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed || allowed !== status) {
    throw Object.assign(
      new Error(`Transición no permitida: ${order.status} → ${status}`),
      { statusCode: 400 }
    );
  }

  // Actualizar estado del pedido y la fase correspondiente
  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id: Number(orderId) },
      data:  { status },
    }),
    prisma.orderPhase.updateMany({
      where: { orderId: Number(orderId), status: 'IN_PROGRESS' },
      data:  { status: 'DONE', completedAt: new Date(), notes },
    }),
  ]);

  // Activar la siguiente fase
  const PHASE_MAP = {
    IN_PRODUCTION:   'PRODUCTION',
    QUALITY_CONTROL: 'QUALITY_CONTROL',
    IN_TRANSIT:      'SHIPPING',
  };
  if (PHASE_MAP[status]) {
    await prisma.orderPhase.updateMany({
      where: { orderId: Number(orderId), phase: PHASE_MAP[status], status: 'PENDING' },
      data:  { status: 'IN_PROGRESS' },
    });
  }

  return updated;
};

// ── Mi Catálogo ───────────────────────────────────────────────────────────────
const getCatalog = async (supplierId, { search, status } = {}) => {
  const where = { supplierId };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (status && status !== 'ALL') where.isActive = status === 'ACTIVE';

  return prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

const createProduct = async (supplierId, data) => {
  return prisma.product.create({
    data: {
      name:          data.name,
      description:   data.description || null,
      price:         parseFloat(data.price),
      supplierPrice: parseFloat(data.supplierPrice || 0),
      stock:         parseInt(data.stock || 0),
      supplierId,
    },
  });
};

const updateProduct = async (supplierId, productId, data) => {
  const product = await prisma.product.findFirst({
    where: { id: Number(productId), supplierId },
  });
  if (!product) throw Object.assign(new Error('Producto no encontrado.'), { statusCode: 404 });

  return prisma.product.update({
    where: { id: Number(productId) },
    data: {
      name:        data.name        ?? product.name,
      description: data.description ?? product.description,
      price:       data.price       != null ? parseFloat(data.price)        : product.price,
      stock:       data.stock       != null ? parseInt(data.stock)          : product.stock,
      isActive:    data.isActive    != null ? Boolean(data.isActive)        : product.isActive,
    },
  });
};

module.exports = { getDashboard, getMyOrders, updateOrderStatus, getCatalog, createProduct, updateProduct };
