const orderService = require('../services/order.service');
const { applyOrderDto, applyOrderDtoList } = require('../dtos/order.dto');

/**
 * POST /api/orders
 * 🔒 authenticate + authorize('CLIENT')
 * Cuerpo: { items: [{ productId, quantity }] }
 *
 * clientId viene del JWT, no del body → el cliente no puede suplantar a otro.
 */
const createOrder = async (req, res, next) => {
  try {
    const clientId = req.user.id; // ← del JWT
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Debes enviar al menos un producto en items.' });
    }

    const order = await orderService.createOrder(clientId, items);
    // CLIENT crea la orden → aplica filtro CLIENT
    res.status(201).json({
      message: 'Orden creada exitosamente.',
      data: applyOrderDto(order, req.user.role, req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders/my
 * 🔒 authenticate + authorize('CLIENT')
 * Retorna solo las órdenes del cliente autenticado.
 */
const getMyOrders = async (req, res, next) => {
  try {
    const clientId = req.user.id; // ← del JWT
    const orders = await orderService.getMyOrders(clientId);
    // Siempre CLIENT en este endpoint → filtra supplierId y datos del proveedor
    res.status(200).json({ data: applyOrderDtoList(orders, 'CLIENT', req.user.id) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders
 * 🔒 authenticate + authorize('ADMIN')
 * Retorna todas las órdenes del sistema.
 */
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAllOrders();
    // Siempre ADMIN en este endpoint → sin filtro
    res.status(200).json({ data: applyOrderDtoList(orders, 'ADMIN', req.user.id) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders/:id
 * 🔒 authenticate + authorize('CLIENT', 'ADMIN', 'SUPPLIER')
 * CLIENT: solo puede ver si la orden es suya.
 * ADMIN/SUPPLIER: puede ver cualquier orden.
 */
const getOrderById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const order = await orderService.getOrderById(id);

    // ── Validación de acceso por ownership ───────────────────────────────
    if (req.user.role === 'CLIENT' && order.clientId !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado: esta orden no te pertenece.' });
    }
    // ─────────────────────────────────────────────────────────────────────

    // Aplica el filtro según el rol del solicitante
    res.status(200).json({ data: applyOrderDto(order, req.user.role, req.user.id) });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/orders/:id/status
 * 🔒 authenticate + authorize('ADMIN', 'SUPPLIER')
 * Cuerpo: { status: 'APPROVED' | 'SHIPPED' | 'DELIVERED' }
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const order = await orderService.updateOrderStatus(id, status);
    // Aplica filtro según el rol (ADMIN ve todo, SUPPLIER no ve datos del cliente)
    res.status(200).json({
      message: `Estado actualizado a "${status}".`,
      data: applyOrderDto(order, req.user.role, req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};

