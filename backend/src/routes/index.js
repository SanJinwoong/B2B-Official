const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authRoutes                = require('./auth.routes');
const productRoutes             = require('./product.routes');
const orderRoutes               = require('./order.routes');
const adminRoutes               = require('./admin.routes');
const supplierApplicationRoutes = require('./supplier-application.routes');
const adminApplicationRoutes    = require('./admin-applications.routes');
const rfqRoutes                 = require('./rfq.routes');
const messageRoutes             = require('./message.routes');
const paymentRoutes             = require('./payment.routes');
const clientProfileRoutes       = require('./client-profile.routes');
const userProfileRoutes         = require('./user-profile.routes');
const dashboardRoutes           = require('./dashboard.routes');
const scouterRoutes             = require('./scouter.routes');
const supplierPortalRoutes      = require('./supplier-portal.routes');
const marketplaceRoutes         = require('./marketplace.routes');
const notificationRoutes        = require('./notification.routes');


const router = Router();

// ── Rutas públicas ────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── Rutas de negocio ──────────────────────────────────────────────────────────
router.use('/products', productRoutes);
router.use('/orders',   orderRoutes);

// ── Dashboard Cliente ─────────────────────────────────────────────────────────
router.use('/dashboard', dashboardRoutes);
router.use('/rfqs',      rfqRoutes);
router.use('/messages',  messageRoutes);
router.use('/payments',  paymentRoutes);

// ── Rutas de administración ───────────────────────────────────────────────────
router.use('/admin', adminRoutes);
router.use('/supplier-applications', supplierApplicationRoutes);
router.use('/admin/applications',    adminApplicationRoutes);

// ── Perfil ────────────────────────────────────────────────────────────────────
router.use('/clients/profile', clientProfileRoutes);
router.use('/me', userProfileRoutes);

// ── Scouters / Sistema de referidos ──────────────────────────────────────────
router.use('/scouters', scouterRoutes);

// ── Portal Proveedor (post-aprobación) ────────────────────────────────────────
router.use('/supplier', supplierPortalRoutes);

// ── Marketplace B2B (catálogo, carrito, wishlist, checkout) ──────────────────
router.use('/marketplace', marketplaceRoutes);

// ── Notificaciones ────────────────────────────────────────────────────────────
router.use('/notifications', notificationRoutes);


// ── Ruta de prueba ────────────────────────────────────────────────────────────
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Acceso permitido', user: req.user });
});

module.exports = router;