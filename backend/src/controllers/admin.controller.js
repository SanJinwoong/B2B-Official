const adminService = require('../services/admin.service');
const { applyOrderDto, applyOrderDtoList } = require('../dtos/order.dto');

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * 🔒 Solo ADMIN
 * Lista todos los usuarios del sistema.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await adminService.getAllUsers();
    res.status(200).json({ data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/:id
 * 🔒 Solo ADMIN
 * Retorna el detalle de un usuario por ID.
 */
const getUserById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await adminService.getUserById(id);
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id
 * 🔒 Solo ADMIN
 * Actualiza el rol o el estado activo de un usuario.
 * Body: { role?: 'CLIENT' | 'SUPPLIER' | 'ADMIN', isActive?: boolean }
 */
const updateUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    const adminId = req.user.id; // ← del JWT
    const { role, isActive } = req.body;

    const user = await adminService.updateUser(targetId, adminId, { role, isActive });
    res.status(200).json({ message: 'Usuario actualizado exitosamente.', data: user });
  } catch (error) {
    next(error);
  }
};

// ─── PEDIDOS ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/orders
 * 🔒 Solo ADMIN
 * Lista todos los pedidos del sistema con datos de clientes y productos.
 */
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await adminService.getAllOrders();
    // ADMIN ve todo: clientAmount + supplierAmount + margin
    res.status(200).json({ data: applyOrderDtoList(orders, 'ADMIN', req.user.id) });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/orders/:id/status
 * 🔒 Solo ADMIN
 * Cambia el estado de un pedido.
 * Body: { status: 'PENDING' | 'APPROVED' | 'SHIPPED' | 'DELIVERED' }
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const order = await adminService.updateOrderStatus(id, status);
    res.status(200).json({
      message: `Estado actualizado a "${status}".`,
      data: applyOrderDto(order, 'ADMIN', req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/orders/messages/flagged
 * 🔒 Solo ADMIN
 * Lista los pedidos que tienen mensajes marcados por palabras prohibidas.
 */
const getFlaggedChats = async (req, res, next) => {
  try {
    const chats = await adminService.getFlaggedChats();
    res.status(200).json({ data: chats });
  } catch (error) {
    next(error);
  }
};

// ─── GATEKEEPER: RFQs ────────────────────────────────────────────────────────

const getAllRFQs = async (req, res, next) => {
  try {
    const rfqs = await adminService.getAllRFQs();
    res.status(200).json({ data: rfqs });
  } catch (error) {
    next(error);
  }
};

const getRFQById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const rfq = await adminService.getRFQById(id);
    res.status(200).json({ data: rfq });
  } catch (error) {
    next(error);
  }
};

const forwardQuoteToClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body; // { unitPrice, totalPrice, samplePrice } optional overrides
    const quote = await adminService.forwardQuoteToClient(id, updates);
    res.status(200).json({ message: 'Cotización liberada al cliente', data: quote });
  } catch (error) {
    next(error);
  }
};

const rejectQuote = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const quote = await adminService.rejectQuote(id);
    res.status(200).json({ message: 'Cotización rechazada', data: quote });
  } catch (error) {
    next(error);
  }
};

const notifyScouters = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await adminService.notifyScoutersForRFQ(id);
    res.status(200).json({ message: 'Scouters notificados' });
  } catch (error) {
    next(error);
  }
};

// ─── FINANZAS ────────────────────────────────────────────────────────────────

const getAllPayments = async (req, res, next) => {
  try {
    const payments = await adminService.getAllPayments();
    res.status(200).json({ data: payments });
  } catch (error) {
    next(error);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const payment = await adminService.updatePaymentStatus(id, updates);
    res.status(200).json({ message: 'Pago actualizado', data: payment });
  } catch (error) {
    next(error);
  }
};

const createPayment = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const data = req.body;
    const payment = await adminService.createPayment(orderId, data);
    res.status(201).json({ message: 'Milestone de pago creado', data: payment });
  } catch (error) {
    next(error);
  }
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

const getDashboard = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({ data: stats });
  } catch (error) {
    next(error);
  }
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
  notifyScouters,
  getAllPayments,
  updatePaymentStatus,
  createPayment,
  getDashboard,
};
