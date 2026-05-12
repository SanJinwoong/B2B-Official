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

/**
 * PATCH /api/orders/:id/confirm-receipt
 * 🔒 authenticate + authorize('CLIENT')
 * Cliente marca el pedido como entregado.
 */
const confirmReceipt = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const clientId = req.user.id;

    const order = await orderService.getOrderById(id);
    if (order.clientId !== clientId) {
      return res.status(403).json({ message: 'No autorizado: esta orden no te pertenece.' });
    }

    if (order.status !== 'IN_TRANSIT') {
      return res.status(400).json({ message: 'Solo puedes confirmar pedidos que estén en tránsito.' });
    }

    const updated = await orderService.updateOrderStatus(id, 'DELIVERED');
    res.status(200).json({
      message: 'Pedido marcado como entregado exitosamente.',
      data: applyOrderDto(updated, req.user.role, req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

const respondSample = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const clientId = req.user.id;

    const order = await orderService.respondSample(clientId, id, status);
    
    res.status(200).json({
      message: `Muestra física ${status === 'APPROVED' ? 'aprobada' : 'rechazada'} exitosamente.`,
      data: applyOrderDto(order, req.user.role, req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

const getOrderMessages = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const messages = await orderService.getOrderMessages(orderId, userId, userRole);
    res.status(200).json({ data: messages });
  } catch (error) {
    next(error);
  }
};

const sendOrderMessage = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const senderId = req.user.id;
    const senderRole = req.user.role;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'El contenido del mensaje es requerido.' });
    }
    
    const message = await orderService.sendOrderMessage(orderId, senderId, senderRole, content);
    res.status(201).json({
      message: 'Mensaje enviado.',
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// ── Data Room / Documentos ────────────────────────────────────────────────

const uploadDocument = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { type, label } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No se envió ningún archivo.' });
    }
    if (!type || !label) {
      return res.status(400).json({ message: 'type y label son requeridos.' });
    }

    const doc = await orderService.uploadOrderDocument(orderId, req.user, file, { type, label });
    res.status(201).json({ message: 'Documento subido con éxito', data: doc });
  } catch (err) {
    next(err);
  }
};

const getDocuments = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const docs = await orderService.getOrderDocuments(orderId, req.user);
    res.json({ data: docs });
  } catch (err) {
    next(err);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { docId } = req.params;
    await orderService.deleteOrderDocument(docId, req.user);
    res.json({ message: 'Documento eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const { docId } = req.params;
    const fileData = await orderService.downloadOrderDocument(docId, req.user);
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.label}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(fileData.filePath);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  confirmReceipt,
  respondSample,
  getOrderMessages,
  sendOrderMessage,
  uploadDocument,
  getDocuments,
  deleteDocument,
  downloadDocument,
};

