const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authRoutes                = require('./auth.routes');
const productRoutes             = require('./product.routes');
const orderRoutes               = require('./order.routes');
const adminRoutes               = require('./admin.routes');
const supplierApplicationRoutes = require('./supplier-application.routes');
const adminApplicationRoutes    = require('./admin-applications.routes');

const router = Router();

// ── Rutas públicas ────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── Rutas de negocio ──────────────────────────────────────────────────────────
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

// ── Rutas de administración (existentes) ──────────────────────────────────────
router.use('/admin', adminRoutes);

// ── Registro de Proveedores B2B (nuevas) ──────────────────────────────────────
router.use('/supplier-applications', supplierApplicationRoutes);
router.use('/admin/applications',    adminApplicationRoutes);



// ── Ruta de prueba de autenticación ──────────────────────────────────────────
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Acceso permitido', user: req.user });
});

module.exports = router;