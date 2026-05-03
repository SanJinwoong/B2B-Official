/**
 * supplier-portal.routes.js — /api/supplier/*
 * Solo accesible con rol SUPPLIER.
 */
const router = require('express').Router();
const ctrl      = require('../controllers/supplier-portal.controller');
const auth      = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const supplier = [auth, authorize('SUPPLIER')];

router.get   ('/dashboard',            ...supplier, ctrl.dashboard);
router.get   ('/orders',               ...supplier, ctrl.getOrders);
router.patch ('/orders/:id/status',    ...supplier, ctrl.updateOrderStatus);

// Catálogo
router.get   ('/catalog',              ...supplier, ctrl.getCatalog);
router.post  ('/catalog',              ...supplier, ctrl.createProduct);
router.patch ('/catalog/:id',          ...supplier, ctrl.updateProduct);
router.delete('/catalog/:id',          ...supplier, ctrl.deleteProduct);

// Perfil público del proveedor (visible para clientes)
router.get   ('/profile',              ...supplier, ctrl.getProfile);

// Oportunidades (RFQs)
router.get   ('/rfqs',                 ...supplier, ctrl.getOpportunities);
router.post  ('/rfqs/:id/quotes',      ...supplier, ctrl.submitQuote);

module.exports = router;

