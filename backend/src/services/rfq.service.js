const prisma = require('../config/prisma');
const { getMargin, applyMargin } = require('./platformConfig.service');

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
  // Use aggregate max id to avoid collisions when orders have been deleted
  const agg = await prisma.order.aggregate({ _max: { id: true } });
  const next = (agg._max.id || 0) + 1;
  const seq = String(next).padStart(3, '0');
  // Add a small random suffix to guarantee uniqueness in concurrent scenarios
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `ORD-${year}-${seq}-${suffix}`;
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
const createRFQ = async (clientId, { title, description, quantity, unit, category, budget, isNegotiable, deadline, images }) => {
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
      budget: budget ? parseFloat(budget) : null,
      isNegotiable: isNegotiable !== undefined ? isNegotiable : true,
      deadline: deadline ? new Date(deadline) : null,
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
 * Los precios de las cotizaciones se muestran con el margen aplicado.
 */
const getMyRFQs = async (clientId) => {
  const margin = await getMargin();
  const rfqs = await prisma.rFQ.findMany({
    where: { clientId },
    include: {
      quotes: {
        where: { adminStatus: 'FORWARDED' },
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

  // Aplicar margen a los precios de cada cotizacion antes de enviarlo al cliente
  return rfqs.map(rfq => ({
    ...rfq,
    quotes: rfq.quotes.map(q => ({
      ...q,
      // El cliente ve los precios con margen aplicado
      unitPrice:   applyMargin(q.unitPrice, margin),
      totalPrice:  applyMargin(q.totalPrice, margin),
      // samplePrice NO lleva margen (es el costo real de la muestra)
    }))
  }));
};

/**
 * Retorna un RFQ por ID, validando que pertenece al cliente.
 * Los precios se devuelven con el margen aplicado.
 */
const getRFQById = async (id, clientId) => {
  const margin = await getMargin();
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: {
      quotes: {
        orderBy: { id: 'asc' },
        include: {
          supplier: {
            select: { id: true, marketplaceRating: true, marketplaceRatingCount: true, rfqRating: true, rfqRatingCount: true }
          }
        }
      },
      order: true
    },
  });
  if (!rfq) {
    const e = new Error('Solicitud no encontrada.'); e.statusCode = 404; throw e;
  }
  if (rfq.clientId !== clientId) {
    const e = new Error('No tienes acceso a esta solicitud.'); e.statusCode = 403; throw e;
  }
  // Aplicar margen a las cotizaciones
  return {
    ...rfq,
    quotes: rfq.quotes.map(q => ({
      ...q,
      unitPrice:  applyMargin(q.unitPrice, margin),
      totalPrice: applyMargin(q.totalPrice, margin),
    }))
  };
};

/**
 * El cliente aprueba una cotización → crea un Order con sus fases y pagos.
 */
const approveQuote = async (rfqId, quoteId, clientId, paymentPreference = 'DEPOSIT_AND_SAMPLE', shippingAddress = '') => {
  const rfq = await getRFQById(rfqId, clientId);
  if (!['QUOTED', 'SEARCHING'].includes(rfq.status)) {
    const e = new Error('Esta solicitud no tiene cotizaciones disponibles para aprobar.');
    e.statusCode = 400; throw e;
  }
  const quote = rfq.quotes.find((q) => q.id === quoteId);
  if (!quote) {
    const e = new Error('Cotización no encontrada.'); e.statusCode = 404; throw e;
  }

  const orderNumber = await generateOrderNumber();
  const margin = await getMargin();

  return prisma.$transaction(async (tx) => {

    // Precios: el proveedor cobra su precio real, la plataforma cobra con margen
    const samplePrice    = quote.samplePrice || 0;
    const supplierBase   = quote.totalPrice;                          // precio real del proveedor
    const clientBase     = applyMargin(supplierBase, margin);         // precio con margen para el cliente
    const clientTotal    = clientBase + samplePrice;                  // total del cliente
    const supplierTotal  = supplierBase;                              // total del proveedor (sin muestra)

    const invoiceBase = orderNumber.replace('ORD', 'FAC');
    const paymentsToCreate = [];

    if (paymentPreference === 'SAMPLE_ONLY' && samplePrice > 0) {
      // Solo paga la muestra ahora — el anticipo se activa cuando apruebe la muestra
      paymentsToCreate.push({ invoiceNumber: `${invoiceBase}-S`, type: 'SAMPLE',   percentage: 0,  amount: samplePrice,                                        status: 'PENDING' });
      paymentsToCreate.push({ invoiceNumber: `${invoiceBase}-A`, type: 'DEPOSIT',  percentage: 50, amount: parseFloat((clientBase * 0.5).toFixed(2)),            status: 'LOCKED'  });
      paymentsToCreate.push({ invoiceNumber: `${invoiceBase}-B`, type: 'BALANCE',  percentage: 50, amount: parseFloat((clientBase * 0.5).toFixed(2)),            status: 'LOCKED'  });
    } else {
      // Paga anticipo(50%) + muestra juntos ahora
      const deposit = parseFloat((clientBase * 0.5).toFixed(2)) + samplePrice;
      const balance = parseFloat((clientBase * 0.5).toFixed(2));
      paymentsToCreate.push({ invoiceNumber: `${invoiceBase}-A`, type: 'DEPOSIT',  percentage: 50, amount: deposit,                                              status: 'PENDING' });
      paymentsToCreate.push({ invoiceNumber: `${invoiceBase}-B`, type: 'BALANCE',  percentage: 50, amount: balance,                                              status: 'LOCKED'  });
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        clientId,
        supplierId: quote.supplierId,
        status: 'IN_PRODUCTION',
        totalAmount:    clientTotal,    // Total facturado al cliente (con margen)
        clientAmount:   clientTotal,    // Lo que paga el cliente
        supplierAmount: supplierTotal,  // Lo que se le paga al proveedor (sin margen)
        sampleStatus: 'PENDING',
        shippingAddress: shippingAddress || null,
        // Fases
        phases: {
          create: DEFAULT_PHASES.map((p, idx) => ({
            ...p,
            status: idx === 0 ? 'DONE' : idx === 1 ? 'IN_PROGRESS' : 'PENDING',
          })),
        },
        // Pagos
        payments: {
          create: paymentsToCreate,
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

const submitRFQRating = async (clientId, rfqId, { stars, comment, images = [] }) => {
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
  const actualSupplierId = rfq.order.supplierId;
  if (!actualSupplierId) {
    const err = new Error('No se pudo determinar el proveedor de esta cotización.');
    err.statusCode = 400; throw err;
  }
  
  const rating = await prisma.rFQRating.upsert({
    where: { rfqId_clientId: { rfqId, clientId } },
    create: {
      rfqId,
      clientId,
      supplierId: actualSupplierId,
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
    where: { supplierId: actualSupplierId },
    _avg: { stars: true },
    _count: { stars: true },
  });

  await prisma.user.update({
    where: { id: actualSupplierId },
    data: {
      rfqRating: supplierAgg._avg.stars || 0,
      rfqRatingCount: supplierAgg._count.stars,
    }
  });

  return rating;
};

const reopenRFQ = async (clientId, id) => {
  const rfq = await prisma.rFQ.findUnique({
    where: { id: Number(id) },
    include: { quotes: true, order: true }
  });

  if (!rfq || rfq.clientId !== clientId) {
    throw Object.assign(new Error('RFQ no encontrada.'), { statusCode: 404 });
  }

  // Cancel associated order if it exists and is not already cancelled
  if (rfq.order && rfq.order.status !== 'CANCELLED') {
    await prisma.order.update({
      where: { id: rfq.order.id },
      data: { status: 'CANCELLED' }
    });
  }

  // Unapprove all quotes and change RFQ status back to SEARCHING
  await prisma.$transaction([
    prisma.rFQQuote.updateMany({
      where: { rfqId: rfq.id },
      data: { isApproved: false }
    }),
    prisma.rFQ.update({
      where: { id: rfq.id },
      data: { status: 'SEARCHING' }
    })
  ]);

  return { success: true };
};

module.exports = { createRFQ, getMyRFQs, getRFQById, approveQuote, addQuoteToRFQ, getAllRFQs, submitRFQRating, reopenRFQ };

