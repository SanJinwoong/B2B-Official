const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { updateOrderStatusSchema } = require('../schemas/order.schema');
const { updateUserSchema } = require('../schemas/admin.schema');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Todas las rutas de este archivo exigen:
//   1. Token JWT válido (authenticate)
//   2. Rol ADMIN (authorize)
// Sin excepciones.
// ─────────────────────────────────────────────────────────────────────────────
router.use(authenticate, authorize('ADMIN'));

// ── Gestión de usuarios ───────────────────────────────────────────────────────

// GET  /api/admin/users          → lista todos los usuarios
router.get('/users', adminController.getAllUsers);

// GET  /api/admin/users/:id      → detalle de un usuario
router.get('/users/:id', adminController.getUserById);

// PATCH /api/admin/users/:id     → cambiar rol o activar/desactivar
// Body: { role?: 'CLIENT'|'SUPPLIER'|'ADMIN', isActive?: boolean }
router.patch('/users/:id', validate(updateUserSchema), adminController.updateUser);

// ── Gestión de pedidos ────────────────────────────────────────────────────────

// GET  /api/admin/orders         → lista todos los pedidos
router.get('/orders', adminController.getAllOrders);

// PATCH /api/admin/orders/:id/status → cambiar estado de un pedido
// Body: { status: 'PENDING'|'APPROVED'|'SHIPPED'|'DELIVERED' }
router.patch(
  '/orders/:id/status',
  validate(updateOrderStatusSchema),
  adminController.updateOrderStatus
);

module.exports = router;
