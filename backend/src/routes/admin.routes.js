const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const configController = require('../controllers/platformConfig.controller');
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

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', adminController.getDashboard);

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

// GET /api/admin/orders/messages/flagged → obtiene pedidos con mensajes con palabras prohibidas
router.get('/orders/messages/flagged', adminController.getFlaggedChats);

// ── Configuracion de la Plataforma ────────────────────────────────────────────
router.get('/config',   configController.getAdminConfig);
router.patch('/config', configController.patchAdminConfig);

// ── Gatekeeper: Cotizaciones (RFQs) ───────────────────────────────────────────

// GET  /api/admin/rfqs           → lista todos los RFQs para el Gatekeeper
router.get('/rfqs', adminController.getAllRFQs);

// GET  /api/admin/rfqs/:id       → detalle de un RFQ y sus cotizaciones
router.get('/rfqs/:id', adminController.getRFQById);

// PATCH /api/admin/rfqs/quotes/:id/forward → aprueba una cotización para enviarla al cliente
// Body (opcional): { unitPrice, totalPrice, samplePrice } para ajustar el margen manualmente
router.patch('/rfqs/quotes/:id/forward', adminController.forwardQuoteToClient);

// PATCH /api/admin/rfqs/quotes/:id/reject  → rechaza una cotización (la oculta al cliente)
router.patch('/rfqs/quotes/:id/reject', adminController.rejectQuote);

// PATCH /api/admin/rfqs/:id/notify-scouters → Notifica a los scouters que un RFQ está estancado
router.patch('/rfqs/:id/notify-scouters', adminController.notifyScouters);

// ── Finanzas (Pagos en Cascada) ───────────────────────────────────────────────

// GET /api/admin/finances/payments → Lista todos los pagos INBOUND y OUTBOUND
router.get('/finances/payments', adminController.getAllPayments);

// PATCH /api/admin/finances/payments/:id → Actualiza estado del pago, notas o adjuntos
router.patch('/finances/payments/:id', adminController.updatePaymentStatus);

// POST /api/admin/finances/orders/:orderId/payments → Crea un nuevo milestone de pago
router.post('/finances/orders/:orderId/payments', adminController.createPayment);

module.exports = router;
