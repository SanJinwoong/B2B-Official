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
const createRFQ = async (clientId, { title, description, quantity, unit }) => {
  const rfqNumber = await generateRFQNumber();
  return prisma.rFQ.create({
    data: { rfqNumber, clientId, title, description, quantity, unit: unit || 'piezas' },
  });
};

/**
 * Retorna todos los RFQs del cliente autenticado, con sus cotizaciones.
 */
const getMyRFQs = async (clientId) => {
  return prisma.rFQ.findMany({
    where: { clientId },
    include: { quotes: { orderBy: { id: 'asc' } } },
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

  return prisma.$transaction(async (tx) => {
    const orderNumber = await generateOrderNumber();

    // Depósito 50% y saldo 50%
    const deposit = parseFloat((quote.totalPrice * 0.5).toFixed(2));
    const balance = parseFloat((quote.totalPrice - deposit).toFixed(2));

    // Número de factura base: FAC-YYYY-NNN
    const invoiceBase = orderNumber.replace('ORD', 'FAC');

    const order = await tx.order.create({
      data: {
        orderNumber,
        clientId,
        status: 'IN_PRODUCTION',
        totalAmount:    quote.totalPrice,
        clientAmount:   quote.totalPrice,
        supplierAmount: 0,
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
    await tx.rFQ.update({
      where: { id: rfqId },
      data: { status: 'APPROVED', orderId: order.id },
    });

    return order;
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

module.exports = { createRFQ, getMyRFQs, getRFQById, approveQuote, addQuoteToRFQ, getAllRFQs };
