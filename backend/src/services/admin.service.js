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

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  getAllOrders,
  updateOrderStatus,
};
