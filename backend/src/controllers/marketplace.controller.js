/**
 * marketplace.controller.js
 */
const svc = require('../services/marketplace.service');

const wrap = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (err) { next(err); }
};

// ── Catálogo público ──────────────────────────────────────────────────────────

exports.getCategories = wrap(async (req, res) => {
  const categories = svc.getCategories();
  res.json({ ok: true, data: categories });
});

exports.search = wrap(async (req, res) => {
  const result = await svc.searchProducts(req.query);
  res.json({ ok: true, ...result });
});

exports.getDetail = wrap(async (req, res) => {
  const clientId = req.user?.id || null;
  const product  = await svc.getProductDetail(req.params.id, clientId);
  res.json({ ok: true, data: product });
});

// ── Ratings ───────────────────────────────────────────────────────────────────

exports.submitRating = wrap(async (req, res) => {
  const rating = await svc.submitRating(req.user.id, req.params.id, req.body);
  res.status(201).json({ ok: true, data: rating });
});

// ── Carrito ───────────────────────────────────────────────────────────────────

exports.getCart = wrap(async (req, res) => {
  const cart = await svc.getCart(req.user.id);
  res.json({ ok: true, data: cart });
});

exports.addToCart = wrap(async (req, res) => {
  const { productId, quantity } = req.body;
  const item = await svc.addToCart(req.user.id, productId, quantity);
  res.status(201).json({ ok: true, data: item });
});

exports.updateCartItem = wrap(async (req, res) => {
  const item = await svc.updateCartItem(req.user.id, req.params.itemId, req.body.quantity);
  res.json({ ok: true, data: item });
});

exports.removeCartItem = wrap(async (req, res) => {
  await svc.removeFromCart(req.user.id, req.params.itemId);
  res.json({ ok: true });
});

exports.clearCart = wrap(async (req, res) => {
  await svc.clearCart(req.user.id);
  res.json({ ok: true });
});

exports.checkout = wrap(async (req, res) => {
  const result = await svc.checkout(req.user.id, req.body);
  res.status(201).json({ ok: true, data: result });
});

// ── Wishlist ──────────────────────────────────────────────────────────────────

exports.getWishlist = wrap(async (req, res) => {
  const list = await svc.getWishlist(req.user.id);
  res.json({ ok: true, data: list });
});

exports.toggleWishlist = wrap(async (req, res) => {
  const result = await svc.toggleWishlist(req.user.id, req.params.productId);
  res.json({ ok: true, data: result });
});
