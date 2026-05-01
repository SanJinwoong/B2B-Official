/**
 * marketplace.routes.js — /api/marketplace/*
 *
 * Rutas públicas: búsqueda, detalle de producto, categorías
 * Rutas protegidas (CLIENT): carrito, wishlist, checkout, ratings
 */
const router    = require('express').Router();
const ctrl      = require('../controllers/marketplace.controller');
const auth      = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const client = [auth, authorize('CLIENT')];

// ── Catálogo (público con info extra si hay token) ────────────────────────────
router.get('/categories',          ctrl.getCategories);
router.get('/products',            ctrl.search);
router.get('/products/:id',        auth, ctrl.getDetail);   // auth opcional — enriquece wishlist/cart status

// Sin auth, también accesible:
router.get('/products/:id/public', ctrl.getDetail);

// ── Ratings (solo clientes) ───────────────────────────────────────────────────
router.post('/products/:id/ratings', ...client, ctrl.submitRating);

// ── Carrito (solo clientes) ───────────────────────────────────────────────────
router.get   ('/cart',              ...client, ctrl.getCart);
router.post  ('/cart',              ...client, ctrl.addToCart);
router.patch ('/cart/:itemId',      ...client, ctrl.updateCartItem);
router.delete('/cart/:itemId',      ...client, ctrl.removeCartItem);
router.delete('/cart',              ...client, ctrl.clearCart);
router.post  ('/cart/checkout',     ...client, ctrl.checkout);

// ── Wishlist (solo clientes) ──────────────────────────────────────────────────
router.get   ('/wishlist',                 ...client, ctrl.getWishlist);
router.post  ('/wishlist/:productId',      ...client, ctrl.toggleWishlist);
router.delete('/wishlist/:productId',      ...client, ctrl.toggleWishlist);

module.exports = router;
