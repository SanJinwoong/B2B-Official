const prisma = require('../config/prisma');
const orderService = require('./order.service');

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

/**
 * Retorna todos los usuarios del sistema.
 * La contraseña se excluye siempre de la respuesta.
 */
const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
          products: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Retorna un usuario por ID.
 * Lanza 404 si no existe.
 */
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { orders: true, products: true } },
    },
  });

  if (!user) {
    const error = new Error('Usuario no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * Actualiza el rol y/o estado activo de un usuario.
 * El ADMIN no puede desactivarse a sí mismo para evitar bloqueos del sistema.
 *
 * @param {number}  targetId   - ID del usuario a modificar
 * @param {number}  adminId    - ID del admin que hace la petición
 * @param {object}  data       - { role?, isActive? }
 */
const updateUser = async (targetId, adminId, { role, isActive }) => {
  // Verificar que el usuario existe
  await getUserById(targetId);

  // Prevenir que el admin se bloquee a sí mismo
  if (targetId === adminId && isActive === false) {
    const error = new Error('No puedes desactivar tu propia cuenta de administrador.');
    error.statusCode = 400;
    throw error;
  }

  // Construir solo los campos enviados (evitar sobrescribir con undefined)
  const data = {};
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;

  if (Object.keys(data).length === 0) {
    const error = new Error('Debes enviar al menos un campo para actualizar (role o isActive).');
    error.statusCode = 400;
    throw error;
  }

  return prisma.user.update({
    where: { id: targetId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });
};

// ─── PEDIDOS (reutiliza el servicio existente sin duplicar lógica) ─────────────

/**
 * Retorna todos los pedidos del sistema con datos completos.
 * Delega en orderService para no duplicar lógica.
 */
const getAllOrders = () => orderService.getAllOrders();

/**
 * Cambia el estado de un pedido.
 * Delega en orderService para no duplicar lógica.
 */
const updateOrderStatus = (orderId, status) =>
  orderService.updateOrderStatus(orderId, status);

/**
 * Retorna todos los pedidos que contienen mensajes con posibles evasiones.
 */
const getFlaggedChats = async () => {
  return prisma.order.findMany({
    where: {
      messages: {
        some: {
          hasFlaggedWords: true,
        },
      },
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      supplier: { select: { id: true, name: true, email: true } },
      messages: {
        where: { hasFlaggedWords: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
};

// ─── GATEKEEPER: RFQs ────────────────────────────────────────────────────────

const getAllRFQs = async () => {
  return prisma.rFQ.findMany({
    include: {
      client: { select: { id: true, name: true, email: true } },
      quotes: {
        include: { supplier: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getRFQById = async (id) => {
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      quotes: {
        include: { supplier: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!rfq) {
    const error = new Error('RFQ no encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return rfq;
};

const forwardQuoteToClient = async (quoteId, updates = {}) => {
  const quote = await prisma.rFQQuote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    const error = new Error('Cotización no encontrada.');
    error.statusCode = 404;
    throw error;
  }

  // Permite al admin sobreescribir los precios sugeridos al cliente antes de liberarla
  const data = { adminStatus: 'FORWARDED' };
  if (updates.unitPrice !== undefined) data.unitPrice = updates.unitPrice;
  if (updates.totalPrice !== undefined) data.totalPrice = updates.totalPrice;
  if (updates.samplePrice !== undefined) data.samplePrice = updates.samplePrice;

  return prisma.rFQQuote.update({
    where: { id: quoteId },
    data,
  });
};

const rejectQuote = async (quoteId) => {
  const quote = await prisma.rFQQuote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    const error = new Error('Cotización no encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return prisma.rFQQuote.update({
    where: { id: quoteId },
    data: { adminStatus: 'REJECTED' },
  });
};

const notifyScoutersForRFQ = async (rfqId) => {
  const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
  if (!rfq) {
    const error = new Error('RFQ no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  // Find users who could act as scouters. We assume any user with role 'ADMIN' or someone specific
  // The system uses 'SCOUTER' role for real scouters if added, or 'ADMIN' can take the alert
  const scouters = await prisma.user.findMany({
    where: { OR: [{ role: 'ADMIN' }, { role: 'SCOUTER' }] }
  });

  for (const scouter of scouters) {
    await prisma.notification.create({
      data: {
        userId: scouter.id,
        type: 'RFQ_STAGNANT',
        title: 'Atención: RFQ Estancado',
        message: `El RFQ-${rfq.rfqNumber} lleva más de 48 horas sin cotizaciones. Se requiere intervención de scouting manual.`,
        link: `/admin/rfqs/${rfq.id}`
      }
    });
  }

  // Marcar como "SEARCHING" para indicar que se está buscando activamente
  await prisma.rFQ.update({
    where: { id: rfqId },
    data: { status: 'SEARCHING' }
  });

  return true;
};

// ─── FINANZAS (PAGOS EN CASCADA) ─────────────────────────────────────────────

const getAllPayments = async () => {
  return prisma.payment.findMany({
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          clientAmount: true,
          supplierAmount: true,
          client: { select: { id: true, name: true, email: true } },
          supplier: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
};

const updatePaymentStatus = async (paymentId, data) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    const error = new Error('Pago no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  // Update logic
  const updateData = {};
  if (data.status) updateData.status = data.status;
  if (data.status === 'PAID' && payment.status !== 'PAID') updateData.paidAt = new Date();
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
  
  return prisma.payment.update({
    where: { id: paymentId },
    data: updateData,
  });
};

const createPayment = async (orderId, data) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const error = new Error('Orden no encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return prisma.payment.create({
    data: {
      orderId,
      direction: data.direction || 'INBOUND',
      type: data.type || 'MILESTONE',
      percentage: data.percentage || 0,
      amount: data.amount || 0,
      status: data.status || 'PENDING',
      notes: data.notes || '',
    }
  });
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  getAllOrders,
  updateOrderStatus,
  getAllRFQs,
  getRFQById,
  forwardQuoteToClient,
  rejectQuote,
  getFlaggedChats,
  notifyScoutersForRFQ,
  getAllPayments,
  updatePaymentStatus,
  createPayment,
};
