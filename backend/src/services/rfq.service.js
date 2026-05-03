const prisma = require('../config/prisma');

// ── Helper: genera número de RFQ único ────────────────────────────────────
const generateRFQNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.rFQ.count();
  const seq = String(count + 1).padStart(3, '0');
  return `RFQ-${year}-${seq}`;
};

// ── Helper: genera número de Order único ──────────────────────────────────
const generateOrderNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  const seq = String(count + 1).padStart(3, '0');
  return `ORD-${year}-${seq}`;
};

/**
 * Fases estándar de un pedido (5 etapas fijas).
 */
const DEFAULT_PHASES = [
  { phase: 'INITIAL_PAYMENT', phaseNumber: 1 },
  { phase: 'PRODUCTION',      phaseNumber: 2 },
  { phase: 'QUALITY_CONTROL', phaseNumber: 3 },
  { phase: 'SHIPPING',        phaseNumber: 4 },
  { phase: 'DELIVERED',       phaseNumber: 5 },
];

/**
 * Crea una nueva solicitud de cotización (RFQ) para el cliente autenticado.
 */
const createRFQ = async (clientId, { title, description, quantity, unit, category, images }) => {
  const rfqNumber = await generateRFQNumber();
  
  const rfq = await prisma.rFQ.create({
    data: { 
      rfqNumber, 
      clientId, 
      title, 
      description, 
      quantity: Number(quantity), 
      unit: unit || 'piezas',
      category: category || 'general',
      images: images ? JSON.stringify(images) : "[]"
    },
  });

  // Broadcasting a todos los proveedores de la categoría relacionada
  const targetCategory = category || 'general';
  
  // Encontramos proveedores aprobados cuya aplicación tenga esa categoría
  // Alternativamente, podríamos buscar a todos los usuarios con rol SUPPLIER
  const applications = await prisma.supplierApplication.findMany({
    where: { status: 'APPROVED', category: targetCategory },
    select: { approvedUserId: true }
  });

  const supplierIds = applications
    .map(app => app.approvedUserId)
    .filter(id => id !== null);
    
  if (supplierIds.length > 0) {
    const notifications = supplierIds.map(userId => ({
      userId,
      type: 'RFQ_NEW',
      title: 'Nueva Solicitud de Cotización (RFQ)',
      message: `Un cliente busca ${quantity} ${unit || 'piezas'} de ${title} en tu categoría.`,
      link: `/supplier/rfqs/${rfq.id}`
    }));
    await prisma.notification.createMany({ data: notifications });
  }

  return rfq;
};

/**
 * Retorna todos los RFQs del cliente autenticado, con sus cotizaciones.
 */
