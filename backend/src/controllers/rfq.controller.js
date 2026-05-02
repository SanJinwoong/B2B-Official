const rfqService = require('../services/rfq.service');

const createRFQ = async (req, res, next) => {
  try {
    const rfq = await rfqService.createRFQ(req.user.id, req.body);
    res.status(201).json(rfq);
  } catch (e) { next(e); }
};

const getMyRFQs = async (req, res, next) => {
  try {
    const rfqs = await rfqService.getMyRFQs(req.user.id);
    res.json(rfqs);
  } catch (e) { next(e); }
};

const getRFQById = async (req, res, next) => {
  try {
    const rfq = await rfqService.getRFQById(Number(req.params.id), req.user.id);
    res.json(rfq);
  } catch (e) { next(e); }
};

const approveQuote = async (req, res, next) => {
  try {
    const { quoteId } = req.body;
    if (!quoteId) {
      return res.status(400).json({ message: 'quoteId es requerido.' });
    }
    const order = await rfqService.approveQuote(
      Number(req.params.id),
      Number(quoteId),
      req.user.id
    );
    res.status(201).json(order);
  } catch (e) { next(e); }
};

const submitRFQRating = async (req, res, next) => {
  try {
    const rating = await rfqService.submitRFQRating(req.user.id, Number(req.params.id), req.body);
    res.status(201).json(rating);
  } catch (e) { next(e); }
};

// Admin: agregar cotización
const addQuote = async (req, res, next) => {
  try {
    const quote = await rfqService.addQuoteToRFQ(Number(req.params.id), req.body);
    res.status(201).json(quote);
  } catch (e) { next(e); }
};

const getAllRFQs = async (req, res, next) => {
  try {
    const rfqs = await rfqService.getAllRFQs();
    res.json(rfqs);
  } catch (e) { next(e); }
};

module.exports = { createRFQ, getMyRFQs, getRFQById, approveQuote, submitRFQRating, addQuote, getAllRFQs };
