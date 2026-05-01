/**
 * supplier-portal.controller.js
 */
const svc = require('../services/supplier-portal.service');

const wrap = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (err) { next(err); }
};

exports.dashboard = wrap(async (req, res) => {
  const data = await svc.getDashboard(req.user.id);
  res.json({ ok: true, data });
});

exports.getOrders = wrap(async (req, res) => {
  const orders = await svc.getMyOrders(req.user.id, req.query);
  res.json({ ok: true, data: orders });
});

exports.updateOrderStatus = wrap(async (req, res) => {
  const updated = await svc.updateOrderStatus(req.user.id, req.params.id, req.body);
  res.json({ ok: true, data: updated });
});

exports.getCatalog = wrap(async (req, res) => {
  const products = await svc.getCatalog(req.user.id, req.query);
  res.json({ ok: true, data: products });
});

exports.createProduct = wrap(async (req, res) => {
  const product = await svc.createProduct(req.user.id, req.body);
  res.status(201).json({ ok: true, data: product });
});

exports.updateProduct = wrap(async (req, res) => {
  const product = await svc.updateProduct(req.user.id, req.params.id, req.body);
  res.json({ ok: true, data: product });
});
