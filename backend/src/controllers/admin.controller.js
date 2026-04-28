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

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  getAllOrders,
  updateOrderStatus,
};
