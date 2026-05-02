const { Router } = require('express');
const ctrl = require('../controllers/rfq.controller');
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');

const router = Router();

// ── Cliente ───────────────────────────────────────────────────────────────
router.post('/',              authenticate, authorize('CLIENT'), ctrl.createRFQ);
router.get('/my',             authenticate, authorize('CLIENT'), ctrl.getMyRFQs);
router.get('/my/:id',         authenticate, authorize('CLIENT'), ctrl.getRFQById);
router.post('/my/:id/approve',authenticate, authorize('CLIENT'), ctrl.approveQuote);
router.post('/my/:id/ratings',authenticate, authorize('CLIENT'), ctrl.submitRFQRating);

// ── Admin ─────────────────────────────────────────────────────────────────
router.get('/',               authenticate, authorize('ADMIN'),  ctrl.getAllRFQs);
router.post('/:id/quotes',    authenticate, authorize('ADMIN'),  ctrl.addQuote);

module.exports = router;
