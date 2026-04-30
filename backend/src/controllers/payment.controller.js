const paymentService = require('../services/payment.service');

const getMyPayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getMyPayments(req.user.id);
    res.json(payments);
  } catch (e) { next(e); }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await paymentService.getPaymentSummary(req.user.id);
    res.json(summary);
  } catch (e) { next(e); }
};

const markAsPaid = async (req, res, next) => {
  try {
    const payment = await paymentService.markAsPaid(Number(req.params.id), req.user.id);
    res.json(payment);
  } catch (e) { next(e); }
};

module.exports = { getMyPayments, getSummary, markAsPaid };
