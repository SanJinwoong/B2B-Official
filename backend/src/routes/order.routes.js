const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { createOrderSchema, updateOrderStatusSchema } = require('../schemas/order.schema');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Todas las rutas de órdenes requieren autenticación mínima
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/orders
// 🔒 Solo CLIENT puede crear una orden
// ✅ validate → rechaza body inválido antes de llegar al controller
router.post(
  '/',
  authenticate,
  authorize('CLIENT'),
  validate(createOrderSchema),
  orderController.createOrder
);

// GET /api/orders/my
// 🔒 Solo el CLIENT autenticado ve sus propias órdenes
// ⚠️  Esta ruta debe ir ANTES de /:id para que Express no la trate como un ID
router.get(
  '/my',
  authenticate,
  authorize('CLIENT'),
  orderController.getMyOrders
);

// GET /api/orders
// 🔒 Solo ADMIN ve todas las órdenes
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  orderController.getAllOrders
);

// GET /api/orders/:id
// 🔒 Cualquier rol autenticado puede intentarlo.
//    La validación de ownership para CLIENT se hace dentro del controller.
router.get(
  '/:id',
  authenticate,
  authorize('CLIENT', 'ADMIN', 'SUPPLIER'),
  orderController.getOrderById
);

// PATCH /api/orders/:id/status
// 🔒 Solo ADMIN o SUPPLIER pueden cambiar el estado de una orden
// ✅ validate → rechaza status inválido antes de llegar al controller
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'SUPPLIER'),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

// PATCH /api/orders/:id/confirm-receipt
// 🔒 Solo CLIENT puede confirmar de recibido
router.patch(
  '/:id/confirm-receipt',
  authenticate,
  authorize('CLIENT'),
  orderController.confirmReceipt
);

// PATCH /api/orders/:id/sample
// 🔒 Solo CLIENT puede aprobar o rechazar la muestra
router.patch(
  '/:id/sample',
  authenticate,
  authorize('CLIENT'),
  orderController.respondSample
);

module.exports = router;