const getMyRFQs = async (clientId) => {
  return prisma.rFQ.findMany({
    where: { clientId },
    include: {
      quotes: {
        orderBy: { id: 'asc' },
        include: {
          supplier: {
            select: {
              id: true,
              marketplaceRating: true,
              marketplaceRatingCount: true,
              rfqRating: true,
              rfqRatingCount: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Retorna un RFQ por ID, validando que pertenece al cliente.
 */
const getRFQById = async (id, clientId) => {
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: { quotes: { orderBy: { id: 'asc' } }, order: true },
  });
  if (!rfq) {
    const e = new Error('Solicitud no encontrada.'); e.statusCode = 404; throw e;
  }
  if (rfq.clientId !== clientId) {
    const e = new Error('No tienes acceso a esta solicitud.'); e.statusCode = 403; throw e;
  }
  return rfq;
};

/**
 * El cliente aprueba una cotización → crea un Order con sus fases y pagos.
 */
const approveQuote = async (rfqId, quoteId, clientId) => {
  const rfq = await getRFQById(rfqId, clientId);
  if (rfq.status !== 'QUOTED') {
    const e = new Error('Esta solicitud no tiene cotizaciones disponibles para aprobar.');
    e.statusCode = 400; throw e;
  }
  const quote = rfq.quotes.find((q) => q.id === quoteId);
  if (!quote) {
    const e = new Error('Cotización no encontrada.'); e.statusCode = 404; throw e;
  }

  const orderNumber = await generateOrderNumber();

  return prisma.$transaction(async (tx) => {

    // Depósito 50% y saldo 50%
    const deposit = parseFloat((quote.totalPrice * 0.5).toFixed(2));
    const balance = parseFloat((quote.totalPrice - deposit).toFixed(2));

    // Número de factura base: FAC-YYYY-NNN
    const invoiceBase = orderNumber.replace('ORD', 'FAC');

    const order = await tx.order.create({
      data: {
        orderNumber,
        clientId,
        supplierId: quote.supplierId,
        status: 'IN_PRODUCTION',
        totalAmount:    quote.totalPrice,
        clientAmount:   quote.totalPrice,
        supplierAmount: quote.totalPrice,
        sampleStatus: 'PENDING',
        // Fases
        phases: {
          create: DEFAULT_PHASES.map((p, idx) => ({
            ...p,
            status: idx === 0 ? 'DONE' : idx === 1 ? 'IN_PROGRESS' : 'PENDING',
          })),
        },
        // Pagos
        payments: {
          create: [
            { invoiceNumber: `${invoiceBase}-A`, type: 'DEPOSIT', percentage: 50, amount: deposit, status: 'PENDING' },
            { invoiceNumber: `${invoiceBase}-B`, type: 'BALANCE', percentage: 50, amount: balance, status: 'PENDING' },
          ],
        },
      },
      include: { phases: true, payments: true },
    });

    // Marcar cotización como aprobada
    await tx.rFQQuote.update({ where: { id: quoteId }, data: { isApproved: true } });

    // Actualizar RFQ → APPROVED + link al pedido
    const updatedRfq = await tx.rFQ.update({
      where: { id: rfqId },
      data: { status: 'APPROVED', orderId: order.id },
      include: { quotes: true }
    });

    // Notify winner and losers
    const notifications = [];
    for (const q of updatedRfq.quotes) {
      if (!q.supplierId) continue;
      if (q.id === quoteId) {
        // Winner
        notifications.push({
          userId: q.supplierId,
          type: 'RFQ_WON',
          title: '¡Propuesta Aceptada!',
          message: `Tu cotización para "${updatedRfq.title}" ha sido aprobada. Tienes un nuevo pedido.`,
          link: `/supplier/orders/${order.id}`
        });
      } else {
        // Loser
        notifications.push({
          userId: q.supplierId,
          type: 'RFQ_LOST',
          title: 'Cotización Cerrada',
          message: `El cliente ha seleccionado otra opción para "${updatedRfq.title}". ¡Gracias por participar!`,
          link: `/supplier/rfqs/${rfqId}`
        });
      }
    }
    
    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return order;
  }, {
    maxWait: 15000,
    timeout: 30000
  });
};

// ── Admin: agregar cotizaciones a un RFQ ──────────────────────────────────

const addQuoteToRFQ = async (rfqId, quoteData) => {
  const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
  if (!rfq) { const e = new Error('RFQ no encontrado.'); e.statusCode = 404; throw e; }

  const [quote] = await prisma.$transaction([
    prisma.rFQQuote.create({ data: { rfqId, ...quoteData } }),
    prisma.rFQ.update({ where: { id: rfqId }, data: { status: 'QUOTED' } }),
  ]);
  return quote;
};

const getAllRFQs = async () => {
  return prisma.rFQ.findMany({
    include: {
      client: { select: { id: true, name: true, email: true } },
      quotes: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

const submitRFQRating = async (clientId, rfqId, { supplierId, stars, comment, images = [] }) => {
  if (!supplierId) {
    const err = new Error('El proveedor es requerido para la calificación.');
    err.statusCode = 400; throw err;
  }
  
  // Verificar si el RFQ pertenece al cliente y tiene una orden
  const rfq = await prisma.rFQ.findFirst({
    where: { id: rfqId, clientId, status: 'APPROVED' },
    include: { order: true }
  });
  
  if (!rfq || !rfq.order) {
    const err = new Error('Solo puedes calificar cotizaciones que hayan sido aprobadas y convertidas a pedido.');
    err.statusCode = 403; throw err;
  }

  // Opcional: Validar que la orden esté DELIVERED (omitido si se permite calificar antes)
  
  const rating = await prisma.rFQRating.upsert({
    where: { rfqId_clientId: { rfqId, clientId } },
    create: {
      rfqId,
      clientId,
      supplierId: Number(supplierId),
      stars: Number(stars),
      comment: comment || null,
      images: JSON.stringify(images),
      verified: true
    },
    update: {
      stars: Number(stars),
      comment: comment || null,
      images: JSON.stringify(images),
    }
  });

  // Recalcular rfqRating del proveedor
  const supplierAgg = await prisma.rFQRating.aggregate({
    where: { supplierId: Number(supplierId) },
    _avg: { stars: true },
    _count: { stars: true },
  });

  await prisma.user.update({
    where: { id: Number(supplierId) },
    data: {
      rfqRating: supplierAgg._avg.stars || 0,
      rfqRatingCount: supplierAgg._count.stars,
    }
  });

  return rating;
};

module.exports = { createRFQ, getMyRFQs, getRFQById, approveQuote, addQuoteToRFQ, getAllRFQs, submitRFQRating };
